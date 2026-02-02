'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { 
  ArrowLeft, 
  GitCompare, 
  Loader2, 
  Building2, 
  Cpu, 
  CheckCircle2,
  BarChart3,
  Download,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'

// Company categories - as specified by user
const COMPANY_CATEGORIES = {
  AI_APPLICATION: {
    name: 'AI Application Companies',
    nameZh: 'AI应用公司',
    icon: Building2,
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-600',
    companies: [
      { symbol: 'MSFT', name: 'Microsoft', nameZh: '微软' },
      { symbol: 'GOOGL', name: 'Alphabet (Google)', nameZh: '谷歌' },
      { symbol: 'AMZN', name: 'Amazon', nameZh: '亚马逊' },
      { symbol: 'META', name: 'Meta Platforms', nameZh: 'Meta' },
      { symbol: 'CRM', name: 'Salesforce', nameZh: 'Salesforce' },
      { symbol: 'NOW', name: 'ServiceNow', nameZh: 'ServiceNow' },
      { symbol: 'PLTR', name: 'Palantir', nameZh: 'Palantir' },
      { symbol: 'AAPL', name: 'Apple', nameZh: '苹果' },
      { symbol: 'APP', name: 'AppLovin', nameZh: 'AppLovin' },
      { symbol: 'ADBE', name: 'Adobe', nameZh: 'Adobe' },
    ]
  },
  AI_SUPPLY_CHAIN: {
    name: 'AI Supply Chain Companies',
    nameZh: 'AI供应链公司',
    icon: Cpu,
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-600',
    companies: [
      { symbol: 'NVDA', name: 'Nvidia', nameZh: '英伟达' },
      { symbol: 'AMD', name: 'AMD', nameZh: 'AMD' },
      { symbol: 'AVGO', name: 'Broadcom', nameZh: '博通' },
      { symbol: 'TSM', name: 'TSMC', nameZh: '台积电' },
      { symbol: '000660.KS', name: 'SK Hynix', nameZh: 'SK海力士' },
      { symbol: 'MU', name: 'Micron', nameZh: '美光' },
      { symbol: '005930.KS', name: 'Samsung Electronics', nameZh: '三星电子' },
      { symbol: 'INTC', name: 'Intel', nameZh: '英特尔' },
      { symbol: 'VRT', name: 'Vertiv', nameZh: 'Vertiv' },
      { symbol: 'ETN', name: 'Eaton', nameZh: '伊顿' },
      { symbol: 'GEV', name: 'GE Vernova', nameZh: 'GE Vernova' },
      { symbol: 'VST', name: 'Vistra', nameZh: 'Vistra' },
      { symbol: 'ASML', name: 'ASML', nameZh: '阿斯麦' },
      { symbol: 'SNPS', name: 'Synopsys', nameZh: '新思科技' },
    ]
  }
}

export default function ComparisonPage() {
  const t = useTranslations()
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<'AI_APPLICATION' | 'AI_SUPPLY_CHAIN' | null>(null)
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [isComparing, setIsComparing] = useState(false)
  const [comparisonResult, setComparisonResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [comparisonHistory, setComparisonHistory] = useState<any[]>([])

  useEffect(() => {
    loadComparisonHistory()
  }, [])

  const loadComparisonHistory = async () => {
    try {
      const response = await fetch('/api/comparison')
      if (response.ok) {
        const data = await response.json()
        setComparisonHistory(data.comparisons || [])
      }
    } catch (error) {
      console.error('Failed to load comparison history:', error)
    }
  }

  const handleCategorySelect = (category: 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN') => {
    setSelectedCategory(category)
    setSelectedCompanies([])
    setComparisonResult(null)
    setError(null)
  }

  const handleCompanyToggle = (symbol: string) => {
    setSelectedCompanies(prev => {
      if (prev.includes(symbol)) {
        return prev.filter(s => s !== symbol)
      }
      return [...prev, symbol]
    })
  }

  const handleSelectAll = () => {
    if (!selectedCategory) return
    const allSymbols = COMPANY_CATEGORIES[selectedCategory].companies.map(c => c.symbol)
    setSelectedCompanies(allSymbols)
  }

  const handleClearAll = () => {
    setSelectedCompanies([])
  }

  const handleCompare = async () => {
    if (selectedCompanies.length < 2) {
      setError(t('comparison.minTwoCompanies'))
      return
    }

    setIsComparing(true)
    setComparisonResult(null)
    setError(null)

    try {
      const response = await fetch('/api/comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          companySymbols: selectedCompanies
        })
      })

      const data = await response.json()

      if (data.success || data.comparison_content) {
        setComparisonResult(data.comparison_content)
        loadComparisonHistory()
      } else {
        setError(data.error || t('comparison.comparisonFailed'))
      }
    } catch (error: any) {
      console.error('Comparison error:', error)
      setError(error.message || t('comparison.comparisonFailed'))
    } finally {
      setIsComparing(false)
    }
  }

  // Show comparison result
  if (comparisonResult) {
    const categoryInfo = selectedCategory ? COMPANY_CATEGORIES[selectedCategory] : null
    
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setComparisonResult(null)}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{t('comparison.result')}</h1>
                  <p className="text-gray-500 mt-1">
                    {categoryInfo?.name} · {selectedCompanies.length} {t('comparison.companies')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setComparisonResult(null)
                  setSelectedCompanies([])
                }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('comparison.recompare')}
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  {t('common.export')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Selected Companies */}
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedCompanies.map(symbol => {
              const company = categoryInfo?.companies.find(c => c.symbol === symbol)
              return (
                <span
                  key={symbol}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedCategory === 'AI_APPLICATION' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {symbol} · {company?.name}
                </span>
              )
            })}
          </div>

          {/* Comparison Content */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-gray-50">{children}</thead>
                    ),
                    th: ({ children }) => (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-4 py-3 text-sm text-gray-700 border-t border-gray-100">
                        {children}
                      </td>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold text-gray-900 mt-6 mb-4">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-semibold text-gray-900 mt-5 mb-3 flex items-center gap-2">
                        <span className={`w-1 h-5 rounded-full ${
                          selectedCategory === 'AI_APPLICATION' ? 'bg-blue-600' : 'bg-purple-600'
                        }`}></span>
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">{children}</h3>
                    ),
                    ul: ({ children }) => (
                      <ul className="space-y-1 my-3">{children}</ul>
                    ),
                    li: ({ children }) => (
                      <li className="flex items-start gap-2 text-gray-700">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                        <span>{children}</span>
                      </li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-gray-900">{children}</strong>
                    ),
                    p: ({ children }) => (
                      <p className="text-gray-700 my-2 leading-relaxed">{children}</p>
                    ),
                  }}
                >
                  {comparisonResult}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('comparison.title')}</h1>
              <p className="text-gray-500 mt-1">{t('comparison.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Selection */}
          <div className="lg:col-span-1 space-y-6">
            {/* Category Selection */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-600" />
                  {t('comparison.selectCategory')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(COMPANY_CATEGORIES).map(([key, category]) => {
                  const Icon = category.icon
                  const isSelected = selectedCategory === key
                  return (
                    <button
                      key={key}
                      onClick={() => handleCategorySelect(key as 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN')}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? `${category.borderColor} ${category.bgColor}`
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          isSelected ? category.bgColor : 'bg-gray-100'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            isSelected ? category.textColor : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <p className={`font-semibold ${isSelected ? 'text-gray-900' : 'text-gray-900'}`}>
                            {category.name}
                          </p>
                          <p className="text-sm text-gray-500">{category.companies.length} companies</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </CardContent>
            </Card>

            {/* Company Selection */}
            {selectedCategory && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{t('comparison.selectCompanies')}</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleSelectAll}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleClearAll}>
                        Clear
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('comparison.selectedCount', { count: selectedCompanies.length })}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {COMPANY_CATEGORIES[selectedCategory].companies.map(company => {
                      const isSelected = selectedCompanies.includes(company.symbol)
                      const categoryInfo = COMPANY_CATEGORIES[selectedCategory]
                      return (
                        <button
                          key={company.symbol}
                          onClick={() => handleCompanyToggle(company.symbol)}
                          className={`w-full p-3 rounded-lg border transition-all text-left flex items-center justify-between ${
                            isSelected
                              ? `${categoryInfo.borderColor} ${categoryInfo.bgColor}`
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div>
                            <p className="font-medium text-gray-900">{company.name}</p>
                            <p className="text-sm text-gray-500">{company.symbol}</p>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className={`h-5 w-5 ${categoryInfo.textColor}`} />
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <Button
                    className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600"
                    onClick={handleCompare}
                    disabled={isComparing || selectedCompanies.length < 2}
                  >
                    {isComparing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('comparison.comparing')}
                      </>
                    ) : (
                      <>
                        <GitCompare className="h-4 w-4 mr-2" />
                        {t('comparison.startComparison')} ({selectedCompanies.length})
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* History */}
            {comparisonHistory.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {comparisonHistory.slice(0, 5).map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => setComparisonResult(item.comparison_content)}
                        className="w-full p-3 rounded-lg border border-gray-200 hover:border-gray-300 bg-white text-left"
                      >
                        <p className="font-medium text-gray-900 text-sm">
                          {item.category === 'AI_APPLICATION' ? 'AI Application Companies' : 'AI Supply Chain Companies'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Instructions or Loading */}
          <div className="lg:col-span-2">
            {!isComparing && (
              <Card className="border-0 shadow-sm h-full flex items-center justify-center min-h-[500px]">
                <CardContent className="text-center py-12">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-6">
                    <GitCompare className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Select companies to compare</h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-6">
                    Choose a category and select companies from the left panel. The system will generate 
                    a comprehensive comparison report based on the latest financial data, including 
                    key metrics comparison, competitive analysis, and investment recommendations.
                  </p>
                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-left">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-600 mb-2" />
                      <p className="text-sm font-medium text-blue-900">{t('comparison.aiApplication')}</p>
                      <p className="text-xs text-blue-700">10 tech giants</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <Cpu className="h-5 w-5 text-purple-600 mb-2" />
                      <p className="text-sm font-medium text-purple-900">{t('comparison.aiSupplyChain')}</p>
                      <p className="text-xs text-purple-700">14 infrastructure</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isComparing && (
              <Card className="border-0 shadow-sm h-full flex items-center justify-center min-h-[500px]">
                <CardContent className="text-center py-12">
                  <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Generating comparison analysis...</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    AI is analyzing financial data from {selectedCompanies.length} companies 
                    to generate a detailed comparison report. Please wait...
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {selectedCompanies.map(symbol => (
                      <span
                        key={symbol}
                        className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-sm font-medium text-gray-700"
                      >
                        {symbol}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
