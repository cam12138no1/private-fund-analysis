import { openrouter } from '../openrouter'
import { getCompanyCategory, AI_APPLICATION_PROMPT, AI_SUPPLY_CHAIN_PROMPT, COMPANY_CATEGORIES } from './prompts'

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
  // Optional category override from user selection
  category?: 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN' | null
}

// Results table row structure
export interface ResultsTableRow {
  metric: string           // 指标名称
  actual: string           // 实际值
  consensus: string        // 市场预期
  delta: string            // 差异
  assessment: string       // 评估 (Beat/Miss/Inline)
}

// Driver detail structure
export interface DriverDetail {
  category: string         // A/B/C 分类
  title: string            // 标题
  change: string           // 变化描述
  magnitude: string        // 幅度
  reason: string           // 原因分析
}

// Complete analysis result
export interface AnalysisResult {
  // 0) 一句话结论
  one_line_conclusion: string
  
  // 1) 结果层 - 表格形式
  results_summary: string  // 业绩概要
  results_table: ResultsTableRow[]
  results_explanation: string  // 关键解释
  
  // 2) 驱动层
  drivers_summary: string  // 驱动概要
  drivers: {
    demand: DriverDetail      // A. 需求/量
    monetization: DriverDetail // B. 变现/单价
    efficiency: DriverDetail   // C. 内部效率
  }
  
  // 3) 投入与ROI
  investment_roi: {
    capex_change: string       // CapEx变化
    opex_change: string        // Opex变化
    investment_direction: string // 投入方向
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
    confidence: string          // 更有信心的点
    concerns: string            // 更担心的点
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

// JSON输出格式系统提示 - 中文版
const JSON_OUTPUT_INSTRUCTION = `

请严格按照以下JSON格式输出分析结果，所有内容必须使用中文：

{
  "one_line_conclusion": "一句话结论：Beat/Miss + 最关键驱动 + 最大风险",
  
  "results_summary": "结果层概要",
  
  "results_table": [
    {"metric": "营收 (Revenue)", "actual": "$XXB", "consensus": "~$XXB", "delta": "+X%", "assessment": "超预期/不及预期/符合预期 (原因)"},
    {"metric": "每股收益 (EPS)", "actual": "$X.XX", "consensus": "~$X.XX", "delta": "+X%", "assessment": "超预期/不及预期/符合预期"},
    {"metric": "营业利润 (Operating Income)", "actual": "$XXB", "consensus": "~$XXB", "delta": "+X%", "assessment": "超预期/不及预期/符合预期"},
    {"metric": "毛利率 (Gross Margin)", "actual": "XX%", "consensus": "~XX%", "delta": "+Xbps", "assessment": "改善/恶化"},
    {"metric": "营业利润率 (Operating Margin)", "actual": "XX%", "consensus": "~XX%", "delta": "+Xbps", "assessment": "改善/恶化"},
    {"metric": "指引 (下季度/全年)", "actual": "$XX-XXB", "consensus": "~$XXB", "delta": "+X%", "assessment": "大幅超预期/不及预期"}
  ],
  
  "results_explanation": "关键解释：营收超预期主要由...驱动；差异主要来自...",
  
  "drivers_summary": "驱动层概要",
  
  "drivers": {
    "demand": {
      "category": "A",
      "title": "需求/量",
      "change": "具体变化描述（指标 + 方向 + 幅度）",
      "magnitude": "幅度（如 +X% YoY）",
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
    "capex_change": "资本支出变化描述",
    "opex_change": "运营支出变化描述",
    "investment_direction": "投入方向：算力/人才/渠道/供应链/并购",
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
    "capex_adjustment": "资本支出假设调整",
    "valuation_change": "估值变化",
    "logic_chain": "逻辑链：财报信号 → 假设变化 → 估值变化"
  },
  
  "final_judgment": {
    "confidence": "我们更有信心的点...",
    "concerns": "我们更担心的点...",
    "net_impact": "更强/更弱/不变",
    "recommendation": "投资建议"
  }
}

重要要求：
1. results_table必须包含至少5-7行关键指标
2. 每个字段都必须填写完整内容，不能留空
3. 所有数字必须是具体的，不能用占位符
4. 必须严格遵循JSON格式
5. 所有分析内容必须使用中文输出`

export async function analyzeFinancialReport(
  reportText: string,
  metadata: ReportMetadata
): Promise<AnalysisResult> {
  // Determine company category - use override if provided, otherwise auto-detect
  let companyInfo: {
    category: 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN' | 'UNKNOWN'
    categoryName: string
    categoryNameEn: string
    prompt: string
    company?: {
      symbol: string
      name: string
      nameZh: string
    }
  }
  
  if (metadata.category && (metadata.category === 'AI_APPLICATION' || metadata.category === 'AI_SUPPLY_CHAIN')) {
    // Use the user-selected category
    const categoryConfig = COMPANY_CATEGORIES[metadata.category]
    companyInfo = {
      category: metadata.category,
      categoryName: categoryConfig.name,
      categoryNameEn: categoryConfig.nameEn,
      prompt: categoryConfig.prompt,
    }
    console.log(`使用用户选择的分类: ${metadata.category}`)
  } else {
    // Auto-detect based on company symbol/name
    companyInfo = getCompanyCategory(metadata.symbol || metadata.company)
  }
  
  console.log(`正在分析 ${metadata.company} (${metadata.symbol})，分类为 ${companyInfo.categoryName}`)
  
  // Build complete system prompt
  const systemPrompt = companyInfo.prompt + JSON_OUTPUT_INSTRUCTION
  
  const response = await openrouter.chat({
    model: 'google/gemini-3-pro-preview',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `公司：${metadata.company} (${metadata.symbol})
报告期：${metadata.period}
公司分类：${companyInfo.categoryName}
市场预期：${JSON.stringify(metadata.consensus || {}, null, 2)}

财报内容：
${reportText}

请严格按JSON格式输出完整分析，确保每个字段都有详细内容。results_table必须包含5-7行关键财务指标对比。所有内容使用中文。`,
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
    max_tokens: 8000,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('AI分析返回空结果')
  }

  try {
    const result = JSON.parse(content) as AnalysisResult
    
    // Add metadata
    result.metadata = {
      company_category: companyInfo.categoryName,
      analysis_timestamp: new Date().toISOString(),
      prompt_version: '2.0-zh',
    }
    
    return result
  } catch (parseError) {
    console.error('解析AI响应失败:', parseError)
    console.error('原始响应:', content)
    throw new Error('解析AI分析结果失败')
  }
}
