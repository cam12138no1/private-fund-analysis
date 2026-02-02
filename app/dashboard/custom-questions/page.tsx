'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, MessageSquarePlus, Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import ReactMarkdown from 'react-markdown'

export default function CustomQuestionsPage() {
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [questions, setQuestions] = useState<string[]>([''])
  const [isExtracting, setIsExtracting] = useState(false)
  const [qaResult, setQaResult] = useState<any>(null)
  const [savedQuestions, setSavedQuestions] = useState<string[]>([
    'ROI如何体现？具体数据是什么？',
    '支出收入比是多少？如何界定好坏？',
    'CapEx的主要投向是什么？预期回报周期？',
    '毛利率变化的主要驱动因素？',
    '与竞争对手相比的相对优势是什么？'
  ])

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/reports')
      const data = await response.json()
      
      if (data.companies) {
        const companiesWithReports = data.companies.filter((c: any) => 
          c.reports && c.reports.some((r: any) => r.processed && r.analysis)
        )
        setCompanies(companiesWithReports)
      }
    } catch (error) {
      console.error('Failed to load companies:', error)
    }
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

  const handleExtract = async () => {
    const validQuestions = questions.filter(q => q.trim() !== '')
    
    if (!selectedReport) {
      alert('请先选择一份财报')
      return
    }

    if (validQuestions.length === 0) {
      alert('请至少输入一个问题')
      return
    }

    setIsExtracting(true)
    setQaResult(null)

    try {
      const response = await fetch('/api/custom-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReport.id,
          questions: validQuestions
        })
      })

      const data = await response.json()

      if (data.success) {
        setQaResult(data)
      } else {
        alert(data.error || '提取失败')
      }
    } catch (error) {
      console.error('Extraction error:', error)
      alert('提取过程中出错')
    } finally {
      setIsExtracting(false)
    }
  }

  if (qaResult) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setQaResult(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">问题回答结果</h1>
              <p className="text-gray-600 mt-1">
                {qaResult.company} ({qaResult.symbol}) - {qaResult.period}
              </p>
            </div>
          </div>
          <Button onClick={() => {
            setQaResult(null)
            setQuestions([''])
          }}>
            提问新问题
          </Button>
        </div>

        <div className="space-y-4">
          {qaResult.answers.map((qa: any, index: number) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg flex items-start">
                  <MessageSquarePlus className="h-5 w-5 mr-2 mt-1 flex-shrink-0 text-blue-600" />
                  <span>{qa.question}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <ReactMarkdown>{qa.answer}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">自定义问题提取</h1>
        <p className="text-gray-600 mt-1">
          基于财报数据回答您关心的特定问题
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Report Selection */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>选择财报</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {companies.map(company => {
                const latestReport = company.reports[0]
                const isSelected = selectedReport?.id === latestReport?.id

                return (
                  <div
                    key={company.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => setSelectedReport(latestReport)}
                  >
                    <div className="font-semibold text-gray-900">
                      {company.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {company.symbol} • {latestReport?.fiscal_quarter ? `Q${latestReport.fiscal_quarter} ` : ''}
                      {latestReport?.fiscal_year}
                    </div>
                    <Badge 
                      variant={company.category === 'AI_APPLICATION' ? 'default' : 'secondary'}
                      className="mt-2"
                    >
                      {company.category === 'AI_APPLICATION' ? 'AI应用' : 'AI供应链'}
                    </Badge>
                  </div>
                )
              })}
              {companies.length === 0 && (
                <p className="text-sm text-gray-600 text-center py-4">
                  暂无已分析的财报
                </p>
              )}
            </CardContent>
          </Card>

          {/* Saved Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">常用问题</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {savedQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2 px-3"
                  onClick={() => handleUseSavedQuestion(question)}
                >
                  <span className="text-xs line-clamp-2">{question}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Questions Input */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>您的问题</CardTitle>
                <Button onClick={handleAddQuestion} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  添加问题
                </Button>
              </div>
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

              <div className="pt-4 border-t">
                <Button
                  onClick={handleExtract}
                  disabled={!selectedReport || isExtracting}
                  className="w-full"
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
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h4 className="font-semibold text-blue-900 mb-2">💡 提问技巧</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 问题要具体明确，包含关键指标名称</li>
                <li>• 可以问数据对比、趋势判断、好坏标准</li>
                <li>• 例如："毛利率YoY变化多少？主要原因是什么？"</li>
                <li>• 例如："CapEx/收入比是多少？行业平均水平是？"</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
