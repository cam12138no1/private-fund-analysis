import { openrouter } from '../openrouter'
import { getCompanyCategory, AI_APPLICATION_PROMPT, AI_SUPPLY_CHAIN_PROMPT } from './prompts'

export interface ReportMetadata {
  company: string
  symbol: string
  period: string
  fiscalYear: number
  fiscalQuarter?: number
  consensus?: {
    revenue?: number
    eps?: number
    operatingIncome?: number
  }
}

// 结果层表格数据结构
export interface ResultsTableRow {
  metric: string           // 指标名称
  actual: string           // 实际值
  consensus: string        // 市场预期
  delta: string            // 差异
  assessment: string       // 评价 (Beat/Miss/Inline)
}

// 驱动层详细数据
export interface DriverDetail {
  category: string         // A/B/C 类别
  title: string            // 标题
  change: string           // 变化描述
  magnitude: string        // 幅度
  reason: string           // 原因分析
}

// 完整分析结果
export interface AnalysisResult {
  // 0) 一句话结论
  one_line_conclusion: string
  
  // 1) 结果层 - 表格化
  results_summary: string  // 业绩概述
  results_table: ResultsTableRow[]
  results_explanation: string  // 关键解释
  
  // 2) 驱动层
  drivers_summary: string  // 驱动概述
  drivers: {
    demand: DriverDetail      // A. 需求/量
    monetization: DriverDetail // B. 变现/单价
    efficiency: DriverDetail   // C. 内部效率
  }
  
  // 3) 投入与ROI
  investment_roi: {
    capex_change: string       // CapEx变化
    opex_change: string        // Opex变化
    investment_direction: string // 投入指向
    roi_evidence: string[]     // ROI证据列表
    management_commitment: string // 管理层承诺
  }
  
  // 4) 可持续性与风险
  sustainability_risks: {
    sustainable_drivers: string[]
    main_risks: string[]
    checkpoints: string[]
  }
  
  // 5) 模型影响
  model_impact: {
    revenue_adjustment: string   // 收入假设调整
    capex_adjustment: string     // CapEx假设调整
    valuation_change: string     // 估值变化
    logic_chain: string          // 逻辑链
  }
  
  // 6) 投委会判断
  final_judgment: {
    confidence: string          // 更有信心的
    concerns: string            // 更担心的
    net_impact: string          // 净影响 (更强/更弱/不变)
    recommendation: string      // 建议
  }
  
  // 元数据
  metadata?: {
    company_category: string
    analysis_timestamp: string
    prompt_version: string
  }
}

// JSON输出格式的系统提示
const JSON_OUTPUT_INSTRUCTION = `

请严格按照以下JSON格式输出分析结果：

{
  "one_line_conclusion": "一句话结论：Beat/Miss + 最关键驱动 + 最大风险",
  
  "results_summary": "结果层概述",
  
  "results_table": [
    {"metric": "Revenue", "actual": "$XXB", "consensus": "~$XXB", "delta": "+X%", "assessment": "Beat/Miss/Inline (原因)"},
    {"metric": "EPS (Diluted)", "actual": "$X.XX", "consensus": "~$X.XX", "delta": "+X%", "assessment": "Beat/Miss/Inline"},
    {"metric": "Operating Income", "actual": "$XXB", "consensus": "~$XXB", "delta": "+X%", "assessment": "Beat/Miss/Inline"},
    {"metric": "Gross Margin", "actual": "XX%", "consensus": "~XX%", "delta": "+Xbps", "assessment": "改善/恶化"},
    {"metric": "Operating Margin", "actual": "XX%", "consensus": "~XX%", "delta": "+Xbps", "assessment": "改善/恶化"},
    {"metric": "指引 (下季度/全年)", "actual": "$XX-XXB", "consensus": "~$XXB", "delta": "+X%", "assessment": "Strong Beat/Miss"}
  ],
  
  "results_explanation": "关键解释：收入超预期源于...；差异主要来自...",
  
  "drivers_summary": "驱动概述",
  
  "drivers": {
    "demand": {
      "category": "A",
      "title": "需求/量",
      "change": "具体变化描述（指标+方向+幅度）",
      "magnitude": "幅度（如+X% YoY）",
      "reason": "原因分析（产品/算法/渠道/供给/组织）"
    },
    "monetization": {
      "category": "B",
      "title": "变现/单价",
      "change": "具体变化描述",
      "magnitude": "幅度",
      "reason": "原因分析"
    },
    "efficiency": {
      "category": "C",
      "title": "内部效率",
      "change": "具体变化描述",
      "magnitude": "幅度",
      "reason": "原因分析"
    }
  },
  
  "investment_roi": {
    "capex_change": "CapEx变化描述",
    "opex_change": "Opex变化描述",
    "investment_direction": "投入指向：算力/人才/渠道/供应链/并购",
    "roi_evidence": ["ROI证据1", "ROI证据2", "ROI证据3"],
    "management_commitment": "管理层底线承诺"
  },
  
  "sustainability_risks": {
    "sustainable_drivers": ["可持续驱动1", "可持续驱动2", "可持续驱动3"],
    "main_risks": ["主要风险1：描述", "主要风险2：描述", "主要风险3：描述"],
    "checkpoints": ["检查点1", "检查点2", "检查点3"]
  },
  
  "model_impact": {
    "revenue_adjustment": "收入假设调整",
    "capex_adjustment": "CapEx假设调整",
    "valuation_change": "估值变化",
    "logic_chain": "逻辑链：财报信号 → 假设变化 → 估值变化"
  },
  
  "final_judgment": {
    "confidence": "我们更有信心的是...",
    "concerns": "我们更担心的是...",
    "net_impact": "更强/更弱/不变",
    "recommendation": "建议"
  }
}

重要要求：
1. results_table必须包含至少5-7行关键指标
2. 每个字段都必须填写完整内容，不能留空
3. 所有数字必须具体，不能用占位符
4. 必须严格遵循JSON格式`

export async function analyzeFinancialReport(
  reportText: string,
  metadata: ReportMetadata
): Promise<AnalysisResult> {
  // 确定公司类别并获取对应的Prompt
  const companyInfo = getCompanyCategory(metadata.symbol || metadata.company)
  console.log(`Analyzing ${metadata.company} (${metadata.symbol}) as ${companyInfo.categoryName}`)
  
  // 构建完整的系统Prompt
  const systemPrompt = companyInfo.prompt + JSON_OUTPUT_INSTRUCTION
  
  const response = await openrouter.chat({
    model: 'google/gemini-2.5-flash-preview',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `公司: ${metadata.company} (${metadata.symbol})
报告期: ${metadata.period}
公司类别: ${companyInfo.categoryName}
市场预期基准: ${JSON.stringify(metadata.consensus || {}, null, 2)}

财报内容:
${reportText}

请严格按照JSON格式输出完整分析，确保每个字段都有详细内容。results_table必须包含5-7行关键财务指标对比。`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'financial_analysis',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            one_line_conclusion: { type: 'string' },
            results_summary: { type: 'string' },
            results_table: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  metric: { type: 'string' },
                  actual: { type: 'string' },
                  consensus: { type: 'string' },
                  delta: { type: 'string' },
                  assessment: { type: 'string' },
                },
                required: ['metric', 'actual', 'consensus', 'delta', 'assessment'],
              },
            },
            results_explanation: { type: 'string' },
            drivers_summary: { type: 'string' },
            drivers: {
              type: 'object',
              properties: {
                demand: {
                  type: 'object',
                  properties: {
                    category: { type: 'string' },
                    title: { type: 'string' },
                    change: { type: 'string' },
                    magnitude: { type: 'string' },
                    reason: { type: 'string' },
                  },
                  required: ['category', 'title', 'change', 'magnitude', 'reason'],
                },
                monetization: {
                  type: 'object',
                  properties: {
                    category: { type: 'string' },
                    title: { type: 'string' },
                    change: { type: 'string' },
                    magnitude: { type: 'string' },
                    reason: { type: 'string' },
                  },
                  required: ['category', 'title', 'change', 'magnitude', 'reason'],
                },
                efficiency: {
                  type: 'object',
                  properties: {
                    category: { type: 'string' },
                    title: { type: 'string' },
                    change: { type: 'string' },
                    magnitude: { type: 'string' },
                    reason: { type: 'string' },
                  },
                  required: ['category', 'title', 'change', 'magnitude', 'reason'],
                },
              },
              required: ['demand', 'monetization', 'efficiency'],
            },
            investment_roi: {
              type: 'object',
              properties: {
                capex_change: { type: 'string' },
                opex_change: { type: 'string' },
                investment_direction: { type: 'string' },
                roi_evidence: {
                  type: 'array',
                  items: { type: 'string' },
                },
                management_commitment: { type: 'string' },
              },
              required: ['capex_change', 'opex_change', 'investment_direction', 'roi_evidence', 'management_commitment'],
            },
            sustainability_risks: {
              type: 'object',
              properties: {
                sustainable_drivers: {
                  type: 'array',
                  items: { type: 'string' },
                },
                main_risks: {
                  type: 'array',
                  items: { type: 'string' },
                },
                checkpoints: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['sustainable_drivers', 'main_risks', 'checkpoints'],
            },
            model_impact: {
              type: 'object',
              properties: {
                revenue_adjustment: { type: 'string' },
                capex_adjustment: { type: 'string' },
                valuation_change: { type: 'string' },
                logic_chain: { type: 'string' },
              },
              required: ['revenue_adjustment', 'capex_adjustment', 'valuation_change', 'logic_chain'],
            },
            final_judgment: {
              type: 'object',
              properties: {
                confidence: { type: 'string' },
                concerns: { type: 'string' },
                net_impact: { type: 'string' },
                recommendation: { type: 'string' },
              },
              required: ['confidence', 'concerns', 'net_impact', 'recommendation'],
            },
          },
          required: [
            'one_line_conclusion',
            'results_summary',
            'results_table',
            'results_explanation',
            'drivers_summary',
            'drivers',
            'investment_roi',
            'sustainability_risks',
            'model_impact',
            'final_judgment',
          ],
        },
      },
    },
    temperature: 0.3,
  })

  const content = response.choices[0].message.content
  const result = JSON.parse(content)
  
  // 添加元数据
  result.metadata = {
    company_category: companyInfo.category,
    analysis_timestamp: new Date().toISOString(),
    prompt_version: '2.0'
  }
  
  return result
}

// 批量分析多个财报（用于横向对比）
export async function analyzeMultipleReports(
  reports: Array<{ text: string; metadata: ReportMetadata }>
): Promise<AnalysisResult[]> {
  const results = await Promise.all(
    reports.map(report => analyzeFinancialReport(report.text, report.metadata))
  )
  return results
}
