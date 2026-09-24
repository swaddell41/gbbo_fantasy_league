import { prisma } from '@/lib/prisma'
import { scoreSeason, type SeasonScores } from '@/lib/scoring'

// Loads a season's picks + results and runs them through the scoring engine.
export async function computeSeasonScores(seasonId: string): Promise<SeasonScores> {
  const [picks, episodes, finalists] = await Promise.all([
    prisma.pick.findMany({
      where: { seasonId, user: { isAdmin: false } },
      select: { id: true, userId: true, contestantId: true, episodeId: true, pickType: true },
    }),
    prisma.episode.findMany({
      where: { seasonId },
      select: {
        id: true,
        isCompleted: true,
        starBakerId: true,
        eliminatedId: true,
        technicalChallengeWinnerId: true,
        handshakes: { select: { contestantId: true } },
        soggyBottoms: { select: { contestantId: true } },
      },
    }),
    prisma.contestant.findMany({
      where: { seasonId, isFinalist: true },
      select: { id: true },
    }),
  ])

  return scoreSeason(
    picks,
    episodes.map(e => ({
      ...e,
      handshakeContestantIds: e.handshakes.map(h => h.contestantId),
      soggyBottomContestantIds: e.soggyBottoms.map(s => s.contestantId),
    })),
    new Set(finalists.map(f => f.id)),
  )
}

export async function getLeaderboard(seasonId: string) {
  const scores = await computeSeasonScores(seasonId)
  const users = await prisma.user.findMany({
    where: { id: { in: [...scores.users.keys()] } },
    select: { id: true, name: true, email: true },
  })
  const usersById = new Map(users.map(u => [u.id, u]))

  const entries = [...scores.users.values()].sort((a, b) => b.totalScore - a.totalScore)

  return entries.map(entry => {
    const user = usersById.get(entry.userId)
    const correct = entry.correctStarBaker + entry.correctElimination
    return {
      ...entry,
      // Tied scores share a rank
      rank: 1 + entries.filter(e => e.totalScore > entry.totalScore).length,
      userName: user?.name ?? null,
      userEmail: user?.email ?? '',
      totalEpisodes: scores.completedEpisodes,
      accuracy: entry.scoredWeeklyPicks > 0 ? Math.round((correct / entry.scoredWeeklyPicks) * 100) : 0,
    }
  })
}
