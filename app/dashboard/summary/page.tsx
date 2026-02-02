'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Download, 
  RefreshCw,
  Building2,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import * as XLSX from 'xlsx'

interface AnalysisSummary {
  id: string
  company_name: string
  company_symbol: string
  fiscal_year: number
  fiscal_quarter?: number
  created_at: string
  one_line_conclusion?: string
  results_summary?: string
  drivers_summary?: string
  drivers?: {
    demand?: { change?: string; magnitude?: string }
    monetization?: { change?: string; magnitude?: string }
    efficiency?: { change?: string; magnitude?: string }
  }
  investment_roi?: {
    capex_change?: string
    management_commitment?: string
  }
  final_judgment?: {
    net_impact: string
    recommendation: string
    confidence: string
    concerns: string
  }
  sustainability_risks?: {
    main_risks: string[]
    checkpoints: string[]
  }
}

// 核心结论提取逻辑
interface CoreConclusion {
  company: string
  symbol: string
  period: string
  beatMiss: string           // Beat/Miss/Inline
  conclusion: string         // 一句话结论
  keyDriver: string          // 核心驱动力
  keyRisk: string            // 核心风险
  netImpact: string          // 净影响：更强/更弱/不变
  recommendation: string     // 投资建议
  checkpoint: string         // 下季检查点
  analysisDate: string       // 分析日期
}

function extractCoreConclusions(analysis: AnalysisSummary): CoreConclusion {
  // 1. 提取 Beat/Miss 状态
  const conclusion = analysis.one_line_conclusion || ''
  let beatMiss = '不明'
  if (conclusion.includes('Beat') || conclusion.includes('超预期') || conclusion.includes('强劲')) {
    beatMiss = 'Beat'
  } else if (conclusion.includes('Miss') || conclusion.includes('不及预期') || conclusion.includes('低于')) {
    beatMiss = 'Miss'
  } else if (conclusion.includes('Inline') || conclusion.includes('符合')) {
    beatMiss = 'Inline'
  }

  // 2. 提取核心驱动力（从drivers_summary或一句话结论中提取）
  let keyDriver = ''
  if (analysis.drivers_summary) {
    keyDriver = analysis.drivers_summary
  } else if (analysis.drivers?.demand?.change) {
    keyDriver = analysis.drivers.demand.change
  }
  // 限制长度
  if (keyDriver.length > 80) {
    keyDriver = keyDriver.substring(0, 77) + '...'
  }

  // 3. 提取核心风险（取第一条）
  const keyRisk = analysis.sustainability_risks?.main_risks?.[0] || ''

  // 4. 提取检查点（取第一条）
  const checkpoint = analysis.sustainability_risks?.checkpoints?.[0] || ''

  // 5. 净影响
  const netImpact = analysis.final_judgment?.net_impact || '不明'

  // 6. 建议
  let recommendation = analysis.final_judgment?.recommendation || ''
  if (recommendation.length > 60) {
    recommendation = recommendation.substring(0, 57) + '...'
  }

  return {
    company: analysis.company_name,
    symbol: analysis.company_symbol,
    period: analysis.fiscal_quarter 
      ? `${analysis.fiscal_year} Q${analysis.fiscal_quarter}` 
      : `${analysis.fiscal_year} FY`,
    beatMiss,
    conclusion: conclusion.length > 100 ? conclusion.substring(0, 97) + '...' : conclusion,
    keyDriver,
    keyRisk: keyRisk.length > 60 ? keyRisk.substring(0, 57) + '...' : keyRisk,
    netImpact,
    recommendation,
    checkpoint: checkpoint.length > 50 ? checkpoint.substring(0, 47) + '...' : checkpoint,
    analysisDate: new Date(analysis.created_at).toLocaleDateString('zh-CN'),
  }
}

export default function SummaryPage() {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filterYear, setFilterYear] = useState<number | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/dashboard')
      const data = await response.json()
      if (data.recentAnalyses) {
        setAnalyses(data.recentAnalyses)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 提取所有核心结论
  const coreConclusions = analyses.map(extractCoreConclusions)
  
  // 筛选
  const years = [...new Set(analyses.map(a => a.fiscal_year))].sort((a, b) => b - a)
  const filteredConclusions = filterYear 
    ? coreConclusions.filter(c => c.period.includes(String(filterYear)))
    : coreConclusions

  // 导出 Excel - 单一汇总表格式
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new()

    // 主表：核心结论汇总
    const headerRow = [
      '公司', 
      '代码', 
      '报告期', 
      'Beat/Miss', 
      '一句话结论', 
      '核心驱动', 
      '核心风险', 
      '净影响', 
      '投资建议', 
      '检查点',
      '分析日期'
    ]

    const dataRows = filteredConclusions.map(c => [
      c.company,
      c.symbol,
      c.period,
      c.beatMiss,
      c.conclusion,
      c.keyDriver,
      c.keyRisk,
      c.netImpact,
      c.recommendation,
      c.checkpoint,
      c.analysisDate,
    ])

    const sheetData = [
      ['财报核心结论汇总表'],
      [`生成时间: ${new Date().toLocaleString('zh-CN')}`],
      [`共计: ${filteredConclusions.length} 份分析`],
      [],
      headerRow,
      ...dataRows,
    ]

    const ws = XLSX.utils.aoa_to_sheet(sheetData)
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 18 },  // 公司
      { wch: 8 },   // 代码
      { wch: 12 },  // 报告期
      { wch: 10 },  // Beat/Miss
      { wch: 50 },  // 一句话结论
      { wch: 40 },  // 核心驱动
      { wch: 35 },  // 核心风险
      { wch: 10 },  // 净影响
      { wch: 35 },  // 投资建议
      { wch: 30 },  // 检查点
      { wch: 12 },  // 分析日期
    ]

    XLSX.utils.book_append_sheet(wb, ws, '核心结论汇总')

    // 第二个sheet：完整风险清单
    const riskRows = analyses.flatMap(a => 
      (a.sustainability_risks?.main_risks || []).map((risk, idx) => [
        a.company_name,
        a.company_symbol,
        a.fiscal_quarter ? `${a.fiscal_year} Q${a.fiscal_quarter}` : `${a.fiscal_year} FY`,
        idx + 1,
        risk,
      ])
    )

    const riskSheet = XLSX.utils.aoa_to_sheet([
      ['风险清单'],
      [],
      ['公司', '代码', '报告期', '序号', '风险描述'],
      ...riskRows,
    ])
    riskSheet['!cols'] = [{ wch: 18 }, { wch: 8 }, { wch: 12 }, { wch: 6 }, { wch: 60 }]
    XLSX.utils.book_append_sheet(wb, riskSheet, '风险清单')

    // 第三个sheet：检查点清单
    const checkRows = analyses.flatMap(a => 
      (a.sustainability_risks?.checkpoints || []).map((cp, idx) => [
        a.company_name,
        a.company_symbol,
        a.fiscal_quarter ? `${a.fiscal_year} Q${a.fiscal_quarter}` : `${a.fiscal_year} FY`,
        idx + 1,
        cp,
      ])
    )

    const checkSheet = XLSX.utils.aoa_to_sheet([
      ['检查点清单'],
      [],
      ['公司', '代码', '报告期', '序号', '检查点'],
      ...checkRows,
    ])
    checkSheet['!cols'] = [{ wch: 18 }, { wch: 8 }, { wch: 12 }, { wch: 6 }, { wch: 60 }]
    XLSX.utils.book_append_sheet(wb, checkSheet, '检查点清单')

    const filename = `财报核心结论_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  const getBeatMissStyle = (beatMiss: string) => {
    switch (beatMiss) {
      case 'Beat':
        return 'bg-green-100 text-green-700'
      case 'Miss':
        return 'bg-red-100 text-red-700'
      case 'Inline':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-50 text-gray-500'
    }
  }

  const getNetImpactStyle = (impact: string) => {
    if (impact.includes('强') || impact.toLowerCase().includes('strong')) {
      return { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' }
    } else if (impact.includes('弱') || impact.toLowerCase().includes('weak')) {
      return { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' }
    }
    return { icon: Minus, color: 'text-gray-500', bg: 'bg-gray-50' }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">核心结论汇总表</h1>
              <p className="text-sm text-gray-500">每家公司抽象为几条核心结论</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          
          {years.length > 0 && (
            <select
              value={filterYear || ''}
              onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 text-sm border rounded-lg bg-white"
            >
              <option value="">全部年份</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}
          
          <Button onClick={exportToExcel} disabled={analyses.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
            <Download className="h-4 w-4 mr-2" />
            导出 Excel
          </Button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">总分析</p>
          <p className="text-2xl font-bold text-gray-900">{filteredConclusions.length}</p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Beat</p>
          <p className="text-2xl font-bold text-green-600">
            {filteredConclusions.filter(c => c.beatMiss === 'Beat').length}
          </p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Miss</p>
          <p className="text-2xl font-bold text-red-600">
            {filteredConclusions.filter(c => c.beatMiss === 'Miss').length}
          </p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">看多</p>
          <p className="text-2xl font-bold text-green-600">
            {filteredConclusions.filter(c => c.netImpact.includes('强')).length}
          </p>
        </Card>
        <Card className="p-4 bg-white border-0 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">看空</p>
          <p className="text-2xl font-bold text-red-600">
            {filteredConclusions.filter(c => c.netImpact.includes('弱')).length}
          </p>
        </Card>
      </div>

      {/* 主表格 - Spreadsheet 样式 */}
      {filteredConclusions.length === 0 ? (
        <Card className="p-12 text-center bg-white border-0 shadow-sm">
          <div className="max-w-md mx-auto">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无分析数据</h3>
            <p className="text-gray-500">上传财报后，核心结论将自动提取到此表格</p>
          </div>
        </Card>
      ) : (
        <Card className="bg-white border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {/* 表头 */}
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap sticky left-0 bg-slate-800 z-10">公司</th>
                  <th className="px-3 py-3 text-center font-semibold whitespace-nowrap">报告期</th>
                  <th className="px-3 py-3 text-center font-semibold whitespace-nowrap">Beat/Miss</th>
                  <th className="px-3 py-3 text-left font-semibold min-w-[300px]">一句话结论</th>
                  <th className="px-3 py-3 text-left font-semibold min-w-[200px]">核心驱动</th>
                  <th className="px-3 py-3 text-left font-semibold min-w-[200px]">核心风险</th>
                  <th className="px-3 py-3 text-center font-semibold whitespace-nowrap">净影响</th>
                  <th className="px-3 py-3 text-left font-semibold min-w-[180px]">投资建议</th>
                  <th className="px-3 py-3 text-left font-semibold min-w-[150px]">检查点</th>
                </tr>
              </thead>
              
              {/* 表体 */}
              <tbody className="divide-y divide-gray-100">
                {filteredConclusions.map((row, idx) => {
                  const impactStyle = getNetImpactStyle(row.netImpact)
                  const ImpactIcon = impactStyle.icon
                  
                  return (
                    <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                      {/* 公司 - sticky */}
                      <td className="px-3 py-3 sticky left-0 bg-white z-10 border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {row.symbol.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate text-xs">{row.company}</p>
                            <p className="text-xs text-gray-400">{row.symbol}</p>
                          </div>
                        </div>
                      </td>
                      
                      {/* 报告期 */}
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex px-2 py-1 rounded bg-gray-100 text-xs font-medium text-gray-700">
                          {row.period}
                        </span>
                      </td>
                      
                      {/* Beat/Miss */}
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${getBeatMissStyle(row.beatMiss)}`}>
                          {row.beatMiss}
                        </span>
                      </td>
                      
                      {/* 一句话结论 */}
                      <td className="px-3 py-3">
                        <p className="text-gray-700 text-xs leading-relaxed">{row.conclusion || '-'}</p>
                      </td>
                      
                      {/* 核心驱动 */}
                      <td className="px-3 py-3">
                        <p className="text-gray-600 text-xs">{row.keyDriver || '-'}</p>
                      </td>
                      
                      {/* 核心风险 */}
                      <td className="px-3 py-3">
                        {row.keyRisk ? (
                          <div className="flex items-start gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                            <p className="text-gray-600 text-xs">{row.keyRisk}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      
                      {/* 净影响 */}
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${impactStyle.bg} ${impactStyle.color}`}>
                          <ImpactIcon className="h-3 w-3" />
                          {row.netImpact.includes('强') ? '更强' : row.netImpact.includes('弱') ? '更弱' : '不变'}
                        </span>
                      </td>
                      
                      {/* 投资建议 */}
                      <td className="px-3 py-3">
                        <p className="text-gray-600 text-xs">{row.recommendation || '-'}</p>
                      </td>
                      
                      {/* 检查点 */}
                      <td className="px-3 py-3">
                        <p className="text-gray-500 text-xs">{row.checkpoint || '-'}</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {/* 表格底部说明 */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            <p>
              <strong>核心结论提取逻辑：</strong>
              Beat/Miss 从一句话结论自动识别 | 
              核心驱动取自驱动层摘要 | 
              核心风险取主要风险第一条 | 
              检查点取检查点列表第一条
            </p>
          </div>
        </Card>
      )}

      {/* 逻辑说明卡片 */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 border-0">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          核心结论提取逻辑
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="font-medium text-white/90 mb-1">Beat/Miss 判断</p>
            <p className="text-white/70 text-xs">从一句话结论中自动识别关键词：Beat、超预期、强劲 → Beat；Miss、不及预期 → Miss</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="font-medium text-white/90 mb-1">核心驱动</p>
            <p className="text-white/70 text-xs">优先取驱动层摘要（drivers_summary），其次取需求/量的变化描述</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="font-medium text-white/90 mb-1">核心风险</p>
            <p className="text-white/70 text-xs">取 sustainability_risks.main_risks 数组的第一条，限制60字符</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="font-medium text-white/90 mb-1">净影响</p>
            <p className="text-white/70 text-xs">直接取 final_judgment.net_impact 字段，识别"更强/更弱/不变"</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="font-medium text-white/90 mb-1">投资建议</p>
            <p className="text-white/70 text-xs">取 final_judgment.recommendation 字段，限制60字符</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="font-medium text-white/90 mb-1">检查点</p>
            <p className="text-white/70 text-xs">取 sustainability_risks.checkpoints 数组的第一条，限制50字符</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
