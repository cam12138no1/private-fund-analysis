'use client'

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { FileText, ChevronRight, Loader2, TrendingUp, TrendingDown, Minus, Calendar, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReportListProps {
  onSelectAnalysis: (analysis: any) => void
  onRefresh: () => void
}

export default function ReportList({ onSelectAnalysis, onRefresh }: ReportListProps) {
  const t = useTranslations()
  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingCount, setProcessingCount] = useState(0)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadReports()
    
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // 当有处理中的项目时自动刷新
  useEffect(() => {
    if (processingCount > 0) {
      pollRef.current = setInterval(loadReports, 3000)
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [processingCount])

  const loadReports = async () => {
    try {
      // 使用 dashboard API，包含所有状态的数据
      const response = await fetch('/api/dashboard?limit=50')
      const data = await response.json()
      
      if (data.analyses) {
        // 按创建时间排序
        const sorted = data.analyses.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setReports(sorted)
        
        // 统计处理中的数量
        const processing = sorted.filter((r: any) => r.processing).length
        setProcessingCount(processing)
        
        // 如果处理完成，通知父组件刷新
        if (processing === 0 && processingCount > 0) {
          onRefresh()
        }
      }
    } catch (error) {
      console.error('Failed to load reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getNetImpactIcon = (report: any) => {
    const impact = report?.final_judgment?.net_impact || ''
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
            className={`flex items-center gap-4 px-6 py-4 transition-colors group ${
              report.processed 
                ? 'hover:bg-gray-50 cursor-pointer' 
                : report.processing 
                  ? 'bg-amber-50/50' 
                  : report.error 
                    ? 'bg-red-50/50' 
                    : ''
            }`}
            onClick={() => {
              if (report.processed) {
                onSelectAnalysis(report)
              }
            }}
          >
            {/* Company Logo */}
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0 ${
              report.processing 
                ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/20 animate-pulse' 
                : report.error
                  ? 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/20'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20'
            }`}>
              {report.processing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : report.error ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                report.company_symbol?.slice(0, 2) || '??'
              )}
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900 truncate">
                  {report.company_name || '正在识别...'}
                </h4>
                {report.company_symbol && (
                  <span className="text-xs text-gray-400">{report.company_symbol}</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  {report.fiscal_quarter ? `Q${report.fiscal_quarter}` : 'FY'} {report.fiscal_year || '---'}
                </span>
                {report.created_at && (
                  <span className="text-xs text-gray-400">
                    {format(new Date(report.created_at), 'yyyy-MM-dd HH:mm')}
                  </span>
                )}
              </div>
              {report.processing ? (
                <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  AI 正在分析财报，提取关键数据...
                </p>
              ) : report.error ? (
                <p className="text-sm text-red-600 mt-1">
                  分析失败: {report.error}
                </p>
              ) : report.one_line_conclusion ? (
                <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                  {report.one_line_conclusion}
                </p>
              ) : null}
            </div>
            
            {/* Status & Action */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {report.processing ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  分析中
                </span>
              ) : report.error ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <AlertCircle className="h-3 w-3" />
                  失败
                </span>
              ) : report.processed ? (
                <div className="flex items-center gap-2">
                  {getNetImpactIcon(report)}
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    已完成
                  </span>
                </div>
              ) : null}
              {report.processed && (
                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
