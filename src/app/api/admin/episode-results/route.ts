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

    // Calculate and update user scores based on their picks
    await calculateEpisodeScores(episodeId, starBakerId, eliminatedId)

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

async function calculateEpisodeScores(episodeId: string, starBakerId: string, eliminatedId: string) {
  try {
    // Get all picks for this episode, excluding admin users
    const picks = await prisma.pick.findMany({
      where: { 
        episodeId,
        user: {
          isAdmin: false
        }
      },
      include: { user: true, contestant: true }
    })

    // Group picks by user
    const userPicks = picks.reduce((acc, pick) => {
      if (!acc[pick.userId]) {
        acc[pick.userId] = { starBaker: null, elimination: null }
      }
      if (pick.pickType === 'STAR_BAKER') {
        acc[pick.userId].starBaker = pick
      } else if (pick.pickType === 'ELIMINATION') {
        acc[pick.userId].elimination = pick
      }
      return acc
    }, {} as Record<string, { starBaker: any, elimination: any }>) // eslint-disable-line @typescript-eslint/no-explicit-any

    // Calculate scores for each user
    for (const [userId, picks] of Object.entries(userPicks)) {
      let points = 0
      let weeklyPoints = 0

      // Check Star Baker pick
      if (picks.starBaker) {
        const isCorrect = picks.starBaker.contestantId === starBakerId
        points += isCorrect ? 10 : 0
        weeklyPoints += isCorrect ? 10 : 0
        
        await prisma.pick.update({
          where: { id: picks.starBaker.id },
          data: { 
            isCorrect,
            points: isCorrect ? 10 : 0
          }
        })
      }

      // Check Elimination pick
      if (picks.elimination) {
        const isCorrect = picks.elimination.contestantId === eliminatedId
        points += isCorrect ? 10 : 0
        weeklyPoints += isCorrect ? 10 : 0
        
        await prisma.pick.update({
          where: { id: picks.elimination.id },
          data: { 
            isCorrect,
            points: isCorrect ? 10 : 0
          }
        })
      }

      // Update user score
      const season = await prisma.episode.findUnique({
        where: { id: episodeId },
        select: { seasonId: true }
      })

      if (season) {
        await prisma.userScore.upsert({
          where: { userId_seasonId: { userId, seasonId: season.seasonId } },
          update: { 
            totalScore: { increment: points },
            weeklyScore: { increment: weeklyPoints }
          },
          create: {
            userId,
            seasonId: season.seasonId,
            totalScore: points,
            weeklyScore: weeklyPoints
          }
        })
      }
    }
  } catch (error) {
    console.error('Error calculating episode scores:', error)
  }
}
