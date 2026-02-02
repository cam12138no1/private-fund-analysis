'use client'

import { useTranslations } from 'next-intl'
import { Settings, Globe, Key, Bell, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import LanguageSwitcher from '@/components/language-switcher'

export default function SettingsPage() {
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600 mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid gap-6">
        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2 text-blue-600" />
              {t('languageSettings')}
            </CardTitle>
            <CardDescription>{t('languageDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('currentLanguage')}</p>
                <p className="text-sm text-gray-600">{t('selectLanguage')}</p>
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
              {t('apiConfiguration')}
            </CardTitle>
            <CardDescription>{t('apiDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">OpenRouter API</p>
                <p className="text-sm text-gray-600">{t('apiKeyFor')}</p>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-green-600 mr-2">● {t('configured')}</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Gemini 3 Pro</p>
                <p className="text-sm text-gray-600">{t('currentModel')}</p>
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
              {t('about')}
            </CardTitle>
            <CardDescription>{t('appInfo')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('appName')}</span>
                <span className="font-medium">{tCommon('appName')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('version')}</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('targetUsers')}</span>
                <span className="font-medium">{t('privateEquity')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mainFeatures')}</span>
                <span className="font-medium">{t('financialAnalysis')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
