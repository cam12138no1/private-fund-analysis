'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, TrendingUp, FileText, BarChart3, Upload, Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import UploadModal from './upload-modal'
import ReportList from './report-list'
import AnalysisView from './analysis-view'
import ProcessingTracker from './processing-tracker'

export default function DashboardClient() {
  const t = useTranslations()
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null)
  const [processingCount, setProcessingCount] = useState(0)
  const [stats, setStats] = useState({
    totalReports: 0,
    companiesAnalyzed: 0,
    recentAnalyses: 0,
  })
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reportListRef = useRef<{ refresh: () => void } | null>(null)

  const loadDashboardData = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard')
      const data = await response.json()
      
      if (data.analyses) {
        setStats({
          totalReports: data.analyses.filter((a: any) => a.processed).length,
          companiesAnalyzed: new Set(data.analyses.filter((a: any) => a.processed).map((a: any) => a.company_symbol)).size,
          recentAnalyses: data.analyses.filter((a: any) => {
            const createdDate = new Date(a.created_at)
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            return createdDate > weekAgo && a.processed
          }).length,
        })
      }
      
      // 更新处理中数量
      setProcessingCount(data.processingCount || 0)
      
      return data.processingCount || 0
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      return 0
    }
  }, [])

  // 当有处理中的任务时，自动轮询刷新
  useEffect(() => {
    loadDashboardData()
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [loadDashboardData])

  // 处理中时自动刷新
  useEffect(() => {
    if (processingCount > 0) {
      // 每3秒刷新一次
      pollIntervalRef.current = setInterval(async () => {
        const count = await loadDashboardData()
        if (count === 0) {
          // 处理完成，停止轮询
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
        }
      }, 3000)
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [processingCount, loadDashboardData])

  if (selectedAnalysis) {
    return (
      <AnalysisView
        analysis={selectedAnalysis}
        onBack={() => setSelectedAnalysis(null)}
      />
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Processing Banner */}
      {processingCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 text-white flex items-center justify-between shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <p className="font-semibold">{t('common.processingBanner', { count: processingCount })}</p>
              <p className="text-sm text-amber-100">{t('common.processingDescription')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-amber-100">{t('common.autoRefreshing')}</p>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,white)]" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-yellow-300" />
              <span className="text-sm font-medium text-blue-100">{t('common.aiDriven')}</span>
            </div>
            <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
            <p className="text-blue-100 mt-2 max-w-lg">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setIsUploadOpen(true)} 
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
            >
              <Upload className="mr-2 h-5 w-5" />
              {t('common.uploadReport')}
            </Button>
            <Link href="/dashboard/summary">
              <Button 
                size="lg"
                className="bg-white/20 text-white border-2 border-white/50 hover:bg-white/30 backdrop-blur-sm"
              >
                {t('nav.analysis')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('dashboard.totalReports')}</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalReports}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('dashboard.companiesAnalyzed')}</p>
                <p className="text-3xl font-bold text-gray-900">{stats.companiesAnalyzed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('dashboard.recentAnalyses')}</p>
                <p className="text-3xl font-bold text-gray-900">{stats.recentAnalyses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
        >
          <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <Plus className="h-6 w-6 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900">{t('common.uploadNew')}</p>
            <p className="text-sm text-gray-500">{t('common.supportPdf')}</p>
          </div>
        </button>
        
        <Link 
          href="/dashboard/summary"
          className="flex items-center gap-4 p-6 bg-white rounded-xl border border-gray-200 hover:border-purple-400 hover:bg-purple-50/50 transition-all group"
        >
          <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
            <BarChart3 className="h-6 w-6 text-purple-600" />
          </div>
          <div className="text-left flex-1">
            <p className="font-semibold text-gray-900">{t('common.summarySheet')}</p>
            <p className="text-sm text-gray-500">{t('common.summaryDescription')}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
        </Link>
      </div>

      {/* Reports List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <ReportList onSelectAnalysis={setSelectedAnalysis} onRefresh={loadDashboardData} />
        </CardContent>
      </Card>

      {/* Processing Tracker */}
      <ProcessingTracker onRefresh={loadDashboardData} />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          loadDashboardData()
        }}
      />
    </div>
  )
}
