import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('seasonId')
    
    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 })
    }

    // Get all user scores for this season, excluding admin users, ordered by total score
    const leaderboard = await prisma.userScore.findMany({
      where: { 
        seasonId,
        user: {
          isAdmin: false
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isAdmin: true
          }
        }
      },
      orderBy: { totalScore: 'desc' }
    })

    // Calculate actual episodes with picks for each user
    const leaderboardWithPickCounts = await Promise.all(
      leaderboard.map(async (entry) => {
        // Count unique episodes where this user has made picks
        const episodesWithPicks = await prisma.pick.findMany({
          where: {
            userId: entry.userId,
            seasonId: seasonId,
            pickType: {
              in: ['STAR_BAKER', 'ELIMINATION']
            }
          },
          select: {
            episodeId: true
          },
          distinct: ['episodeId']
        })

        const totalEpisodesWithPicks = episodesWithPicks.length

        return {
          ...entry,
          totalEpisodesWithPicks
        }
      })
    )

    // Add rank to each entry
    const rankedLeaderboard = leaderboardWithPickCounts.map((entry, index) => ({
      rank: index + 1,
      userId: entry.user.id,
      userName: entry.user.name,
      userEmail: entry.user.email,
      totalScore: entry.totalScore,
      weeklyScore: entry.weeklyScore,
      finalistScore: entry.finalistScore,
      correctStarBaker: entry.correctStarBaker,
      correctElimination: entry.correctElimination,
      wrongStarBaker: entry.wrongStarBaker,
      wrongElimination: entry.wrongElimination,
      totalEpisodes: entry.totalEpisodes, // Completed episodes
      totalEpisodesWithPicks: entry.totalEpisodesWithPicks, // Episodes with picks
      technicalChallengeWins: entry.technicalChallengeWins,
      handshakes: entry.handshakes,
      soggyBottoms: entry.soggyBottoms,
      accuracy: entry.totalEpisodesWithPicks > 0 
        ? Math.round(((entry.correctStarBaker + entry.correctElimination) / (entry.totalEpisodesWithPicks * 2)) * 100)
        : 0
    }))

    return NextResponse.json(rankedLeaderboard)

  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
