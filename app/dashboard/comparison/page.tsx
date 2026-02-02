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
  Cpu,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CompanyInvestmentData {
  id: string
  company_name: string
  company_symbol: string
  fiscal_year: number
  fiscal_quarter?: number
  created_at: string
  category?: string
  
  // 核心投资结论 - 从分析结果中提取
  one_line_conclusion: string
  net_impact: string
  recommendation: string
  confidence: string
  concerns: string
  watch_list: string
  long_term_narrative: string
  
  // 驱动因素
  demand_driver: string
  monetization_driver: string
  efficiency_driver: string
  
  // 风险与检查点
  main_risks: string[]
  checkpoints: string[]
  
  // 投委会总结
  investment_committee_summary: string
}

export default function ComparisonPage() {
  const [companyData, setCompanyData] = useState<CompanyInvestmentData[]>([])
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
      
      // 处理分析数据，提取核心投资结论
      const processedData: CompanyInvestmentData[] = (data.analyses || [])
        .filter((a: any) => a.processed && !a.error)
        .map((analysis: any) => {
          // 提取投资建议
          let recommendation = '标配'
          if (analysis.final_judgment?.recommendation) {
            const rec = analysis.final_judgment.recommendation
            if (rec.includes('超配') || rec.toLowerCase().includes('overweight')) {
              recommendation = '超配'
            } else if (rec.includes('低配') || rec.toLowerCase().includes('underweight')) {
              recommendation = '低配'
            }
          }
          
          // 提取驱动因素
          const demandDriver = analysis.drivers?.demand?.change || '-'
          const monetizationDriver = analysis.drivers?.monetization?.change || '-'
          const efficiencyDriver = analysis.drivers?.efficiency?.change || '-'
          
          return {
            id: analysis.id,
            company_name: analysis.company_name || '未知公司',
            company_symbol: analysis.company_symbol || '-',
            fiscal_year: analysis.fiscal_year || new Date().getFullYear(),
            fiscal_quarter: analysis.fiscal_quarter,
            created_at: analysis.created_at,
            category: analysis.metadata?.company_category,
            
            one_line_conclusion: analysis.one_line_conclusion || '-',
            net_impact: analysis.final_judgment?.net_impact || '-',
            recommendation,
            confidence: analysis.final_judgment?.confidence || '-',
            concerns: analysis.final_judgment?.concerns || '-',
            watch_list: analysis.final_judgment?.watch_list || '-',
            long_term_narrative: analysis.final_judgment?.long_term_narrative || '-',
            
            demand_driver: demandDriver,
            monetization_driver: monetizationDriver,
            efficiency_driver: efficiencyDriver,
            
            main_risks: analysis.sustainability_risks?.main_risks || [],
            checkpoints: analysis.sustainability_risks?.checkpoints || [],
            
            investment_committee_summary: analysis.investment_committee_summary || '-',
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
      let aVal: any = a[sortField as keyof CompanyInvestmentData]
      let bVal: any = b[sortField as keyof CompanyInvestmentData]
      
      if (sortField === 'created_at') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })

  const getNetImpactBadge = (value: string) => {
    const lower = value.toLowerCase()
    if (lower.includes('strong beat')) {
      return <Badge className="bg-green-600 text-white hover:bg-green-600">Strong Beat</Badge>
    }
    if (lower.includes('beat') || lower.includes('更强')) {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Beat</Badge>
    }
    if (lower.includes('strong miss')) {
      return <Badge className="bg-red-600 text-white hover:bg-red-600">Strong Miss</Badge>
    }
    if (lower.includes('miss') || lower.includes('更弱')) {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Miss</Badge>
    }
    return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Inline</Badge>
  }

  const getRecommendationBadge = (value: string) => {
    if (value === '超配') {
      return (
        <Badge className="bg-green-500 text-white hover:bg-green-500">
          <TrendingUp className="h-3 w-3 mr-1" />
          超配
        </Badge>
      )
    }
    if (value === '低配') {
      return (
        <Badge className="bg-red-500 text-white hover:bg-red-500">
          <TrendingDown className="h-3 w-3 mr-1" />
          低配
        </Badge>
      )
    }
    return (
      <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
        <Minus className="h-3 w-3 mr-1" />
        标配
      </Badge>
    )
  }

  const exportToCSV = () => {
    const headers = [
      '公司', '代码', '报告期', '分析日期', '净影响', '投资建议',
      '一句话结论', '更有信心的点', '更担心的点', '接下来要盯',
      '需求驱动', '变现驱动', '效率驱动',
      '主要风险', '检查点', '投委会总结'
    ]
    
    const rows = filteredData.map(d => [
      d.company_name,
      d.company_symbol,
      d.fiscal_quarter ? `Q${d.fiscal_quarter} ${d.fiscal_year}` : `FY ${d.fiscal_year}`,
      new Date(d.created_at).toLocaleDateString('zh-CN'),
      d.net_impact,
      d.recommendation,
      d.one_line_conclusion,
      d.confidence,
      d.concerns,
      d.watch_list,
      d.demand_driver,
      d.monetization_driver,
      d.efficiency_driver,
      d.main_risks.join('；'),
      d.checkpoints.join('；'),
      d.investment_committee_summary
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `投资结论对比_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 统计
  const stats = {
    total: filteredData.length,
    overweight: filteredData.filter(d => d.recommendation === '超配').length,
    underweight: filteredData.filter(d => d.recommendation === '低配').length,
    neutral: filteredData.filter(d => d.recommendation === '标配').length,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">加载投资结论对比...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={loadComparisonData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              重试
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* 页面标题 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <FileSpreadsheet className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">投资结论横向对比</h1>
            <p className="text-gray-500 text-sm mt-1">
              汇总所有分析报告的核心投资结论，支持对比和导出
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadComparisonData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Button onClick={exportToCSV} className="bg-gradient-to-r from-green-600 to-emerald-600">
            <Download className="h-4 w-4 mr-2" />
            导出CSV
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">总分析数</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.overweight}</div>
            <div className="text-sm text-green-700">超配建议</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.neutral}</div>
            <div className="text-sm text-gray-500">标配建议</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.underweight}</div>
            <div className="text-sm text-red-700">低配建议</div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选器 */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-500">筛选：</span>
        <Button
          variant={categoryFilter === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter(null)}
        >
          全部
        </Button>
        <Button
          variant={categoryFilter === 'AI应用' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('AI应用')}
        >
          <Building2 className="h-3.5 w-3.5 mr-1" />
          AI应用公司
        </Button>
        <Button
          variant={categoryFilter === 'AI供应链' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('AI供应链')}
        >
          <Cpu className="h-3.5 w-3.5 mr-1" />
          AI供应链公司
        </Button>
      </div>

      {/* 对比表格 */}
      {filteredData.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Table2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无分析数据</h3>
            <p className="text-gray-500">
              上传财报并完成分析后，投资结论将自动汇总到此表格
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    公司
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      报告期
                      {sortField === 'created_at' && (
                        sortDirection === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    净影响
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    投资建议
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider max-w-md">
                    一句话结论
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    更有信心
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    更担心
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    详情
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.map((company) => (
                  <>
                    <tr 
                      key={company.id} 
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
                            {company.company_symbol?.slice(0, 2) || '??'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{company.company_name}</div>
                            <div className="text-xs text-gray-500">{company.company_symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {company.fiscal_quarter ? `Q${company.fiscal_quarter}` : 'FY'} {company.fiscal_year}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(company.created_at).toLocaleDateString('zh-CN')}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {getNetImpactBadge(company.net_impact)}
                      </td>
                      <td className="px-4 py-4">
                        {getRecommendationBadge(company.recommendation)}
                      </td>
                      <td className="px-4 py-4 max-w-md">
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {company.one_line_conclusion}
                        </p>
                      </td>
                      <td className="px-4 py-4 max-w-xs">
                        <p className="text-sm text-green-700 line-clamp-2">
                          {company.confidence}
                        </p>
                      </td>
                      <td className="px-4 py-4 max-w-xs">
                        <p className="text-sm text-red-700 line-clamp-2">
                          {company.concerns}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpand(company.id)}
                        >
                          {expandedRows.has(company.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                    
                    {/* 展开的详情行 */}
                    {expandedRows.has(company.id) && (
                      <tr key={`${company.id}-detail`} className="bg-gray-50">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* 驱动因素 */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-900 text-sm">增长驱动</h4>
                              <div className="space-y-2">
                                <div className="p-3 bg-green-50 rounded-lg">
                                  <div className="text-xs font-medium text-green-700 mb-1">需求/量</div>
                                  <div className="text-sm text-green-900">{company.demand_driver}</div>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg">
                                  <div className="text-xs font-medium text-blue-700 mb-1">变现/单价</div>
                                  <div className="text-sm text-blue-900">{company.monetization_driver}</div>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-lg">
                                  <div className="text-xs font-medium text-amber-700 mb-1">内部效率</div>
                                  <div className="text-sm text-amber-900">{company.efficiency_driver}</div>
                                </div>
                              </div>
                            </div>
                            
                            {/* 风险与检查点 */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-900 text-sm">风险与检查点</h4>
                              <div className="p-3 bg-red-50 rounded-lg">
                                <div className="text-xs font-medium text-red-700 mb-2">主要风险</div>
                                <ul className="space-y-1">
                                  {company.main_risks.slice(0, 3).map((risk, idx) => (
                                    <li key={idx} className="text-sm text-red-900 flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                                      {risk}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="p-3 bg-indigo-50 rounded-lg">
                                <div className="text-xs font-medium text-indigo-700 mb-2">接下来要盯</div>
                                <div className="text-sm text-indigo-900">{company.watch_list}</div>
                              </div>
                            </div>
                            
                            {/* 投委会总结 */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-900 text-sm">投委会总结</h4>
                              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <div className="text-sm text-amber-900 leading-relaxed">
                                  {company.investment_committee_summary}
                                </div>
                              </div>
                              <div className="p-3 bg-purple-50 rounded-lg">
                                <div className="text-xs font-medium text-purple-700 mb-1">对长期叙事的影响</div>
                                <div className="text-sm text-purple-900">{company.long_term_narrative}</div>
                              </div>
                            </div>
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
