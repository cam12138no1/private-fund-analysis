import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analysisStore } from '@/lib/store'
import { checkRateLimit, createRateLimitHeaders } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // 速率限制检查
    const rateLimit = await checkRateLimit(userId, 'dashboard')
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimit),
        }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    // ★ 使用用户隔离的方法获取数据
    const allAnalyses = await analysisStore.getAll(userId)
    const analyses = allAnalyses.slice(0, limit)
    
    // 计算统计信息
    const stats = await analysisStore.getUserStats(userId)

    console.log(`[Dashboard API] User ${userId}: ${analyses.length} analyses, ${stats.processing} processing`)

    return NextResponse.json({ 
      analyses,
      recentAnalyses: analyses,
      processingCount: stats.processing,
      totalCount: stats.total,
      completedCount: stats.completed,
      failedCount: stats.failed,
    })
  } catch (error: any) {
    console.error('[Dashboard API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
