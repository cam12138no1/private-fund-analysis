import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { extractTextFromDocument } from '@/lib/document-parser'
import { analyzeFinancialReport } from '@/lib/ai/analyzer'
import { extractMetadataFromReport } from '@/lib/ai/extractor'
import { analysisStore } from '@/lib/store'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  let processingId: string | null = null
  
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Check file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Extract text from PDF
    console.log('Extracting text from PDF...')
    const reportText = await extractTextFromDocument(buffer, file.type)

    if (!reportText || reportText.length < 100) {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 })
    }

    // Step 1: Extract metadata using AI
    console.log('Extracting metadata with AI...')
    const metadata = await extractMetadataFromReport(reportText)
    console.log('Extracted metadata:', metadata)

    // 创建处理中的记录，让前端能看到进度
    const processingEntry = analysisStore.add({
      company_name: metadata.company_name,
      company_symbol: metadata.company_symbol,
      report_type: metadata.report_type,
      fiscal_year: metadata.fiscal_year,
      fiscal_quarter: metadata.fiscal_quarter || undefined,
      filing_date: metadata.filing_date,
      created_at: new Date().toISOString(),
      processed: false,
      processing: true,  // 标记为处理中
    })
    processingId = processingEntry.id
    console.log('Created processing entry:', processingId)

    // Step 2: Analyze the report
    console.log('Analyzing report with AI...')
    const analysis = await analyzeFinancialReport(reportText, {
      company: metadata.company_name,
      symbol: metadata.company_symbol,
      period: metadata.fiscal_quarter 
        ? `Q${metadata.fiscal_quarter} ${metadata.fiscal_year}` 
        : `FY ${metadata.fiscal_year}`,
      fiscalYear: metadata.fiscal_year,
      fiscalQuarter: metadata.fiscal_quarter || undefined,
      consensus: {
        revenue: metadata.revenue || undefined,
        eps: metadata.eps || undefined,
        operatingIncome: metadata.operating_income || undefined,
      },
    })

    // 更新记录为已完成
    const storedAnalysis = analysisStore.update(processingId, {
      processed: true,
      processing: false,
      ...analysis,
    })

    console.log('Analysis complete:', processingId)

    return NextResponse.json({
      success: true,
      analysis_id: processingId,
      metadata,
      analysis: storedAnalysis,
    })
  } catch (error: any) {
    console.error('Upload and analyze error:', error)
    
    // 如果有处理中的记录，标记为错误
    if (processingId) {
      analysisStore.update(processingId, {
        processing: false,
        processed: false,
        error: error.message || 'Analysis failed',
      })
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to process report' },
      { status: 500 }
    )
  }
}
