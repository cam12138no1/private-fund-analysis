'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, TrendingUp, FileText, BarChart3, Upload, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import UploadModal from './upload-modal'
import ReportList from './report-list'
import AnalysisView from './analysis-view'

export default function DashboardClient() {
  const t = useTranslations()
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null)
  const [stats, setStats] = useState({
    totalReports: 0,
    companiesAnalyzed: 0,
    recentAnalyses: 0,
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard')
      const data = await response.json()
      
      if (data.analyses) {
        setStats({
          totalReports: data.analyses.length,
          companiesAnalyzed: new Set(data.analyses.map((a: any) => a.company_symbol)).size,
          recentAnalyses: data.analyses.filter((a: any) => {
            const createdDate = new Date(a.created_at)
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            return createdDate > weekAgo
          }).length,
        })
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

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
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,white)]" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-yellow-300" />
              <span className="text-sm font-medium text-blue-100">AI 驱动的财报分析</span>
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
              批量上传
            </Button>
            <Link href="/dashboard/summary">
              <Button 
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                查看汇总表
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
            <p className="font-semibold text-gray-900">上传新财报</p>
            <p className="text-sm text-gray-500">支持 PDF 格式，批量上传</p>
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
            <p className="font-semibold text-gray-900">财报汇总表</p>
            <p className="text-sm text-gray-500">所有分析要点的动态视图</p>
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
