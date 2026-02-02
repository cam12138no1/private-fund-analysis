'use client'

import { useTranslations } from 'next-intl'
import { Settings, Globe, Key, Bell, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import LanguageSwitcher from '@/components/language-switcher'

export default function SettingsPage() {
  const t = useTranslations()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">设置</h1>
        <p className="text-gray-600 mt-1">管理应用配置和偏好设置</p>
      </div>

      <div className="grid gap-6">
        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2 text-blue-600" />
              语言设置
            </CardTitle>
            <CardDescription>切换界面显示语言</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">当前语言</p>
                <p className="text-sm text-gray-600">选择您偏好的界面语言</p>
              </div>
              <LanguageSwitcher />
            </div>
          </CardContent>
        </Card>

        {/* API Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Key className="h-5 w-5 mr-2 text-green-600" />
              API 配置
            </CardTitle>
            <CardDescription>管理外部服务连接</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">OpenRouter API</p>
                <p className="text-sm text-gray-600">用于 AI 分析的 API 密钥</p>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-green-600 mr-2">● 已配置</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Gemini 3 Pro</p>
                <p className="text-sm text-gray-600">当前使用的 AI 模型</p>
              </div>
              <span className="text-sm text-blue-600">google/gemini-3-pro-preview</span>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-purple-600" />
              关于
            </CardTitle>
            <CardDescription>应用信息</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">应用名称</span>
                <span className="font-medium">AI金融工具</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">版本</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">目标用户</span>
                <span className="font-medium">私募基金</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">主要功能</span>
                <span className="font-medium">财报分析 & 要点提取</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
