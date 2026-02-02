'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { FileText, ChevronRight, Loader2, TrendingUp, TrendingDown, Minus, Calendar, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReportListProps {
  onSelectAnalysis: (analysis: any) => void
  onRefresh: () => void
}

export default function ReportList({ onSelectAnalysis, onRefresh }: ReportListProps) {
  const t = useTranslations()
  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/reports')
      const data = await response.json()
      
      if (data.companies) {
        const allReports = data.companies.flatMap((company: any) =>
          company.reports.map((report: any) => ({
            ...report,
            company_name: company.name,
            company_symbol: company.symbol,
          }))
        )
        
        setReports(allReports.sort((a: any, b: any) => 
          new Date(b.filing_date).getTime() - new Date(a.filing_date).getTime()
        ))
      }
    } catch (error) {
      console.error('Failed to load reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getNetImpactIcon = (analysis: any) => {
    const impact = analysis?.final_judgment?.net_impact || ''
    if (impact.includes('强')) {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    } else if (impact.includes('弱')) {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('dashboard.noReportsYet')}</h3>
        <p className="text-gray-500 max-w-sm mx-auto">{t('dashboard.uploadFirstReport')}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">{t('dashboard.recentReports')}</h3>
        <Button variant="ghost" size="sm" onClick={loadReports} className="text-gray-500">
          <RefreshCw className="h-4 w-4 mr-1" />
          刷新
        </Button>
      </div>
      
      {/* List */}
      <div className="divide-y divide-gray-100">
        {reports.map((report) => (
          <div
            key={report.id}
            className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group"
            onClick={() => {
              if (report.analysis) {
                onSelectAnalysis({
                  ...report.analysis,
                  company_name: report.company_name,
                  company_symbol: report.company_symbol,
                  report_type: report.report_type,
                  fiscal_year: report.fiscal_year,
                  fiscal_quarter: report.fiscal_quarter,
                })
              }
            }}
          >
            {/* Company Logo */}
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20 flex-shrink-0">
              {report.company_symbol?.slice(0, 2) || '??'}
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900 truncate">
                  {report.company_name}
                </h4>
                <span className="text-xs text-gray-400">{report.company_symbol}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  {report.fiscal_quarter ? `Q${report.fiscal_quarter}` : 'FY'} {report.fiscal_year}
                </span>
                <span className="text-xs text-gray-400">
                  {format(new Date(report.filing_date), 'yyyy-MM-dd')}
                </span>
              </div>
              {report.analysis?.one_line_conclusion && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                  {report.analysis.one_line_conclusion}
                </p>
              )}
            </div>
            
            {/* Status & Action */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {report.processed ? (
                <div className="flex items-center gap-2">
                  {getNetImpactIcon(report.analysis)}
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    已分析
                  </span>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  处理中
                </span>
              )}
              <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
