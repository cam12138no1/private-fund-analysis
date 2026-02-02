'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Upload, Loader2, FileText, CheckCircle2, AlertCircle, Trash2, Building2, Cpu, Clock, FileSearch, Brain, Save, BookOpen, FileBarChart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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

type AnalysisStatus = 'idle' | 'uploading' | 'extracting' | 'analyzing' | 'saving' | 'success' | 'error'

// Company categories for selection
const COMPANY_CATEGORIES = {
  AI_APPLICATION: {
    name: 'AI应用公司',
    icon: Building2,
    color: 'blue',
    description: 'Microsoft, Google, Amazon, Meta, Salesforce 等'
  },
  AI_SUPPLY_CHAIN: {
    name: 'AI供应链公司',
    icon: Cpu,
    color: 'purple',
    description: 'Nvidia, AMD, TSMC, ASML 等'
  }
}

// Status display configuration - Chinese labels
const STATUS_CONFIG = {
  idle: { icon: Clock, color: 'gray', label: '待上传' },
  uploading: { icon: Upload, color: 'blue', label: '上传中' },
  extracting: { icon: FileSearch, color: 'indigo', label: '提取文本' },
  analyzing: { icon: Brain, color: 'purple', label: 'AI分析中' },
  saving: { icon: Save, color: 'green', label: '保存结果' },
  success: { icon: CheckCircle2, color: 'green', label: '完成' },
  error: { icon: AlertCircle, color: 'red', label: '失败' },
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  // Financial report files (财报)
  const [financialFiles, setFinancialFiles] = useState<FileItem[]>([])
  // Research report files (研报)
  const [researchFiles, setResearchFiles] = useState<FileItem[]>([])
  
  const [dragActiveFinancial, setDragActiveFinancial] = useState(false)
  const [dragActiveResearch, setDragActiveResearch] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<'AI_APPLICATION' | 'AI_SUPPLY_CHAIN' | null>(null)
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  
  // 使用 ref 来防止重复提交（比 state 更可靠，因为不会触发重渲染）
  const isSubmittingRef = useRef(false)
  const submissionIdRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // 如果正在提交，取消请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      
      // 只有在不提交时才重置状态
      if (!isSubmittingRef.current) {
        setFinancialFiles([])
        setResearchFiles([])
        setSelectedCategory(null)
        setAnalysisStatus('idle')
        setErrorMessage('')
        submissionIdRef.current = null
      }
    }
  }, [isOpen])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  if (!isOpen) return null

  const handleDragFinancial = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActiveFinancial(true)
    } else if (e.type === 'dragleave') {
      setDragActiveFinancial(false)
    }
  }

  const handleDragResearch = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActiveResearch(true)
    } else if (e.type === 'dragleave') {
      setDragActiveResearch(false)
    }
  }

  const addFiles = (newFiles: FileList | File[], type: 'financial' | 'research') => {
    const validFiles: FileItem[] = []
    const invalidFiles: string[] = []
    const existingFiles = type === 'financial' ? financialFiles : researchFiles

    Array.from(newFiles).forEach((file) => {
      if (file.type === 'application/pdf') {
        if (!existingFiles.some(f => f.file.name === file.name)) {
          validFiles.push({
            file,
            id: `${file.name}_${Date.now()}_${Math.random()}`,
          })
        }
      } else {
        invalidFiles.push(file.name)
      }
    })

    if (invalidFiles.length > 0) {
      toast({
        title: '格式错误',
        description: `仅支持PDF格式: ${invalidFiles.join(', ')}`,
        variant: 'destructive',
      })
    }

    if (validFiles.length > 0) {
      if (type === 'financial') {
        setFinancialFiles(prev => [...prev, ...validFiles])
      } else {
        setResearchFiles(prev => [...prev, ...validFiles])
      }
    }
  }

  const handleDropFinancial = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActiveFinancial(false)
    if (e.dataTransfer.files?.length > 0) {
      addFiles(e.dataTransfer.files, 'financial')
    }
  }

  const handleDropResearch = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActiveResearch(false)
    if (e.dataTransfer.files?.length > 0) {
      addFiles(e.dataTransfer.files, 'research')
    }
  }

  const handleFileSelectFinancial = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(e.target.files, 'financial')
    }
    e.target.value = ''
  }

  const handleFileSelectResearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(e.target.files, 'research')
    }
    e.target.value = ''
  }

  const removeFile = (id: string, type: 'financial' | 'research') => {
    if (type === 'financial') {
      setFinancialFiles(prev => prev.filter(f => f.id !== id))
    } else {
      setResearchFiles(prev => prev.filter(f => f.id !== id))
    }
  }

  const handleSubmit = async () => {
    // 使用 ref 进行更可靠的重复提交检查
    if (isSubmittingRef.current) {
      console.log('[Upload] 已在提交中（ref检查），忽略重复请求')
      return
    }

    if (financialFiles.length === 0) {
      toast({
        title: '错误',
        description: '请至少上传一份财报文件',
        variant: 'destructive',
      })
      return
    }

    if (!selectedCategory) {
      toast({
        title: '错误',
        description: '请选择公司分类',
        variant: 'destructive',
      })
      return
    }

    // 立即设置锁定状态（使用 ref 确保同步）
    isSubmittingRef.current = true
    
    // 生成唯一提交ID
    const currentSubmissionId = `submit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    submissionIdRef.current = currentSubmissionId
    console.log(`[Upload] 开始提交: ${currentSubmissionId}`)

    // 创建 AbortController 用于取消请求
    abortControllerRef.current = new AbortController()

    setIsSubmitting(true)
    setAnalysisStatus('uploading')
    setErrorMessage('')

    try {
      const formData = new FormData()
      
      // Add all financial report files
      financialFiles.forEach((item, index) => {
        formData.append(`financialFiles`, item.file)
      })
      
      // Add all research report files
      researchFiles.forEach((item, index) => {
        formData.append(`researchFiles`, item.file)
      })
      
      formData.append('category', selectedCategory)
      // 添加唯一请求ID防止服务端重复处理
      formData.append('requestId', currentSubmissionId)

      // Update status as we progress
      const statusTimer1 = setTimeout(() => {
        if (submissionIdRef.current === currentSubmissionId) {
          setAnalysisStatus('extracting')
        }
      }, 1000)
      
      const statusTimer2 = setTimeout(() => {
        if (submissionIdRef.current === currentSubmissionId) {
          setAnalysisStatus('analyzing')
        }
      }, 3000)

      const response = await fetch('/api/reports/upload', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      })

      // 清除定时器
      clearTimeout(statusTimer1)
      clearTimeout(statusTimer2)

      // 检查是否是当前提交（防止旧请求的响应影响新状态）
      if (submissionIdRef.current !== currentSubmissionId) {
        console.log(`[Upload] 忽略旧请求的响应: ${currentSubmissionId}`)
        return
      }

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || '上传失败')
      }

      const result = await response.json()
      
      // 检查是否是重复请求
      if (result.duplicate) {
        console.log(`[Upload] 服务端检测到重复请求: ${currentSubmissionId}`)
      }
      
      setAnalysisStatus('saving')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setAnalysisStatus('success')
      
      toast({
        title: '✅ 分析完成',
        description: `${result.metadata?.company_name || '公司'} 财报分析已完成`,
      })
      
      onSuccess()
      
      // Auto close after success
      setTimeout(() => {
        if (submissionIdRef.current === currentSubmissionId) {
          setFinancialFiles([])
          setResearchFiles([])
          setSelectedCategory(null)
          setAnalysisStatus('idle')
          isSubmittingRef.current = false
          submissionIdRef.current = null
          onClose()
        }
      }, 2000)
      
    } catch (error: any) {
      // 忽略取消的请求
      if (error.name === 'AbortError') {
        console.log(`[Upload] 请求已取消: ${currentSubmissionId}`)
        return
      }
      
      // 检查是否是当前提交
      if (submissionIdRef.current !== currentSubmissionId) {
        console.log(`[Upload] 忽略旧请求的错误: ${currentSubmissionId}`)
        return
      }
      
      setAnalysisStatus('error')
      setErrorMessage(error.message || '分析失败')
      
      toast({
        title: '❌ 分析失败',
        description: error.message || '分析失败',
        variant: 'destructive',
      })
      
      // 错误时也要重置锁定状态
      isSubmittingRef.current = false
    } finally {
      setIsSubmitting(false)
      abortControllerRef.current = null
    }
  }

  const totalFinancialSize = financialFiles.reduce((acc, f) => acc + f.file.size, 0)
  const totalResearchSize = researchFiles.reduce((acc, f) => acc + f.file.size, 0)
  const isProcessing = ['uploading', 'extracting', 'analyzing', 'saving'].includes(analysisStatus)

  const StatusIcon = STATUS_CONFIG[analysisStatus].icon

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl bg-white shadow-2xl border-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">单公司财报分析</h2>
              <p className="text-blue-100 text-sm mt-1">
                {isProcessing 
                  ? STATUS_CONFIG[analysisStatus].label + '...'
                  : '上传财报和研报进行对比分析'
                }
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-white hover:bg-white/20"
              disabled={isSubmitting}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Progress indicator */}
          {isProcessing && (
            <div className="mt-4 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
              <div className="flex-1">
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500 ease-out"
                    style={{ 
                      width: analysisStatus === 'uploading' ? '25%' 
                           : analysisStatus === 'extracting' ? '50%' 
                           : analysisStatus === 'analyzing' ? '75%' 
                           : analysisStatus === 'saving' ? '90%' 
                           : '100%' 
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Success State */}
          {analysisStatus === 'success' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">分析完成</h3>
              <p className="text-gray-500">正在返回首页...</p>
            </div>
          )}

          {/* Error State */}
          {analysisStatus === 'error' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">分析失败</h3>
              <p className="text-red-600 text-sm mb-4">{errorMessage}</p>
              <Button 
                onClick={() => {
                  setAnalysisStatus('idle')
                  setErrorMessage('')
                  isSubmittingRef.current = false
                  submissionIdRef.current = null
                }}
                variant="outline"
              >
                重试
              </Button>
            </div>
          )}

          {/* Normal Form State */}
          {!['success', 'error'].includes(analysisStatus) && (
            <>
              {/* Company Category Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  公司分类 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(COMPANY_CATEGORIES).map(([key, category]) => {
                    const Icon = category.icon
                    const isSelected = selectedCategory === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedCategory(key as 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN')}
                        disabled={isProcessing}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected 
                            ? category.color === 'blue'
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            isSelected
                              ? category.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'
                              : 'bg-gray-100'
                          }`}>
                            <Icon className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                          </div>
                          <div>
                            <p className={`font-semibold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                              {category.name}
                            </p>
                            <p className="text-xs text-gray-500">{category.description}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Financial Report Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <div className="flex items-center gap-2">
                    <FileBarChart className="h-4 w-4 text-blue-600" />
                    财报文件 <span className="text-red-500">*</span>
                  </div>
                  <span className="text-xs font-normal text-gray-500 mt-1 block">
                    上传10-K、10-Q、Earnings Call等财报文件（支持多文件）
                  </span>
                </label>
                
                <div
                  onDragEnter={handleDragFinancial}
                  onDragLeave={handleDragFinancial}
                  onDragOver={handleDragFinancial}
                  onDrop={handleDropFinancial}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    dragActiveFinancial 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                  } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileSelectFinancial}
                    className="hidden"
                    id="financial-file-input"
                    disabled={isProcessing}
                  />
                  <label 
                    htmlFor="financial-file-input" 
                    className={`cursor-pointer ${isProcessing ? 'cursor-not-allowed' : ''}`}
                  >
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                      <Upload className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-600">
                      拖拽PDF文件到此处，或 <span className="text-blue-600 font-medium">点击上传</span>
                    </p>
                  </label>
                </div>

                {/* Financial Files List */}
                {financialFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {financialFiles.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
                          <p className="text-xs text-gray-500">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(item.id, 'financial')}
                          disabled={isProcessing}
                          className="h-8 w-8 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Research Report Upload (Optional) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-purple-600" />
                    研报文件 <span className="text-gray-400 font-normal">(可选)</span>
                  </div>
                  <span className="text-xs font-normal text-gray-500 mt-1 block">
                    上传券商研报用于对比分析（支持多文件）
                  </span>
                </label>
                
                <div
                  onDragEnter={handleDragResearch}
                  onDragLeave={handleDragResearch}
                  onDragOver={handleDragResearch}
                  onDrop={handleDropResearch}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    dragActiveResearch 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                  } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileSelectResearch}
                    className="hidden"
                    id="research-file-input"
                    disabled={isProcessing}
                  />
                  <label 
                    htmlFor="research-file-input" 
                    className={`cursor-pointer ${isProcessing ? 'cursor-not-allowed' : ''}`}
                  >
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                      <BookOpen className="h-6 w-6 text-purple-600" />
                    </div>
                    <p className="text-sm text-gray-600">
                      拖拽研报PDF到此处，或 <span className="text-purple-600 font-medium">点击上传</span>
                    </p>
                  </label>
                </div>

                {/* Research Files List */}
                {researchFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {researchFiles.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                        <BookOpen className="h-5 w-5 text-purple-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
                          <p className="text-xs text-gray-500">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(item.id, 'research')}
                          disabled={isProcessing}
                          className="h-8 w-8 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!['success', 'error'].includes(analysisStatus) && (
          <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {financialFiles.length > 0 && (
                  <span>财报: {financialFiles.length} 个文件 ({(totalFinancialSize / 1024 / 1024).toFixed(2)} MB)</span>
                )}
                {researchFiles.length > 0 && (
                  <span className="ml-3">研报: {researchFiles.length} 个文件</span>
                )}
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  取消
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={financialFiles.length === 0 || !selectedCategory || isSubmitting}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {STATUS_CONFIG[analysisStatus].label}...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      开始分析
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
