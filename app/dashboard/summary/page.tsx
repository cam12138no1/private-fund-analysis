'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
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
  netImpact: 'Stronger' | 'Weaker' | 'Unchanged' | '-'
  recommendation: string
  checkpoint: string
  analysisDate: string
}

type SortField = 'company' | 'period' | 'beatMiss' | 'netImpact' | 'analysisDate'
type SortDirection = 'asc' | 'desc'

function extractCoreConclusions(analysis: AnalysisSummary, locale: string): CoreConclusion {
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
  if (/强|strong/i.test(netImpactRaw)) netImpact = 'Stronger'
  else if (/弱|weak/i.test(netImpactRaw)) netImpact = 'Weaker'
  else if (netImpactRaw) netImpact = 'Unchanged'

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
    analysisDate: new Date(analysis.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US'),
  }
}

export default function SummaryPage() {
  const t = useTranslations('summary')
  const locale = useLocale()
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
    return analyses.map(a => extractCoreConclusions(a, locale))
  }, [analyses, locale])

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

    const headerRow = [t('company'), t('symbol'), t('period'), 'Beat/Miss', t('oneLineConclusion'), t('keyDriver'), t('keyRisk'), t('netImpact'), t('recommendation'), t('checkpoint'), t('date')]
    const dataRows = filteredAndSorted.map(c => [
      c.company, c.symbol, c.period, c.beatMiss, c.conclusion,
      c.keyDriver, c.keyRisk, c.netImpact, c.recommendation, c.checkpoint, c.analysisDate,
    ])

    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows])
    ws['!cols'] = [
      { wch: 16 }, { wch: 8 }, { wch: 11 }, { wch: 9 }, { wch: 45 },
      { wch: 35 }, { wch: 30 }, { wch: 10 }, { wch: 30 }, { wch: 25 }, { wch: 11 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, t('coreConclusions'))
    XLSX.writeFile(wb, `Core_Conclusions_${new Date().toISOString().split('T')[0]}.xlsx`)
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
            <h1 className="text-lg font-semibold text-gray-900">{t('title')}</h1>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-500">
                {t('total')} <span className="font-semibold text-gray-900">{filteredAndSorted.length}</span> {t('items')}
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
                placeholder={t('searchCompany')}
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
              <option value="">{t('netImpact')}</option>
              <option value="Stronger">{t('stronger')}</option>
              <option value="Weaker">{t('weaker')}</option>
              <option value="Unchanged">{t('unchanged')}</option>
            </select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs text-gray-500">
                <X className="h-3 w-3 mr-1" />
                {t('clear')}
              </Button>
            )}

            <div className="w-px h-5 bg-gray-200 mx-1" />

            <Button variant="ghost" size="sm" onClick={fetchData} className="h-7 px-2">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>

            <Button size="sm" onClick={exportToExcel} disabled={filteredAndSorted.length === 0} className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700">
              <Download className="h-3.5 w-3.5 mr-1" />
              {t('export')}
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
                  {t('company')} <SortIcon field="company" />
                </div>
              </th>
              <th 
                className="px-3 py-2 text-center font-medium text-gray-700 border-r border-gray-200 cursor-pointer hover:bg-gray-200 select-none w-24"
                onClick={() => handleSort('period')}
              >
                <div className="flex items-center justify-center gap-1">
                  {t('period')} <SortIcon field="period" />
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
                {t('oneLineConclusion')}
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200 min-w-[200px]">
                {t('keyDriver')}
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200 min-w-[180px]">
                {t('keyRisk')}
              </th>
              <th 
                className="px-3 py-2 text-center font-medium text-gray-700 border-r border-gray-200 cursor-pointer hover:bg-gray-200 select-none w-24"
                onClick={() => handleSort('netImpact')}
              >
                <div className="flex items-center justify-center gap-1">
                  {t('netImpact')} <SortIcon field="netImpact" />
                </div>
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200 min-w-[180px]">
                {t('recommendation')}
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200 min-w-[150px]">
                {t('checkpoint')}
              </th>
              <th 
                className="px-3 py-2 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-200 select-none w-24"
                onClick={() => handleSort('analysisDate')}
              >
                <div className="flex items-center justify-center gap-1">
                  {t('date')} <SortIcon field="analysisDate" />
                </div>
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                  {hasFilters ? t('noMatchingData') : t('noDataYet')}
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((row, idx) => (
                <tr 
                  key={row.id}
                  className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <td className="px-3 py-2.5 sticky left-0 bg-inherit border-r border-gray-100 z-10">
                    <div className="font-medium text-gray-900">{row.company}</div>
                    <div className="text-gray-500 text-[10px]">{row.symbol}</div>
                  </td>
                  <td className="px-3 py-2.5 text-center border-r border-gray-100 text-gray-700">
                    {row.period}
                  </td>
                  <td className="px-3 py-2.5 text-center border-r border-gray-100">
                    <span className={`inline-flex items-center justify-center w-14 py-0.5 rounded text-[10px] font-semibold ${
                      row.beatMiss === 'Beat' ? 'bg-green-100 text-green-700' :
                      row.beatMiss === 'Miss' ? 'bg-red-100 text-red-700' :
                      row.beatMiss === 'Inline' ? 'bg-gray-100 text-gray-700' :
                      'bg-gray-50 text-gray-400'
                    }`}>
                      {row.beatMiss}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 border-r border-gray-100 text-gray-700 leading-relaxed">
                    {row.conclusion || '-'}
                  </td>
                  <td className="px-3 py-2.5 border-r border-gray-100 text-gray-600">
                    {row.keyDriver || '-'}
                  </td>
                  <td className="px-3 py-2.5 border-r border-gray-100 text-gray-600">
                    {row.keyRisk || '-'}
                  </td>
                  <td className="px-3 py-2.5 text-center border-r border-gray-100">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                      row.netImpact === 'Stronger' ? 'bg-emerald-100 text-emerald-700' :
                      row.netImpact === 'Weaker' ? 'bg-red-100 text-red-700' :
                      row.netImpact === 'Unchanged' ? 'bg-gray-100 text-gray-600' :
                      'bg-gray-50 text-gray-400'
                    }`}>
                      {row.netImpact === 'Stronger' && <TrendingUp className="h-3 w-3" />}
                      {row.netImpact === 'Weaker' && <TrendingDown className="h-3 w-3" />}
                      {row.netImpact === 'Unchanged' && <Minus className="h-3 w-3" />}
                      {row.netImpact}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 border-r border-gray-100 text-gray-600">
                    {row.recommendation || '-'}
                  </td>
                  <td className="px-3 py-2.5 border-r border-gray-100 text-gray-500 text-[10px]">
                    {row.checkpoint || '-'}
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-500">
                    {row.analysisDate}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
