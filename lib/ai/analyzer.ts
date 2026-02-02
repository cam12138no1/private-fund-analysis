import { openrouter } from '../openrouter'

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
}

const ANALYSIS_PROMPT = `角色与目标
你是一名顶级美股/科技股研究分析师（sell-side 写作风格），要产出一份可给投委会/董事会阅读的财报分析。你的目标不是复述财报，而是回答：
"本次财报是否改变了我们对未来 2–3 年现金流与竞争力的判断？"

重要说明：年报(10-K)通常与Q4合并发布，请正确识别报告期类型。

输出格式（必须严格按此JSON结构，每个字段都必须填写完整内容）

请返回以下JSON格式的完整分析：

{
  "one_line_conclusion": "一句话结论：Beat/Miss + 最关键驱动 + 最大风险。例：核心收入/指引超预期，增长由{驱动A}+{驱动B}带动；但{风险点}可能在未来{时间窗口}压制利润/FCF。",
  
  "results_summary": "结果层概述，如：业绩强劲，指引炸裂，CapEx震惊市场。",
  
  "results_table": [
    {"metric": "Revenue", "actual": "$59.89B", "consensus": "~$58.45B", "delta": "+2.5%", "assessment": "Beat (广告需求强劲)"},
    {"metric": "EPS (Diluted)", "actual": "$8.88", "consensus": "~$8.20", "delta": "+8.3%", "assessment": "Beat (运营杠杆显现)"},
    {"metric": "Operating Income", "actual": "$24.75B", "consensus": "~$23.5B", "delta": "+5.3%", "assessment": "Beat (核心业务利润率稳健)"},
    {"metric": "Reality Labs OI", "actual": "$(6.02)B", "consensus": "~$(5.67)B", "delta": "-6.2%", "assessment": "Miss (亏损幅度大于预期)"},
    {"metric": "Q1 '26 指引", "actual": "$53.5-56.5B", "consensus": "~$51.3B", "delta": "+7%", "assessment": "Strong Beat (增长加速信号)"},
    {"metric": "FY '26 CapEx", "actual": "$115-135B", "consensus": "~$110B", "delta": "+13.6%", "assessment": "Shock (远超预期)"}
  ],
  
  "results_explanation": "关键解释：收入超预期源于...；CapEx激增因为...",
  
  "drivers_summary": "驱动概述，如：增长逻辑已从'用户红利'完全切换为'AI提效'",
  
  "drivers": {
    "demand": {
      "category": "A",
      "title": "需求/量：用户/使用量/订单量",
      "change": "变化描述，如：DAP达3.58亿，同比增长+6.9%",
      "magnitude": "幅度，如：+6.9% YoY",
      "reason": "原因，如：推荐算法优化使用户停留时间延长"
    },
    "monetization": {
      "category": "B",
      "title": "变现/单价：ARPU/价格/转化率",
      "change": "变化描述",
      "magnitude": "幅度",
      "reason": "原因"
    },
    "efficiency": {
      "category": "C",
      "title": "内部效率：人效/算力效率/成本",
      "change": "变化描述",
      "magnitude": "幅度",
      "reason": "原因"
    }
  },
  
  "investment_roi": {
    "capex_change": "CapEx变化描述，如：FY2025达$72.2B，FY2026指引跳涨至$115-135B",
    "opex_change": "Opex变化描述",
    "investment_direction": "投入指向：算力/人才/渠道/供应链/并购",
    "roi_evidence": ["ROI证据1", "ROI证据2", "ROI证据3"],
    "management_commitment": "管理层底线承诺，如：2026年OI将高于2025年"
  },
  
  "sustainability_risks": {
    "sustainable_drivers": ["可持续驱动1", "可持续驱动2", "可持续驱动3"],
    "main_risks": ["主要风险1：描述", "主要风险2：描述", "主要风险3：描述"],
    "checkpoints": ["检查点1：下一季度需关注...", "检查点2", "检查点3"]
  },
  
  "model_impact": {
    "revenue_adjustment": "收入假设调整，如：将FY2026收入增速从15%上调至18-20%",
    "capex_adjustment": "CapEx假设调整",
    "valuation_change": "估值变化，如：下调FCF权重，上调EPS权重",
    "logic_chain": "逻辑链：财报信号 → 假设变化 → 估值变化"
  },
  
  "final_judgment": {
    "confidence": "我们更有信心的是...",
    "concerns": "我们更担心的是...",
    "net_impact": "更强/更弱/不变",
    "recommendation": "建议：如在回调时买入..."
  }
}

写作风格约束（强制）
- 必须 vs 预期（没有预期就用"隐含预期/历史区间"替代）
- 必须把 AI/技术从"故事"落到 指标→机制→财务变量
- 必须识别并剥离 一次性因素（罚款、诉讼、重组、资产减值等）
- 不允许空泛形容词（"强劲""亮眼"）不带指标
- results_table必须包含至少5-7行关键指标`

export async function analyzeFinancialReport(
  reportText: string,
  metadata: ReportMetadata
): Promise<AnalysisResult> {
  const response = await openrouter.chat({
    model: 'google/gemini-3-pro-preview',
    messages: [
      {
        role: 'system',
        content: ANALYSIS_PROMPT,
      },
      {
        role: 'user',
        content: `公司: ${metadata.company} (${metadata.symbol})
报告期: ${metadata.period}
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
  return JSON.parse(content)
}
