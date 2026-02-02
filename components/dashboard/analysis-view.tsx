'use client'

import { useRef, useState } from 'react'
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
  Calendar,
  FileText,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AnalysisViewProps {
  analysis: any
  onBack: () => void
}

export default function AnalysisView({ analysis, onBack }: AnalysisViewProps) {
  const t = useTranslations('analysis')
  const locale = useLocale()
  const reportRef = useRef<HTMLDivElement>(null)

  const [isExporting, setIsExporting] = useState(false)

  const handleExportPdf = async () => {
    if (!reportRef.current || isExporting) return
    
    setIsExporting(true)
    
    try {
      // Dynamic import html2canvas and jspdf
      const [html2canvasModule, jspdfModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ])
      
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jspdfModule
      
      const element = reportRef.current
      
      // Clone the element to avoid modifying the original
      const clone = element.cloneNode(true) as HTMLElement
      clone.style.width = '800px'
      clone.style.padding = '20px'
      clone.style.backgroundColor = '#ffffff'
      document.body.appendChild(clone)
      
      // Wait for fonts and images to load
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Create canvas with better settings
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: false,
        foreignObjectRendering: false,
        removeContainer: true
      })
      
      // Remove the clone
      document.body.removeChild(clone)
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth - 20 // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      let heightLeft = imgHeight
      let position = 10 // Top margin
      
      // Add first page
      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight)
      heightLeft -= (pdfHeight - 20)
      
      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight)
        heightLeft -= (pdfHeight - 20)
      }
      
      const filename = `${analysis.company_symbol || 'Report'}_${analysis.fiscal_year || 'FY'}${analysis.fiscal_quarter ? `Q${analysis.fiscal_quarter}` : ''}_分析报告.pdf`
      pdf.save(filename)
    } catch (error) {
      console.error('PDF导出失败:', error)
      // Fallback: try window.print()
      try {
        window.print()
      } catch (printError) {
        alert('PDF导出失败，请尝试使用浏览器的打印功能 (Ctrl+P / Cmd+P)')
      }
    } finally {
      setIsExporting(false)
    }
  }

  const getAssessmentColor = (assessment: string) => {
    const lower = (assessment || '').toLowerCase()
    if (lower.includes('beat') || lower.includes('超预期') || lower.includes('strong') || lower.includes('强')) return 'text-green-600 bg-green-50'
    if (lower.includes('miss') || lower.includes('不及') || lower.includes('shock') || lower.includes('弱')) return 'text-red-600 bg-red-50'
    return 'text-gray-600 bg-gray-50'
  }

  const getDeltaColor = (delta: string) => {
    if (!delta) return 'text-gray-600'
    if (delta.startsWith('-')) return 'text-red-600'
    if (delta.startsWith('+') || parseFloat(delta) > 0) return 'text-green-600'
    return 'text-gray-600'
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
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
        <Button 
          onClick={handleExportPdf} 
          disabled={isExporting}
          className="bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              导出中...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              导出PDF
            </>
          )}
        </Button>
      </div>

      {/* Report Content - wrapped in ref for PDF export */}
      <div ref={reportRef} className="space-y-6 print:space-y-4">
        {/* Print Header - only visible when printing */}
        <div className="hidden print:block mb-6">
          <div className="flex items-center gap-4 border-b pb-4">
            <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
              {analysis.company_symbol?.slice(0, 2) || '??'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{analysis.company_name}</h1>
              <p className="text-sm text-gray-500">
                {analysis.company_symbol} · {analysis.fiscal_quarter ? `Q${analysis.fiscal_quarter}` : 'FY'} {analysis.fiscal_year}
              </p>
            </div>
          </div>
        </div>

        {/* 一句话结论 */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white overflow-hidden print:bg-blue-600 print:shadow-none">
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

        {/* 业绩与市场预期对比 */}
        {analysis.results_table && analysis.results_table.length > 0 && (
          <Card className="border-0 shadow-sm print:shadow-none print:border print:border-gray-200">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center print:bg-blue-50">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">1) 业绩与市场预期对比</CardTitle>
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">指标</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">实际值</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">市场预期</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">差异</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">评估</th>
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
                  <h4 className="font-medium text-blue-900 mb-1">关键解读</h4>
                  <p className="text-sm text-blue-800">{analysis.results_explanation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 增长驱动拆解 */}
        {analysis.drivers && (
          <Card className="border-0 shadow-sm print:shadow-none print:border print:border-gray-200">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">2) 增长驱动拆解</CardTitle>
                  {analysis.drivers_summary && (
                    <p className="text-sm text-gray-500 mt-1">{analysis.drivers_summary}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:grid-cols-3">
                {/* 需求/量 */}
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-green-600" />
                    <h4 className="font-semibold text-green-900">A. 需求/量</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">变化：</span> {analysis.drivers.demand?.change || '-'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">幅度：</span>
                      <span className="text-green-600 font-medium"> {analysis.drivers.demand?.magnitude || '-'}</span>
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">原因：</span> {analysis.drivers.demand?.reason || '-'}
                    </p>
                  </div>
                </div>
                
                {/* 变现/单价 */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">B. 变现/单价</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">变化：</span> {analysis.drivers.monetization?.change || '-'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">幅度：</span>
                      <span className="text-blue-600 font-medium"> {analysis.drivers.monetization?.magnitude || '-'}</span>
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">原因：</span> {analysis.drivers.monetization?.reason || '-'}
                    </p>
                  </div>
                </div>
                
                {/* 内部效率 */}
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-amber-600" />
                    <h4 className="font-semibold text-amber-900">C. 内部效率</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">变化：</span> {analysis.drivers.efficiency?.change || '-'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">幅度：</span>
                      <span className="text-amber-600 font-medium"> {analysis.drivers.efficiency?.magnitude || '-'}</span>
                    </p>
                    <p className="text-gray-700">
                      <span className="font-medium text-gray-900">原因：</span> {analysis.drivers.efficiency?.reason || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 投入与ROI分析 */}
        {analysis.investment_roi && (
          <Card className="border-0 shadow-sm print:shadow-none print:border print:border-gray-200">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                </div>
                <CardTitle className="text-lg">3) 投入与ROI分析</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 print:grid-cols-2">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 mb-1">资本支出变化</p>
                  <p className="text-gray-900">{analysis.investment_roi.capex_change || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 mb-1">运营支出变化</p>
                  <p className="text-gray-900">{analysis.investment_roi.opex_change || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 mb-1">投入方向</p>
                  <p className="text-gray-900">{analysis.investment_roi.investment_direction || '-'}</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-xs font-medium text-amber-700 mb-1">管理层承诺</p>
                  <p className="text-amber-900 font-medium">{analysis.investment_roi.management_commitment || '-'}</p>
                </div>
              </div>
              
              {analysis.investment_roi.roi_evidence && analysis.investment_roi.roi_evidence.length > 0 && (
                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-xs font-medium text-green-700 mb-2">ROI证据</p>
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

        {/* 可持续性与风险 */}
        {analysis.sustainability_risks && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:grid-cols-3">
            {/* 可持续驱动 */}
            <Card className="border-0 shadow-sm print:shadow-none print:border print:border-gray-200">
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

            {/* 主要风险 */}
            <Card className="border-0 shadow-sm print:shadow-none print:border print:border-gray-200">
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

            {/* 未来检查点 */}
            <Card className="border-0 shadow-sm print:shadow-none print:border print:border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  未来检查点
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

        {/* 模型影响与估值 */}
        {analysis.model_impact && (
          <Card className="border-0 shadow-sm print:shadow-none print:border print:border-gray-200">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-lg">5) 模型影响与估值</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 mb-1">收入假设调整</p>
                  <p className="text-gray-900">{analysis.model_impact.revenue_adjustment || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 mb-1">资本支出假设调整</p>
                  <p className="text-gray-900">{analysis.model_impact.capex_adjustment || '-'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl md:col-span-2 print:col-span-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">估值变化</p>
                  <p className="text-gray-900">{analysis.model_impact.valuation_change || '-'}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 md:col-span-2 print:col-span-2">
                  <p className="text-xs font-medium text-purple-700 mb-1">逻辑链</p>
                  <p className="text-purple-900">{analysis.model_impact.logic_chain || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 投委会结论 */}
        {analysis.final_judgment && (
          <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-800 to-slate-900 text-white overflow-hidden print:bg-slate-800 print:shadow-none">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                6) 投委会结论
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 print:grid-cols-2">
                <div className="p-4 bg-white/10 rounded-xl">
                  <p className="text-xs font-medium text-slate-300 mb-2">更有信心的点</p>
                  <p className="text-white">{analysis.final_judgment.confidence || '-'}</p>
                </div>
                <div className="p-4 bg-white/10 rounded-xl">
                  <p className="text-xs font-medium text-slate-300 mb-2">更担心的点</p>
                  <p className="text-white">{analysis.final_judgment.concerns || '-'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl">
                <div>
                  <p className="text-xs font-medium text-slate-300 mb-1">净影响</p>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                    analysis.final_judgment.net_impact?.toLowerCase().includes('strong') || analysis.final_judgment.net_impact?.includes('强') ? 'bg-green-500 text-white' :
                    analysis.final_judgment.net_impact?.toLowerCase().includes('weak') || analysis.final_judgment.net_impact?.includes('弱') ? 'bg-red-500 text-white' :
                    'bg-slate-600 text-white'
                  }`}>
                    {(analysis.final_judgment.net_impact?.toLowerCase().includes('strong') || analysis.final_judgment.net_impact?.includes('强')) && <TrendingUp className="h-3.5 w-3.5" />}
                    {(analysis.final_judgment.net_impact?.toLowerCase().includes('weak') || analysis.final_judgment.net_impact?.includes('弱')) && <TrendingDown className="h-3.5 w-3.5" />}
                    {analysis.final_judgment.net_impact || '-'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-300 mb-1">投资建议</p>
                  <p className="text-white font-medium">{analysis.final_judgment.recommendation || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 研报对比分析 (如果有) */}
        {analysis.research_comparison && (
          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 print:shadow-none print:border print:border-amber-200">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-lg text-amber-900">研报对比分析</CardTitle>
                  {analysis.research_comparison.consensus_source && (
                    <p className="text-sm text-amber-700 mt-1">
                      预期来源: {analysis.research_comparison.consensus_source}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {analysis.research_comparison.beat_miss_summary && (
                <div className="p-4 bg-white/70 rounded-xl mb-4">
                  <p className="text-xs font-medium text-amber-700 mb-1">Beat/Miss 总结</p>
                  <p className="text-amber-900 font-medium">{analysis.research_comparison.beat_miss_summary}</p>
                </div>
              )}
              
              {analysis.research_comparison.key_differences && analysis.research_comparison.key_differences.length > 0 && (
                <div className="p-4 bg-white/70 rounded-xl mb-4">
                  <p className="text-xs font-medium text-amber-700 mb-2">关键差异点</p>
                  <ul className="space-y-1">
                    {analysis.research_comparison.key_differences.map((diff: string, idx: number) => (
                      <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                        {diff}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {analysis.research_comparison.analyst_blind_spots && (
                <div className="p-4 bg-amber-100/50 rounded-xl border border-amber-200">
                  <p className="text-xs font-medium text-amber-700 mb-1">分析师盲点</p>
                  <p className="text-amber-900">{analysis.research_comparison.analyst_blind_spots}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
