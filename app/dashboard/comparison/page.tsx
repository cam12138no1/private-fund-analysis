'use client'

import { useState, useEffect } from 'react'
import { 
  Table2, 
  Loader2, 
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Filter,
  Building2,
  Cpu
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// 公司分类
const COMPANY_CATEGORIES = {
  AI_APPLICATION: {
    name: 'AI应用公司',
    icon: Building2,
    color: 'blue',
  },
  AI_SUPPLY_CHAIN: {
    name: 'AI供应链公司',
    icon: Cpu,
    color: 'purple',
  }
}

// 关键指标定义
const KEY_METRICS = [
  { key: 'revenue', name: '营收', unit: '' },
  { key: 'revenue_growth', name: '营收增长', unit: '%' },
  { key: 'eps', name: 'EPS', unit: '' },
  { key: 'gross_margin', name: '毛利率', unit: '%' },
  { key: 'operating_margin', name: '营业利润率', unit: '%' },
  { key: 'net_income', name: '净利润', unit: '' },
  { key: 'guidance', name: '指引', unit: '' },
  { key: 'beat_miss', name: 'Beat/Miss', unit: '' },
]

interface CompanyData {
  id: string
  company_name: string
  company_symbol: string
  fiscal_year: number
  fiscal_quarter?: number
  created_at: string
  category?: string
  // 从results_table提取的关键指标
  metrics: {
    revenue?: string
    revenue_growth?: string
    eps?: string
    gross_margin?: string
    operating_margin?: string
    net_income?: string
    guidance?: string
    beat_miss?: string
  }
  // 核心结论
  one_line_conclusion?: string
  net_impact?: string
  recommendation?: string
}

export default function ComparisonPage() {
  const [companyData, setCompanyData] = useState<CompanyData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<string>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadComparisonData()
  }, [])

  const loadComparisonData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/dashboard')
      if (!response.ok) throw new Error('加载数据失败')
      
      const data = await response.json()
      
      // 处理分析数据，提取关键指标
      const processedData: CompanyData[] = (data.analyses || [])
        .filter((a: any) => a.processed && !a.error)
        .map((analysis: any) => {
          // 从results_table提取指标
          const metrics: CompanyData['metrics'] = {}
          
          if (analysis.results_table && Array.isArray(analysis.results_table)) {
            analysis.results_table.forEach((row: any) => {
              const metricLower = (row.metric || '').toLowerCase()
              
              if (metricLower.includes('营收') || metricLower.includes('revenue')) {
                metrics.revenue = row.actual
                // 尝试从delta提取增长率
                if (row.delta) {
                  metrics.revenue_growth = row.delta
                }
              }
              if (metricLower.includes('eps') || metricLower.includes('每股收益')) {
                metrics.eps = row.actual
              }
              if (metricLower.includes('毛利率') || metricLower.includes('gross margin')) {
                metrics.gross_margin = row.actual
              }
              if (metricLower.includes('营业利润率') || metricLower.includes('operating margin')) {
                metrics.operating_margin = row.actual
              }
              if (metricLower.includes('净利润') || metricLower.includes('net income')) {
                metrics.net_income = row.actual
              }
              if (metricLower.includes('指引') || metricLower.includes('guidance')) {
                metrics.guidance = row.actual
              }
            })
          }
          
          // 从one_line_conclusion提取Beat/Miss
          const conclusion = analysis.one_line_conclusion || ''
          if (conclusion.toLowerCase().includes('beat') || conclusion.includes('超预期')) {
            metrics.beat_miss = 'Beat'
          } else if (conclusion.toLowerCase().includes('miss') || conclusion.includes('不及预期')) {
            metrics.beat_miss = 'Miss'
          } else if (conclusion.includes('符合预期') || conclusion.toLowerCase().includes('inline')) {
            metrics.beat_miss = 'Inline'
          }
          
          return {
            id: analysis.id,
            company_name: analysis.company_name,
            company_symbol: analysis.company_symbol,
            fiscal_year: analysis.fiscal_year,
            fiscal_quarter: analysis.fiscal_quarter,
            created_at: analysis.created_at,
            category: analysis.metadata?.company_category,
            metrics,
            one_line_conclusion: analysis.one_line_conclusion,
            net_impact: analysis.final_judgment?.net_impact,
            recommendation: analysis.final_judgment?.recommendation,
          }
        })
      
      setCompanyData(processedData)
    } catch (err: any) {
      console.error('加载对比数据失败:', err)
      setError(err.message || '加载数据失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const toggleRowExpand = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  // 过滤和排序数据
  const filteredData = companyData
    .filter(d => !categoryFilter || d.category?.includes(categoryFilter))
    .sort((a, b) => {
      let aVal: any = a[sortField as keyof CompanyData]
      let bVal: any = b[sortField as keyof CompanyData]
      
      if (sortField === 'created_at') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })

  const getBeatMissBadge = (value?: string) => {
    if (!value) return null
    
    if (value === 'Beat') {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          <TrendingUp className="h-3 w-3 mr-1" />
          Beat
        </Badge>
      )
    }
    if (value === 'Miss') {
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
          <TrendingDown className="h-3 w-3 mr-1" />
          Miss
        </Badge>
      )
    }
    return (
      <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
        <Minus className="h-3 w-3 mr-1" />
        Inline
      </Badge>
    )
  }

  const getNetImpactBadge = (value?: string) => {
    if (!value) return null
    
    if (value.includes('更强') || value.toLowerCase().includes('positive')) {
      return <Badge className="bg-green-100 text-green-700">更强</Badge>
    }
    if (value.includes('更弱') || value.toLowerCase().includes('negative')) {
      return <Badge className="bg-red-100 text-red-700">更弱</Badge>
    }
    return <Badge className="bg-gray-100 text-gray-700">不变</Badge>
  }

  const exportToCSV = () => {
    const headers = ['公司', '代码', '财年', '季度', '营收', '营收增长', 'EPS', '毛利率', '营业利润率', 'Beat/Miss', '净影响', '分析日期']
    const rows = filteredData.map(d => [
      d.company_name,
      d.company_symbol,
      d.fiscal_year,
      d.fiscal_quarter || '-',
      d.metrics.revenue || '-',
      d.metrics.revenue_growth || '-',
      d.metrics.eps || '-',
      d.metrics.gross_margin || '-',
      d.metrics.operating_margin || '-',
      d.metrics.beat_miss || '-',
      d.net_impact || '-',
      new Date(d.created_at).toLocaleDateString('zh-CN')
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `公司对比表_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Table2 className="h-6 w-6 text-purple-600" />
              横向对比表
            </h1>
            <p className="text-gray-500 mt-1">
              自动汇总所有已分析公司的关键指标，支持排序和筛选
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadComparisonData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button variant="outline" onClick={exportToCSV} disabled={filteredData.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              导出CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="mb-6 border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter className="h-4 w-4" />
              筛选:
            </div>
            <Button
              variant={categoryFilter === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(null)}
            >
              全部 ({companyData.length})
            </Button>
            <Button
              variant={categoryFilter === 'AI应用' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter('AI应用')}
              className={categoryFilter === 'AI应用' ? 'bg-blue-600' : ''}
            >
              <Building2 className="h-4 w-4 mr-1" />
              AI应用公司
            </Button>
            <Button
              variant={categoryFilter === 'AI供应链' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter('AI供应链')}
              className={categoryFilter === 'AI供应链' ? 'bg-purple-600' : ''}
            >
              <Cpu className="h-4 w-4 mr-1" />
              AI供应链公司
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-500">加载中...</span>
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-500">
              {error}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-20">
              <Table2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无分析数据</p>
              <p className="text-sm text-gray-400 mt-1">上传并分析财报后，数据将自动显示在此表格中</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                      公司
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('fiscal_year')}
                    >
                      <div className="flex items-center gap-1">
                        报告期
                        {sortField === 'fiscal_year' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      营收
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      营收增长
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      EPS
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      毛利率
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      营业利润率
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      指引
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Beat/Miss
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      净影响
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center gap-1">
                        分析日期
                        {sortField === 'created_at' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map((company) => (
                    <>
                      <tr 
                        key={company.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => toggleRowExpand(company.id)}
                      >
                        <td className="px-4 py-4 sticky left-0 bg-white z-10">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                              company.category?.includes('AI应用') ? 'bg-blue-500' : 'bg-purple-500'
                            }`}>
                              {company.company_symbol.slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{company.company_name}</p>
                              <p className="text-xs text-gray-500">{company.company_symbol}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          FY{company.fiscal_year}{company.fiscal_quarter ? ` Q${company.fiscal_quarter}` : ''}
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                          {company.metrics.revenue || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`font-medium ${
                            company.metrics.revenue_growth?.includes('+') ? 'text-green-600' : 
                            company.metrics.revenue_growth?.includes('-') ? 'text-red-600' : 'text-gray-700'
                          }`}>
                            {company.metrics.revenue_growth || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                          {company.metrics.eps || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {company.metrics.gross_margin || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {company.metrics.operating_margin || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-[150px] truncate">
                          {company.metrics.guidance || '-'}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {getBeatMissBadge(company.metrics.beat_miss)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {getNetImpactBadge(company.net_impact)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {new Date(company.created_at).toLocaleDateString('zh-CN')}
                        </td>
                      </tr>
                      {/* Expanded Row */}
                      {expandedRows.has(company.id) && (
                        <tr className="bg-gray-50">
                          <td colSpan={11} className="px-4 py-4">
                            <div className="space-y-2">
                              <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase">一句话结论:</span>
                                <p className="text-sm text-gray-700 mt-1">{company.one_line_conclusion || '暂无'}</p>
                              </div>
                              {company.recommendation && (
                                <div>
                                  <span className="text-xs font-semibold text-gray-500 uppercase">投资建议:</span>
                                  <p className="text-sm text-gray-700 mt-1">{company.recommendation}</p>
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
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {filteredData.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">总计公司</p>
              <p className="text-2xl font-bold text-gray-900">{filteredData.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Beat</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredData.filter(d => d.metrics.beat_miss === 'Beat').length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Miss</p>
              <p className="text-2xl font-bold text-red-600">
                {filteredData.filter(d => d.metrics.beat_miss === 'Miss').length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Inline</p>
              <p className="text-2xl font-bold text-gray-600">
                {filteredData.filter(d => d.metrics.beat_miss === 'Inline').length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
