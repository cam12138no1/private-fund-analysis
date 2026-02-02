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
  const t = useTranslations()
  const locale = useLocale()

  const handleExport = () => {
    const wb = XLSX.utils.book_new()
    
    // Sheet 1: Summary
    const summaryData = [
      ['财报分析报告', ''],
      [''],
      ['公司', analysis.company_name],
      ['代码', analysis.company_symbol],
      ['报告期', analysis.fiscal_quarter ? `Q${analysis.fiscal_quarter} ${analysis.fiscal_year}` : `FY ${analysis.fiscal_year}`],
      ['分析时间', new Date(analysis.created_at).toLocaleString('zh-CN')],
      [''],
      ['一句话结论'],
      [analysis.one_line_conclusion || ''],
      [''],
      ['投委会判断'],
      ['净影响', analysis.final_judgment?.net_impact || ''],
      ['信心来源', analysis.final_judgment?.confidence || ''],
      ['担忧', analysis.final_judgment?.concerns || ''],
      ['建议', analysis.final_judgment?.recommendation || ''],
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summarySheet, '摘要')
    
    // Sheet 2: Results Table
    if (analysis.results_table?.length > 0) {
      const resultsData = [
        ['结果层：业绩 vs 预期'],
        [analysis.results_summary || ''],
        [''],
        ['指标', '实际值', '市场预期', '差异', '评价'],
        ...analysis.results_table.map((row: any) => [
          row.metric,
          row.actual,
          row.consensus,
          row.delta,
          row.assessment,
        ]),
        [''],
        ['关键解释'],
        [analysis.results_explanation || ''],
      ]
      const resultsSheet = XLSX.utils.aoa_to_sheet(resultsData)
      XLSX.utils.book_append_sheet(wb, resultsSheet, '结果层')
    }
    
    // Sheet 3: Drivers
    if (analysis.drivers) {
      const driversData = [
        ['驱动层分析'],
        [analysis.drivers_summary || ''],
        [''],
        ['A. 需求/量'],
        ['变化', analysis.drivers.demand?.change || ''],
        ['幅度', analysis.drivers.demand?.magnitude || ''],
        ['原因', analysis.drivers.demand?.reason || ''],
        [''],
        ['B. 变现/单价'],
        ['变化', analysis.drivers.monetization?.change || ''],
        ['幅度', analysis.drivers.monetization?.magnitude || ''],
        ['原因', analysis.drivers.monetization?.reason || ''],
        [''],
        ['C. 内部效率'],
        ['变化', analysis.drivers.efficiency?.change || ''],
        ['幅度', analysis.drivers.efficiency?.magnitude || ''],
        ['原因', analysis.drivers.efficiency?.reason || ''],
      ]
      const driversSheet = XLSX.utils.aoa_to_sheet(driversData)
      XLSX.utils.book_append_sheet(wb, driversSheet, '驱动层')
    }
    
    // Sheet 4: Investment & Risks
    const investmentData = [
      ['投入与ROI'],
      [''],
      ['CapEx变化', analysis.investment_roi?.capex_change || ''],
      ['Opex变化', analysis.investment_roi?.opex_change || ''],
      ['投入指向', analysis.investment_roi?.investment_direction || ''],
      ['管理层承诺', analysis.investment_roi?.management_commitment || ''],
      [''],
      ['ROI证据'],
      ...(analysis.investment_roi?.roi_evidence?.map((e: string) => [e]) || []),
      [''],
      ['风险与检查点'],
      [''],
      ['主要风险'],
      ...(analysis.sustainability_risks?.main_risks?.map((r: string) => [r]) || []),
      [''],
      ['检查点'],
      ...(analysis.sustainability_risks?.checkpoints?.map((c: string) => [c]) || []),
    ]
    const investmentSheet = XLSX.utils.aoa_to_sheet(investmentData)
    XLSX.utils.book_append_sheet(wb, investmentSheet, '投入与风险')
    
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
          导出 Excel
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
              <h3 className="text-sm font-medium text-blue-100 mb-2">一句话结论</h3>
              <p className="text-lg font-medium leading-relaxed">
                {analysis.one_line_conclusion || '暂无结论'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table - 结果层 */}
      {analysis.results_table && analysis.results_table.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">1) 结果层：业绩与指引 vs 市场预期</CardTitle>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">指标 (USD)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">实际值</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">市场预期</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">差异</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">评价</th>
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
                <h4 className="font-medium text-blue-900 mb-1">关键解释</h4>
                <p className="text-sm text-blue-800">{analysis.results_explanation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Drivers - 驱动层 */}
      {analysis.drivers && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">2) 驱动层：增长机制拆解</CardTitle>
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
                  <h4 className="font-semibold text-green-900">A. 需求/量</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">变化：</span>
                    {analysis.drivers.demand?.change || '-'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">幅度：</span>
                    <span className="text-green-600 font-medium">{analysis.drivers.demand?.magnitude || '-'}</span>
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">原因：</span>
                    {analysis.drivers.demand?.reason || '-'}
                  </p>
                </div>
              </div>
              
              {/* Monetization */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">B. 变现/单价</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">变化：</span>
                    {analysis.drivers.monetization?.change || '-'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">幅度：</span>
                    <span className="text-blue-600 font-medium">{analysis.drivers.monetization?.magnitude || '-'}</span>
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">原因：</span>
                    {analysis.drivers.monetization?.reason || '-'}
                  </p>
                </div>
              </div>
              
              {/* Efficiency */}
              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <h4 className="font-semibold text-amber-900">C. 内部效率</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">变化：</span>
                    {analysis.drivers.efficiency?.change || '-'}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">幅度：</span>
                    <span className="text-amber-600 font-medium">{analysis.drivers.efficiency?.magnitude || '-'}</span>
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">原因：</span>
                    {analysis.drivers.efficiency?.reason || '-'}
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
              <CardTitle className="text-lg">3) 投入与 ROI</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-1">CapEx 变化</p>
                <p className="text-gray-900">{analysis.investment_roi.capex_change || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-1">Opex 变化</p>
                <p className="text-gray-900">{analysis.investment_roi.opex_change || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-1">投入指向</p>
                <p className="text-gray-900">{analysis.investment_roi.investment_direction || '-'}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-medium text-amber-700 mb-1">管理层承诺</p>
                <p className="text-amber-900 font-medium">{analysis.investment_roi.management_commitment || '-'}</p>
              </div>
            </div>
            
            {analysis.investment_roi.roi_evidence && analysis.investment_roi.roi_evidence.length > 0 && (
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <p className="text-xs font-medium text-green-700 mb-2">ROI 证据（已验证）</p>
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
                可持续驱动
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
                主要风险
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
                检查点
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
              <CardTitle className="text-lg">5) 模型影响</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-1">收入假设调整</p>
                <p className="text-gray-900">{analysis.model_impact.revenue_adjustment || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-1">CapEx 假设调整</p>
                <p className="text-gray-900">{analysis.model_impact.capex_adjustment || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl md:col-span-2">
                <p className="text-xs font-medium text-gray-500 mb-1">估值变化</p>
                <p className="text-gray-900">{analysis.model_impact.valuation_change || '-'}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 md:col-span-2">
                <p className="text-xs font-medium text-purple-700 mb-1">逻辑链</p>
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
              6) 投委会判断
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-white/10 rounded-xl">
                <p className="text-xs font-medium text-slate-300 mb-2">更有信心的是</p>
                <p className="text-white">{analysis.final_judgment.confidence || '-'}</p>
              </div>
              <div className="p-4 bg-white/10 rounded-xl">
                <p className="text-xs font-medium text-slate-300 mb-2">更担心的是</p>
                <p className="text-white">{analysis.final_judgment.concerns || '-'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl">
              <div>
                <p className="text-xs font-medium text-slate-300 mb-1">净影响</p>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                  analysis.final_judgment.net_impact?.includes('强') ? 'bg-green-500 text-white' :
                  analysis.final_judgment.net_impact?.includes('弱') ? 'bg-red-500 text-white' :
                  'bg-slate-600 text-white'
                }`}>
                  {analysis.final_judgment.net_impact?.includes('强') && <TrendingUp className="h-3.5 w-3.5" />}
                  {analysis.final_judgment.net_impact?.includes('弱') && <TrendingDown className="h-3.5 w-3.5" />}
                  {analysis.final_judgment.net_impact || '-'}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-300 mb-1">建议</p>
                <p className="text-white font-medium">{analysis.final_judgment.recommendation || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
