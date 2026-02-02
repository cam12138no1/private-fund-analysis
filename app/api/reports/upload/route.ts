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
    
    // Get financial report files (required)
    const financialFiles = formData.getAll('financialFiles') as File[]
    // Get research report files (optional)
    const researchFiles = formData.getAll('researchFiles') as File[]
    const category = formData.get('category') as string | null

    // Backward compatibility: also check for single 'file' field
    const singleFile = formData.get('file') as File | null
    if (singleFile && financialFiles.length === 0) {
      financialFiles.push(singleFile)
    }

    if (financialFiles.length === 0) {
      return NextResponse.json({ error: '请上传至少一份财报文件' }, { status: 400 })
    }

    // Validate all files are PDFs
    for (const file of [...financialFiles, ...researchFiles]) {
      if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: `文件 ${file.name} 不是PDF格式` }, { status: 400 })
      }
    }

    // Validate category
    const validCategories = ['AI_APPLICATION', 'AI_SUPPLY_CHAIN']
    const selectedCategory = category && validCategories.includes(category) 
      ? category as 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN'
      : null

    console.log(`[上传] 处理财报: ${financialFiles.length} 个文件, 研报: ${researchFiles.length} 个文件, 分类: ${selectedCategory || '自动检测'}`)

    // Extract text from all financial reports
    console.log('[上传] 正在提取财报文本...')
    let financialText = ''
    for (const file of financialFiles) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const text = await extractTextFromDocument(buffer, file.type)
      if (text) {
        financialText += `\n\n=== 财报文件: ${file.name} ===\n\n${text}`
      }
    }

    if (!financialText || financialText.length < 100) {
      return NextResponse.json({ error: '无法从财报PDF中提取文本' }, { status: 400 })
    }

    console.log(`[上传] 已提取财报文本 ${financialText.length} 字符`)

    // Extract text from research reports (if any)
    let researchText = ''
    if (researchFiles.length > 0) {
      console.log('[上传] 正在提取研报文本...')
      for (const file of researchFiles) {
        const buffer = Buffer.from(await file.arrayBuffer())
        const text = await extractTextFromDocument(buffer, file.type)
        if (text) {
          researchText += `\n\n=== 研报文件: ${file.name} ===\n\n${text}`
        }
      }
      console.log(`[上传] 已提取研报文本 ${researchText.length} 字符`)
    }

    // Step 1: Extract metadata using AI (from financial report)
    console.log('[上传] 正在使用AI提取元数据...')
    const metadata = await extractMetadataFromReport(financialText)
    console.log('[上传] 提取的元数据:', metadata)

    // Create processing entry so frontend can see progress
    const processingEntry = await analysisStore.add({
      company_name: metadata.company_name,
      company_symbol: metadata.company_symbol,
      report_type: metadata.report_type,
      fiscal_year: metadata.fiscal_year,
      fiscal_quarter: metadata.fiscal_quarter || undefined,
      filing_date: metadata.filing_date,
      created_at: new Date().toISOString(),
      processed: false,
      processing: true,
      has_research_report: researchFiles.length > 0, // Track if research report was provided
    })
    processingId = processingEntry.id
    console.log(`[上传] 创建处理记录: ${processingId}`)

    // Step 2: Analyze the report with the selected category
    console.log(`[上传] 正在进行AI分析... 分类: ${selectedCategory || '自动检测'}`)
    
    let analysis
    try {
      analysis = await analyzeFinancialReport(
        financialText, 
        {
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
          category: selectedCategory,
        },
        researchText || undefined // Pass research report text if available
      )
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

    // Update the SAME record as completed
    const storedAnalysis = await analysisStore.update(processingId, {
      processed: true,
      processing: false,
      error: undefined,
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
