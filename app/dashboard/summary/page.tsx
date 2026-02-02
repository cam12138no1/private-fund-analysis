'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Download, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import * as XLSX from 'xlsx'

interface ResultsTableRow {
  metric: string
  actual: string
  consensus: string
  delta: string
  assessment: string
}

interface AnalysisSummary {
  id: string
  company_name: string
  company_symbol: string
  fiscal_year: number
  fiscal_quarter?: number
  filing_date: string
  created_at: string
  one_line_conclusion?: string
  results_summary?: string
  results_table?: ResultsTableRow[]
  drivers_summary?: string
  final_judgment?: {
    net_impact: string
    recommendation: string
    confidence: string
    concerns: string
  }
  sustainability_risks?: {
    main_risks: string[]
    checkpoints: string[]
  }
}

export default function SummaryPage() {
  const t = useTranslations()
  const locale = useLocale()
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [filterYear, setFilterYear] = useState<number | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/dashboard')
      const data = await response.json()
      if (data.recentAnalyses) {
        setAnalyses(data.recentAnalyses)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const getNetImpactBadge = (impact: string | undefined) => {
    if (!impact) return null
    const impactLower = impact.toLowerCase()
    if (impactLower.includes('强') || impactLower.includes('strong')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <TrendingUp className="h-3 w-3" />
          更强
        </span>
      )
    } else if (impactLower.includes('弱') || impactLower.includes('weak')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <TrendingDown className="h-3 w-3" />
          更弱
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        <Minus className="h-3 w-3" />
        不变
      </span>
    )
  }

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new()

    // Sheet 1: 汇总表
    const summaryData = [
      ['财报分析汇总表', '', '', '', '', '', ''],
      ['生成时间', new Date().toLocaleString('zh-CN'), '', '', '', '', ''],
      [''],
      ['公司', '代码', '报告期', '一句话结论', '净影响', '建议', '关键风险'],
      ...analyses.map(a => [
        a.company_name,
        a.company_symbol,
        a.fiscal_quarter ? `${a.fiscal_year} Q${a.fiscal_quarter}` : `${a.fiscal_year} FY`,
        a.one_line_conclusion || '',
        a.final_judgment?.net_impact || '',
        a.final_judgment?.recommendation || '',
        a.sustainability_risks?.main_risks?.slice(0, 2).join('; ') || '',
      ]),
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 60 }, { wch: 10 }, { wch: 40 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(wb, summarySheet, '汇总表')

    // Sheet 2: 结果层详情
    const resultsData: any[][] = [
      ['结果层对比表 - 业绩 vs 预期', '', '', '', '', ''],
      [''],
    ]
    
    analyses.forEach(a => {
      resultsData.push([`${a.company_name} (${a.company_symbol}) - ${a.fiscal_quarter ? `Q${a.fiscal_quarter}` : 'FY'} ${a.fiscal_year}`, '', '', '', '', ''])
      resultsData.push(['指标', '实际值', '市场预期', '差异', '评价', ''])
      if (a.results_table) {
        a.results_table.forEach(row => {
          resultsData.push([row.metric, row.actual, row.consensus, row.delta, row.assessment, ''])
        })
      }
      resultsData.push([''])
    })
    
    const resultsSheet = XLSX.utils.aoa_to_sheet(resultsData)
    resultsSheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, resultsSheet, '结果层详情')

    // Sheet 3: 风险与检查点
    const riskData: any[][] = [
      ['风险与检查点汇总', '', ''],
      [''],
      ['公司', '主要风险', '检查点'],
    ]
    
    analyses.forEach(a => {
      const risks = a.sustainability_risks?.main_risks?.join('\n') || ''
      const checkpoints = a.sustainability_risks?.checkpoints?.join('\n') || ''
      riskData.push([`${a.company_name} (${a.company_symbol})`, risks, checkpoints])
    })
    
    const riskSheet = XLSX.utils.aoa_to_sheet(riskData)
    riskSheet['!cols'] = [{ wch: 25 }, { wch: 50 }, { wch: 50 }]
    XLSX.utils.book_append_sheet(wb, riskSheet, '风险汇总')

    // Sheet 4: 投资建议
    const adviceData: any[][] = [
      ['投资建议汇总', ''],
      [''],
      ['公司', '信心来源', '担忧', '建议'],
    ]
    
    analyses.forEach(a => {
      adviceData.push([
        `${a.company_name} (${a.company_symbol})`,
        a.final_judgment?.confidence || '',
        a.final_judgment?.concerns || '',
        a.final_judgment?.recommendation || '',
      ])
    })
    
    const adviceSheet = XLSX.utils.aoa_to_sheet(adviceData)
    adviceSheet['!cols'] = [{ wch: 25 }, { wch: 50 }, { wch: 50 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(wb, adviceSheet, '投资建议')

    const filename = `财报分析汇总_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  const years = [...new Set(analyses.map(a => a.fiscal_year))].sort((a, b) => b - a)
  const filteredAnalyses = filterYear 
    ? analyses.filter(a => a.fiscal_year === filterYear)
    : analyses

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">财报汇总表</h1>
          <p className="text-gray-500 mt-1">
            所有财报分析要点的动态汇总视图
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          
          {years.length > 0 && (
            <select
              value={filterYear || ''}
              onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 text-sm border rounded-lg bg-white"
            >
              <option value="">全部年份</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}
          
          <Button onClick={exportToExcel} disabled={analyses.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            导出汇总表
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总分析数</p>
              <p className="text-2xl font-bold">{analyses.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">看多 (更强)</p>
              <p className="text-2xl font-bold text-green-600">
                {analyses.filter(a => a.final_judgment?.net_impact?.includes('强')).length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">看空 (更弱)</p>
              <p className="text-2xl font-bold text-red-600">
                {analyses.filter(a => a.final_judgment?.net_impact?.includes('弱')).length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-white border-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">风险项</p>
              <p className="text-2xl font-bold text-yellow-600">
                {analyses.reduce((acc, a) => acc + (a.sustainability_risks?.main_risks?.length || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Table */}
      {filteredAnalyses.length === 0 ? (
        <Card className="p-12 text-center bg-white border-0 shadow-sm">
          <div className="max-w-md mx-auto">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无分析数据</h3>
            <p className="text-gray-500">上传财报后，分析结果将自动汇总到此表格</p>
          </div>
        </Card>
      ) : (
        <Card className="bg-white border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-8"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">公司</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">报告期</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[400px]">一句话结论</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">净影响</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">分析时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAnalyses.map((analysis) => (
                  <>
                    <tr 
                      key={analysis.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleRow(analysis.id)}
                    >
                      <td className="px-4 py-4">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          {expandedRows.has(analysis.id) ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                            {analysis.company_symbol?.slice(0, 2) || '??'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{analysis.company_name}</p>
                            <p className="text-sm text-gray-500">{analysis.company_symbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-sm font-medium text-gray-700">
                          <Calendar className="h-3.5 w-3.5" />
                          {analysis.fiscal_quarter ? `Q${analysis.fiscal_quarter}` : 'FY'} {analysis.fiscal_year}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {analysis.one_line_conclusion || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {getNetImpactBadge(analysis.final_judgment?.net_impact)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(analysis.created_at).toLocaleDateString('zh-CN')}
                      </td>
                    </tr>
                    
                    {/* Expanded Details */}
                    {expandedRows.has(analysis.id) && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={6} className="px-4 py-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
                            {/* 结果层表格 */}
                            {analysis.results_table && analysis.results_table.length > 0 && (
                              <div className="bg-white rounded-xl p-4 shadow-sm">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <div className="h-6 w-1 bg-blue-500 rounded" />
                                  结果层：业绩 vs 预期
                                </h4>
                                <p className="text-sm text-gray-600 mb-3">{analysis.results_summary}</p>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b">
                                        <th className="px-2 py-2 text-left font-medium text-gray-600">指标</th>
                                        <th className="px-2 py-2 text-right font-medium text-gray-600">实际值</th>
                                        <th className="px-2 py-2 text-right font-medium text-gray-600">预期</th>
                                        <th className="px-2 py-2 text-right font-medium text-gray-600">差异</th>
                                        <th className="px-2 py-2 text-left font-medium text-gray-600">评价</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {analysis.results_table.map((row, idx) => (
                                        <tr key={idx}>
                                          <td className="px-2 py-2 font-medium text-gray-900">{row.metric}</td>
                                          <td className="px-2 py-2 text-right text-gray-700">{row.actual}</td>
                                          <td className="px-2 py-2 text-right text-gray-500">{row.consensus}</td>
                                          <td className={`px-2 py-2 text-right font-medium ${
                                            row.delta.includes('-') ? 'text-red-600' : 'text-green-600'
                                          }`}>{row.delta}</td>
                                          <td className="px-2 py-2 text-gray-700 text-xs">{row.assessment}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            
                            {/* 投资建议 */}
                            <div className="bg-white rounded-xl p-4 shadow-sm">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <div className="h-6 w-1 bg-green-500 rounded" />
                                投委会判断
                              </h4>
                              <div className="space-y-3">
                                {analysis.final_judgment?.confidence && (
                                  <div className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <span className="text-xs font-medium text-gray-500">更有信心</span>
                                      <p className="text-sm text-gray-700">{analysis.final_judgment.confidence}</p>
                                    </div>
                                  </div>
                                )}
                                {analysis.final_judgment?.concerns && (
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <span className="text-xs font-medium text-gray-500">更担心</span>
                                      <p className="text-sm text-gray-700">{analysis.final_judgment.concerns}</p>
                                    </div>
                                  </div>
                                )}
                                {analysis.final_judgment?.recommendation && (
                                  <div className="flex items-start gap-2">
                                    <ArrowUpRight className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <span className="text-xs font-medium text-gray-500">建议</span>
                                      <p className="text-sm text-gray-700">{analysis.final_judgment.recommendation}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* 风险与检查点 */}
                            {analysis.sustainability_risks && (
                              <div className="bg-white rounded-xl p-4 shadow-sm lg:col-span-2">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <div className="h-6 w-1 bg-red-500 rounded" />
                                  风险与检查点
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-2">主要风险</p>
                                    <ul className="space-y-1">
                                      {analysis.sustainability_risks.main_risks?.map((risk, idx) => (
                                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                          <span className="text-red-400">•</span>
                                          {risk}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-2">检查点</p>
                                    <ul className="space-y-1">
                                      {analysis.sustainability_risks.checkpoints?.map((cp, idx) => (
                                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                          <span className="text-blue-400">•</span>
                                          {cp}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
