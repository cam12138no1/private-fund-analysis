import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analysisStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    // Use async store methods
    const allAnalyses = await analysisStore.getAll()
    const analyses = allAnalyses.slice(0, limit)
    const processingCount = await analysisStore.getProcessingCount()
    const totalCount = await analysisStore.size()

    console.log(`[Dashboard API] Retrieved ${analyses.length} analyses, ${processingCount} processing`)

    return NextResponse.json({ 
      analyses,
      recentAnalyses: analyses,
      processingCount,
      totalCount,
    })
  } catch (error: any) {
    console.error('Get dashboard error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
