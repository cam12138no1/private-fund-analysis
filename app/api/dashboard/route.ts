import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analysisStore } from '@/lib/store'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Use in-memory store for demo mode
    const analyses = analysisStore.getAll().slice(0, limit)

    return NextResponse.json({ 
      analyses,
      recentAnalyses: analyses,  // 兼容汇总表页面
    })
  } catch (error: any) {
    console.error('Get dashboard error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
