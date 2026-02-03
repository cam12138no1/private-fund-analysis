// Hybrid storage: Uses Vercel Blob when available, falls back to in-memory for development
// This ensures data persists across serverless function invocations

import { put, list, del } from '@vercel/blob'
import { AnalysisResult, ResultsTableRow, DriverDetail } from './ai/analyzer'

export interface StoredAnalysis {
  id: string
  company_name: string
  company_symbol: string
  report_type: string
  fiscal_year: number
  fiscal_quarter?: number
  period?: string  // 格式化的期间，如 "Q4 2025"
  category?: string  // 公司分类: AI_APPLICATION | AI_SUPPLY_CHAIN
  filing_date: string
  created_at: string
  processed: boolean
  processing?: boolean
  error?: string
  has_research_report?: boolean  // 是否包含研报对比
  
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
    upgrade_factors: string[]
    downgrade_factors: string[]
    logic_chain: string
  }
  final_judgment?: {
    confidence: string
    concerns: string
    watch_list: string
    net_impact: string
    long_term_narrative: string
    recommendation: string
  }
  investment_committee_summary?: string
  // 横向对比快照 (用于投委会表格)
  comparison_snapshot?: {
    core_revenue: string
    core_profit: string
    guidance: string
    beat_miss: string
    core_driver_quantified: string
    main_risk_quantified: string
    recommendation: string
    position_action: string
    next_quarter_focus: string
  }
  // 研报对比分析 (可选，仅当有研报时)
  research_comparison?: {
    consensus_source: string
    key_differences: string[]
    beat_miss_summary: string
    analyst_blind_spots: string
  }
  metadata?: {
    company_category: string
    analysis_timestamp: string
    prompt_version: string
    has_research_report?: boolean
  }
}

const BLOB_PREFIX = 'analyses/'
const INDEX_FILE = 'analyses/_index.json'

// Check if Blob is available
function isBlobAvailable(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

class AnalysisStore {
  private memoryStore: Map<string, StoredAnalysis> = new Map()
  private memoryCounter: number = 0
  private useBlob: boolean

  constructor() {
    this.useBlob = isBlobAvailable()
    console.log(`AnalysisStore initialized. Using Blob: ${this.useBlob}`)
  }

  private async getIndex(): Promise<string[]> {
    if (!this.useBlob) return []
    
    try {
      const { blobs } = await list({ prefix: BLOB_PREFIX })
      // Filter out the index file itself
      return blobs
        .filter(b => !b.pathname.endsWith('_index.json'))
        .map(b => b.pathname.replace(BLOB_PREFIX, '').replace('.json', ''))
    } catch (error) {
      console.error('[Blob] Error getting index:', error)
      return []
    }
  }

  async add(analysis: Omit<StoredAnalysis, 'id'>): Promise<StoredAnalysis> {
    const timestamp = Date.now()
    const id = `analysis_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
    const storedAnalysis: StoredAnalysis = { id, ...analysis }
    
    if (this.useBlob) {
      try {
        const blobPath = `${BLOB_PREFIX}${id}.json`
        await put(blobPath, JSON.stringify(storedAnalysis), {
          access: 'public',
          contentType: 'application/json',
        })
        
        console.log(`[Blob] Added analysis: ${id}`)
        return storedAnalysis
      } catch (error) {
        console.error('[Blob] Error adding analysis, falling back to memory:', error)
        // Fall back to memory
      }
    }
    
    // Memory fallback
    this.memoryCounter++
    this.memoryStore.set(id, storedAnalysis)
    console.log(`[Memory] Added analysis: ${id}`)
    return storedAnalysis
  }

  async update(id: string, updates: Partial<StoredAnalysis>): Promise<StoredAnalysis | undefined> {
    if (this.useBlob) {
      try {
        // First get the existing analysis
        const existing = await this.get(id)
        if (!existing) {
          console.log(`[Blob] Analysis not found for update: ${id}`)
          return undefined
        }
        
        const updated = { ...existing, ...updates }
        const blobPath = `${BLOB_PREFIX}${id}.json`
        
        await put(blobPath, JSON.stringify(updated), {
          access: 'public',
          contentType: 'application/json',
        })
        
        console.log(`[Blob] Updated analysis: ${id}`)
        return updated
      } catch (error) {
        console.error('[Blob] Error updating analysis:', error)
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
    if (this.useBlob) {
      try {
        const { blobs } = await list({ prefix: `${BLOB_PREFIX}${id}` })
        if (blobs.length === 0) return undefined
        
        const response = await fetch(blobs[0].url)
        if (!response.ok) return undefined
        
        return await response.json()
      } catch (error) {
        console.error('[Blob] Error getting analysis:', error)
      }
    }
    return this.memoryStore.get(id)
  }

  async getAll(): Promise<StoredAnalysis[]> {
    if (this.useBlob) {
      try {
        const { blobs } = await list({ prefix: BLOB_PREFIX })
        const analyses: StoredAnalysis[] = []
        
        for (const blob of blobs) {
          if (blob.pathname.endsWith('_index.json')) continue
          
          try {
            const response = await fetch(blob.url)
            if (response.ok) {
              const analysis = await response.json()
              analyses.push(analysis)
            }
          } catch (e) {
            console.error(`[Blob] Error fetching ${blob.pathname}:`, e)
          }
        }
        
        // Sort by created_at descending
        analyses.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        
        console.log(`[Blob] Retrieved ${analyses.length} analyses`)
        return analyses
      } catch (error) {
        console.error('[Blob] Error getting all analyses:', error)
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
    if (this.useBlob) {
      try {
        const { blobs } = await list({ prefix: BLOB_PREFIX })
        for (const blob of blobs) {
          await del(blob.url)
        }
        console.log('[Blob] Cleared all analyses')
      } catch (error) {
        console.error('[Blob] Error clearing analyses:', error)
      }
    }
    this.memoryStore.clear()
    this.memoryCounter = 0
  }

  async size(): Promise<number> {
    const all = await this.getAll()
    return all.length
  }

  async delete(id: string): Promise<boolean> {
    if (this.useBlob) {
      try {
        const { blobs } = await list({ prefix: `${BLOB_PREFIX}${id}` })
        if (blobs.length > 0) {
          await del(blobs[0].url)
          console.log(`[Blob] Deleted analysis: ${id}`)
          return true
        }
        return false
      } catch (error) {
        console.error('[Blob] Error deleting analysis:', error)
        return false
      }
    }
    
    // Memory fallback
    const existed = this.memoryStore.has(id)
    this.memoryStore.delete(id)
    return existed
  }

  async deleteStale(maxAgeMinutes: number = 30): Promise<number> {
    const all = await this.getAll()
    const now = Date.now()
    let deletedCount = 0
    
    for (const analysis of all) {
      // Delete if processing for too long (stuck)
      if (analysis.processing) {
        const createdAt = new Date(analysis.created_at).getTime()
        const ageMinutes = (now - createdAt) / (1000 * 60)
        
        if (ageMinutes > maxAgeMinutes) {
          const deleted = await this.delete(analysis.id)
          if (deleted) {
            deletedCount++
            console.log(`[Store] Deleted stale processing analysis: ${analysis.id} (age: ${ageMinutes.toFixed(1)} minutes)`)
          }
        }
      }
    }
    
    return deletedCount
  }
}

// Singleton instance
export const analysisStore = new AnalysisStore()
