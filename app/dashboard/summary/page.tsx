'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Download, 
  RefreshCw,
  Search,
  ChevronUp,
  ChevronDown,
  Filter,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import * as XLSX from 'xlsx'

interface AnalysisSummary {
  id: string
  company_name: string
  company_symbol: string
  fiscal_year: number
  fiscal_quarter?: number
  created_at: string
  one_line_conclusion?: string
  drivers_summary?: string
  drivers?: {
    demand?: { change?: string; magnitude?: string }
    monetization?: { change?: string; magnitude?: string }
    efficiency?: { change?: string; magnitude?: string }
  }
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

interface CoreConclusion {
  id: string
  company: string
  symbol: string
  period: string
  periodSort: number
  beatMiss: 'Beat' | 'Miss' | 'Inline' | '-'
  conclusion: string
  keyDriver: string
  keyRisk: string
  netImpact: '更强' | '更弱' | '不变' | '-'
  recommendation: string
  checkpoint: string
  analysisDate: string
}

type SortField = 'company' | 'period' | 'beatMiss' | 'netImpact' | 'analysisDate'
type SortDirection = 'asc' | 'desc'

function extractCoreConclusions(analysis: AnalysisSummary): CoreConclusion {
  const conclusion = analysis.one_line_conclusion || ''
  
  let beatMiss: CoreConclusion['beatMiss'] = '-'
  if (/beat|超预期|强劲|高于/i.test(conclusion)) {
    beatMiss = 'Beat'
  } else if (/miss|不及预期|低于|疲软/i.test(conclusion)) {
    beatMiss = 'Miss'
  } else if (/inline|符合|持平/i.test(conclusion)) {
    beatMiss = 'Inline'
  }

  let keyDriver = analysis.drivers_summary || analysis.drivers?.demand?.change || ''
  if (keyDriver.length > 60) keyDriver = keyDriver.substring(0, 57) + '...'

  let keyRisk = analysis.sustainability_risks?.main_risks?.[0] || ''
  if (keyRisk.length > 50) keyRisk = keyRisk.substring(0, 47) + '...'

  let checkpoint = analysis.sustainability_risks?.checkpoints?.[0] || ''
  if (checkpoint.length > 40) checkpoint = checkpoint.substring(0, 37) + '...'

  const netImpactRaw = analysis.final_judgment?.net_impact || ''
  let netImpact: CoreConclusion['netImpact'] = '-'
  if (/强|strong/i.test(netImpactRaw)) netImpact = '更强'
  else if (/弱|weak/i.test(netImpactRaw)) netImpact = '更弱'
  else if (netImpactRaw) netImpact = '不变'

  let recommendation = analysis.final_judgment?.recommendation || ''
  if (recommendation.length > 50) recommendation = recommendation.substring(0, 47) + '...'

  const period = analysis.fiscal_quarter 
    ? `${analysis.fiscal_year} Q${analysis.fiscal_quarter}` 
    : `${analysis.fiscal_year} FY`

  return {
    id: analysis.id,
    company: analysis.company_name,
    symbol: analysis.company_symbol,
    period,
    periodSort: analysis.fiscal_year * 10 + (analysis.fiscal_quarter || 0),
    beatMiss,
    conclusion: conclusion.length > 80 ? conclusion.substring(0, 77) + '...' : conclusion,
    keyDriver,
    keyRisk,
    netImpact,
    recommendation,
    checkpoint,
    analysisDate: new Date(analysis.created_at).toLocaleDateString('zh-CN'),
  }
}

export default function SummaryPage() {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('analysisDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [filterBeatMiss, setFilterBeatMiss] = useState<string>('')
  const [filterNetImpact, setFilterNetImpact] = useState<string>('')

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

  const coreConclusions = useMemo(() => {
    return analyses.map(extractCoreConclusions)
  }, [analyses])

  const filteredAndSorted = useMemo(() => {
    let result = [...coreConclusions]

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(c => 
        c.company.toLowerCase().includes(term) ||
        c.symbol.toLowerCase().includes(term) ||
        c.conclusion.toLowerCase().includes(term)
      )
    }

    // Filters
    if (filterBeatMiss) {
      result = result.filter(c => c.beatMiss === filterBeatMiss)
    }
    if (filterNetImpact) {
      result = result.filter(c => c.netImpact === filterNetImpact)
    }

    // Sort
    result.sort((a, b) => {
      let compare = 0
      switch (sortField) {
        case 'company':
          compare = a.company.localeCompare(b.company)
          break
        case 'period':
          compare = a.periodSort - b.periodSort
          break
        case 'beatMiss':
          compare = a.beatMiss.localeCompare(b.beatMiss)
          break
        case 'netImpact':
          compare = a.netImpact.localeCompare(b.netImpact)
          break
        case 'analysisDate':
          compare = new Date(a.analysisDate).getTime() - new Date(b.analysisDate).getTime()
          break
      }
      return sortDirection === 'asc' ? compare : -compare
    })

    return result
  }, [coreConclusions, searchTerm, sortField, sortDirection, filterBeatMiss, filterNetImpact])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new()

    const headerRow = ['公司', '代码', '报告期', 'Beat/Miss', '一句话结论', '核心驱动', '核心风险', '净影响', '投资建议', '检查点', '分析日期']
    const dataRows = filteredAndSorted.map(c => [
      c.company, c.symbol, c.period, c.beatMiss, c.conclusion,
      c.keyDriver, c.keyRisk, c.netImpact, c.recommendation, c.checkpoint, c.analysisDate,
    ])

    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows])
    ws['!cols'] = [
      { wch: 16 }, { wch: 8 }, { wch: 11 }, { wch: 9 }, { wch: 45 },
      { wch: 35 }, { wch: 30 }, { wch: 8 }, { wch: 30 }, { wch: 25 }, { wch: 11 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, '核心结论')
    XLSX.writeFile(wb, `财报核心结论_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 opacity-30" />
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3" /> 
      : <ChevronDown className="h-3 w-3" />
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilterBeatMiss('')
    setFilterNetImpact('')
  }

  const hasFilters = searchTerm || filterBeatMiss || filterNetImpact

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#f8f9fa]">
      {/* Toolbar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Title & Stats */}
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-gray-900">核心结论</h1>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-500">
                共 <span className="font-semibold text-gray-900">{filteredAndSorted.length}</span> 条
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-gray-600">Beat {coreConclusions.filter(c => c.beatMiss === 'Beat').length}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-gray-600">Miss {coreConclusions.filter(c => c.beatMiss === 'Miss').length}</span>
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索公司..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md w-40 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Filters */}
            <select
              value={filterBeatMiss}
              onChange={(e) => setFilterBeatMiss(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Beat/Miss</option>
              <option value="Beat">Beat</option>
              <option value="Miss">Miss</option>
              <option value="Inline">Inline</option>
            </select>

            <select
              value={filterNetImpact}
              onChange={(e) => setFilterNetImpact(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">净影响</option>
              <option value="更强">更强</option>
              <option value="更弱">更弱</option>
              <option value="不变">不变</option>
            </select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs text-gray-500">
                <X className="h-3 w-3 mr-1" />
                清除
              </Button>
            )}

            <div className="w-px h-5 bg-gray-200 mx-1" />

            <Button variant="ghost" size="sm" onClick={fetchData} className="h-7 px-2">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>

            <Button size="sm" onClick={exportToExcel} disabled={filteredAndSorted.length === 0} className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700">
              <Download className="h-3.5 w-3.5 mr-1" />
              导出
            </Button>
          </div>
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          {/* Header */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#f1f3f4] border-b border-gray-300">
              <th 
                className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200 cursor-pointer hover:bg-gray-200 select-none sticky left-0 bg-[#f1f3f4] z-20 min-w-[140px]"
                onClick={() => handleSort('company')}
              >
                <div className="flex items-center gap-1">
                  公司 <SortIcon field="company" />
                </div>
              </th>
              <th 
                className="px-3 py-2 text-center font-medium text-gray-700 border-r border-gray-200 cursor-pointer hover:bg-gray-200 select-none w-24"
                onClick={() => handleSort('period')}
              >
                <div className="flex items-center justify-center gap-1">
                  报告期 <SortIcon field="period" />
                </div>
              </th>
              <th 
                className="px-3 py-2 text-center font-medium text-gray-700 border-r border-gray-200 cursor-pointer hover:bg-gray-200 select-none w-20"
                onClick={() => handleSort('beatMiss')}
              >
                <div className="flex items-center justify-center gap-1">
                  B/M <SortIcon field="beatMiss" />
                </div>
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200 min-w-[280px]">
                一句话结论
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200 min-w-[200px]">
                核心驱动
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200 min-w-[180px]">
                核心风险
              </th>
              <th 
                className="px-3 py-2 text-center font-medium text-gray-700 border-r border-gray-200 cursor-pointer hover:bg-gray-200 select-none w-20"
                onClick={() => handleSort('netImpact')}
              >
                <div className="flex items-center justify-center gap-1">
                  净影响 <SortIcon field="netImpact" />
                </div>
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200 min-w-[180px]">
                投资建议
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200 min-w-[150px]">
                检查点
              </th>
              <th 
                className="px-3 py-2 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-200 select-none w-24"
                onClick={() => handleSort('analysisDate')}
              >
                <div className="flex items-center justify-center gap-1">
                  日期 <SortIcon field="analysisDate" />
                </div>
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                  {hasFilters ? '没有符合条件的数据' : '暂无分析数据，上传财报后自动生成'}
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((row, idx) => (
                <tr 
                  key={row.id} 
                  className={`border-b border-gray-100 hover:bg-blue-50/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  {/* 公司 - Sticky */}
                  <td className={`px-3 py-2 border-r border-gray-100 sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {row.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{row.company}</div>
                        <div className="text-[10px] text-gray-400">{row.symbol}</div>
                      </div>
                    </div>
                  </td>

                  {/* 报告期 */}
                  <td className="px-3 py-2 text-center border-r border-gray-100">
                    <span className="inline-block px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 text-[11px]">
                      {row.period}
                    </span>
                  </td>

                  {/* Beat/Miss */}
                  <td className="px-3 py-2 text-center border-r border-gray-100">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                      row.beatMiss === 'Beat' ? 'bg-green-100 text-green-700' :
                      row.beatMiss === 'Miss' ? 'bg-red-100 text-red-700' :
                      row.beatMiss === 'Inline' ? 'bg-gray-100 text-gray-600' :
                      'text-gray-400'
                    }`}>
                      {row.beatMiss}
                    </span>
                  </td>

                  {/* 结论 */}
                  <td className="px-3 py-2 border-r border-gray-100">
                    <span className="text-gray-700 leading-relaxed">{row.conclusion || '-'}</span>
                  </td>

                  {/* 核心驱动 */}
                  <td className="px-3 py-2 border-r border-gray-100">
                    <span className="text-gray-600">{row.keyDriver || '-'}</span>
                  </td>

                  {/* 核心风险 */}
                  <td className="px-3 py-2 border-r border-gray-100">
                    <span className="text-gray-600">{row.keyRisk || '-'}</span>
                  </td>

                  {/* 净影响 */}
                  <td className="px-3 py-2 text-center border-r border-gray-100">
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium ${
                      row.netImpact === '更强' ? 'bg-green-50 text-green-600' :
                      row.netImpact === '更弱' ? 'bg-red-50 text-red-600' :
                      row.netImpact === '不变' ? 'bg-gray-50 text-gray-500' :
                      'text-gray-400'
                    }`}>
                      {row.netImpact === '更强' && <TrendingUp className="h-3 w-3" />}
                      {row.netImpact === '更弱' && <TrendingDown className="h-3 w-3" />}
                      {row.netImpact === '不变' && <Minus className="h-3 w-3" />}
                      {row.netImpact}
                    </span>
                  </td>

                  {/* 建议 */}
                  <td className="px-3 py-2 border-r border-gray-100">
                    <span className="text-gray-600">{row.recommendation || '-'}</span>
                  </td>

                  {/* 检查点 */}
                  <td className="px-3 py-2 border-r border-gray-100">
                    <span className="text-gray-500">{row.checkpoint || '-'}</span>
                  </td>

                  {/* 日期 */}
                  <td className="px-3 py-2 text-center text-gray-400">
                    {row.analysisDate}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-1.5 text-[11px] text-gray-400">
        <div className="flex items-center justify-between">
          <span>显示 {filteredAndSorted.length} / {coreConclusions.length} 条记录</span>
          <span>点击列头排序 · 支持搜索和筛选</span>
        </div>
      </div>
    </div>
  )
}
