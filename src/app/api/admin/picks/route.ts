import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Admin override for locked picks: clears a player's weekly picks for one
// episode (episodeId) or their finalists (finalists: true) so they can re-pick.
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user.canAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, seasonId, episodeId, finalists } = await request.json()
    if (!userId || !seasonId || (!episodeId && !finalists)) {
      return NextResponse.json({ error: 'userId, seasonId and episodeId or finalists are required' }, { status: 400 })
    }

    const { count } = await prisma.pick.deleteMany({
      where: finalists
        ? { userId, seasonId, pickType: 'FINALIST' }
        : { userId, seasonId, episodeId, pickType: { in: ['STAR_BAKER', 'ELIMINATION'] } },
    })

    return NextResponse.json({ deleted: count })
  } catch (error) {
    console.error('Error resetting picks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
