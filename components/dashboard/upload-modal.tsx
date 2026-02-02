'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X, Upload, Loader2, FileText, CheckCircle2, AlertCircle, Trash2, Building2, Cpu, Clock, FileSearch, Brain, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/toaster'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FileWithStatus {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'extracting' | 'analyzing' | 'saving' | 'success' | 'error'
  progress: number
  error?: string
  analysisId?: string
}

// Company categories for selection
const COMPANY_CATEGORIES = {
  AI_APPLICATION: {
    name: 'AI Application Companies',
    nameZh: 'AI应用公司',
    icon: Building2,
    color: 'blue',
    description: 'Microsoft, Google, Amazon, Meta, Salesforce, etc.'
  },
  AI_SUPPLY_CHAIN: {
    name: 'AI Supply Chain Companies',
    nameZh: 'AI供应链公司',
    icon: Cpu,
    color: 'purple',
    description: 'Nvidia, AMD, TSMC, ASML, etc.'
  }
}

// Status display configuration
const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'gray', label: 'Waiting', progress: 0 },
  uploading: { icon: Upload, color: 'blue', label: 'Uploading', progress: 20 },
  extracting: { icon: FileSearch, color: 'indigo', label: 'Extracting Text', progress: 40 },
  analyzing: { icon: Brain, color: 'purple', label: 'AI Analyzing', progress: 70 },
  saving: { icon: Save, color: 'green', label: 'Saving Results', progress: 90 },
  success: { icon: CheckCircle2, color: 'green', label: 'Complete', progress: 100 },
  error: { icon: AlertCircle, color: 'red', label: 'Failed', progress: 0 },
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const t = useTranslations()
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<'AI_APPLICATION' | 'AI_SUPPLY_CHAIN' | null>(null)
  const [showProgress, setShowProgress] = useState(false)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Don't reset if still processing
      if (!isSubmitting) {
        setFiles([])
        setSelectedCategory(null)
        setShowProgress(false)
      }
    }
  }, [isOpen, isSubmitting])

  if (!isOpen) return null

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const addFiles = (newFiles: FileList | File[]) => {
    const validFiles: FileWithStatus[] = []
    const invalidFiles: string[] = []

    Array.from(newFiles).forEach((file) => {
      if (file.type === 'application/pdf') {
        // Check if file already exists
        if (!files.some(f => f.file.name === file.name)) {
          validFiles.push({
            file,
            id: `${file.name}_${Date.now()}_${Math.random()}`,
            status: 'pending',
            progress: 0,
          })
        }
      } else {
        invalidFiles.push(file.name)
      }
    })

    if (invalidFiles.length > 0) {
      toast({
        title: t('common.error'),
        description: `${t('upload.onlyPdfSupported')}: ${invalidFiles.join(', ')}`,
        variant: 'destructive',
      })
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files?.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(e.target.files)
    }
    e.target.value = '' // Reset to allow re-selecting same files
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const updateFileStatus = (id: string, updates: Partial<FileWithStatus>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast({
        title: t('common.error'),
        description: t('upload.selectFile'),
        variant: 'destructive',
      })
      return
    }

    if (!selectedCategory) {
      toast({
        title: t('common.error'),
        description: 'Please select a company category',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    setShowProgress(true)

    // Process files sequentially to show clear progress
    const results: { success: number; failed: number } = { success: 0, failed: 0 }

    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i]
      
      try {
        // Step 1: Uploading
        updateFileStatus(fileItem.id, { status: 'uploading', progress: 20 })
        
        const formData = new FormData()
        formData.append('file', fileItem.file)
        formData.append('category', selectedCategory)

        // Step 2: Extracting (simulated - happens on server)
        setTimeout(() => {
          updateFileStatus(fileItem.id, { status: 'extracting', progress: 40 })
        }, 500)

        // Step 3: Analyzing (simulated - happens on server)
        setTimeout(() => {
          updateFileStatus(fileItem.id, { status: 'analyzing', progress: 70 })
        }, 2000)

        const response = await fetch('/api/reports/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || 'Upload failed')
        }

        const result = await response.json()
        
        // Step 4: Saving
        updateFileStatus(fileItem.id, { status: 'saving', progress: 90 })
        
        // Small delay to show saving state
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Step 5: Success
        updateFileStatus(fileItem.id, { 
          status: 'success', 
          progress: 100,
          analysisId: result.analysis_id 
        })
        
        results.success++
        
        // Show individual success toast
        toast({
          title: `✅ ${fileItem.file.name}`,
          description: `Analysis complete for ${result.metadata?.company_name || 'report'}`,
        })
        
      } catch (error: any) {
        results.failed++
        updateFileStatus(fileItem.id, { 
          status: 'error', 
          progress: 0,
          error: error.message || 'Analysis failed'
        })
        
        // Show individual error toast
        toast({
          title: `❌ ${fileItem.file.name}`,
          description: error.message || 'Analysis failed',
          variant: 'destructive',
        })
        
        console.error(`Failed to process ${fileItem.file.name}:`, error)
      }
    }

    // Show final summary toast
    if (results.success > 0) {
      toast({
        title: `📊 Analysis Complete`,
        description: `Successfully analyzed ${results.success} report(s)${results.failed > 0 ? `, ${results.failed} failed` : ''}`,
      })
    }

    setIsSubmitting(false)
    
    // Trigger refresh
    onSuccess()
    
    // Auto close after 2 seconds if all successful
    if (results.failed === 0) {
      setTimeout(() => {
        setFiles([])
        setSelectedCategory(null)
        setShowProgress(false)
        onClose()
      }, 2000)
    }
  }

  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0)
  const completedCount = files.filter(f => f.status === 'success').length
  const errorCount = files.filter(f => f.status === 'error').length
  const processingCount = files.filter(f => !['pending', 'success', 'error'].includes(f.status)).length

  const getStatusIcon = (status: FileWithStatus['status']) => {
    const config = STATUS_CONFIG[status]
    const Icon = config.icon
    return <Icon className={`h-4 w-4 text-${config.color}-600 ${status === 'analyzing' ? 'animate-pulse' : ''} ${['uploading', 'extracting', 'saving'].includes(status) ? 'animate-spin' : ''}`} />
  }

  const getStatusColor = (status: FileWithStatus['status']) => {
    return STATUS_CONFIG[status].color
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white shadow-2xl border-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{t('upload.title')}</h2>
              <p className="text-blue-100 text-sm mt-1">
                {showProgress 
                  ? `Processing ${processingCount} / ${files.length} reports...`
                  : t('upload.subtitle')
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
          
          {/* Overall progress bar */}
          {showProgress && files.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-blue-100 mb-1">
                <span>{completedCount} completed</span>
                <span>{errorCount > 0 ? `${errorCount} failed` : ''}</span>
              </div>
              <div className="h-2 bg-blue-400/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-500 ease-out"
                  style={{ width: `${(completedCount / files.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Company Category Selection - Hide during processing */}
          {!showProgress && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">
                Company Category <span className="text-red-500">*</span>
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
              <p className="text-xs text-gray-500">
                Select the category to use the appropriate analysis prompt for the company type.
              </p>
            </div>
          )}

          {/* Drop Zone - Hide during processing */}
          {!showProgress && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div 
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                    : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-3">
                  <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center transition-all ${
                    dragActive ? 'bg-blue-200 scale-110' : 'bg-gradient-to-br from-blue-100 to-indigo-100'
                  }`}>
                    <Upload className={`h-8 w-8 transition-colors ${dragActive ? 'text-blue-600' : 'text-blue-500'}`} />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {t('upload.dragDrop')} <span className="text-blue-600">{t('upload.clickSelect')}</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {t('upload.supportBatch')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* File List with Progress */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">
                  {showProgress ? 'Processing Status' : `${files.length} file(s) selected`}
                </span>
                {!showProgress && (
                  <span className="text-gray-500">
                    {(totalSize / 1024 / 1024).toFixed(2)} MB total
                  </span>
                )}
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((fileItem) => {
                  const statusConfig = STATUS_CONFIG[fileItem.status]
                  const StatusIcon = statusConfig.icon
                  
                  return (
                    <div 
                      key={fileItem.id} 
                      className={`relative p-3 rounded-xl border transition-all ${
                        fileItem.status === 'error' 
                          ? 'border-red-200 bg-red-50'
                          : fileItem.status === 'success'
                            ? 'border-green-200 bg-green-50'
                            : showProgress
                              ? 'border-blue-200 bg-blue-50'
                              : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          fileItem.status === 'error'
                            ? 'bg-red-100'
                            : fileItem.status === 'success'
                              ? 'bg-green-100'
                              : showProgress
                                ? 'bg-blue-100'
                                : 'bg-white'
                        }`}>
                          {showProgress ? (
                            <StatusIcon className={`h-5 w-5 text-${statusConfig.color}-600 ${
                              ['uploading', 'extracting', 'saving'].includes(fileItem.status) ? 'animate-spin' : ''
                            } ${fileItem.status === 'analyzing' ? 'animate-pulse' : ''}`} />
                          ) : (
                            <FileText className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {fileItem.file.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {showProgress ? (
                              <>
                                <span className={`text-xs font-medium text-${statusConfig.color}-600`}>
                                  {statusConfig.label}
                                </span>
                                {fileItem.error && (
                                  <span className="text-xs text-red-600 truncate">
                                    - {fileItem.error}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-gray-500">
                                {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {!showProgress && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-600"
                            onClick={() => removeFile(fileItem.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      {/* Progress bar for each file */}
                      {showProgress && !['pending', 'success', 'error'].includes(fileItem.status) && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full bg-${statusConfig.color}-500 transition-all duration-500 ease-out`}
                              style={{ width: `${fileItem.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between flex-shrink-0">
          {showProgress ? (
            <>
              <div className="text-sm text-gray-600">
                {completedCount === files.length 
                  ? '✅ All reports processed!'
                  : `Processing ${processingCount} of ${files.length} reports...`
                }
              </div>
              <Button
                onClick={() => {
                  setFiles([])
                  setSelectedCategory(null)
                  setShowProgress(false)
                  onClose()
                }}
                disabled={isSubmitting}
                variant={completedCount === files.length ? 'default' : 'outline'}
              >
                {completedCount === files.length ? 'Done' : 'Close'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={files.length === 0 || !selectedCategory || isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {t('upload.startAnalysis')}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
