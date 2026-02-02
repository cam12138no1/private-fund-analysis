import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analysisStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

// Clean stale processing reports
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get optional maxAgeMinutes from request body
    let maxAgeMinutes = 10 // Default: 10 minutes
    try {
      const body = await request.json()
      if (body.maxAgeMinutes && typeof body.maxAgeMinutes === 'number') {
        maxAgeMinutes = body.maxAgeMinutes
      }
    } catch {
      // Use default if no body
    }

    const deletedCount = await analysisStore.deleteStale(maxAgeMinutes)
    
    console.log(`[Clean API] Deleted ${deletedCount} stale reports (maxAge: ${maxAgeMinutes} minutes)`)
    
    return NextResponse.json({ 
      success: true, 
      deletedCount,
      message: `Cleaned ${deletedCount} stale processing reports`
    })
  } catch (error: any) {
    console.error('Clean reports error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to clean reports' },
      { status: 500 }
    )
  }
}

// Get count of stale reports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const all = await analysisStore.getAll()
    const now = Date.now()
    
    const staleReports = all.filter(analysis => {
      if (analysis.processing) {
        const createdAt = new Date(analysis.created_at).getTime()
        const ageMinutes = (now - createdAt) / (1000 * 60)
        return ageMinutes > 10 // Stale if processing for more than 10 minutes
      }
      return false
    })
    
    return NextResponse.json({ 
      staleCount: staleReports.length,
      staleReports: staleReports.map(r => ({
        id: r.id,
        company_name: r.company_name,
        created_at: r.created_at,
        ageMinutes: Math.round((now - new Date(r.created_at).getTime()) / (1000 * 60))
      }))
    })
  } catch (error: any) {
    console.error('Get stale reports error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get stale reports' },
      { status: 500 }
    )
  }
}
