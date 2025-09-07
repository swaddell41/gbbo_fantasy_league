import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId } = await request.json()

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 })
    }

    // Get all contestants for this season
    const contestants = await prisma.contestant.findMany({
      where: { seasonId }
    })

    // Get all completed episodes for this season
    const completedEpisodes = await prisma.episode.findMany({
      where: { 
        seasonId,
        isCompleted: true,
        eliminatedId: { not: null }
      },
      select: { eliminatedId: true }
    })

    // Get all eliminated contestant IDs from completed episodes
    const eliminatedIds = completedEpisodes.map(ep => ep.eliminatedId).filter(Boolean)

    // Update all contestants' elimination status
    for (const contestant of contestants) {
      const isEliminated = eliminatedIds.includes(contestant.id)
      await prisma.contestant.update({
        where: { id: contestant.id },
        data: { isEliminated }
      })
    }

    return NextResponse.json({ 
      message: 'Elimination status recalculated successfully',
      eliminatedCount: eliminatedIds.length,
      totalContestants: contestants.length
    })
  } catch (error) {
    console.error('Error recalculating elimination status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
