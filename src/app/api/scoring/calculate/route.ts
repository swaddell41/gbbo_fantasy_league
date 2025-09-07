import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Scoring rules
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

    const { seasonId } = await request.json()
    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 })
    }

    // Get all non-admin users for this season
    const users = await prisma.user.findMany({
      where: {
        isAdmin: false,
        picks: {
          some: {
            seasonId: seasonId
          }
        }
      }
    })

    // Get all episodes with results for this season
    const episodes = await prisma.episode.findMany({
      where: {
        seasonId: seasonId,
        isCompleted: true
      },
      include: {
        starBaker: true,
        eliminated: true,
        technicalChallengeWinner: true,
        handshakes: {
          include: {
            contestant: true
          }
        },
        soggyBottoms: {
          include: {
            contestant: true
          }
        }
      }
    })

    // Get all contestants for this season
    const contestants = await prisma.contestant.findMany({
      where: { seasonId }
    })

    // Calculate scores for each user
    const userScores = []

    for (const user of users) {
      let totalScore = 0
      const scoreBreakdown = {
        finalistPoints: 0,
        weeklyPoints: 0,
        totalEpisodes: episodes.length,
        correctStarBaker: 0,
        correctElimination: 0,
        wrongStarBaker: 0,
        wrongElimination: 0,
        technicalChallengeWins: 0,
        handshakes: 0,
        soggyBottoms: 0
      }

      // Get all picks for this user in this season
      const userPicks = await prisma.pick.findMany({
        where: {
          userId: user.id,
          seasonId: seasonId
        },
        include: {
          contestant: true,
          episode: true
        }
      })

      // Calculate finalist picks (these are scored at the end)
      const finalistPicks = userPicks.filter(pick => pick.pickType === 'FINALIST')
      
      // For now, we'll calculate finalist points when the season is complete
      // This would need to be updated when we know who the actual finalists are
      scoreBreakdown.finalistPoints = 0 // Will be calculated when season ends

      // Calculate weekly picks
      for (const episode of episodes) {
        const episodePicks = userPicks.filter(pick => 
          pick.episodeId === episode.id && 
          (pick.pickType === 'STAR_BAKER' || pick.pickType === 'ELIMINATION')
        )

        for (const pick of episodePicks) {
          if (pick.pickType === 'STAR_BAKER') {
            if (episode.starBakerId === pick.contestantId) {
              // Correct Star Baker pick
              totalScore += SCORING_RULES.STAR_BAKER_CORRECT
              scoreBreakdown.weeklyPoints += SCORING_RULES.STAR_BAKER_CORRECT
              scoreBreakdown.correctStarBaker++

              // Check for bonus points
              if (episode.technicalChallengeWinnerId === pick.contestantId) {
                totalScore += SCORING_RULES.TECHNICAL_CHALLENGE_WIN
                scoreBreakdown.weeklyPoints += SCORING_RULES.TECHNICAL_CHALLENGE_WIN
                scoreBreakdown.technicalChallengeWins++
              }

              // Check for handshakes
              const handshakeCount = episode.handshakes.filter(h => h.contestantId === pick.contestantId).length
              if (handshakeCount > 0) {
                const handshakePoints = handshakeCount * SCORING_RULES.HANDSHAKE
                totalScore += handshakePoints
                scoreBreakdown.weeklyPoints += handshakePoints
                scoreBreakdown.handshakes += handshakeCount
              }

              // Check for soggy bottoms
              const soggyBottomCount = episode.soggyBottoms.filter(s => s.contestantId === pick.contestantId).length
              if (soggyBottomCount > 0) {
                const soggyBottomPoints = soggyBottomCount * SCORING_RULES.SOGGY_BOTTOM
                totalScore += soggyBottomPoints
                scoreBreakdown.weeklyPoints += soggyBottomPoints
                scoreBreakdown.soggyBottoms += soggyBottomCount
              }
            } else if (episode.eliminatedId === pick.contestantId) {
              // Star Baker pick was eliminated (wrong pick)
              totalScore += SCORING_RULES.STAR_BAKER_WRONG_ELIMINATED
              scoreBreakdown.weeklyPoints += SCORING_RULES.STAR_BAKER_WRONG_ELIMINATED
              scoreBreakdown.wrongStarBaker++
            } else {
              // Star Baker pick was neither Star Baker nor eliminated (neutral)
              // No points awarded or deducted
            }
          } else if (pick.pickType === 'ELIMINATION') {
            if (episode.eliminatedId === pick.contestantId) {
              // Correct Elimination pick
              totalScore += SCORING_RULES.ELIMINATION_CORRECT
              scoreBreakdown.weeklyPoints += SCORING_RULES.ELIMINATION_CORRECT
              scoreBreakdown.correctElimination++
            } else if (episode.starBakerId === pick.contestantId) {
              // Elimination pick won Star Baker (wrong pick)
              totalScore += SCORING_RULES.ELIMINATION_WRONG_STAR_BAKER
              scoreBreakdown.weeklyPoints += SCORING_RULES.ELIMINATION_WRONG_STAR_BAKER
              scoreBreakdown.wrongElimination++
            } else {
              // Elimination pick was neither eliminated nor Star Baker (neutral)
              // No points awarded or deducted
            }
          }
        }
      }

      // Update or create user score record
      await prisma.userScore.upsert({
        where: {
          userId_seasonId: {
            userId: user.id,
            seasonId: seasonId
          }
        },
        update: {
          totalScore,
          weeklyScore: scoreBreakdown.weeklyPoints,
          finalistScore: scoreBreakdown.finalistPoints,
          correctStarBaker: scoreBreakdown.correctStarBaker,
          correctElimination: scoreBreakdown.correctElimination,
          wrongStarBaker: scoreBreakdown.wrongStarBaker,
          wrongElimination: scoreBreakdown.wrongElimination,
          totalEpisodes: scoreBreakdown.totalEpisodes,
          technicalChallengeWins: scoreBreakdown.technicalChallengeWins,
          handshakes: scoreBreakdown.handshakes,
          soggyBottoms: scoreBreakdown.soggyBottoms
        },
        create: {
          userId: user.id,
          seasonId: seasonId,
          totalScore,
          weeklyScore: scoreBreakdown.weeklyPoints,
          finalistScore: scoreBreakdown.finalistPoints,
          correctStarBaker: scoreBreakdown.correctStarBaker,
          correctElimination: scoreBreakdown.correctElimination,
          wrongStarBaker: scoreBreakdown.wrongStarBaker,
          wrongElimination: scoreBreakdown.wrongElimination,
          totalEpisodes: scoreBreakdown.totalEpisodes,
          technicalChallengeWins: scoreBreakdown.technicalChallengeWins,
          handshakes: scoreBreakdown.handshakes,
          soggyBottoms: scoreBreakdown.soggyBottoms
        }
      })

      userScores.push({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        totalScore,
        weeklyPoints: scoreBreakdown.weeklyPoints,
        finalistPoints: scoreBreakdown.finalistPoints,
        correctStarBaker: scoreBreakdown.correctStarBaker,
        correctElimination: scoreBreakdown.correctElimination,
        wrongStarBaker: scoreBreakdown.wrongStarBaker,
        wrongElimination: scoreBreakdown.wrongElimination,
        totalEpisodes: scoreBreakdown.totalEpisodes,
        technicalChallengeWins: scoreBreakdown.technicalChallengeWins,
        handshakes: scoreBreakdown.handshakes,
        soggyBottoms: scoreBreakdown.soggyBottoms
      })
    }

    // Sort by total score (descending)
    userScores.sort((a, b) => b.totalScore - a.totalScore)

    return NextResponse.json({
      success: true,
      scores: userScores,
      scoringRules: SCORING_RULES
    })

  } catch (error) {
    console.error('Error calculating scores:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
