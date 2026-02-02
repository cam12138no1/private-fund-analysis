'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
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
  results_table?: any[]
  drivers?: any
  investment_roi: any
  sustainability_risks: any
  model_impact: any
  final_judgment: {
    confidence?: string
    concerns?: string
    net_impact?: string
    recommendation?: string
  } | string
}

export default function ReportsPage() {
  const t = useTranslations('reports')
  const locale = useLocale()
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
    exportAnalysisToExcel(analysis as any, locale)
  }

  const handleExportAll = () => {
    if (analyses.length === 0) return
    
    import('xlsx').then((XLSX) => {
      const wb = XLSX.utils.book_new()
      
      // Summary sheet
      const summaryData = [
        [t('summaryReport')],
        [t('generatedAt'), new Date().toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')],
        [''],
        [t('company'), t('symbol'), t('reportType'), t('fiscalYear'), t('quarter'), t('oneLineConclusion'), t('mainRisks'), t('investmentAdvice')],
        ...analyses.map(a => [
          a.company_name,
          a.company_symbol,
          a.report_type,
          a.fiscal_year,
          a.fiscal_quarter || '-',
          a.one_line_conclusion,
          a.sustainability_risks?.main_risks?.join('; ') || '-',
          typeof a.final_judgment === 'string' 
            ? a.final_judgment.slice(0, 100) + '...'
            : a.final_judgment?.recommendation || '-',
        ])
      ]
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      summarySheet['!cols'] = [
        { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, 
        { wch: 50 }, { wch: 40 }, { wch: 50 }
      ]
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

      // Key metrics sheet
      const metricsData = [
        [t('keyMetricsComparison')],
        [''],
        [t('company'), t('symbol'), t('revenueActual'), t('revenueExpected'), t('revenueDelta'), t('epsActual'), t('epsExpected'), t('epsDelta')],
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
      XLSX.utils.book_append_sheet(wb, metricsSheet, 'Metrics')

      // Risk summary sheet
      const riskData = [
        [t('riskSummary')],
        [''],
        [t('company'), t('symbol'), t('sustainableDrivers'), t('mainRisks'), t('checkpoints')],
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
      XLSX.utils.book_append_sheet(wb, riskSheet, 'Risks')

      XLSX.writeFile(wb, `Financial_Analysis_Summary_${new Date().toISOString().split('T')[0]}.xlsx`)
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
              ← {t('backToList')}
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
            {t('exportExcel')}
          </Button>
        </div>

        {/* Analysis Content */}
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader>
            <CardTitle>{t('executiveSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{selectedAnalysis.one_line_conclusion}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('resultsVsExpectations')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">{t('revenue')}</div>
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
                <div className="text-sm text-gray-600">{t('operatingProfit')}</div>
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
                {t('sustainableDrivers')}
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
                {t('mainRisks')}
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
            <CardTitle>{t('investmentCommitteeConclusion')}</CardTitle>
          </CardHeader>
          <CardContent>
            {typeof selectedAnalysis.final_judgment === 'string' ? (
              <p className="text-lg leading-relaxed">{selectedAnalysis.final_judgment}</p>
            ) : (
              <div className="space-y-4">
                {selectedAnalysis.final_judgment?.confidence && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('moreConfident')}</p>
                    <p className="text-gray-900">{selectedAnalysis.final_judgment.confidence}</p>
                  </div>
                )}
                {selectedAnalysis.final_judgment?.concerns && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('moreConcerned')}</p>
                    <p className="text-gray-900">{selectedAnalysis.final_judgment.concerns}</p>
                  </div>
                )}
                {selectedAnalysis.final_judgment?.net_impact && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('netImpact')}</p>
                    <p className="text-lg font-semibold text-blue-600">{selectedAnalysis.final_judgment.net_impact}</p>
                  </div>
                )}
                {selectedAnalysis.final_judgment?.recommendation && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('recommendation')}</p>
                    <p className="text-gray-900">{selectedAnalysis.final_judgment.recommendation}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('analysisReports')}</h1>
          <p className="text-gray-600 mt-1">{t('viewAndExport')}</p>
        </div>
        {analyses.length > 0 && (
          <Button onClick={handleExportAll}>
            <Download className="h-4 w-4 mr-2" />
            {t('exportSummary')}
          </Button>
        )}
      </div>

      {analyses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noAnalysisReports')}</h3>
            <p className="text-gray-600">{t('uploadToSeeResults')}</p>
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
                        {new Date(analysis.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                      </p>
                      <p className="text-sm text-gray-700 mt-1 line-clamp-1">
                        {analysis.one_line_conclusion}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="success">{t('analyzed')}</Badge>
                    <Button variant="outline" size="sm" onClick={() => setSelectedAnalysis(analysis)}>
                      <Eye className="h-4 w-4 mr-1" />
                      {t('view')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport(analysis)}>
                      <Download className="h-4 w-4 mr-1" />
                      {t('export')}
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
