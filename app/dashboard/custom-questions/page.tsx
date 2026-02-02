'use client'

import { useState, useEffect } from 'react'
import { 
  ArrowLeft, 
  MessageSquarePlus, 
  Loader2, 
  Plus, 
  X,
  Lightbulb,
  BarChart3,
  TrendingUp,
  DollarSign,
  Target,
  FileQuestion,
  CheckCircle2,
  Building2,
  Cpu,
  History
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'

// 预设评价体系问题分类
const EVALUATION_CATEGORIES = {
  ROI: {
    name: 'ROI评估',
    icon: TrendingUp,
    color: 'green',
    questions: [
      'ROI如何体现？具体数据是什么？',
      '投资回报周期是多久？',
      '与历史ROI相比有何变化？',
      '主要投资项目的回报率分别是多少？'
    ]
  },
  EXPENSE_RATIO: {
    name: '支出收入比',
    icon: DollarSign,
    color: 'blue',
    questions: [
      '支出收入比是多少？如何界定好坏？',
      'R&D/Revenue比例是多少？与行业平均相比如何？',
      'S&M/Revenue比例趋势如何？',
      'G&A费用率是否在合理范围？'
    ]
  },
  CAPEX: {
    name: 'CapEx分析',
    icon: BarChart3,
    color: 'purple',
    questions: [
      'CapEx的主要投向是什么？',
      'CapEx/Revenue比例是多少？',
      '增长型CapEx vs 维护型CapEx占比？',
      'CapEx预期回报周期是多久？'
    ]
  },
  PROFITABILITY: {
    name: '盈利能力',
    icon: Target,
    color: 'amber',
    questions: [
      '毛利率变化的主要驱动因素？',
      '营业利润率趋势如何？',
      '净利率是否有一次性因素影响？',
      '与竞争对手的盈利能力对比？'
    ]
  },
  CASH_FLOW: {
    name: '现金流',
    icon: DollarSign,
    color: 'teal',
    questions: [
      'FCF/Revenue比例是多少？',
      'FCF/Net Income转化率如何？',
      '现金转化周期有何变化？',
      '自由现金流能否覆盖股息和回购？'
    ]
  }
}

// 公司分类
const COMPANY_CATEGORIES = {
  AI_APPLICATION: {
    name: 'AI应用公司',
    icon: Building2,
    color: 'blue',
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
    name: 'AI供应链公司',
    icon: Cpu,
    color: 'purple',
    companies: [
      { symbol: 'NVDA', name: 'Nvidia', nameZh: '英伟达' },
      { symbol: 'AMD', name: 'AMD', nameZh: 'AMD' },
      { symbol: 'AVGO', name: 'Broadcom', nameZh: '博通' },
      { symbol: 'TSM', name: 'TSMC', nameZh: '台积电' },
      { symbol: 'MU', name: 'Micron', nameZh: '美光' },
      { symbol: 'INTC', name: 'Intel', nameZh: '英特尔' },
      { symbol: 'VRT', name: 'Vertiv', nameZh: 'Vertiv' },
      { symbol: 'ETN', name: 'Eaton', nameZh: '伊顿' },
      { symbol: 'ASML', name: 'ASML', nameZh: '阿斯麦' },
      { symbol: 'SNPS', name: 'Synopsys', nameZh: '新思科技' },
    ]
  }
}

export default function CustomQuestionsPage() {
  const [selectedCategory, setSelectedCategory] = useState<'AI_APPLICATION' | 'AI_SUPPLY_CHAIN' | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<any>(null)
  const [questions, setQuestions] = useState<string[]>([''])
  const [isExtracting, setIsExtracting] = useState(false)
  const [qaResult, setQaResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvalCategory, setSelectedEvalCategory] = useState<string | null>(null)
  const [qaHistory, setQaHistory] = useState<any[]>([])

  useEffect(() => {
    loadQAHistory()
  }, [])

  const loadQAHistory = async () => {
    try {
      const response = await fetch('/api/custom-questions')
      if (response.ok) {
        const data = await response.json()
        setQaHistory(data.qas || [])
      }
    } catch (error) {
      console.error('Failed to load QA history:', error)
    }
  }

  const handleCategorySelect = (category: 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN') => {
    setSelectedCategory(category)
    setSelectedCompany(null)
    setQaResult(null)
    setError(null)
  }

  const handleCompanySelect = (company: any) => {
    setSelectedCompany(company)
    setQaResult(null)
    setError(null)
  }

  const handleAddQuestion = () => {
    setQuestions([...questions, ''])
  }

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...questions]
    newQuestions[index] = value
    setQuestions(newQuestions)
  }

  const handleUseSavedQuestion = (question: string) => {
    const emptyIndex = questions.findIndex(q => q === '')
    if (emptyIndex !== -1) {
      handleQuestionChange(emptyIndex, question)
    } else {
      setQuestions([...questions, question])
    }
  }

  const handleUseEvalCategory = (categoryKey: string) => {
    const category = EVALUATION_CATEGORIES[categoryKey as keyof typeof EVALUATION_CATEGORIES]
    if (category) {
      setQuestions(category.questions)
      setSelectedEvalCategory(categoryKey)
    }
  }

  const handleExtract = async () => {
    const validQuestions = questions.filter(q => q.trim() !== '')
    
    if (!selectedCompany) {
      setError('请先选择一家公司')
      return
    }

    if (validQuestions.length === 0) {
      setError('请至少输入一个问题')
      return
    }

    setIsExtracting(true)
    setQaResult(null)
    setError(null)

    try {
      const response = await fetch('/api/custom-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companySymbol: selectedCompany.symbol,
          companyName: selectedCompany.name,
          category: selectedCategory,
          questions: validQuestions,
          evaluationCategory: selectedEvalCategory
        })
      })

      const data = await response.json()

      if (data.success || data.answers) {
        setQaResult(data)
        loadQAHistory()
      } else {
        setError(data.error || '提取失败')
      }
    } catch (error: any) {
      console.error('Extraction error:', error)
      setError(error.message || '提取过程中出错')
    } finally {
      setIsExtracting(false)
    }
  }

  // 显示问答结果
  if (qaResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setQaResult(null)}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">问题回答结果</h1>
                  <p className="text-gray-500 mt-1">
                    {qaResult.company || selectedCompany?.name} ({qaResult.symbol || selectedCompany?.symbol})
                  </p>
                </div>
              </div>
              <Button onClick={() => {
                setQaResult(null)
                setQuestions([''])
                setSelectedEvalCategory(null)
              }}>
                提问新问题
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {(qaResult.answers || []).map((qa: any, index: number) => (
              <Card key={index} className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileQuestion className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-gray-900">{qa.question}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h2: ({ children }) => (
                          <h2 className="text-base font-semibold text-gray-900 mt-4 mb-2 flex items-center gap-2">
                            <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-sm font-semibold text-gray-800 mt-3 mb-1">{children}</h3>
                        ),
                        ul: ({ children }) => (
                          <ul className="space-y-1 my-2">{children}</ul>
                        ),
                        li: ({ children }) => (
                          <li className="flex items-start gap-2 text-gray-700 text-sm">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></span>
                            <span>{children}</span>
                          </li>
                        ),
                        p: ({ children }) => (
                          <p className="text-gray-700 my-2 text-sm leading-relaxed">{children}</p>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-gray-900">{children}</strong>
                        ),
                      }}
                    >
                      {qa.answer}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
              <h1 className="text-2xl font-bold text-gray-900">自定义问题与评价体系</h1>
              <p className="text-gray-500 mt-1">基于财报数据回答您关心的特定问题，支持预设评价体系</p>
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
                <CardTitle className="text-lg">选择公司</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category Tabs */}
                <div className="flex gap-2">
                  {Object.entries(COMPANY_CATEGORIES).map(([key, category]) => {
                    const Icon = category.icon
                    const isSelected = selectedCategory === key
                    return (
                      <button
                        key={key}
                        onClick={() => handleCategorySelect(key as 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN')}
                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? `border-${category.color}-500 bg-${category.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`h-5 w-5 mx-auto mb-1 ${
                          isSelected ? `text-${category.color}-600` : 'text-gray-600'
                        }`} />
                        <p className="text-xs font-medium text-center">{category.name}</p>
                      </button>
                    )
                  })}
                </div>

                {/* Company List */}
                {selectedCategory && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {COMPANY_CATEGORIES[selectedCategory].companies.map(company => {
                      const isSelected = selectedCompany?.symbol === company.symbol
                      return (
                        <button
                          key={company.symbol}
                          onClick={() => handleCompanySelect(company)}
                          className={`w-full p-3 rounded-lg border transition-all text-left flex items-center justify-between ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{company.name}</p>
                            <p className="text-xs text-gray-500">{company.symbol} · {company.nameZh}</p>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Evaluation Categories */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-gray-600" />
                  评价体系
                </CardTitle>
                <p className="text-sm text-gray-500">选择预设评价维度快速提问</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(EVALUATION_CATEGORIES).map(([key, category]) => {
                  const Icon = category.icon
                  const isSelected = selectedEvalCategory === key
                  return (
                    <button
                      key={key}
                      onClick={() => handleUseEvalCategory(key)}
                      className={`w-full p-3 rounded-lg border transition-all text-left flex items-center gap-3 ${
                        isSelected
                          ? `border-${category.color}-500 bg-${category.color}-50`
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        isSelected ? `bg-${category.color}-100` : 'bg-gray-100'
                      }`}>
                        <Icon className={`h-4 w-4 ${
                          isSelected ? `text-${category.color}-600` : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{category.name}</p>
                        <p className="text-xs text-gray-500">{category.questions.length} 个问题</p>
                      </div>
                    </button>
                  )
                })}
              </CardContent>
            </Card>

            {/* History */}
            {qaHistory.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5 text-gray-600" />
                    历史问答
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {qaHistory.slice(0, 5).map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg border border-gray-200 bg-white text-left"
                      >
                        <p className="font-medium text-gray-900 text-xs">
                          {item.company_name || item.companySymbol}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {item.questions?.[0] || '自定义问题'}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Questions */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquarePlus className="h-5 w-5 text-gray-600" />
                    您的问题
                  </CardTitle>
                  <Button onClick={handleAddQuestion} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    添加问题
                  </Button>
                </div>
                {selectedEvalCategory && (
                  <Badge variant="secondary" className="mt-2">
                    {EVALUATION_CATEGORIES[selectedEvalCategory as keyof typeof EVALUATION_CATEGORIES]?.name}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((question, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="flex-1">
                      <Textarea
                        value={question}
                        onChange={(e) => handleQuestionChange(index, e.target.value)}
                        placeholder={`问题 ${index + 1}：例如 "ROI如何体现？具体数据是什么？"`}
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                    {questions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveQuestion(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button
                    onClick={handleExtract}
                    disabled={!selectedCompany || isExtracting}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
                    size="lg"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        AI分析中...
                      </>
                    ) : (
                      <>
                        <MessageSquarePlus className="mr-2 h-5 w-5" />
                        获取答案
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">提问技巧</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• 问题要具体明确，包含关键指标名称</li>
                      <li>• 可以问数据对比、趋势判断、好坏标准</li>
                      <li>• 例如："毛利率YoY变化多少？主要原因是什么？"</li>
                      <li>• 例如："CapEx/收入比是多少？行业平均水平是？"</li>
                      <li>• 使用左侧评价体系可快速获取标准化分析</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
