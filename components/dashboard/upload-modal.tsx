'use client'

import { useState, useCallback, useEffect } from 'react'
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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (!isSubmitting) {
        setFinancialFiles([])
        setResearchFiles([])
        setSelectedCategory(null)
        setAnalysisStatus('idle')
        setErrorMessage('')
      }
    }
  }, [isOpen, isSubmitting])

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

      // Update status as we progress
      setTimeout(() => setAnalysisStatus('extracting'), 1000)
      setTimeout(() => setAnalysisStatus('analyzing'), 3000)

      const response = await fetch('/api/reports/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || '上传失败')
      }

      const result = await response.json()
      
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
        setFinancialFiles([])
        setResearchFiles([])
        setSelectedCategory(null)
        setAnalysisStatus('idle')
        onClose()
      }, 2000)
      
    } catch (error: any) {
      setAnalysisStatus('error')
      setErrorMessage(error.message || '分析失败')
      
      toast({
        title: '❌ 分析失败',
        description: error.message || '分析失败',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
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
                           : '0%' 
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Success indicator */}
          {analysisStatus === 'success' && (
            <div className="mt-4 flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5" />
              <span>分析完成！</span>
            </div>
          )}
          
          {/* Error indicator */}
          {analysisStatus === 'error' && (
            <div className="mt-4 flex items-center gap-2 text-red-200">
              <AlertCircle className="h-5 w-5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Company Category Selection */}
          {!isProcessing && analysisStatus !== 'success' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                公司分类 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(COMPANY_CATEGORIES).map(([key, category]) => {
                  const Icon = category.icon
                  const isSelected = selectedCategory === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedCategory(key as 'AI_APPLICATION' | 'AI_SUPPLY_CHAIN')}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? category.color === 'blue' 
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          isSelected 
                            ? category.color === 'blue' ? 'bg-blue-100' : 'bg-purple-100'
                            : 'bg-gray-100'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            isSelected 
                              ? category.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                              : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{category.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Two Column Upload Areas */}
          {!isProcessing && analysisStatus !== 'success' && (
            <div className="grid grid-cols-2 gap-4">
              {/* Financial Report Upload */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileBarChart className="h-5 w-5 text-blue-600" />
                  <label className="text-sm font-medium text-gray-700">
                    财报文件 <span className="text-red-500">*</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  上传公司10-K、10-Q等财务报告
                </p>
                
                <div
                  onDragEnter={handleDragFinancial}
                  onDragLeave={handleDragFinancial}
                  onDragOver={handleDragFinancial}
                  onDrop={handleDropFinancial}
                >
                  <div 
                    className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                      dragActiveFinancial 
                        ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                        : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={handleFileSelectFinancial}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-2">
                      <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center ${
                        dragActiveFinancial ? 'bg-blue-200' : 'bg-blue-100'
                      }`}>
                        <FileBarChart className="h-6 w-6 text-blue-600" />
                      </div>
                      <p className="text-sm text-gray-600">
                        拖拽或<span className="text-blue-600">点击选择</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Financial Files List */}
                {financialFiles.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {financialFiles.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                        <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="text-xs text-gray-700 truncate flex-1">{item.file.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-red-600"
                          onClick={() => removeFile(item.id, 'financial')}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <p className="text-xs text-gray-500 text-right">
                      {financialFiles.length} 个文件，共 {(totalFinancialSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>

              {/* Research Report Upload */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  <label className="text-sm font-medium text-gray-700">
                    研报文件 <span className="text-gray-400">(可选)</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  上传券商研报，用于对比市场预期
                </p>
                
                <div
                  onDragEnter={handleDragResearch}
                  onDragLeave={handleDragResearch}
                  onDragOver={handleDragResearch}
                  onDrop={handleDropResearch}
                >
                  <div 
                    className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                      dragActiveResearch 
                        ? 'border-purple-500 bg-purple-50 scale-[1.02]' 
                        : 'border-gray-200 hover:border-purple-400 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={handleFileSelectResearch}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-2">
                      <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center ${
                        dragActiveResearch ? 'bg-purple-200' : 'bg-purple-100'
                      }`}>
                        <BookOpen className="h-6 w-6 text-purple-600" />
                      </div>
                      <p className="text-sm text-gray-600">
                        拖拽或<span className="text-purple-600">点击选择</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Research Files List */}
                {researchFiles.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {researchFiles.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                        <BookOpen className="h-4 w-4 text-purple-600 flex-shrink-0" />
                        <span className="text-xs text-gray-700 truncate flex-1">{item.file.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-red-600"
                          onClick={() => removeFile(item.id, 'research')}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <p className="text-xs text-gray-500 text-right">
                      {researchFiles.length} 个文件，共 {(totalResearchSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analysis Info Box */}
          {!isProcessing && analysisStatus !== 'success' && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Brain className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-900">分析说明</p>
                  <ul className="text-xs text-amber-700 mt-1 space-y-1">
                    <li>• 财报文件必须上传，研报文件可选</li>
                    <li>• 如有研报，AI将对比财报实际数据与研报预期</li>
                    <li>• 支持多个文件合并分析（如10-K + Earnings Call）</li>
                    <li>• 分析过程约需1-3分钟，请耐心等待</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between flex-shrink-0">
          {analysisStatus === 'success' ? (
            <>
              <div className="text-sm text-green-600 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                分析完成！
              </div>
              <Button
                onClick={() => {
                  setFinancialFiles([])
                  setResearchFiles([])
                  setSelectedCategory(null)
                  setAnalysisStatus('idle')
                  onClose()
                }}
              >
                完成
              </Button>
            </>
          ) : analysisStatus === 'error' ? (
            <>
              <div className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {errorMessage}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAnalysisStatus('idle')}>
                  重试
                </Button>
                <Button variant="outline" onClick={onClose}>
                  关闭
                </Button>
              </div>
            </>
          ) : isProcessing ? (
            <>
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {STATUS_CONFIG[analysisStatus].label}...
              </div>
              <Button variant="outline" disabled>
                处理中...
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={financialFiles.length === 0 || !selectedCategory || isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 min-w-[140px]"
              >
                <Upload className="h-4 w-4 mr-2" />
                开始分析
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
