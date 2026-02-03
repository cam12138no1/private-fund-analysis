import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analysisStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

// Delete a specific report (用户只能删除自己的报告)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { id } = params
    
    if (!id) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    // ★ 传入userId，确保只能删除自己的数据
    const deleted = await analysisStore.delete(userId, id)
    
    if (deleted) {
      console.log(`[Reports API] User ${userId} deleted report: ${id}`)
      return NextResponse.json({ success: true, message: `Report ${id} deleted` })
    } else {
      return NextResponse.json({ error: 'Report not found or access denied' }, { status: 404 })
    }
  } catch (error: any) {
    console.error('[Reports API] Delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete report' },
      { status: 500 }
    )
  }
}

// Get a specific report (用户只能查看自己的报告)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { id } = params
    
    if (!id) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    // ★ 传入userId，确保只能查看自己的数据
    const report = await analysisStore.get(userId, id)
    
    if (report) {
      return NextResponse.json({ report })
    } else {
      return NextResponse.json({ error: 'Report not found or access denied' }, { status: 404 })
    }
  } catch (error: any) {
    console.error('[Reports API] Get error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get report' },
      { status: 500 }
    )
  }
}
