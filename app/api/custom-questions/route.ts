import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { openrouter } from '@/lib/openrouter'
import { kv } from '@vercel/kv'
import { CUSTOM_EXTRACTION_PROMPT, EVALUATION_SYSTEM_PROMPT } from '@/lib/ai/prompts'

/**
 * Custom Questions Extraction API
 * Extract specific information based on user-defined questions
 */

export const runtime = 'nodejs'
export const maxDuration = 180

interface CustomQuestionsRequest {
  companySymbol: string
  companyName: string
  category: 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN'
  questions: string[]
  evaluationCategory?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companySymbol, companyName, category, questions, evaluationCategory } = body as CustomQuestionsRequest

    if (!companySymbol || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: '请选择公司并输入问题' },
        { status: 400 }
      )
    }

    // 尝试获取该公司的最新分析数据
    const companyKey = `company:${companySymbol}`
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

    // 选择合适的系统提示
    const systemPrompt = evaluationCategory 
      ? EVALUATION_SYSTEM_PROMPT 
      : CUSTOM_EXTRACTION_PROMPT

    const categoryName = category === 'AI_APPLICATION' ? 'AI应用公司' : 'AI供应链公司'

    // 为每个问题生成答案
    const answers = []

    for (const question of questions) {
      const userContent = latestAnalysis
        ? `公司: ${companyName} (${companySymbol})
类别: ${categoryName}
报告期: ${latestReport?.fiscalQuarter ? `Q${latestReport.fiscalQuarter} ${latestReport.fiscalYear}` : latestReport?.fiscalYear || '最新'}

财报分析数据:
${JSON.stringify(latestAnalysis, null, 2)}

用户问题: ${question}

请详细回答这个问题，引用具体数据和指标。`
        : `公司: ${companyName} (${companySymbol})
类别: ${categoryName}

注意: 该公司尚无已分析的财报数据，请基于公开市场信息和行业知识回答。

用户问题: ${question}

请基于公开信息尽可能详细地回答这个问题。`

      const response = await openrouter.chat({
        model: 'google/gemini-2.5-flash-preview',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userContent
          }
        ],
        temperature: 0.3
      })

      answers.push({
        question,
        answer: response.choices[0].message.content
      })
    }

    // 保存问答记录到KV
    const qaId = `customq:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`
    const qaData = {
      id: qaId,
      companySymbol,
      company_name: companyName,
      category,
      questions,
      answers,
      evaluationCategory,
      created_at: new Date().toISOString(),
      created_by: (session.user as any)?.id || 'anonymous'
    }
    
    await kv.set(qaId, qaData)
    
    // 添加到问答历史索引
    const qaIds = await kv.get<string[]>('customquestions:all') || []
    qaIds.push(qaId)
    await kv.set('customquestions:all', qaIds)

    return NextResponse.json({
      success: true,
      qa_id: qaId,
      company: companyName,
      symbol: companySymbol,
      category,
      answers
    })

  } catch (error: any) {
    console.error('Custom questions error:', error)
    return NextResponse.json(
      { error: error.message || '问题处理失败' },
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
    const companySymbol = searchParams.get('companySymbol')
    const limit = parseInt(searchParams.get('limit') || '10')

    // 从KV获取问答历史
    const qaIds = await kv.get<string[]>('customquestions:all') || []
    const recentIds = qaIds.slice(-limit).reverse()
    
    let qas = await Promise.all(
      recentIds.map(id => kv.get<any>(id))
    )
    
    qas = qas.filter(Boolean)
    
    // 如果指定了公司，过滤
    if (companySymbol) {
      qas = qas.filter(qa => qa.companySymbol === companySymbol)
    }

    return NextResponse.json({ qas })
  } catch (error: any) {
    console.error('Get Q&A error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Q&A' },
      { status: 500 }
    )
  }
}
