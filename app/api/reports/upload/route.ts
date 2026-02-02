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
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const category = formData.get('category') as string | null

    if (!file) {
      return NextResponse.json({ error: '未上传文件' }, { status: 400 })
    }

    // Check file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: '仅支持PDF文件' }, { status: 400 })
    }

    // Validate category
    const validCategories = ['AI_APPLICATION', 'AI_SUPPLY_CHAIN']
    const selectedCategory = category && validCategories.includes(category) 
      ? category as 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN'
      : null

    console.log(`[上传] 处理文件: ${file.name}, 分类: ${selectedCategory || '自动检测'}`)

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Extract text from PDF
    console.log('[上传] 正在提取PDF文本...')
    const reportText = await extractTextFromDocument(buffer, file.type)

    if (!reportText || reportText.length < 100) {
      return NextResponse.json({ error: '无法从PDF中提取文本' }, { status: 400 })
    }

    console.log(`[上传] 已提取 ${reportText.length} 字符`)

    // Step 1: Extract metadata using AI
    console.log('[上传] 正在使用AI提取元数据...')
    const metadata = await extractMetadataFromReport(reportText)
    console.log('[上传] 提取的元数据:', metadata)

    // Create processing entry so frontend can see progress
    // Only create ONE entry that will be updated when complete
    const processingEntry = await analysisStore.add({
      company_name: metadata.company_name,
      company_symbol: metadata.company_symbol,
      report_type: metadata.report_type,
      fiscal_year: metadata.fiscal_year,
      fiscal_quarter: metadata.fiscal_quarter || undefined,
      filing_date: metadata.filing_date,
      created_at: new Date().toISOString(),
      processed: false,
      processing: true,  // Mark as processing
    })
    processingId = processingEntry.id
    console.log(`[上传] 创建处理记录: ${processingId}`)

    // Step 2: Analyze the report with the selected category
    console.log(`[上传] 正在进行AI分析... 分类: ${selectedCategory || '自动检测'}`)
    
    let analysis
    try {
      analysis = await analyzeFinancialReport(reportText, {
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
        // Pass the selected category to override auto-detection
        category: selectedCategory,
      })
    } catch (analysisError: any) {
      console.error('[上传] AI分析失败:', analysisError)
      
      // Update record with error status
      await analysisStore.update(processingId, {
        processing: false,
        processed: false,
        error: analysisError.message || 'AI分析失败',
      })
      
      return NextResponse.json(
        { error: `AI分析失败: ${analysisError.message}` },
        { status: 500 }
      )
    }

    // Update the SAME record as completed (not create a new one)
    const storedAnalysis = await analysisStore.update(processingId, {
      processed: true,
      processing: false,
      error: undefined, // Clear any previous error
      ...analysis,
    })

    console.log(`[上传] 分析完成: ${processingId}`)

    return NextResponse.json({
      success: true,
      analysis_id: processingId,
      metadata,
      analysis: storedAnalysis,
    })
  } catch (error: any) {
    console.error('[上传] 错误:', error)
    
    // If there's a processing record, mark it as error
    if (processingId) {
      try {
        await analysisStore.update(processingId, {
          processing: false,
          processed: false,
          error: error.message || '处理失败',
        })
      } catch (updateError) {
        console.error('[上传] 更新错误状态失败:', updateError)
      }
    }
    
    return NextResponse.json(
      { error: error.message || '处理报告失败' },
      { status: 500 }
    )
  }
}
