import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Scoring rules - must match the rules in /api/scoring/calculate/route.ts
const SCORING_RULES = {
  FINALIST_CORRECT: 3, // Points for each correct finalist pick
  STAR_BAKER_CORRECT: 3, // Points for correct Star Baker pick
  ELIMINATION_CORRECT: 2, // Points for correct Elimination pick
  STAR_BAKER_WRONG_ELIMINATED: -3, // Penalty if Star Baker pick gets eliminated
  ELIMINATION_WRONG_STAR_BAKER: -3, // Penalty if Elimination pick wins Star Baker
  TECHNICAL_CHALLENGE_WIN: 1, // Bonus for Star Baker winning technical challenge
  HANDSHAKE: 1, // Bonus for Paul Hollywood handshake
  SOGGY_BOTTOM: -1, // Penalty for soggy bottom comment
}

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
        let starBakerPoints = 0
        let isCorrect = false
        
        if (picks.starBaker.contestantId === starBakerId) {
          // Correct Star Baker pick
          starBakerPoints = SCORING_RULES.STAR_BAKER_CORRECT
          isCorrect = true
        } else if (picks.starBaker.contestantId === eliminatedId) {
          // Star Baker pick was eliminated (wrong pick)
          starBakerPoints = SCORING_RULES.STAR_BAKER_WRONG_ELIMINATED
          isCorrect = false
        }
        // If neither Star Baker nor eliminated, no points awarded or deducted
        
        points += starBakerPoints
        weeklyPoints += starBakerPoints
        
        await prisma.pick.update({
          where: { id: picks.starBaker.id },
          data: { 
            isCorrect,
            points: starBakerPoints
          }
        })
      }

      // Check Elimination pick
      if (picks.elimination) {
        let eliminationPoints = 0
        let isCorrect = false
        
        if (picks.elimination.contestantId === eliminatedId) {
          // Correct Elimination pick
          eliminationPoints = SCORING_RULES.ELIMINATION_CORRECT
          isCorrect = true
        } else if (picks.elimination.contestantId === starBakerId) {
          // Elimination pick won Star Baker (wrong pick)
          eliminationPoints = SCORING_RULES.ELIMINATION_WRONG_STAR_BAKER
          isCorrect = false
        }
        // If neither eliminated nor Star Baker, no points awarded or deducted
        
        points += eliminationPoints
        weeklyPoints += eliminationPoints
        
        await prisma.pick.update({
          where: { id: picks.elimination.id },
          data: { 
            isCorrect,
            points: eliminationPoints
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
