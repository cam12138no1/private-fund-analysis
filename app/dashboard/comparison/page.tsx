'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, GitCompare, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

export default function ComparisonPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([])
  const [isComparing, setIsComparing] = useState(false)
  const [comparisonResult, setComparisonResult] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN'>('all')

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/reports')
      const data = await response.json()
      
      if (data.companies) {
        // Filter companies that have analyzed reports
        const companiesWithReports = data.companies.filter((c: any) => 
          c.reports && c.reports.some((r: any) => r.processed && r.analysis)
        )
        setCompanies(companiesWithReports)
      }
    } catch (error) {
      console.error('Failed to load companies:', error)
    }
  }

  const handleCompanyToggle = (companyId: number) => {
    setSelectedCompanies(prev => {
      if (prev.includes(companyId)) {
        return prev.filter(id => id !== companyId)
      } else {
        return [...prev, companyId]
      }
    })
  }

  const handleCompare = async () => {
    if (selectedCompanies.length < 2) {
      alert('请至少选择2家公司进行对比')
      return
    }

    setIsComparing(true)
    setComparisonResult(null)

    try {
      const response = await fetch('/api/comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyIds: selectedCompanies,
          metrics: []
        })
      })

      const data = await response.json()

      if (data.success) {
        setComparisonResult(data.comparison_content)
      } else {
        alert(data.error || '对比失败')
      }
    } catch (error) {
      console.error('Comparison error:', error)
      alert('对比过程中出错')
    } finally {
      setIsComparing(false)
    }
  }

  const filteredCompanies = filter === 'all' 
    ? companies 
    : companies.filter(c => c.category === filter)

  if (comparisonResult) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setComparisonResult(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">横向对比结果</h1>
              <p className="text-gray-600 mt-1">
                已对比 {selectedCompanies.length} 家公司
              </p>
            </div>
          </div>
          <Button onClick={() => {
            setComparisonResult(null)
            setSelectedCompanies([])
          }}>
            重新对比
          </Button>
        </div>

        <Card>
          <CardContent className="prose max-w-none p-6">
            <ReactMarkdown>{comparisonResult}</ReactMarkdown>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">同赛道公司横向对比</h1>
          <p className="text-gray-600 mt-1">选择2家以上公司进行关键指标对比</p>
        </div>
        <Button 
          onClick={handleCompare} 
          disabled={selectedCompanies.length < 2 || isComparing}
          size="lg"
        >
          {isComparing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              分析中...
            </>
          ) : (
            <>
              <GitCompare className="mr-2 h-5 w-5" />
              开始对比 ({selectedCompanies.length})
            </>
          )}
        </Button>
      </div>

      {/* Category Filter */}
      <div className="flex space-x-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          全部公司
        </Button>
        <Button
          variant={filter === 'AI_APPLICATION' ? 'default' : 'outline'}
          onClick={() => setFilter('AI_APPLICATION')}
        >
          AI应用公司
        </Button>
        <Button
          variant={filter === 'AI_SUPPLY_CHAIN' ? 'default' : 'outline'}
          onClick={() => setFilter('AI_SUPPLY_CHAIN')}
        >
          AI供应链公司
        </Button>
      </div>

      {/* Company Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCompanies.map(company => {
          const latestReport = company.reports[0]
          const isSelected = selectedCompanies.includes(company.id)

          return (
            <Card
              key={company.id}
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => handleCompanyToggle(company.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{company.symbol}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="h-5 w-5"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">类别</span>
                    <Badge variant={
                      company.category === 'AI_APPLICATION' ? 'default' : 'secondary'
                    }>
                      {company.category === 'AI_APPLICATION' ? 'AI应用' : 'AI供应链'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">最新财报</span>
                    <span className="text-sm font-medium">
                      {latestReport?.fiscal_quarter ? `Q${latestReport.fiscal_quarter} ` : ''}
                      {latestReport?.fiscal_year}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">分析状态</span>
                    <Badge variant={latestReport?.processed ? 'success' : 'outline'}>
                      {latestReport?.processed ? '已分析' : '未分析'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredCompanies.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <GitCompare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无可对比公司</h3>
            <p className="text-gray-600">请先上传并分析财报数据</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
