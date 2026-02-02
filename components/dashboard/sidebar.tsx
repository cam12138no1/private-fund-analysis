'use client'

import { LayoutDashboard, FileText, Settings, LogOut, TrendingUp, GitCompare, MessageSquarePlus } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export default function Sidebar() {
  const pathname = usePathname()

  // 简化后的导航 - 删除冗余Tab
  const navigation = [
    { name: '仪表板', href: '/dashboard', icon: LayoutDashboard },
    { name: '财报分析', href: '/dashboard/reports', icon: FileText },
    { name: '横向对比', href: '/dashboard/comparison', icon: GitCompare },
    { name: '自定义问题', href: '/dashboard/custom-questions', icon: MessageSquarePlus },
    { name: '设置', href: '/dashboard/settings', icon: Settings },
  ]

  return (
    <div className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-lg font-bold text-white">
            财报分析平台
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="flex-1">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-3 py-2 mb-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">管理员</p>
            <p className="text-xs text-slate-400 truncate">admin@example.com</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700/50"
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
        >
          <LogOut className="mr-3 h-5 w-5 text-slate-400" />
          退出登录
        </Button>
      </div>
    </div>
  )
}
