import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { extractTextFromDocument } from '@/lib/document-parser'
import { analyzeFinancialReport } from '@/lib/ai/analyzer'
import { extractMetadataFromReport } from '@/lib/ai/extractor'
import { analysisStore } from '@/lib/store'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

// 使用 Map 存储正在处理的请求，防止重复
// Key: requestId, Value: { timestamp, analysisId, status }
const activeRequests = new Map<string, { 
  timestamp: number
  analysisId: string | null
  status: 'processing' | 'completed' | 'error'
  result?: any
}>()

// 清理过期的请求记录（10分钟过期）
function cleanupOldRequests() {
  const now = Date.now()
  const expireTime = 10 * 60 * 1000 // 10分钟
  for (const [key, value] of activeRequests.entries()) {
    if (now - value.timestamp > expireTime) {
      activeRequests.delete(key)
    }
  }
}

export async function POST(request: NextRequest) {
  let processingId: string | null = null
  let requestId: string | null = null
  
  try {
    console.log('[上传] 收到上传请求')
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // Parse form data with error handling
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (formError: any) {
      console.error('[上传] FormData解析失败:', formError.message)
      return NextResponse.json({ 
        error: `文件上传失败: ${formError.message.includes('body') ? '文件过大或格式错误' : formError.message}` 
      }, { status: 400 })
    }
    
    // 获取请求ID
    requestId = formData.get('requestId') as string | null
    
    // 清理过期请求
    cleanupOldRequests()
    
    // 检查是否是重复请求
    if (requestId) {
      const existing = activeRequests.get(requestId)
      if (existing) {
        console.log(`[上传] 检测到重复请求: ${requestId}, 状态: ${existing.status}`)
        
        // 如果请求正在处理中，返回等待状态
        if (existing.status === 'processing') {
          return NextResponse.json({
            success: false,
            message: '请求正在处理中，请勿重复提交',
            duplicate: true,
            processing: true,
          }, { status: 202 })
        }
        
        // 如果请求已完成，返回已有结果
        if (existing.status === 'completed' && existing.analysisId) {
          const existingAnalysis = await analysisStore.get(existing.analysisId)
          return NextResponse.json({
            success: true,
            analysis_id: existing.analysisId,
            analysis: existingAnalysis,
            duplicate: true,
          })
        }
        
        // 如果之前失败了，允许重试（删除旧记录）
        if (existing.status === 'error') {
          activeRequests.delete(requestId)
        }
      }
      
      // 立即标记请求为处理中，防止并发请求
      activeRequests.set(requestId, {
        timestamp: Date.now(),
        analysisId: null,
        status: 'processing',
      })
    }
    
    // Get financial report files (required)
    const financialFiles = formData.getAll('financialFiles') as File[]
    // Get research report files (optional)
    const researchFiles = formData.getAll('researchFiles') as File[]
    const category = formData.get('category') as string | null
    
    // Get fiscal year and quarter from form (user selected)
    const userFiscalYear = formData.get('fiscalYear') as string | null
    const userFiscalQuarter = formData.get('fiscalQuarter') as string | null
    const parsedFiscalYear = userFiscalYear ? parseInt(userFiscalYear) : null
    const parsedFiscalQuarter = userFiscalQuarter ? parseInt(userFiscalQuarter) : null

    // Backward compatibility: also check for single 'file' field
    const singleFile = formData.get('file') as File | null
    if (singleFile && financialFiles.length === 0) {
      financialFiles.push(singleFile)
    }

    if (financialFiles.length === 0) {
      // 清除请求记录
      if (requestId) activeRequests.delete(requestId)
      return NextResponse.json({ error: '请上传至少一份财报文件' }, { status: 400 })
    }

    // Calculate total file size
    const totalSize = [...financialFiles, ...researchFiles].reduce((acc, f) => acc + f.size, 0)
    console.log(`[上传] 文件总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
    
    // Warn if files are very large
    if (totalSize > 30 * 1024 * 1024) {
      console.warn(`[上传] 文件较大 (${(totalSize / 1024 / 1024).toFixed(2)} MB)，处理可能需要较长时间`)
    }

    // Validate all files are PDFs
    for (const file of [...financialFiles, ...researchFiles]) {
      if (file.type !== 'application/pdf') {
        if (requestId) activeRequests.delete(requestId)
        return NextResponse.json({ error: `文件 ${file.name} 不是PDF格式` }, { status: 400 })
      }
    }

    // Validate category
    const validCategories = ['AI_APPLICATION', 'AI_SUPPLY_CHAIN']
    const selectedCategory = category && validCategories.includes(category) 
      ? category as 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN'
      : null

    console.log(`[上传] 处理财报: ${financialFiles.length} 个文件, 研报: ${researchFiles.length} 个文件, 分类: ${selectedCategory || '自动检测'}, requestId: ${requestId}`)

    // Extract text from all financial reports
    console.log('[上传] 正在提取财报文本...')
    let financialText = ''
    for (const file of financialFiles) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        console.log(`[上传] 解析文件: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
        const text = await extractTextFromDocument(buffer, file.type)
        if (text) {
          financialText += `\n\n=== 财报文件: ${file.name} ===\n\n${text}`
        }
      } catch (extractError: any) {
        console.error(`[上传] 提取文件 ${file.name} 失败:`, extractError.message)
        // Continue with other files instead of failing completely
      }
    }

    if (!financialText || financialText.length < 100) {
      if (requestId) {
        activeRequests.set(requestId, {
          timestamp: Date.now(),
          analysisId: null,
          status: 'error',
        })
      }
      return NextResponse.json({ error: '无法从财报PDF中提取足够的文本内容，请确保PDF不是扫描件' }, { status: 400 })
    }

    console.log(`[上传] 已提取财报文本 ${financialText.length} 字符`)

    // Extract text from research reports (if any)
    let researchText = ''
    if (researchFiles.length > 0) {
      console.log('[上传] 正在提取研报文本...')
      for (const file of researchFiles) {
        try {
          const buffer = Buffer.from(await file.arrayBuffer())
          console.log(`[上传] 解析研报: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
          const text = await extractTextFromDocument(buffer, file.type)
          if (text) {
            researchText += `\n\n=== 研报文件: ${file.name} ===\n\n${text}`
          }
        } catch (extractError: any) {
          console.error(`[上传] 提取研报 ${file.name} 失败:`, extractError.message)
        }
      }
      console.log(`[上传] 已提取研报文本 ${researchText.length} 字符`)
    }

    // Step 1: Extract metadata using AI (from financial report)
    console.log('[上传] 正在使用AI提取元数据...')
    let metadata
    try {
      metadata = await extractMetadataFromReport(financialText)
      console.log('[上传] 提取的元数据:', metadata)
    } catch (metadataError: any) {
      console.error('[上传] 元数据提取失败:', metadataError.message)
      if (requestId) {
        activeRequests.set(requestId, {
          timestamp: Date.now(),
          analysisId: null,
          status: 'error',
        })
      }
      return NextResponse.json({ 
        error: `元数据提取失败: ${metadataError.message}` 
      }, { status: 500 })
    }

    // Use user-selected fiscal year/quarter if provided, otherwise use AI-extracted metadata
    const finalFiscalYear = parsedFiscalYear || metadata.fiscal_year
    const finalFiscalQuarter = parsedFiscalQuarter || metadata.fiscal_quarter
    const period = finalFiscalQuarter 
      ? `Q${finalFiscalQuarter} ${finalFiscalYear}` 
      : `FY ${finalFiscalYear}`

    // Create processing entry so frontend can see progress
    const processingEntry = await analysisStore.add({
      company_name: metadata.company_name,
      company_symbol: metadata.company_symbol,
      report_type: metadata.report_type,
      fiscal_year: finalFiscalYear,
      fiscal_quarter: finalFiscalQuarter || undefined,
      period: period,
      category: selectedCategory || undefined,
      filing_date: metadata.filing_date,
      created_at: new Date().toISOString(),
      processed: false,
      processing: true,
      has_research_report: researchFiles.length > 0,
    })
    processingId = processingEntry.id
    console.log(`[上传] 创建处理记录: ${processingId}`)

    // 更新请求记录，关联 analysisId
    if (requestId) {
      activeRequests.set(requestId, {
        timestamp: Date.now(),
        analysisId: processingId,
        status: 'processing',
      })
    }

    // Step 2: Analyze the report with the selected category
    console.log(`[上传] 正在进行AI分析... 分类: ${selectedCategory || '自动检测'}`)
    console.log(`[上传] 财报文本长度: ${financialText.length}, 研报文本长度: ${researchText.length}`)
    
    let analysis
    try {
      analysis = await analyzeFinancialReport(
        financialText, 
        {
          company: metadata.company_name,
          symbol: metadata.company_symbol,
          period: period,
          fiscalYear: finalFiscalYear,
          fiscalQuarter: finalFiscalQuarter || undefined,
          consensus: {
            revenue: metadata.revenue || undefined,
            eps: metadata.eps || undefined,
            operatingIncome: metadata.operating_income || undefined,
          },
          category: selectedCategory,
        },
        researchText || undefined
      )
    } catch (analysisError: any) {
      console.error('[上传] AI分析失败:', analysisError.message)
      
      // Update record with error status
      await analysisStore.update(processingId, {
        processing: false,
        processed: false,
        error: analysisError.message || 'AI分析失败',
      })
      
      // 更新请求状态为错误
      if (requestId) {
        activeRequests.set(requestId, {
          timestamp: Date.now(),
          analysisId: processingId,
          status: 'error',
        })
      }
      
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

    // 更新请求状态为完成
    if (requestId) {
      activeRequests.set(requestId, {
        timestamp: Date.now(),
        analysisId: processingId,
        status: 'completed',
      })
    }

    return NextResponse.json({
      success: true,
      analysis_id: processingId,
      metadata,
      analysis: storedAnalysis,
    })
  } catch (error: any) {
    console.error('[上传] 未预期的错误:', error)
    
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
    
    // 更新请求状态为错误
    if (requestId) {
      activeRequests.set(requestId, {
        timestamp: Date.now(),
        analysisId: processingId,
        status: 'error',
      })
    }
    
    return NextResponse.json(
      { error: error.message || '处理报告失败' },
      { status: 500 }
    )
  }
}
