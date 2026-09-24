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

    const { episodeId, starBakerId, eliminatedId } = await request.json()

    if (!episodeId || !starBakerId || !eliminatedId) {
      return NextResponse.json({ error: 'Episode ID, Star Baker ID, and Eliminated ID are required' }, { status: 400 })
    }

    // Get the current episode to check if there was a previously eliminated contestant
    const currentEpisode = await prisma.episode.findUnique({
      where: { id: episodeId },
      select: { eliminatedId: true }
    })

    // Update the episode with results
    const episode = await prisma.episode.update({
      where: { id: episodeId },
      data: {
        starBakerId,
        eliminatedId,
        isCompleted: true
      },
      include: {
        starBaker: true,
        eliminated: true
      }
    })

    // Recalculate elimination status for all contestants based on completed episodes
    await recalculateEliminationStatus(episode.seasonId)

    return NextResponse.json(episode)
  } catch (error) {
    console.error('Error saving episode results:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function recalculateEliminationStatus(seasonId: string) {
  try {
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
  } catch (error) {
    console.error('Error recalculating elimination status:', error)
  }
}
