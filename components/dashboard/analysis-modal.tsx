'use client'

import { useState, useEffect } from 'react'
import { X, Download, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Target, Lightbulb, BarChart3, DollarSign, Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Analysis {
  id: string
  company_name: string
  company_symbol: string
  period: string
  category: string
  processed: boolean
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

interface AnalysisModalProps {
  analysis: Analysis
  onClose: () => void
}

export default function AnalysisModal({ analysis, onClose }: AnalysisModalProps) {
  const [fullAnalysis, setFullAnalysis] = useState<Analysis>(analysis)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  // 加载完整分析数据
  useEffect(() => {
    const loadFullAnalysis = async () => {
      try {
        const response = await fetch(`/api/reports/${analysis.id}`)
        const data = await response.json()
        if (data.analysis) {
          setFullAnalysis(data.analysis)
        }
      } catch (error) {
        console.error('Failed to load full analysis:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadFullAnalysis()
  }, [analysis.id])

  // 导出PDF
  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      // 使用浏览器打印功能
      window.print()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // 获取Beat/Miss样式
  const getBeatMissStyle = (beatMiss?: string) => {
    if (!beatMiss) return { bg: 'bg-gray-100', text: 'text-gray-600', icon: Minus }
    const lower = beatMiss.toLowerCase()
    if (lower.includes('strong beat')) {
      return { bg: 'bg-green-100', text: 'text-green-700', icon: TrendingUp }
    } else if (lower.includes('beat')) {
      return { bg: 'bg-green-50', text: 'text-green-600', icon: TrendingUp }
    } else if (lower.includes('strong miss')) {
      return { bg: 'bg-red-100', text: 'text-red-700', icon: TrendingDown }
    } else if (lower.includes('miss')) {
      return { bg: 'bg-red-50', text: 'text-red-600', icon: TrendingDown }
    }
    return { bg: 'bg-gray-100', text: 'text-gray-600', icon: Minus }
  }

  const beatMissStyle = getBeatMissStyle(fullAnalysis.comparison_snapshot?.beat_miss || fullAnalysis.final_judgment?.net_impact)
  const BeatMissIcon = beatMissStyle.icon

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="absolute inset-4 md:inset-8 lg:inset-12 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                {fullAnalysis.company_symbol?.slice(0, 4) || 'N/A'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{fullAnalysis.company_name}</h2>
                <p className="text-sm text-slate-500">{fullAnalysis.period} · {fullAnalysis.category === 'AI_APPLICATION' ? 'AI应用公司' : 'AI供应链公司'}</p>
              </div>
              <div className={`ml-4 px-3 py-1.5 rounded-full ${beatMissStyle.bg} ${beatMissStyle.text} flex items-center gap-1.5`}>
                <BeatMissIcon className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {fullAnalysis.comparison_snapshot?.beat_miss || fullAnalysis.final_judgment?.net_impact || 'Inline'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                导出PDF
              </Button>
              <button
                onClick={onClose}
                className="h-9 w-9 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 print:p-0" id="analysis-content">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8">
              {/* 一句话结论 */}
              {fullAnalysis.one_line_conclusion && (
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                  <h3 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    核心结论
                  </h3>
                  <p className="text-lg font-medium text-slate-800 leading-relaxed">
                    {fullAnalysis.one_line_conclusion}
                  </p>
                </div>
              )}

              {/* 投委会总结 */}
              {fullAnalysis.investment_committee_summary && (
                <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
                  <h3 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    投委会总结
                  </h3>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {fullAnalysis.investment_committee_summary}
                  </p>
                </div>
              )}

              {/* 关键指标表格 */}
              {fullAnalysis.results_table && fullAnalysis.results_table.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    关键财务指标
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-4 py-3 text-left font-semibold text-slate-600">指标</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-600">实际</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-600">预期</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-600">差异</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-600">评估</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {fullAnalysis.results_table.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-800">{row.metric}</td>
                            <td className="px-4 py-3 text-slate-700">{row.actual}</td>
                            <td className="px-4 py-3 text-slate-500">{row.consensus}</td>
                            <td className="px-4 py-3">
                              <span className={`font-medium ${
                                row.delta?.startsWith('+') ? 'text-green-600' : 
                                row.delta?.startsWith('-') ? 'text-red-600' : 'text-slate-600'
                              }`}>
                                {row.delta}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                row.assessment?.toLowerCase().includes('beat') ? 'bg-green-100 text-green-700' :
                                row.assessment?.toLowerCase().includes('miss') ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {row.assessment}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 三大驱动 */}
              {fullAnalysis.drivers && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    增长驱动分析
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {fullAnalysis.drivers.demand && (
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <h4 className="font-semibold text-blue-700 mb-2">{fullAnalysis.drivers.demand.title}</h4>
                        <p className="text-sm text-blue-600 mb-2">{fullAnalysis.drivers.demand.metrics}</p>
                        <p className="text-sm text-slate-700 mb-1"><strong>变化：</strong>{fullAnalysis.drivers.demand.change}</p>
                        <p className="text-sm text-slate-700 mb-1"><strong>幅度：</strong>{fullAnalysis.drivers.demand.magnitude}</p>
                        <p className="text-sm text-slate-600"><strong>原因：</strong>{fullAnalysis.drivers.demand.reason}</p>
                      </div>
                    )}
                    {fullAnalysis.drivers.monetization && (
                      <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                        <h4 className="font-semibold text-green-700 mb-2">{fullAnalysis.drivers.monetization.title}</h4>
                        <p className="text-sm text-green-600 mb-2">{fullAnalysis.drivers.monetization.metrics}</p>
                        <p className="text-sm text-slate-700 mb-1"><strong>变化：</strong>{fullAnalysis.drivers.monetization.change}</p>
                        <p className="text-sm text-slate-700 mb-1"><strong>幅度：</strong>{fullAnalysis.drivers.monetization.magnitude}</p>
                        <p className="text-sm text-slate-600"><strong>原因：</strong>{fullAnalysis.drivers.monetization.reason}</p>
                      </div>
                    )}
                    {fullAnalysis.drivers.efficiency && (
                      <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                        <h4 className="font-semibold text-purple-700 mb-2">{fullAnalysis.drivers.efficiency.title}</h4>
                        <p className="text-sm text-purple-600 mb-2">{fullAnalysis.drivers.efficiency.metrics}</p>
                        <p className="text-sm text-slate-700 mb-1"><strong>变化：</strong>{fullAnalysis.drivers.efficiency.change}</p>
                        <p className="text-sm text-slate-700 mb-1"><strong>幅度：</strong>{fullAnalysis.drivers.efficiency.magnitude}</p>
                        <p className="text-sm text-slate-600"><strong>原因：</strong>{fullAnalysis.drivers.efficiency.reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 投入与ROI */}
              {fullAnalysis.investment_roi && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-600 mb-4 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    投入与ROI
                  </h3>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-700"><strong>CapEx变化：</strong>{fullAnalysis.investment_roi.capex_change}</p>
                    <p className="text-sm text-slate-700"><strong>Opex变化：</strong>{fullAnalysis.investment_roi.opex_change}</p>
                    <p className="text-sm text-slate-700"><strong>投入方向：</strong>{fullAnalysis.investment_roi.investment_direction}</p>
                    {fullAnalysis.investment_roi.roi_evidence && fullAnalysis.investment_roi.roi_evidence.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-1">ROI证据：</p>
                        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                          {fullAnalysis.investment_roi.roi_evidence.map((evidence, idx) => (
                            <li key={idx}>{evidence}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="text-sm text-slate-700"><strong>管理层承诺：</strong>{fullAnalysis.investment_roi.management_commitment}</p>
                  </div>
                </div>
              )}

              {/* 风险与检查点 */}
              {fullAnalysis.sustainability_risks && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 可持续驱动 */}
                  {fullAnalysis.sustainability_risks.sustainable_drivers && fullAnalysis.sustainability_risks.sustainable_drivers.length > 0 && (
                    <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                      <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        可持续驱动
                      </h4>
                      <ul className="space-y-2">
                        {fullAnalysis.sustainability_risks.sustainable_drivers.map((driver, idx) => (
                          <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            {driver}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* 主要风险 */}
                  {fullAnalysis.sustainability_risks.main_risks && fullAnalysis.sustainability_risks.main_risks.length > 0 && (
                    <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                      <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        主要风险
                      </h4>
                      <ul className="space-y-2">
                        {fullAnalysis.sustainability_risks.main_risks.map((risk, idx) => (
                          <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">⚠</span>
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* 检查点 */}
              {fullAnalysis.sustainability_risks?.checkpoints && fullAnalysis.sustainability_risks.checkpoints.length > 0 && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <h4 className="font-semibold text-amber-700 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    后续检查点
                  </h4>
                  <ul className="space-y-2">
                    {fullAnalysis.sustainability_risks.checkpoints.map((checkpoint, idx) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">📍</span>
                        {checkpoint}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 最终判断 */}
              {fullAnalysis.final_judgment && (
                <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                  <h3 className="text-sm font-semibold text-indigo-700 mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    投资判断
                  </h3>
                  <div className="space-y-4">
                    {fullAnalysis.final_judgment.confidence && (
                      <div>
                        <p className="text-sm font-medium text-green-700 mb-1">✓ 更有信心的点</p>
                        <p className="text-sm text-slate-700">{fullAnalysis.final_judgment.confidence}</p>
                      </div>
                    )}
                    {fullAnalysis.final_judgment.concerns && (
                      <div>
                        <p className="text-sm font-medium text-red-700 mb-1">⚠ 更担心的点</p>
                        <p className="text-sm text-slate-700">{fullAnalysis.final_judgment.concerns}</p>
                      </div>
                    )}
                    {fullAnalysis.final_judgment.watch_list && (
                      <div>
                        <p className="text-sm font-medium text-amber-700 mb-1">👁 接下来要盯</p>
                        <p className="text-sm text-slate-700">{fullAnalysis.final_judgment.watch_list}</p>
                      </div>
                    )}
                    {fullAnalysis.final_judgment.recommendation && (
                      <div className="pt-4 border-t border-indigo-200">
                        <p className="text-sm font-medium text-indigo-700 mb-1">💡 投资建议</p>
                        <p className="text-sm text-slate-700">{fullAnalysis.final_judgment.recommendation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 研报对比 */}
              {fullAnalysis.research_comparison && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-600 mb-4">研报对比分析</h3>
                  {fullAnalysis.research_comparison.consensus_source && (
                    <p className="text-sm text-slate-700 mb-3">
                      <strong>预期来源：</strong>{fullAnalysis.research_comparison.consensus_source}
                    </p>
                  )}
                  {fullAnalysis.research_comparison.beat_miss_summary && (
                    <p className="text-sm text-slate-700 mb-3">
                      <strong>总结：</strong>{fullAnalysis.research_comparison.beat_miss_summary}
                    </p>
                  )}
                  {fullAnalysis.research_comparison.key_differences && fullAnalysis.research_comparison.key_differences.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-slate-700 mb-1">关键差异：</p>
                      <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                        {fullAnalysis.research_comparison.key_differences.map((diff, idx) => (
                          <li key={idx}>{diff}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {fullAnalysis.research_comparison.analyst_blind_spots && (
                    <p className="text-sm text-slate-700">
                      <strong>分析师盲点：</strong>{fullAnalysis.research_comparison.analyst_blind_spots}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
