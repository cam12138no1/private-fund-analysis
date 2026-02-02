// Hybrid storage: Uses Vercel KV when available, falls back to in-memory for development
// This ensures data persists across serverless function invocations

import { kv } from '@vercel/kv'
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
  processing?: boolean
  error?: string
  
  // Complete analysis results
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
  metadata?: {
    company_category: string
    analysis_timestamp: string
    prompt_version: string
  }
}

const ANALYSES_KEY = 'financial_analyses'
const COUNTER_KEY = 'analysis_counter'

// Check if KV is available
function isKVAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

class AnalysisStore {
  private memoryStore: Map<string, StoredAnalysis> = new Map()
  private memoryCounter: number = 0
  private useKV: boolean

  constructor() {
    this.useKV = isKVAvailable()
    console.log(`AnalysisStore initialized. Using KV: ${this.useKV}`)
  }

  async add(analysis: Omit<StoredAnalysis, 'id'>): Promise<StoredAnalysis> {
    if (this.useKV) {
      try {
        // Get and increment counter
        let counter = await kv.get<number>(COUNTER_KEY) || 0
        counter++
        await kv.set(COUNTER_KEY, counter)
        
        const id = `analysis_${counter}_${Date.now()}`
        const storedAnalysis: StoredAnalysis = { id, ...analysis }
        
        // Get existing analyses
        const analyses = await kv.get<Record<string, StoredAnalysis>>(ANALYSES_KEY) || {}
        analyses[id] = storedAnalysis
        await kv.set(ANALYSES_KEY, analyses)
        
        console.log(`[KV] Added analysis: ${id}`)
        return storedAnalysis
      } catch (error) {
        console.error('[KV] Error adding analysis, falling back to memory:', error)
        // Fall back to memory
      }
    }
    
    // Memory fallback
    this.memoryCounter++
    const id = `analysis_${this.memoryCounter}_${Date.now()}`
    const storedAnalysis: StoredAnalysis = { id, ...analysis }
    this.memoryStore.set(id, storedAnalysis)
    console.log(`[Memory] Added analysis: ${id}`)
    return storedAnalysis
  }

  async update(id: string, updates: Partial<StoredAnalysis>): Promise<StoredAnalysis | undefined> {
    if (this.useKV) {
      try {
        const analyses = await kv.get<Record<string, StoredAnalysis>>(ANALYSES_KEY) || {}
        const existing = analyses[id]
        if (!existing) {
          console.log(`[KV] Analysis not found for update: ${id}`)
          return undefined
        }
        
        const updated = { ...existing, ...updates }
        analyses[id] = updated
        await kv.set(ANALYSES_KEY, analyses)
        
        console.log(`[KV] Updated analysis: ${id}`)
        return updated
      } catch (error) {
        console.error('[KV] Error updating analysis:', error)
      }
    }
    
    // Memory fallback
    const existing = this.memoryStore.get(id)
    if (!existing) return undefined
    const updated = { ...existing, ...updates }
    this.memoryStore.set(id, updated)
    console.log(`[Memory] Updated analysis: ${id}`)
    return updated
  }

  async get(id: string): Promise<StoredAnalysis | undefined> {
    if (this.useKV) {
      try {
        const analyses = await kv.get<Record<string, StoredAnalysis>>(ANALYSES_KEY) || {}
        return analyses[id]
      } catch (error) {
        console.error('[KV] Error getting analysis:', error)
      }
    }
    return this.memoryStore.get(id)
  }

  async getAll(): Promise<StoredAnalysis[]> {
    if (this.useKV) {
      try {
        const analyses = await kv.get<Record<string, StoredAnalysis>>(ANALYSES_KEY) || {}
        const result = Object.values(analyses).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        console.log(`[KV] Retrieved ${result.length} analyses`)
        return result
      } catch (error) {
        console.error('[KV] Error getting all analyses:', error)
      }
    }
    
    return Array.from(this.memoryStore.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  async getProcessingCount(): Promise<number> {
    const all = await this.getAll()
    return all.filter(a => a.processing).length
  }

  async getByCompany(symbol: string): Promise<StoredAnalysis[]> {
    const all = await this.getAll()
    return all.filter(a => a.company_symbol === symbol)
  }

  async clear(): Promise<void> {
    if (this.useKV) {
      try {
        await kv.del(ANALYSES_KEY)
        await kv.set(COUNTER_KEY, 0)
        console.log('[KV] Cleared all analyses')
      } catch (error) {
        console.error('[KV] Error clearing analyses:', error)
      }
    }
    this.memoryStore.clear()
    this.memoryCounter = 0
  }

  async size(): Promise<number> {
    const all = await this.getAll()
    return all.length
  }
}

// Singleton instance
export const analysisStore = new AnalysisStore()
