import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { openrouter } from '@/lib/openrouter'
import { sql } from '@vercel/postgres'

/**
 * Cross-company comparison API
 * Compares multiple companies in the same sector
 */

export const runtime = 'nodejs'
export const maxDuration = 300

interface ComparisonRequest {
  companyIds: number[]
  metrics: string[]
}

const COMPARISON_PROMPT = `你是一名顶级美股研究分析师，擅长同赛道公司横向对比分析。

任务：对提供的多家公司财报数据进行横向对比，输出清晰的对比表格和分析。

输出要求：

1. 对比表格（必须包含）：
   - 公司名称
   - 报告期
   - 关键财务指标（Revenue、EPS、Gross Margin、Operating Margin等）
   - YoY增长率
   - QoQ增长率
   - 毛利率
   - 营业利润率
   - 现金流
   - CapEx

2. 相对表现分析：
   - 谁的增长最快？为什么？
   - 谁的盈利能力最强？
   - 谁的投资强度最大？
   - 估值倍数对比（PE、EV/EBITDA等）

3. 竞争优势识别：
   - 技术领先性对比
   - 客户粘性对比
   - 成本结构对比
   - 规模效应对比

4. 投资建议排序：
   - 基于当前财报数据，给出投资吸引力排序
   - 每家公司的核心买点和主要风险
   - 估值合理性判断

格式要求：
- 表格使用markdown格式
- 数字保留2位小数
- 百分比用%表示
- 增长率标注正负
- 突出最优/最差数据`

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyIds, metrics } = body as ComparisonRequest

    if (!companyIds || companyIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 companies required for comparison' },
        { status: 400 }
      )
    }

    // Fetch latest reports for selected companies
    const reportsData = await Promise.all(
      companyIds.map(async (companyId) => {
        const reportResult = await sql`
          SELECT 
            c.id as company_id,
            c.name as company_name,
            c.symbol as company_symbol,
            c.category,
            fr.id as report_id,
            fr.fiscal_year,
            fr.fiscal_quarter,
            fr.filing_date,
            ar.analysis_content
          FROM companies c
          JOIN financial_reports fr ON c.id = fr.company_id
          LEFT JOIN analysis_results ar ON fr.id = ar.report_id
          WHERE c.id = ${companyId}
          ORDER BY fr.fiscal_year DESC, fr.fiscal_quarter DESC
          LIMIT 1
        `
        return reportResult.rows[0]
      })
    )

    // Filter out companies without reports
    const validReports = reportsData.filter(r => r && r.analysis_content)

    if (validReports.length < 2) {
      return NextResponse.json(
        { error: 'Not enough analyzed reports for comparison' },
        { status: 400 }
      )
    }

    // Prepare comparison data
    const comparisonData = validReports.map(report => ({
      company: report.company_name,
      symbol: report.company_symbol,
      category: report.category,
      period: report.fiscal_quarter 
        ? `Q${report.fiscal_quarter} ${report.fiscal_year}`
        : `FY ${report.fiscal_year}`,
      analysis: report.analysis_content,
      filing_date: report.filing_date
    }))

    // Call AI to generate comparison
    const response = await openrouter.chat({
      model: 'google/gemini-3-pro-preview',
      messages: [
        {
          role: 'system',
          content: COMPARISON_PROMPT
        },
        {
          role: 'user',
          content: `请对以下公司进行横向对比分析：

${comparisonData.map((c, i) => `
公司 ${i + 1}: ${c.company} (${c.symbol})
类别: ${c.category}
报告期: ${c.period}
财务分析数据:
${JSON.stringify(c.analysis, null, 2)}
`).join('\n---\n')}

${metrics && metrics.length > 0 ? `重点对比指标: ${metrics.join(', ')}` : ''}

请输出详细的横向对比分析，包括表格和文字说明。`
        }
      ],
      temperature: 0.3
    })

    const comparisonResult = response.choices[0].message.content

    // Save comparison result
    const saveResult = await sql`
      INSERT INTO comparison_analyses (
        company_ids,
        comparison_content,
        created_by
      )
      VALUES (
        ${JSON.stringify(companyIds)},
        ${comparisonResult},
        ${(session.user as any).id}
      )
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      comparison_id: saveResult.rows[0].id,
      comparison_content: comparisonResult,
      companies: comparisonData.map(c => ({
        name: c.company,
        symbol: c.symbol,
        category: c.category,
        period: c.period
      }))
    })

  } catch (error: any) {
    console.error('Comparison error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate comparison' },
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

    const result = await sql`
      SELECT 
        ca.id,
        ca.company_ids,
        ca.comparison_content,
        ca.created_at,
        u.name as created_by_name
      FROM comparison_analyses ca
      LEFT JOIN users u ON ca.created_by = u.id
      ORDER BY ca.created_at DESC
      LIMIT ${limit}
    `

    return NextResponse.json({ comparisons: result.rows })
  } catch (error: any) {
    console.error('Get comparisons error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch comparisons' },
      { status: 500 }
    )
  }
}
