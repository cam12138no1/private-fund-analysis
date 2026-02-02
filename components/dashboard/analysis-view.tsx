'use client'

import { useLocale, useTranslations } from 'next-intl'
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Download, 
  CheckCircle2,
  ArrowUpRight,
  Target,
  DollarSign,
  Users,
  Zap,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import * as XLSX from 'xlsx'

interface AnalysisViewProps {
  analysis: any
  onBack: () => void
}

export default function AnalysisView({ analysis, onBack }: AnalysisViewProps) {
  const t = useTranslations('analysis')
  const locale = useLocale()

  const handleExport = () => {
    const wb = XLSX.utils.book_new()
    
    // Sheet 1: Summary
    const summaryData = [
      [t('reportTitle'), ''],
      [''],
      [t('company'), analysis.company_name],
      [t('symbol'), analysis.company_symbol],
      [t('reportPeriod'), analysis.fiscal_quarter ? `Q${analysis.fiscal_quarter} ${analysis.fiscal_year}` : `FY ${analysis.fiscal_year}`],
      [t('analysisTime'), new Date(analysis.created_at).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')],
      [''],
      [t('oneLineConclusion')],
      [analysis.one_line_conclusion || ''],
      [''],
      [t('investmentCommitteeJudgment')],
      [t('netImpact'), analysis.final_judgment?.net_impact || ''],
      [t('confidenceSource'), analysis.final_judgment?.confidence || ''],
      [t('concerns'), analysis.final_judgment?.concerns || ''],
      [t('recommendation'), analysis.final_judgment?.recommendation || ''],
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summarySheet, t('summary'))
    
    // Sheet 2: Results Table
    if (analysis.results_table?.length > 0) {
      const resultsData = [
        [t('resultsVsExpectationsTitle')],
        [analysis.results_summary || ''],
        [''],
        [t('metric'), t('actual'), t('consensus'), t('delta'), t('assessment')],
        ...analysis.results_table.map((row: any) => [
          row.metric,
          row.actual,
          row.consensus,
          row.delta,
          row.assessment,
        ]),
        [''],
        [t('keyExplanation')],
        [analysis.results_explanation || ''],
      ]
      const resultsSheet = XLSX.utils.aoa_to_sheet(resultsData)
      XLSX.utils.book_append_sheet(wb, resultsSheet, 'Results')
    }
    
    // Sheet 3: Drivers
    if (analysis.drivers) {
      const driversData = [
        [t('driversAnalysis')],
        [analysis.drivers_summary || ''],
        [''],
        [`A. ${t('demandVolume')}`],
        [t('change'), analysis.drivers.demand?.change || ''],
        [t('magnitude'), analysis.drivers.demand?.magnitude || ''],
        [t('reason'), analysis.drivers.demand?.reason || ''],
        [''],
        [`B. ${t('monetizationPricing')}`],
        [t('change'), analysis.drivers.monetization?.change || ''],
        [t('magnitude'), analysis.drivers.monetization?.magnitude || ''],
        [t('reason'), analysis.drivers.monetization?.reason || ''],
        [''],
        [`C. ${t('internalEfficiency')}`],
        [t('change'), analysis.drivers.efficiency?.change || ''],
        [t('magnitude'), analysis.drivers.efficiency?.magnitude || ''],
        [t('reason'), analysis.drivers.efficiency?.reason || ''],
      ]
      const driversSheet = XLSX.utils.aoa_to_sheet(driversData)
      XLSX.utils.book_append_sheet(wb, driversSheet, 'Drivers')
    }
    
    // Sheet 4: Investment & Risks
    const investmentData = [
      [t('investmentAndRoi')],
      [''],
      [t('capexChange'), analysis.investment_roi?.capex_change || ''],
      [t('opexChange'), analysis.investment_roi?.opex_change || ''],
      [t('investmentDirection'), analysis.investment_roi?.investment_direction || ''],
      [t('managementCommitment'), analysis.investment_roi?.management_commitment || ''],
      [''],
      [t('roiEvidence')],
      ...(analysis.investment_roi?.roi_evidence?.map((e: string) => [e]) || []),
      [''],
      [t('risksAndCheckpoints')],
      [''],
      [t('mainRisks')],
      ...(analysis.sustainability_risks?.main_risks?.map((r: string) => [r]) || []),
      [''],
      [t('checkpoints')],
      ...(analysis.sustainability_risks?.checkpoints?.map((c: string) => [c]) || []),
    ]
    const investmentSheet = XLSX.utils.aoa_to_sheet(investmentData)
    XLSX.utils.book_append_sheet(wb, investmentSheet, 'Investment & Risks')
    
    const filename = `${analysis.company_symbol}_${analysis.fiscal_year}${analysis.fiscal_quarter ? `Q${analysis.fiscal_quarter}` : 'FY'}_Analysis.xlsx`
    XLSX.writeFile(wb, filename)
  }

  const getAssessmentColor = (assessment: string) => {
    const lower = assessment.toLowerCase()
    if (lower.includes('beat') || lower.includes('strong')) return 'text-green-600 bg-green-50'
    if (lower.includes('miss') || lower.includes('shock')) return 'text-red-600 bg-red-50'
    return 'text-gray-600 bg-gray-50'
  }

  const getDeltaColor = (delta: string) => {
    if (delta.startsWith('-')) return 'text-red-600'
    if (delta.startsWith('+') || parseFloat(delta) > 0) return 'text-green-600'
    return 'text-gray-600'
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {analysis.company_symbol?.slice(0, 2) || '??'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {analysis.company_name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-500">{analysis.company_symbol}</span>
                <span className="text-gray-300">•</span>
                <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                  <Calendar className="h-3.5 w-3.5" />
                  {analysis.fiscal_quarter ? `Q${analysis.fiscal_quarter}` : 'FY'} {analysis.fiscal_year}
                </span>
              </div>
            </div>
          </div>
        </div>
        <Button onClick={handleExport} className="bg-gradient-to-r from-blue-600 to-indigo-600">
          <Download className="h-4 w-4 mr-2" />
          {t('exportToExcel')}
        </Button>
      </div>

      {/* One Line Conclusion */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-100 mb-2">{t('oneLineConclusion')}</h3>
              <p className="text-lg font-medium leading-relaxed">
                {analysis.one_line_conclusion || t('noConclusion')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      {analysis.results_table && analysis.results_table.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">1) {t('resultsVsExpectationsTitle')}</CardTitle>
                {analysis.results_summary && (
                  <p className="text-sm text-gray-500 mt-1">{analysis.results_summary}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('metric')}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">{t('actual')}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">{t('consensus')}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">{t('delta')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('assessment')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {analysis.results_table.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 font-medium text-gray-900">{row.metric}</td>
                      <td className="px-4 py-4 text-right font-semibold text-gray-900">{row.actual}</td>
                      <td className="px-4 py-4 text-right text-gray-500">{row.consensus}</td>
                      <td className={`px-4 py-4 text-right font-semibold ${getDeltaColor(row.delta)}`}>
                        {row.delta}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${getAssessmentColor(row.assessment)}`}>
                          {row.assessment}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {analysis.results_explanation && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-medium text-blue-900 mb-1">{t('keyExplanation')}</h4>
                <p className="text-sm text-blue-800">{analysis.results_explanation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Drivers */}
      {analysis.drivers && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">2) {t('driversAnalysis')}</CardTitle>
                {analysis.drivers_summary && (
                  <p className="text-sm text-gray-500 mt-1">{analysis.drivers_summary}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Demand */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-green-600" />
                  <h4 className="font-semibold text-green-900">A. {t('demandVolume')}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">{t('change')}:</span> {analysis.drivers.demand?.change || '-'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">{t('magnitude')}:</span>
                    <span className="text-green-600 font-medium"> {analysis.drivers.demand?.magnitude || '-'}</span>
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">{t('reason')}:</span> {analysis.drivers.demand?.reason || '-'}
                  </p>
                </div>
              </div>
              
              {/* Monetization */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">B. {t('monetizationPricing')}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">{t('change')}:</span> {analysis.drivers.monetization?.change || '-'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">{t('magnitude')}:</span>
                    <span className="text-blue-600 font-medium"> {analysis.drivers.monetization?.magnitude || '-'}</span>
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">{t('reason')}:</span> {analysis.drivers.monetization?.reason || '-'}
                  </p>
                </div>
              </div>
              
              {/* Efficiency */}
              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <h4 className="font-semibold text-amber-900">C. {t('internalEfficiency')}</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">{t('change')}:</span> {analysis.drivers.efficiency?.change || '-'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">{t('magnitude')}:</span>
                    <span className="text-amber-600 font-medium"> {analysis.drivers.efficiency?.magnitude || '-'}</span>
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">{t('reason')}:</span> {analysis.drivers.efficiency?.reason || '-'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Investment & ROI */}
      {analysis.investment_roi && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
              <CardTitle className="text-lg">3) {t('investmentAndRoi')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-1">{t('capexChange')}</p>
                <p className="text-gray-900">{analysis.investment_roi.capex_change || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-1">{t('opexChange')}</p>
                <p className="text-gray-900">{analysis.investment_roi.opex_change || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-1">{t('investmentDirection')}</p>
                <p className="text-gray-900">{analysis.investment_roi.investment_direction || '-'}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-medium text-amber-700 mb-1">{t('managementCommitment')}</p>
                <p className="text-amber-900 font-medium">{analysis.investment_roi.management_commitment || '-'}</p>
              </div>
            </div>
            
            {analysis.investment_roi.roi_evidence && analysis.investment_roi.roi_evidence.length > 0 && (
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <p className="text-xs font-medium text-green-700 mb-2">{t('roiEvidence')}</p>
                <ul className="space-y-1">
                  {analysis.investment_roi.roi_evidence.map((evidence: string, idx: number) => (
                    <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      {evidence}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sustainability & Risks */}
      {analysis.sustainability_risks && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sustainable Drivers */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                {t('sustainableDrivers')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.sustainability_risks.sustainable_drivers?.map((driver: string, idx: number) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    {driver}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Risks */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                {t('mainRisks')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.sustainability_risks.main_risks?.map((risk: string, idx: number) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                    {risk}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Checkpoints */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                {t('checkpoints')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.sustainability_risks.checkpoints?.map((cp: string, idx: number) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="inline-flex items-center justify-center w-4 h-4 bg-blue-100 text-blue-700 text-[10px] font-bold rounded flex-shrink-0">
                      {idx + 1}
                    </span>
                    {cp}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Model Impact */}
      {analysis.model_impact && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 text-purple-600" />
              </div>
              <CardTitle className="text-lg">5) {t('modelImpact')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-1">{t('revenueAssumptionAdjustment')}</p>
                <p className="text-gray-900">{analysis.model_impact.revenue_adjustment || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-1">{t('capexAssumptionAdjustment')}</p>
                <p className="text-gray-900">{analysis.model_impact.capex_adjustment || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl md:col-span-2">
                <p className="text-xs font-medium text-gray-500 mb-1">{t('valuationChange')}</p>
                <p className="text-gray-900">{analysis.model_impact.valuation_change || '-'}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 md:col-span-2">
                <p className="text-xs font-medium text-purple-700 mb-1">{t('logicChain')}</p>
                <p className="text-purple-900">{analysis.model_impact.logic_chain || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Judgment */}
      {analysis.final_judgment && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-800 to-slate-900 text-white overflow-hidden">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              6) {t('investmentCommitteeJudgment')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-white/10 rounded-xl">
                <p className="text-xs font-medium text-slate-300 mb-2">{t('moreConfident')}</p>
                <p className="text-white">{analysis.final_judgment.confidence || '-'}</p>
              </div>
              <div className="p-4 bg-white/10 rounded-xl">
                <p className="text-xs font-medium text-slate-300 mb-2">{t('moreConcerned')}</p>
                <p className="text-white">{analysis.final_judgment.concerns || '-'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl">
              <div>
                <p className="text-xs font-medium text-slate-300 mb-1">{t('netImpact')}</p>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                  analysis.final_judgment.net_impact?.toLowerCase().includes('strong') ? 'bg-green-500 text-white' :
                  analysis.final_judgment.net_impact?.toLowerCase().includes('weak') ? 'bg-red-500 text-white' :
                  'bg-slate-600 text-white'
                }`}>
                  {analysis.final_judgment.net_impact?.toLowerCase().includes('strong') && <TrendingUp className="h-3.5 w-3.5" />}
                  {analysis.final_judgment.net_impact?.toLowerCase().includes('weak') && <TrendingDown className="h-3.5 w-3.5" />}
                  {analysis.final_judgment.net_impact || '-'}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-300 mb-1">{t('recommendation')}</p>
                <p className="text-white font-medium">{analysis.final_judgment.recommendation || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
