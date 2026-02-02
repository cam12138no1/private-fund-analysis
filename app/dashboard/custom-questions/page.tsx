'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
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

// Preset evaluation category questions
const EVALUATION_CATEGORIES = {
  ROI: {
    name: 'ROI Assessment',
    nameZh: 'ROI评估',
    icon: TrendingUp,
    color: 'green',
    questions: [
      'How is ROI reflected? What are the specific figures?',
      'What is the investment payback period?',
      'How has ROI changed compared to historical data?',
      'What are the returns for major investment projects?'
    ]
  },
  EXPENSE_RATIO: {
    name: 'Expense/Revenue Ratio',
    nameZh: '支出收入比',
    icon: DollarSign,
    color: 'blue',
    questions: [
      'What is the expense/revenue ratio? How to define good vs bad?',
      'What is the R&D/Revenue ratio? How does it compare to industry average?',
      'What is the S&M/Revenue trend?',
      'Is the G&A expense ratio within reasonable range?'
    ]
  },
  CAPEX: {
    name: 'CapEx Analysis',
    nameZh: 'CapEx分析',
    icon: BarChart3,
    color: 'purple',
    questions: [
      'What are the main CapEx investments?',
      'What is the CapEx/Revenue ratio?',
      'What is the growth CapEx vs maintenance CapEx split?',
      'What is the expected CapEx payback period?'
    ]
  },
  PROFITABILITY: {
    name: 'Profitability',
    nameZh: '盈利能力',
    icon: Target,
    color: 'amber',
    questions: [
      'What are the main drivers of gross margin changes?',
      'What is the operating margin trend?',
      'Are there one-time factors affecting net margin?',
      'How does profitability compare to competitors?'
    ]
  },
  CASH_FLOW: {
    name: 'Cash Flow',
    nameZh: '现金流',
    icon: DollarSign,
    color: 'teal',
    questions: [
      'What is the FCF/Revenue ratio?',
      'What is the FCF/Net Income conversion rate?',
      'How has the cash conversion cycle changed?',
      'Can free cash flow cover dividends and buybacks?'
    ]
  }
}

// Company categories
const COMPANY_CATEGORIES = {
  AI_APPLICATION: {
    name: 'AI Application Companies',
    nameZh: 'AI应用公司',
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
    name: 'AI Supply Chain Companies',
    nameZh: 'AI供应链公司',
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
  const t = useTranslations()
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
      setError('Please select a company first')
      return
    }

    if (validQuestions.length === 0) {
      setError('Please enter at least one question')
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
        setError(data.error || 'Extraction failed')
      }
    } catch (error: any) {
      console.error('Extraction error:', error)
      setError(error.message || 'Error during extraction')
    } finally {
      setIsExtracting(false)
    }
  }

  // Show Q&A results
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
                  <h1 className="text-2xl font-bold text-gray-900">Question Answers</h1>
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
                Ask New Questions
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
              <h1 className="text-2xl font-bold text-gray-900">{t('customQuestions.title')}</h1>
              <p className="text-gray-500 mt-1">{t('customQuestions.subtitle')}</p>
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
                <CardTitle className="text-lg">{t('customQuestions.selectCompany')}</CardTitle>
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
                            ? category.color === 'blue' 
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`h-5 w-5 mx-auto mb-1 ${
                          isSelected 
                            ? category.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                            : 'text-gray-600'
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
                            <p className="text-xs text-gray-500">{company.symbol}</p>
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
                  {t('customQuestions.evaluationSystem')}
                </CardTitle>
                <p className="text-sm text-gray-500">{t('customQuestions.selectPreset')}</p>
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
                          ? category.color === 'green' ? 'border-green-500 bg-green-50'
                            : category.color === 'blue' ? 'border-blue-500 bg-blue-50'
                            : category.color === 'purple' ? 'border-purple-500 bg-purple-50'
                            : category.color === 'amber' ? 'border-amber-500 bg-amber-50'
                            : 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        isSelected 
                          ? category.color === 'green' ? 'bg-green-100'
                            : category.color === 'blue' ? 'bg-blue-100'
                            : category.color === 'purple' ? 'bg-purple-100'
                            : category.color === 'amber' ? 'bg-amber-100'
                            : 'bg-teal-100'
                          : 'bg-gray-100'
                      }`}>
                        <Icon className={`h-4 w-4 ${
                          isSelected 
                            ? category.color === 'green' ? 'text-green-600'
                              : category.color === 'blue' ? 'text-blue-600'
                              : category.color === 'purple' ? 'text-purple-600'
                              : category.color === 'amber' ? 'text-amber-600'
                              : 'text-teal-600'
                            : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{category.name}</p>
                        <p className="text-xs text-gray-500">{category.questions.length} questions</p>
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
                    History
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
                          {item.questions?.[0] || 'Custom question'}
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
                    {t('customQuestions.yourQuestions')}
                  </CardTitle>
                  <Button onClick={handleAddQuestion} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    {t('customQuestions.addQuestion')}
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
                        placeholder={`Question ${index + 1}: e.g. "How is ROI reflected? What are the specific figures?"`}
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
                        {t('customQuestions.analyzing')}
                      </>
                    ) : (
                      <>
                        <MessageSquarePlus className="mr-2 h-5 w-5" />
                        {t('customQuestions.getAnswers')}
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
                    <h4 className="font-semibold text-blue-900 mb-2">{t('customQuestions.tips')}</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Be specific and include key metric names</li>
                      <li>• Ask about data comparisons, trends, and benchmarks</li>
                      <li>• Example: "What is the gross margin YoY change? What are the main drivers?"</li>
                      <li>• Example: "What is the CapEx/Revenue ratio? What is the industry average?"</li>
                      <li>• Use the evaluation system on the left for standardized analysis</li>
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
