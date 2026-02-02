import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { openrouter } from '@/lib/openrouter'
import { sql } from '@vercel/postgres'

/**
 * Custom Questions Extraction API
 * Extract specific information based on user-defined questions
 */

export const runtime = 'nodejs'
export const maxDuration = 180

interface CustomQuestionsRequest {
  reportId: number
  questions: string[]
}

const CUSTOM_EXTRACTION_PROMPT = `你是一名专业的财报分析师，擅长从财报中提取特定信息回答用户问题。

任务：基于提供的财报分析数据，回答用户的特定问题。

要求：
1. 直接回答问题，不要回避
2. 引用具体数字和指标
3. 如果财报中没有直接信息，基于相关数据进行合理推导
4. 标注信息来源（财报原文/推导结果）
5. 对于定性问题（如"好坏"判断），给出明确标准和依据

回答格式：
- 问题重述
- 直接答案（1-2句话核心结论）
- 详细解释（引用数据+分析逻辑）
- 判断依据（如适用）`

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { reportId, questions } = body as CustomQuestionsRequest

    if (!reportId || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'Report ID and questions are required' },
        { status: 400 }
      )
    }

    // Fetch report and analysis data
    const reportResult = await sql`
      SELECT 
        c.name as company_name,
        c.symbol as company_symbol,
        c.category,
        fr.fiscal_year,
        fr.fiscal_quarter,
        fr.document_url,
        ar.analysis_content
      FROM financial_reports fr
      JOIN companies c ON fr.company_id = c.id
      LEFT JOIN analysis_results ar ON fr.id = ar.report_id
      WHERE fr.id = ${reportId}
    `

    if (reportResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    const report = reportResult.rows[0]

    if (!report.analysis_content) {
      return NextResponse.json(
        { error: 'Report not analyzed yet' },
        { status: 400 }
      )
    }

    // Generate answers for each question
    const answers = []

    for (const question of questions) {
      const response = await openrouter.chat({
        model: 'google/gemini-3-pro-preview',
        messages: [
          {
            role: 'system',
            content: CUSTOM_EXTRACTION_PROMPT
          },
          {
            role: 'user',
            content: `公司: ${report.company_name} (${report.company_symbol})
类别: ${report.category}
报告期: ${report.fiscal_quarter ? `Q${report.fiscal_quarter}` : 'FY'} ${report.fiscal_year}

财报分析数据:
${JSON.stringify(report.analysis_content, null, 2)}

用户问题: ${question}

请详细回答这个问题。`
          }
        ],
        temperature: 0.3
      })

      answers.push({
        question,
        answer: response.choices[0].message.content
      })
    }

    // Save custom Q&A
    const saveResult = await sql`
      INSERT INTO custom_questions (
        report_id,
        questions,
        answers,
        created_by
      )
      VALUES (
        ${reportId},
        ${JSON.stringify(questions)},
        ${JSON.stringify(answers)},
        ${(session.user as any).id}
      )
      RETURNING id
    `

    return NextResponse.json({
      success: true,
      qa_id: saveResult.rows[0].id,
      company: report.company_name,
      symbol: report.company_symbol,
      period: report.fiscal_quarter 
        ? `Q${report.fiscal_quarter} ${report.fiscal_year}`
        : `FY ${report.fiscal_year}`,
      answers
    })

  } catch (error: any) {
    console.error('Custom questions error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process questions' },
      { status: 500 }
    )
  }
}

// Get saved Q&A history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')
    const limit = parseInt(searchParams.get('limit') || '10')

    let query
    if (reportId) {
      query = sql`
        SELECT 
          cq.id,
          cq.report_id,
          cq.questions,
          cq.answers,
          cq.created_at,
          c.name as company_name,
          c.symbol as company_symbol,
          fr.fiscal_year,
          fr.fiscal_quarter
        FROM custom_questions cq
        JOIN financial_reports fr ON cq.report_id = fr.id
        JOIN companies c ON fr.company_id = c.id
        WHERE cq.report_id = ${parseInt(reportId)}
        ORDER BY cq.created_at DESC
        LIMIT ${limit}
      `
    } else {
      query = sql`
        SELECT 
          cq.id,
          cq.report_id,
          cq.questions,
          cq.answers,
          cq.created_at,
          c.name as company_name,
          c.symbol as company_symbol,
          fr.fiscal_year,
          fr.fiscal_quarter
        FROM custom_questions cq
        JOIN financial_reports fr ON cq.report_id = fr.id
        JOIN companies c ON fr.company_id = c.id
        ORDER BY cq.created_at DESC
        LIMIT ${limit}
      `
    }

    const result = await query

    return NextResponse.json({ qas: result.rows })
  } catch (error: any) {
    console.error('Get Q&A error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Q&A' },
      { status: 500 }
    )
  }
}
