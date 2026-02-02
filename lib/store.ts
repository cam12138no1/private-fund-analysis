// In-memory storage for demo mode (when no database is configured)
// This store persists across API requests in the same server instance

import { AnalysisResult, ResultsTableRow, DriverDetail } from './ai/analyzer'

export interface StoredAnalysis {
  id: string
  company_name: string
  company_symbol: string
  report_type: string
  fiscal_year: number
  fiscal_quarter?: number
  filing_date: string
  created_at: string
  processed: boolean
  processing?: boolean  // 正在处理中
  error?: string        // 处理错误
  
  // 完整分析结果
  one_line_conclusion?: string
  results_summary?: string
  results_table?: ResultsTableRow[]
  results_explanation?: string
  drivers_summary?: string
  drivers?: {
    demand: DriverDetail
    monetization: DriverDetail
    efficiency: DriverDetail
  }
  investment_roi?: {
    capex_change: string
    opex_change: string
    investment_direction: string
    roi_evidence: string[]
    management_commitment: string
  }
  sustainability_risks?: {
    sustainable_drivers: string[]
    main_risks: string[]
    checkpoints: string[]
  }
  model_impact?: {
    revenue_adjustment: string
    capex_adjustment: string
    valuation_change: string
    logic_chain: string
  }
  final_judgment?: {
    confidence: string
    concerns: string
    net_impact: string
    recommendation: string
  }
}

class AnalysisStore {
  private analyses: Map<string, StoredAnalysis> = new Map()
  private counter: number = 0

  add(analysis: Omit<StoredAnalysis, 'id'>): StoredAnalysis {
    this.counter++
    const id = `analysis_${this.counter}_${Date.now()}`
    const storedAnalysis: StoredAnalysis = { id, ...analysis }
    this.analyses.set(id, storedAnalysis)
    return storedAnalysis
  }

  // 更新已存在的分析
  update(id: string, updates: Partial<StoredAnalysis>): StoredAnalysis | undefined {
    const existing = this.analyses.get(id)
    if (!existing) return undefined
    const updated = { ...existing, ...updates }
    this.analyses.set(id, updated)
    return updated
  }

  get(id: string): StoredAnalysis | undefined {
    return this.analyses.get(id)
  }

  getAll(): StoredAnalysis[] {
    return Array.from(this.analyses.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  // 获取处理中的数量
  getProcessingCount(): number {
    return Array.from(this.analyses.values()).filter(a => a.processing).length
  }

  getByCompany(symbol: string): StoredAnalysis[] {
    return this.getAll().filter(a => a.company_symbol === symbol)
  }

  clear(): void {
    this.analyses.clear()
    this.counter = 0
  }

  get size(): number {
    return this.analyses.size
  }
}

// Singleton instance
export const analysisStore = new AnalysisStore()
