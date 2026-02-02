'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { X, Upload, Loader2, FileText, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'
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

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const t = useTranslations()
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
        description: `Only PDF files supported: ${invalidFiles.join(', ')}`,
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

    setIsSubmitting(true)

    // Mark all as uploading
    setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const })))

    // Show toast and close modal immediately
    toast({
      title: '📤 正在后台处理',
      description: `${files.length} 份财报已提交分析，完成后将自动更新`,
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
        title: '✅ 分析完成',
        description: `${results.success} 份财报分析已完成`,
      })
    } else {
      toast({
        title: '⚠️ 部分完成',
        description: `成功 ${results.success}，失败 ${results.failed}`,
        variant: results.success === 0 ? 'destructive' : 'default',
      })
    }

    // Reset files state and trigger refresh
    setFiles([])
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
              <h2 className="text-xl font-bold text-white">批量上传财报</h2>
              <p className="text-blue-100 text-sm mt-1">支持多文件拖拽上传，AI自动分析归档</p>
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
                    拖拽文件到此处或 <span className="text-blue-600">点击选择</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    支持批量上传 PDF 格式财报
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
                  已选择 {files.length} 个文件
                </span>
                <span className="text-gray-500">
                  共 {(totalSize / 1024 / 1024).toFixed(2)} MB
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
                <p className="font-medium text-blue-900">AI 智能分析</p>
                <p className="text-blue-700 mt-0.5">
                  自动提取公司名称、财务数据、关键指标，生成完整的投委会级别分析报告
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
              取消
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={files.length === 0 || isSubmitting}
              className="px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  开始分析 ({files.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
