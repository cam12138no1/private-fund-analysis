'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { X, Upload, Loader2, FileText, CheckCircle2, AlertCircle, Trash2, Building2, Cpu } from 'lucide-react'
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
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
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

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const t = useTranslations()
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<'AI_APPLICATION' | 'AI_SUPPLY_CHAIN' | null>(null)

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

    // Mark all as uploading
    setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const })))

    // Show toast and close modal immediately
    toast({
      title: `📤 ${t('upload.backgroundProcessing')}`,
      description: t('upload.submittedForAnalysis', { count: files.length }),
    })
    
    // Close modal immediately - processing continues in background
    onClose()

    // Process files in parallel (but limit concurrency to 3)
    const pendingFiles = [...files]
    const results: { success: number; failed: number } = { success: 0, failed: 0 }

    const uploadFile = async (fileItem: FileWithStatus) => {
      try {
        const formData = new FormData()
        formData.append('file', fileItem.file)
        formData.append('category', selectedCategory)

        const response = await fetch('/api/reports/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || 'Upload failed')
        }

        results.success++
      } catch (error: any) {
        results.failed++
        console.error(`Failed to upload ${fileItem.file.name}:`, error)
      }
    }

    // Process in batches of 3
    for (let i = 0; i < pendingFiles.length; i += 3) {
      const batch = pendingFiles.slice(i, i + 3)
      await Promise.all(batch.map(uploadFile))
    }

    // Show completion toast
    if (results.failed === 0) {
      toast({
        title: `✅ ${t('upload.analysisComplete')}`,
        description: t('upload.reportsCompleted', { count: results.success }),
      })
    } else {
      toast({
        title: `⚠️ ${t('upload.partialComplete')}`,
        description: t('upload.successFailed', { success: results.success, failed: results.failed }),
        variant: results.success === 0 ? 'destructive' : 'default',
      })
    }

    // Reset files state and trigger refresh
    setFiles([])
    setSelectedCategory(null)
    setIsSubmitting(false)
    onSuccess()
  }

  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white shadow-2xl border-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{t('upload.title')}</h2>
              <p className="text-blue-100 text-sm mt-1">{t('upload.subtitle')}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Company Category Selection */}
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

          {/* Drop Zone */}
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

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">
                  {t('upload.filesSelected', { count: files.length })}
                </span>
                <span className="text-gray-500">
                  {t('upload.totalSize', { size: (totalSize / 1024 / 1024).toFixed(2) })}
                </span>
              </div>
              
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {files.map((fileItem) => (
                  <div 
                    key={fileItem.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
                  >
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      fileItem.status === 'success' ? 'bg-green-100' :
                      fileItem.status === 'error' ? 'bg-red-100' :
                      fileItem.status === 'uploading' ? 'bg-blue-100' : 'bg-gray-200'
                    }`}>
                      {fileItem.status === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : fileItem.status === 'error' ? (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      ) : fileItem.status === 'uploading' ? (
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                      ) : (
                        <FileText className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fileItem.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                        {fileItem.error && (
                          <span className="text-red-500 ml-2">{fileItem.error}</span>
                        )}
                      </p>
                    </div>
                    
                    {fileItem.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                        onClick={() => removeFile(fileItem.id)}
                      >
                        <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-sm">
                <p className="font-medium text-blue-900">{t('upload.aiSmartAnalysis')}</p>
                <p className="text-blue-700 mt-0.5">
                  {t('upload.aiDescription')}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="px-6"
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={files.length === 0 || isSubmitting || !selectedCategory}
              className="px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('upload.submitting')}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('upload.startAnalysis')} ({files.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
