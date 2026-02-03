'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Upload, Loader2, FileText, CheckCircle2, AlertCircle, Trash2, Building2, Cpu, FileBarChart, BookOpen, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FileItem {
  file: File
  id: string
}

type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'success' | 'error'

const COMPANY_CATEGORIES = {
  AI_APPLICATION: {
    name: 'AI应用公司',
    icon: Building2,
    description: 'Meta, Google, Microsoft, Salesforce 等'
  },
  AI_SUPPLY_CHAIN: {
    name: 'AI供应链公司',
    icon: Cpu,
    description: 'Nvidia, AMD, TSMC, ASML 等'
  }
}

// 年份选项：当前年份及前后各一年
const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = [currentYear - 1, currentYear, currentYear + 1]

// 季度选项
const QUARTER_OPTIONS = [
  { value: 1, label: 'Q1' },
  { value: 2, label: 'Q2' },
  { value: 3, label: 'Q3' },
  { value: 4, label: 'Q4' },
]

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [financialFiles, setFinancialFiles] = useState<FileItem[]>([])
  const [researchFiles, setResearchFiles] = useState<FileItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<'AI_APPLICATION' | 'AI_SUPPLY_CHAIN' | null>(null)
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedQuarter, setSelectedQuarter] = useState<number>(4) // 默认Q4
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  
  // ★★★ 防重复提交的关键状态 ★★★
  const isSubmittingRef = useRef(false)
  const currentRequestIdRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!isOpen) {
      // 关闭时取消正在进行的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      
      // 只有在没有正在提交时才重置状态
      if (!isSubmittingRef.current) {
        setFinancialFiles([])
        setResearchFiles([])
        setSelectedCategory(null)
        setSelectedYear(currentYear)
        setSelectedQuarter(4)
        setAnalysisStatus('idle')
        setErrorMessage('')
        currentRequestIdRef.current = null
      }
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  if (!isOpen) return null

  const addFiles = (newFiles: FileList | File[], type: 'financial' | 'research') => {
    const validFiles: FileItem[] = []
    const existingFiles = type === 'financial' ? financialFiles : researchFiles

    Array.from(newFiles).forEach((file) => {
      if (file.type === 'application/pdf') {
        if (!existingFiles.some(f => f.file.name === file.name)) {
          validFiles.push({
            file,
            id: `${file.name}_${Date.now()}_${Math.random()}`,
          })
        }
      }
    })

    if (validFiles.length > 0) {
      if (type === 'financial') {
        setFinancialFiles(prev => [...prev, ...validFiles])
      } else {
        setResearchFiles(prev => [...prev, ...validFiles])
      }
    }
  }

  const removeFile = (id: string, type: 'financial' | 'research') => {
    if (type === 'financial') {
      setFinancialFiles(prev => prev.filter(f => f.id !== id))
    } else {
      setResearchFiles(prev => prev.filter(f => f.id !== id))
    }
  }

  const handleSubmit = async () => {
    // ★★★ 严格的防重复提交检查 ★★★
    if (isSubmittingRef.current) {
      console.log('[前端] ⚠️ 阻止重复提交：isSubmittingRef.current = true')
      return
    }

    if (financialFiles.length === 0) {
      toast({
        title: '请上传财报',
        description: '请至少上传一份财报PDF文件',
        variant: 'destructive',
      })
      return
    }

    if (!selectedCategory) {
      toast({
        title: '请选择分类',
        description: '请选择公司分类（AI应用/AI供应链）',
        variant: 'destructive',
      })
      return
    }

    // ★★★ 设置提交锁 ★★★
    isSubmittingRef.current = true
    
    // 生成唯一的请求ID
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    currentRequestIdRef.current = requestId
    
    console.log('[前端] ========================================')
    console.log('[前端] 开始提交，requestId:', requestId)
    
    abortControllerRef.current = new AbortController()

    setAnalysisStatus('uploading')
    setErrorMessage('')

    try {
      const formData = new FormData()
      
      financialFiles.forEach((item) => {
        formData.append('financialFiles', item.file)
      })
      
      researchFiles.forEach((item) => {
        formData.append('researchFiles', item.file)
      })
      
      formData.append('category', selectedCategory)
      formData.append('requestId', requestId)
      formData.append('fiscalYear', selectedYear.toString())
      formData.append('fiscalQuarter', selectedQuarter.toString())

      // 1.5秒后切换到分析状态
      const statusTimeout = setTimeout(() => {
        if (currentRequestIdRef.current === requestId) {
          setAnalysisStatus('analyzing')
        }
      }, 1500)

      console.log('[前端] 发送请求到 /api/reports/upload')
      const response = await fetch('/api/reports/upload', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      })

      clearTimeout(statusTimeout)

      // 检查是否是当前请求
      if (currentRequestIdRef.current !== requestId) {
        console.log('[前端] ⚠️ 请求ID不匹配，忽略响应')
        return
      }

      console.log('[前端] 收到响应，状态:', response.status)

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || '上传失败')
      }

      const result = await response.json()
      console.log('[前端] ✓ 分析成功，analysis_id:', result.analysis_id)
      
      setAnalysisStatus('success')
      
      toast({
        title: '分析完成',
        description: `${result.metadata?.company_name || '公司'} 财报分析已完成`,
      })
      
      onSuccess()
      
      // 1.5秒后关闭并重置
      setTimeout(() => {
        if (currentRequestIdRef.current === requestId) {
          setFinancialFiles([])
          setResearchFiles([])
          setSelectedCategory(null)
          setSelectedYear(currentYear)
          setSelectedQuarter(4)
          setAnalysisStatus('idle')
          isSubmittingRef.current = false
          currentRequestIdRef.current = null
          onClose()
        }
      }, 1500)
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[前端] 请求被取消')
        return
      }
      
      if (currentRequestIdRef.current !== requestId) {
        console.log('[前端] ⚠️ 请求ID不匹配，忽略错误')
        return
      }
      
      console.error('[前端] ✗ 提交失败:', error.message)
      
      setAnalysisStatus('error')
      setErrorMessage(error.message || '分析失败')
      
      toast({
        title: '分析失败',
        description: error.message || '分析失败',
        variant: 'destructive',
      })
      
      // 失败后释放提交锁，允许重试
      isSubmittingRef.current = false
    } finally {
      abortControllerRef.current = null
      console.log('[前端] ========================================')
    }
  }

  const isProcessing = analysisStatus === 'uploading' || analysisStatus === 'analyzing'

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isProcessing && onClose()}
      />
      
      {/* Modal */}
      <div className="absolute inset-x-4 top-[5%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">上传财报分析</h2>
            <p className="text-sm text-slate-500">上传季度财报和研报进行AI深度分析</p>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Status Display */}
          {isProcessing && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                </div>
                <div>
                  <p className="font-medium text-blue-900">
                    {analysisStatus === 'uploading' ? '正在上传文件...' : 'AI正在分析财报...'}
                  </p>
                  <p className="text-sm text-blue-600">请稍候，这可能需要1-2分钟</p>
                </div>
              </div>
            </div>
          )}

          {analysisStatus === 'success' && (
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-900">分析完成</p>
                  <p className="text-sm text-green-600">财报分析已生成，正在关闭...</p>
                </div>
              </div>
            </div>
          )}

          {analysisStatus === 'error' && (
            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-900">分析失败</p>
                  <p className="text-sm text-red-600">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Company Category Selection */}
          {!isProcessing && analysisStatus !== 'success' && (
            <>
              {/* Year and Quarter Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  报告期间
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Year Selection */}
                  <div>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {YEAR_OPTIONS.map(year => (
                        <option key={year} value={year}>{year}年</option>
                      ))}
                    </select>
                  </div>
                  {/* Quarter Selection */}
                  <div>
                    <select
                      value={selectedQuarter}
                      onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {QUARTER_OPTIONS.map(q => (
                        <option key={q.value} value={q.value}>{q.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">公司分类</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(COMPANY_CATEGORIES).map(([key, value]) => {
                    const Icon = value.icon
                    const isSelected = selectedCategory === key
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedCategory(key as 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN')}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                            {value.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{value.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Financial Report Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <FileBarChart className="h-4 w-4 text-blue-500" />
                  财报文件 <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-3">季度财报 (10-Q) 或年度财报 (10-K)</p>
                
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={(e) => e.target.files && addFiles(e.target.files, 'financial')}
                    className="hidden"
                    id="financial-upload"
                  />
                  <label htmlFor="financial-upload" className="cursor-pointer block text-center">
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">点击上传财报PDF</p>
                  </label>
                </div>

                {financialFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {financialFiles.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                        <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <span className="text-sm text-slate-700 flex-1 truncate">{item.file.name}</span>
                        <button
                          onClick={() => removeFile(item.id, 'financial')}
                          className="p-1 hover:bg-blue-100 rounded"
                        >
                          <Trash2 className="h-4 w-4 text-slate-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Research Report Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-500" />
                  研报文件 <span className="text-slate-400 text-xs font-normal">（可选）</span>
                </label>
                <p className="text-xs text-slate-500 mb-3">卖方研报，用于对比市场预期</p>
                
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 hover:border-purple-300 transition-colors">
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={(e) => e.target.files && addFiles(e.target.files, 'research')}
                    className="hidden"
                    id="research-upload"
                  />
                  <label htmlFor="research-upload" className="cursor-pointer block text-center">
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">点击上传研报PDF</p>
                  </label>
                </div>

                {researchFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {researchFiles.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                        <FileText className="h-4 w-4 text-purple-500 flex-shrink-0" />
                        <span className="text-sm text-slate-700 flex-1 truncate">{item.file.name}</span>
                        <button
                          onClick={() => removeFile(item.id, 'research')}
                          className="p-1 hover:bg-purple-100 rounded"
                        >
                          <Trash2 className="h-4 w-4 text-slate-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isProcessing && analysisStatus !== 'success' && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={financialFiles.length === 0 || !selectedCategory}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                开始分析
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
