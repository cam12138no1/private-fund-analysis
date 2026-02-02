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
  metric: string           // Metric name
  actual: string           // Actual value
  consensus: string        // Market expectation
  delta: string            // Difference
  assessment: string       // Assessment (Beat/Miss/Inline)
}

// Driver detail structure
export interface DriverDetail {
  category: string         // A/B/C category
  title: string            // Title
  change: string           // Change description
  magnitude: string        // Magnitude
  reason: string           // Reason analysis
}

// Complete analysis result
export interface AnalysisResult {
  // 0) One-line conclusion
  one_line_conclusion: string
  
  // 1) Results layer - tabular
  results_summary: string  // Performance summary
  results_table: ResultsTableRow[]
  results_explanation: string  // Key explanation
  
  // 2) Driver layer
  drivers_summary: string  // Driver summary
  drivers: {
    demand: DriverDetail      // A. Demand/Volume
    monetization: DriverDetail // B. Monetization/Pricing
    efficiency: DriverDetail   // C. Internal efficiency
  }
  
  // 3) Investment & ROI
  investment_roi: {
    capex_change: string       // CapEx change
    opex_change: string        // Opex change
    investment_direction: string // Investment direction
    roi_evidence: string[]     // ROI evidence list
    management_commitment: string // Management commitment
  }
  
  // 4) Sustainability & Risks
  sustainability_risks: {
    sustainable_drivers: string[]
    main_risks: string[]
    checkpoints: string[]
  }
  
  // 5) Model Impact
  model_impact: {
    revenue_adjustment: string   // Revenue assumption adjustment
    capex_adjustment: string     // CapEx assumption adjustment
    valuation_change: string     // Valuation change
    logic_chain: string          // Logic chain
  }
  
  // 6) Investment Committee Judgment
  final_judgment: {
    confidence: string          // More confident about
    concerns: string            // More concerned about
    net_impact: string          // Net impact (Stronger/Weaker/Unchanged)
    recommendation: string      // Recommendation
  }
  
  // Metadata
  metadata?: {
    company_category: string
    analysis_timestamp: string
    prompt_version: string
  }
}

// JSON output format system prompt
const JSON_OUTPUT_INSTRUCTION = `

Please strictly output the analysis results in the following JSON format:

{
  "one_line_conclusion": "One-line conclusion: Beat/Miss + key driver + main risk",
  
  "results_summary": "Results layer summary",
  
  "results_table": [
    {"metric": "Revenue", "actual": "$XXB", "consensus": "~$XXB", "delta": "+X%", "assessment": "Beat/Miss/Inline (reason)"},
    {"metric": "EPS (Diluted)", "actual": "$X.XX", "consensus": "~$X.XX", "delta": "+X%", "assessment": "Beat/Miss/Inline"},
    {"metric": "Operating Income", "actual": "$XXB", "consensus": "~$XXB", "delta": "+X%", "assessment": "Beat/Miss/Inline"},
    {"metric": "Gross Margin", "actual": "XX%", "consensus": "~XX%", "delta": "+Xbps", "assessment": "Improved/Deteriorated"},
    {"metric": "Operating Margin", "actual": "XX%", "consensus": "~XX%", "delta": "+Xbps", "assessment": "Improved/Deteriorated"},
    {"metric": "Guidance (Next Q/FY)", "actual": "$XX-XXB", "consensus": "~$XXB", "delta": "+X%", "assessment": "Strong Beat/Miss"}
  ],
  
  "results_explanation": "Key explanation: Revenue beat driven by...; Variance mainly from...",
  
  "drivers_summary": "Driver summary",
  
  "drivers": {
    "demand": {
      "category": "A",
      "title": "Demand/Volume",
      "change": "Specific change description (metric + direction + magnitude)",
      "magnitude": "Magnitude (e.g., +X% YoY)",
      "reason": "Reason analysis (product/algorithm/channel/supply/organization)"
    },
    "monetization": {
      "category": "B",
      "title": "Monetization/Pricing",
      "change": "Specific change description",
      "magnitude": "Magnitude",
      "reason": "Reason analysis"
    },
    "efficiency": {
      "category": "C",
      "title": "Internal Efficiency",
      "change": "Specific change description",
      "magnitude": "Magnitude",
      "reason": "Reason analysis"
    }
  },
  
  "investment_roi": {
    "capex_change": "CapEx change description",
    "opex_change": "Opex change description",
    "investment_direction": "Investment direction: compute/talent/channel/supply chain/M&A",
    "roi_evidence": ["ROI evidence 1", "ROI evidence 2", "ROI evidence 3"],
    "management_commitment": "Management bottom-line commitment"
  },
  
  "sustainability_risks": {
    "sustainable_drivers": ["Sustainable driver 1", "Sustainable driver 2", "Sustainable driver 3"],
    "main_risks": ["Main risk 1: description", "Main risk 2: description", "Main risk 3: description"],
    "checkpoints": ["Checkpoint 1", "Checkpoint 2", "Checkpoint 3"]
  },
  
  "model_impact": {
    "revenue_adjustment": "Revenue assumption adjustment",
    "capex_adjustment": "CapEx assumption adjustment",
    "valuation_change": "Valuation change",
    "logic_chain": "Logic chain: Earnings signal → Assumption change → Valuation change"
  },
  
  "final_judgment": {
    "confidence": "We are more confident about...",
    "concerns": "We are more concerned about...",
    "net_impact": "Stronger/Weaker/Unchanged",
    "recommendation": "Recommendation"
  }
}

Important requirements:
1. results_table must contain at least 5-7 rows of key metrics
2. Every field must be filled with complete content, cannot be left empty
3. All numbers must be specific, no placeholders
4. Must strictly follow JSON format`

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
    console.log(`Using user-selected category: ${metadata.category}`)
  } else {
    // Auto-detect based on company symbol/name
    companyInfo = getCompanyCategory(metadata.symbol || metadata.company)
  }
  
  console.log(`Analyzing ${metadata.company} (${metadata.symbol}) as ${companyInfo.categoryName}`)
  
  // Build complete system prompt
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
        content: `Company: ${metadata.company} (${metadata.symbol})
Report Period: ${metadata.period}
Company Category: ${companyInfo.categoryNameEn}
Market Consensus: ${JSON.stringify(metadata.consensus || {}, null, 2)}

Financial Report Content:
${reportText}

Please strictly output complete analysis in JSON format, ensuring every field has detailed content. results_table must contain 5-7 rows of key financial metrics comparison.`,
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
  
  // Add metadata
  result.metadata = {
    company_category: companyInfo.category,
    analysis_timestamp: new Date().toISOString(),
    prompt_version: '2.0'
  }
  
  return result
}

// Batch analyze multiple reports (for comparison)
export async function analyzeMultipleReports(
  reports: Array<{ text: string; metadata: ReportMetadata }>
): Promise<AnalysisResult[]> {
  const results = await Promise.all(
    reports.map(report => analyzeFinancialReport(report.text, report.metadata))
  )
  return results
}
