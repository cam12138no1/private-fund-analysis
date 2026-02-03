'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Upload, Loader2, TrendingUp, TrendingDown, Minus, ChevronRight, FileText, Building2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import UploadModal from './upload-modal'
import AnalysisModal from './analysis-modal'

interface Analysis {
  id: string
  company_name: string
  company_symbol: string
  period: string
  category: string
  processed: boolean
  processing?: boolean
  error?: string
  created_at: string
  one_line_conclusion?: string
  results_summary?: string
  results_table?: Array<{
    metric: string
    actual: string
    consensus: string
    delta: string
    assessment: string
    importance?: string
  }>
  results_explanation?: string
  drivers_summary?: string
  drivers?: {
    demand?: {
      title: string
      metrics: string
      change: string
      magnitude: string
      reason: string
    }
    monetization?: {
      title: string
      metrics: string
      change: string
      magnitude: string
      reason: string
    }
    efficiency?: {
      title: string
      metrics: string
      change: string
      magnitude: string
      reason: string
    }
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
  comparison_snapshot?: {
    core_revenue?: string
    core_profit?: string
    guidance?: string
    beat_miss?: string
    core_driver_quantified?: string
    main_risk_quantified?: string
    recommendation?: string
    position_action?: string
    next_quarter_focus?: string
  }
  research_comparison?: {
    consensus_source?: string
    key_differences?: string[]
    beat_miss_summary?: string
    analyst_blind_spots?: string
  }
}

export default function DashboardClient() {
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchRef = useRef<number>(0)

  // 加载数据
  const loadDashboardData = useCallback(async (force: boolean = false) => {
    // 防止频繁请求（至少间隔1秒）
    const now = Date.now()
    if (!force && now - lastFetchRef.current < 1000) {
      return
    }
    lastFetchRef.current = now

    try {
      const response = await fetch('/api/dashboard')
      const data = await response.json()
      
      if (data.analyses) {
        // 过滤掉超过10分钟仍在处理的任务（视为卡住）
        const validAnalyses = data.analyses.filter((a: Analysis) => {
          if (a.processing && !a.processed) {
            const createdAt = new Date(a.created_at).getTime()
            const ageMinutes = (Date.now() - createdAt) / (1000 * 60)
            // 超过10分钟的处理中任务视为无效
            if (ageMinutes > 10) {
              console.log(`[Dashboard] 过滤掉卡住的任务: ${a.id}, 已运行 ${ageMinutes.toFixed(1)} 分钟`)
              return false
            }
          }
          return true
        })
        setAnalyses(validAnalyses)
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setIsLoading(false)
    }
  }, [])

  // 删除单个任务
  const deleteAnalysis = async (id: string) => {
    try {
      const response = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setAnalyses(prev => prev.filter(a => a.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete analysis:', error)
    }
  }

  // 清理所有卡住的任务
  const cleanupStaleAnalyses = async () => {
    try {
      const response = await fetch('/api/reports/clean', { method: 'POST' })
      if (response.ok) {
        await loadDashboardData(true)
      }
    } catch (error) {
      console.error('Failed to cleanup stale analyses:', error)
    }
  }

  // 初始加载
  useEffect(() => {
    loadDashboardData(true)
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [loadDashboardData])

  // 轮询处理中的任务
  useEffect(() => {
    const processingAnalyses = analyses.filter(a => a.processing && !a.processed)
    
    if (processingAnalyses.length > 0) {
      // 有处理中的任务，开始轮询
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          loadDashboardData()
        }, 3000)
      }
    } else {
      // 没有处理中的任务，停止轮询
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [analyses, loadDashboardData])

  // 获取完成的分析（已处理且无错误）
  const completedAnalyses = analyses.filter(a => a.processed && !a.error)
  // 获取正在处理的分析（处理中且未超时）
  const processingAnalyses = analyses.filter(a => {
    if (!a.processing || a.processed) return false
    const createdAt = new Date(a.created_at).getTime()
    const ageMinutes = (Date.now() - createdAt) / (1000 * 60)
    return ageMinutes <= 10 // 只显示10分钟内的处理中任务
  })
  // 获取卡住的任务（超过10分钟仍在处理）
  const staleAnalyses = analyses.filter(a => {
    if (!a.processing || a.processed) return false
    const createdAt = new Date(a.created_at).getTime()
    const ageMinutes = (Date.now() - createdAt) / (1000 * 60)
    return ageMinutes > 10
  })

  // 获取Beat/Miss图标
  const getBeatMissIcon = (beatMiss?: string) => {
    if (!beatMiss) return <Minus className="h-4 w-4 text-gray-400" />
    const lower = beatMiss.toLowerCase()
    if (lower.includes('beat')) {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    } else if (lower.includes('miss')) {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  // 获取推荐颜色
  const getRecommendationColor = (rec?: string) => {
    if (!rec) return 'bg-gray-100 text-gray-600'
    if (rec.includes('超配')) return 'bg-green-100 text-green-700'
    if (rec.includes('低配')) return 'bg-red-100 text-red-700'
    return 'bg-blue-100 text-blue-700'
  }

  // 提取3句核心结论
  const getThreeConclusions = (analysis: Analysis) => {
    const conclusions: string[] = []
    
    // 1. 一句话结论
    if (analysis.one_line_conclusion) {
      conclusions.push(analysis.one_line_conclusion)
    }
    
    // 2. 更有信心的点
    if (analysis.final_judgment?.confidence) {
      conclusions.push(`✓ ${analysis.final_judgment.confidence}`)
    }
    
    // 3. 更担心的点
    if (analysis.final_judgment?.concerns) {
      conclusions.push(`⚠ ${analysis.final_judgment.concerns}`)
    }
    
    return conclusions.slice(0, 3)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">FinSight AI</h1>
                <p className="text-xs text-slate-500">智析财报 · 投委会级分析</p>
              </div>
            </div>
            <Button 
              onClick={() => setIsUploadOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
            >
              <Upload className="mr-2 h-4 w-4" />
              上传财报
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Processing Banner - 只在有有效处理中任务时显示 */}
        {processingAnalyses.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-xl shadow-orange-500/20">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <div>
                <p className="font-semibold text-lg">正在分析 {processingAnalyses.length} 份财报</p>
                <p className="text-amber-100 text-sm">AI正在深度分析财报内容，请稍候...</p>
              </div>
            </div>
          </div>
        )}

        {/* Stale Tasks Warning */}
        {staleAnalyses.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-800">发现 {staleAnalyses.length} 个卡住的任务</p>
                  <p className="text-sm text-red-600">这些任务已超过10分钟未完成，建议清理</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100"
                onClick={cleanupStaleAnalyses}
              >
                清理无效任务
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-8 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{completedAnalyses.length}</p>
              <p className="text-xs text-slate-500">已分析</p>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {new Set(completedAnalyses.map(a => a.company_symbol)).size}
              </p>
              <p className="text-xs text-slate-500">家公司</p>
            </div>
          </div>
        </div>

        {/* Upload Area (when empty) */}
        {completedAnalyses.length === 0 && processingAnalyses.length === 0 && !isLoading && (
          <div className="mb-8">
            <button 
              onClick={() => setIsUploadOpen(true)}
              className="w-full p-12 bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Plus className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-slate-900">上传第一份财报</p>
                  <p className="text-sm text-slate-500 mt-1">支持PDF格式，可同时上传财报和研报进行对比分析</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Company Cards Grid */}
        {(completedAnalyses.length > 0 || processingAnalyses.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Add New Card */}
            <button 
              onClick={() => setIsUploadOpen(true)}
              className="p-6 bg-white/50 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all group min-h-[280px] flex flex-col items-center justify-center"
            >
              <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors mb-4">
                <Plus className="h-7 w-7 text-blue-600" />
              </div>
              <p className="font-semibold text-slate-700">添加新分析</p>
              <p className="text-sm text-slate-500 mt-1">上传财报 + 研报</p>
            </button>

            {/* Processing Cards */}
            {processingAnalyses.map((analysis) => (
              <div
                key={analysis.id}
                className="p-6 bg-white/70 rounded-2xl border border-slate-200 animate-pulse min-h-[280px] flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-slate-200 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-700">{analysis.company_name || '分析中...'}</h3>
                      <p className="text-xs text-slate-500">{analysis.period}</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-slate-500">AI正在分析中...</p>
                </div>
              </div>
            ))}

            {/* Completed Analysis Cards */}
            {completedAnalyses.map((analysis) => {
              const conclusions = getThreeConclusions(analysis)
              const beatMiss = analysis.comparison_snapshot?.beat_miss || analysis.final_judgment?.net_impact
              const recommendation = analysis.comparison_snapshot?.recommendation || analysis.final_judgment?.recommendation

              return (
                <button
                  key={analysis.id}
                  onClick={() => setSelectedAnalysis(analysis)}
                  className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 transition-all text-left group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm">
                        {analysis.company_symbol?.slice(0, 4) || 'N/A'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {analysis.company_name}
                        </h3>
                        <p className="text-xs text-slate-500">{analysis.period}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>

                  {/* Beat/Miss & Recommendation */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100">
                      {getBeatMissIcon(beatMiss)}
                      <span className="text-xs font-medium text-slate-600">
                        {beatMiss?.replace('Strong ', '').replace('Moderate ', '') || 'Inline'}
                      </span>
                    </div>
                    {recommendation && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRecommendationColor(recommendation)}`}>
                        {recommendation}
                      </span>
                    )}
                  </div>

                  {/* 3 Key Conclusions */}
                  <div className="space-y-2">
                    {conclusions.map((conclusion, idx) => (
                      <p 
                        key={idx} 
                        className="text-sm text-slate-600 line-clamp-2 leading-relaxed"
                      >
                        {conclusion}
                      </p>
                    ))}
                    {conclusions.length === 0 && (
                      <p className="text-sm text-slate-400 italic">分析结果加载中...</p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                      {new Date(analysis.created_at).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          // 上传成功后立即刷新
          loadDashboardData(true)
        }}
      />

      {/* Analysis Detail Modal */}
      {selectedAnalysis && (
        <AnalysisModal
          analysis={selectedAnalysis}
          onClose={() => setSelectedAnalysis(null)}
        />
      )}
    </div>
  )
}
