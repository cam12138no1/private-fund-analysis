import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { openrouter } from '@/lib/openrouter'
import { kv } from '@vercel/kv'
import { COMPARISON_PROMPT } from '@/lib/ai/prompts'

/**
 * Cross-company comparison API
 * Compares multiple companies in the same sector
 */

export const runtime = 'nodejs'
export const maxDuration = 300

interface ComparisonRequest {
  category: 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN'
  companySymbols: string[]
  metrics?: string[]
}

// 公司信息映射
const COMPANY_INFO: Record<string, { name: string; nameZh: string }> = {
  // AI应用公司
  'MSFT': { name: 'Microsoft', nameZh: '微软' },
  'GOOGL': { name: 'Alphabet (Google)', nameZh: '谷歌' },
  'AMZN': { name: 'Amazon', nameZh: '亚马逊' },
  'META': { name: 'Meta Platforms', nameZh: 'Meta' },
  'CRM': { name: 'Salesforce', nameZh: 'Salesforce' },
  'NOW': { name: 'ServiceNow', nameZh: 'ServiceNow' },
  'PLTR': { name: 'Palantir', nameZh: 'Palantir' },
  'AAPL': { name: 'Apple', nameZh: '苹果' },
  'APP': { name: 'AppLovin', nameZh: 'AppLovin' },
  'ADBE': { name: 'Adobe', nameZh: 'Adobe' },
  // AI供应链公司
  'NVDA': { name: 'Nvidia', nameZh: '英伟达' },
  'AMD': { name: 'AMD', nameZh: 'AMD' },
  'AVGO': { name: 'Broadcom', nameZh: '博通' },
  'TSM': { name: 'TSMC', nameZh: '台积电' },
  '000660.KS': { name: 'SK Hynix', nameZh: 'SK海力士' },
  'MU': { name: 'Micron', nameZh: '美光' },
  '005930.KS': { name: 'Samsung Electronics', nameZh: '三星电子' },
  'INTC': { name: 'Intel', nameZh: '英特尔' },
  'VRT': { name: 'Vertiv', nameZh: 'Vertiv' },
  'ETN': { name: 'Eaton', nameZh: '伊顿' },
  'GEV': { name: 'GE Vernova', nameZh: 'GE Vernova' },
  'VST': { name: 'Vistra', nameZh: 'Vistra' },
  'ASML': { name: 'ASML', nameZh: '阿斯麦' },
  'SNPS': { name: 'Synopsys', nameZh: '新思科技' },
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { category, companySymbols, metrics } = body as ComparisonRequest

    if (!companySymbols || companySymbols.length < 2) {
      return NextResponse.json(
        { error: '请至少选择2家公司进行对比' },
        { status: 400 }
      )
    }

    // 获取每家公司的最新分析数据
    const companiesData = await Promise.all(
      companySymbols.map(async (symbol) => {
        // 尝试从KV获取公司分析数据
        const companyKey = `company:${symbol}`
        const company = await kv.get<any>(companyKey)
        
        // 获取该公司的报告
        const reportIds = await kv.get<string[]>(`reports:company:${companyKey}`) || []
        let latestAnalysis = null
        let latestReport = null
        
        for (const reportId of reportIds.reverse()) {
          const report = await kv.get<any>(reportId)
          if (report && report.status === 'completed') {
            const analysisId = await kv.get<string>(`analysis:report:${reportId}`)
            if (analysisId) {
              const analysis = await kv.get<any>(analysisId)
              if (analysis) {
                latestAnalysis = analysis.resultData
                latestReport = report
                break
              }
            }
          }
        }

        const companyInfo = COMPANY_INFO[symbol] || { name: symbol, nameZh: symbol }
        
        return {
          symbol,
          name: companyInfo.name,
          nameZh: companyInfo.nameZh,
          category,
          analysis: latestAnalysis,
          report: latestReport
        }
      })
    )

    // 构建对比请求内容
    const categoryName = category === 'AI_APPLICATION' ? 'AI应用公司' : 'AI供应链公司'
    
    // 构建公司信息列表（即使没有分析数据也列出）
    const companyListText = companiesData.map((c, i) => {
      if (c.analysis) {
        return `
公司 ${i + 1}: ${c.name} (${c.symbol}) - ${c.nameZh}
类别: ${categoryName}
报告期: ${c.report?.fiscalQuarter ? `Q${c.report.fiscalQuarter} ${c.report.fiscalYear}` : c.report?.fiscalYear || '最新'}
财务分析数据:
${JSON.stringify(c.analysis, null, 2)}`
      } else {
        return `
公司 ${i + 1}: ${c.name} (${c.symbol}) - ${c.nameZh}
类别: ${categoryName}
注意: 该公司尚无已分析的财报数据，请基于公开信息进行对比`
      }
    }).join('\n---\n')

    // 调用AI生成对比分析
    const response = await openrouter.chat({
      model: 'google/gemini-2.5-flash-preview',
      messages: [
        {
          role: 'system',
          content: COMPARISON_PROMPT
        },
        {
          role: 'user',
          content: `请对以下${categoryName}进行横向对比分析：

${companyListText}

${metrics && metrics.length > 0 ? `重点对比指标: ${metrics.join(', ')}` : ''}

请输出详细的横向对比分析，包括：
1. 关键指标对比表格（Markdown格式）
2. 相对表现分析
3. 竞争优势识别
4. 投资建议排序

注意：如果某些公司没有详细财报数据，请基于公开市场信息和行业知识进行合理推断和对比。`
        }
      ],
      temperature: 0.3
    })

    const comparisonContent = response.choices[0].message.content

    // 保存对比结果到KV
    const comparisonId = `comparison:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`
    const comparisonData = {
      id: comparisonId,
      category,
      companySymbols,
      comparison_content: comparisonContent,
      companies: companiesData.map(c => ({
        symbol: c.symbol,
        name: c.name,
        nameZh: c.nameZh,
        period: c.report?.fiscalQuarter ? `Q${c.report.fiscalQuarter} ${c.report.fiscalYear}` : 'Latest'
      })),
      created_at: new Date().toISOString(),
      created_by: (session.user as any)?.id || 'anonymous'
    }
    
    await kv.set(comparisonId, comparisonData)
    
    // 添加到对比历史索引
    const comparisonIds = await kv.get<string[]>('comparisons:all') || []
    comparisonIds.push(comparisonId)
    await kv.set('comparisons:all', comparisonIds)

    return NextResponse.json({
      success: true,
      comparison_id: comparisonId,
      comparison_content: comparisonContent,
      category,
      companies: comparisonData.companies
    })

  } catch (error: any) {
    console.error('Comparison error:', error)
    return NextResponse.json(
      { error: error.message || '对比分析失败' },
      { status: 500 }
    )
  }
}

// Get comparison history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // 从KV获取对比历史
    const comparisonIds = await kv.get<string[]>('comparisons:all') || []
    const recentIds = comparisonIds.slice(-limit).reverse()
    
    const comparisons = await Promise.all(
      recentIds.map(id => kv.get<any>(id))
    )

    return NextResponse.json({ 
      comparisons: comparisons.filter(Boolean) 
    })
  } catch (error: any) {
    console.error('Get comparisons error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch comparisons' },
      { status: 500 }
    )
  }
}
