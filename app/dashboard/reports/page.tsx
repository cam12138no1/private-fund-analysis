'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { FileText, Download, Eye, Loader2, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { exportAnalysisToExcel } from '@/lib/export-excel'

interface Analysis {
  id: string
  company_name: string
  company_symbol: string
  report_type: string
  fiscal_year: number
  fiscal_quarter?: number
  filing_date: string
  created_at: string
  processed: boolean
  one_line_conclusion: string
  results_vs_expectations: any
  key_drivers: any
  investment_roi: any
  sustainability_risks: any
  model_impact: any
  final_judgment: string
}

export default function ReportsPage() {
  const t = useTranslations()
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)

  useEffect(() => {
    loadAnalyses()
  }, [])

  const loadAnalyses = async () => {
    try {
      const response = await fetch('/api/dashboard?limit=50')
      const data = await response.json()
      setAnalyses(data.analyses || [])
    } catch (error) {
      console.error('Failed to load analyses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = (analysis: Analysis) => {
    exportAnalysisToExcel(analysis as any, 'zh')
  }

  const handleExportAll = () => {
    // Export summary of all analyses
    if (analyses.length === 0) return
    
    import('xlsx').then((XLSX) => {
      const wb = XLSX.utils.book_new()
      
      // Summary sheet
      const summaryData = [
        ['AI金融工具 - 分析汇总报告'],
        ['生成时间', new Date().toLocaleString('zh-CN')],
        [''],
        ['公司', '代码', '报告类型', '财年', '季度', '一句话结论', '主要风险', '投资建议'],
        ...analyses.map(a => [
          a.company_name,
          a.company_symbol,
          a.report_type,
          a.fiscal_year,
          a.fiscal_quarter || '-',
          a.one_line_conclusion,
          a.sustainability_risks?.main_risks?.join('; ') || '-',
          a.final_judgment?.slice(0, 100) + '...',
        ])
      ]
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      summarySheet['!cols'] = [
        { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, 
        { wch: 50 }, { wch: 40 }, { wch: 50 }
      ]
      XLSX.utils.book_append_sheet(wb, summarySheet, '汇总')

      // Key metrics sheet
      const metricsData = [
        ['关键财务指标对比'],
        [''],
        ['公司', '代码', '收入(实际)', '收入(预期)', '收入差异', 'EPS(实际)', 'EPS(预期)', 'EPS差异'],
        ...analyses.map(a => [
          a.company_name,
          a.company_symbol,
          a.results_vs_expectations?.revenue?.actual || '-',
          a.results_vs_expectations?.revenue?.consensus || '-',
          a.results_vs_expectations?.revenue?.difference || '-',
          a.results_vs_expectations?.eps?.actual || '-',
          a.results_vs_expectations?.eps?.consensus || '-',
          a.results_vs_expectations?.eps?.difference || '-',
        ])
      ]
      const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData)
      metricsSheet['!cols'] = [
        { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }
      ]
      XLSX.utils.book_append_sheet(wb, metricsSheet, '财务指标')

      // Risk summary sheet
      const riskData = [
        ['风险汇总'],
        [''],
        ['公司', '代码', '可持续驱动因素', '主要风险', '检查点'],
        ...analyses.map(a => [
          a.company_name,
          a.company_symbol,
          a.sustainability_risks?.sustainable_drivers?.join('\n') || '-',
          a.sustainability_risks?.main_risks?.join('\n') || '-',
          a.sustainability_risks?.checkpoints?.join('\n') || '-',
        ])
      ]
      const riskSheet = XLSX.utils.aoa_to_sheet(riskData)
      riskSheet['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 40 }, { wch: 40 }, { wch: 40 }]
      XLSX.utils.book_append_sheet(wb, riskSheet, '风险汇总')

      XLSX.writeFile(wb, `AI金融工具_分析汇总_${new Date().toISOString().split('T')[0]}.xlsx`)
    })
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (selectedAnalysis) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => setSelectedAnalysis(null)}>
              ← 返回列表
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {selectedAnalysis.company_name} ({selectedAnalysis.company_symbol})
              </h1>
              <p className="text-gray-600">
                {selectedAnalysis.report_type} • 
                {selectedAnalysis.fiscal_quarter ? `Q${selectedAnalysis.fiscal_quarter} ` : ''}
                {selectedAnalysis.fiscal_year}
              </p>
            </div>
          </div>
          <Button onClick={() => handleExport(selectedAnalysis)}>
            <Download className="h-4 w-4 mr-2" />
            导出Excel
          </Button>
        </div>

        {/* Analysis Content */}
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader>
            <CardTitle>执行摘要</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{selectedAnalysis.one_line_conclusion}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>业绩 vs 预期</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">收入</div>
                <div className="text-2xl font-bold">
                  {selectedAnalysis.results_vs_expectations?.revenue?.actual || '-'}M
                </div>
                <div className="text-sm">
                  vs {selectedAnalysis.results_vs_expectations?.revenue?.consensus || '-'}M
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">EPS</div>
                <div className="text-2xl font-bold">
                  ${selectedAnalysis.results_vs_expectations?.eps?.actual || '-'}
                </div>
                <div className="text-sm">
                  vs ${selectedAnalysis.results_vs_expectations?.eps?.consensus || '-'}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">营业利润</div>
                <div className="text-2xl font-bold">
                  {selectedAnalysis.results_vs_expectations?.operating_income?.actual || '-'}M
                </div>
                <div className="text-sm">
                  vs {selectedAnalysis.results_vs_expectations?.operating_income?.consensus || '-'}M
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                可持续驱动因素
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {selectedAnalysis.sustainability_risks?.sustainable_drivers?.map((d: string, i: number) => (
                  <li key={i} className="flex items-start">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-2" />
                    {d}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                主要风险
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {selectedAnalysis.sustainability_risks?.main_risks?.map((r: string, i: number) => (
                  <li key={i} className="flex items-start">
                    <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-2" />
                    {r}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="border-l-4 border-l-purple-600">
          <CardHeader>
            <CardTitle>投委会结论</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg leading-relaxed">{selectedAnalysis.final_judgment}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">分析报告</h1>
          <p className="text-gray-600 mt-1">查看和导出所有财报分析</p>
        </div>
        {analyses.length > 0 && (
          <Button onClick={handleExportAll}>
            <Download className="h-4 w-4 mr-2" />
            导出汇总表
          </Button>
        )}
      </div>

      {analyses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无分析报告</h3>
            <p className="text-gray-600">上传财报PDF后，分析结果将显示在这里</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {analyses.map((analysis) => (
            <Card key={analysis.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {analysis.company_name} ({analysis.company_symbol})
                      </h3>
                      <p className="text-sm text-gray-600">
                        {analysis.report_type} • 
                        {analysis.fiscal_quarter ? `Q${analysis.fiscal_quarter} ` : ''}
                        {analysis.fiscal_year} • 
                        {new Date(analysis.created_at).toLocaleDateString('zh-CN')}
                      </p>
                      <p className="text-sm text-gray-700 mt-1 line-clamp-1">
                        {analysis.one_line_conclusion}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="success">已分析</Badge>
                    <Button variant="outline" size="sm" onClick={() => setSelectedAnalysis(analysis)}>
                      <Eye className="h-4 w-4 mr-1" />
                      查看
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport(analysis)}>
                      <Download className="h-4 w-4 mr-1" />
                      导出
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
