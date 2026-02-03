import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { extractTextFromDocument } from '@/lib/document-parser'
import { analyzeFinancialReport } from '@/lib/ai/analyzer'
import { extractMetadataFromReport } from '@/lib/ai/extractor'
import { analysisStore } from '@/lib/store'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

interface UploadedFile {
  url: string
  pathname: string
  originalName: string
}

interface AnalyzeRequest {
  financialFiles: UploadedFile[]
  researchFiles: UploadedFile[]
  category: 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN'
  requestId: string
  fiscalYear: number
  fiscalQuarter: number
}

/**
 * 分析API - 从 Vercel Blob URL 读取文件并进行分析
 * 
 * 这个API接收已上传到 Vercel Blob 的文件URL，
 * 从URL下载文件内容，然后进行AI分析。
 * 
 * 优势：
 * - 绕过了 Serverless Functions 的 4.5MB 请求体限制
 * - 支持最大 500MB 的文件
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let processingId: string | null = null
  let requestId: string | null = null
  
  try {
    console.log('========================================')
    console.log('[分析] 收到新请求', new Date().toISOString())
    
    const session = await getServerSession(authOptions)
    if (!session) {
      console.log('[分析] 未授权访问')
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    console.log('[分析] 用户已认证:', session.user?.email)

    // 解析JSON请求体
    const body: AnalyzeRequest = await request.json()
    
    const { financialFiles, researchFiles, category, fiscalYear, fiscalQuarter } = body
    requestId = body.requestId
    
    console.log('[分析] 请求参数:')
    console.log('  - requestId:', requestId)
    console.log('  - category:', category)
    console.log('  - fiscalYear:', fiscalYear)
    console.log('  - fiscalQuarter:', fiscalQuarter)
    console.log('  - 财报文件数:', financialFiles.length)
    console.log('  - 研报文件数:', researchFiles.length)

    if (!requestId) {
      return NextResponse.json({ error: '缺少requestId' }, { status: 400 })
    }

    if (!financialFiles || financialFiles.length === 0) {
      return NextResponse.json({ error: '请上传财报文件' }, { status: 400 })
    }

    // ★★★ 检查是否已存在此requestId的记录 ★★★
    const existingByRequestId = await analysisStore.getByRequestId(requestId)
    if (existingByRequestId) {
      console.log('[分析] 发现已存在的记录:', existingByRequestId.id)
      if (!existingByRequestId.processing && existingByRequestId.analysis) {
        console.log('[分析] 返回已完成的分析结果')
        return NextResponse.json({
          success: true,
          analysis_id: existingByRequestId.id,
          analysis: existingByRequestId,
          duplicate: true,
        })
      }
      if (existingByRequestId.processing) {
        return NextResponse.json({
          success: false,
          analysis_id: existingByRequestId.id,
          message: '请求正在处理中',
          duplicate: true,
          processing: true,
        }, { status: 202 })
      }
    }

    // ★★★ 从 Blob URL 下载文件内容 ★★★
    console.log('[分析] 开始从Blob下载文件...')
    
    // 下载财报文件
    const financialBuffers: { buffer: Buffer; name: string }[] = []
    for (const file of financialFiles) {
      console.log(`[分析] 下载财报: ${file.originalName} from ${file.url}`)
      const response = await fetch(file.url)
      if (!response.ok) {
        throw new Error(`下载文件失败: ${file.originalName}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      financialBuffers.push({
        buffer: Buffer.from(arrayBuffer),
        name: file.originalName,
      })
      console.log(`[分析] 下载完成: ${file.originalName} (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)}MB)`)
    }
    
    // 下载研报文件
    const researchBuffers: { buffer: Buffer; name: string }[] = []
    for (const file of researchFiles) {
      console.log(`[分析] 下载研报: ${file.originalName} from ${file.url}`)
      const response = await fetch(file.url)
      if (!response.ok) {
        throw new Error(`下载文件失败: ${file.originalName}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      researchBuffers.push({
        buffer: Buffer.from(arrayBuffer),
        name: file.originalName,
      })
      console.log(`[分析] 下载完成: ${file.originalName} (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)}MB)`)
    }

    // ★★★ 提取文本 ★★★
    console.log('[分析] 开始提取文本...')
    
    let financialText = ''
    for (const { buffer, name } of financialBuffers) {
      const text = await extractTextFromDocument(buffer, name)
      financialText += text + '\n\n'
    }
    console.log(`[分析] 财报文本提取完成: ${financialText.length} 字符`)
    
    let researchText = ''
    for (const { buffer, name } of researchBuffers) {
      const text = await extractTextFromDocument(buffer, name)
      researchText += text + '\n\n'
    }
    if (researchText) {
      console.log(`[分析] 研报文本提取完成: ${researchText.length} 字符`)
    }

    // ★★★ 提取元数据 ★★★
    console.log('[分析] 开始提取元数据...')
    const metadata = await extractMetadataFromReport(financialText)
    console.log('[分析] 元数据:', JSON.stringify(metadata, null, 2))

    // 使用用户选择的年份和季度
    const finalFiscalYear = fiscalYear || metadata.fiscal_year || new Date().getFullYear()
    const finalFiscalQuarter = fiscalQuarter || metadata.fiscal_quarter || 4
    const period = `${finalFiscalYear} Q${finalFiscalQuarter}`

    // ★★★ 再次检查是否已存在（防止并发） ★★★
    const doubleCheck = await analysisStore.getByRequestId(requestId)
    if (doubleCheck) {
      console.log('[分析] 二次检查发现已存在记录:', doubleCheck.id)
      if (!doubleCheck.processing && doubleCheck.analysis) {
        return NextResponse.json({
          success: true,
          analysis_id: doubleCheck.id,
          analysis: doubleCheck,
          duplicate: true,
        })
      }
      if (doubleCheck.processing) {
        return NextResponse.json({
          success: false,
          analysis_id: doubleCheck.id,
          message: '请求正在处理中',
          duplicate: true,
          processing: true,
        }, { status: 202 })
      }
    }

    // ★★★ 创建处理记录 ★★★
    console.log('[分析] 创建处理记录...')
    const processingEntry = await analysisStore.addWithRequestId(requestId, {
      company_name: metadata.company_name,
      company_symbol: metadata.company_symbol,
      report_type: metadata.report_type,
      fiscal_year: finalFiscalYear,
      fiscal_quarter: finalFiscalQuarter || undefined,
      period: period,
      category: category || undefined,
      filing_date: metadata.filing_date,
      created_at: new Date().toISOString(),
      processing: true,
    })
    processingId = processingEntry.id
    console.log('[分析] 处理记录已创建:', processingId)

    // ★★★ AI分析 ★★★
    console.log('[分析] 开始AI分析...')
    const analysisResult = await analyzeFinancialReport(
      financialText,
      {
        company: metadata.company_name,
        symbol: metadata.company_symbol,
        period: period,
        fiscalYear: finalFiscalYear,
        fiscalQuarter: finalFiscalQuarter,
        category: category,
      },
      researchText || undefined
    )
    console.log('[分析] AI分析完成')

    // ★★★ 更新记录 ★★★
    console.log('[分析] 更新记录...')
    await analysisStore.update(processingId, {
      analysis: analysisResult,
      processing: false,
    })
    console.log('[分析] 记录更新完成')

    const duration = Date.now() - startTime
    console.log(`[分析] ✓ 完成，耗时: ${duration}ms`)
    console.log('========================================')

    return NextResponse.json({
      success: true,
      analysis_id: processingId,
      metadata: {
        company_name: metadata.company_name,
        company_symbol: metadata.company_symbol,
        period: period,
      },
      analysis: analysisResult,
    })

  } catch (error: any) {
    console.error('[分析] ✗ 错误:', error.message)
    console.error('[分析] 错误堆栈:', error.stack)
    
    // 更新记录为失败状态
    if (processingId) {
      try {
        await analysisStore.update(processingId, {
          processing: false,
          error: error.message,
        })
        console.log('[分析] 已更新记录为失败状态')
      } catch (updateError) {
        console.error('[分析] 更新失败状态时出错:', updateError)
      }
    }
    
    return NextResponse.json(
      { error: error.message || '分析失败' },
      { status: 500 }
    )
  }
}
