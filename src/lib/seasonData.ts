import { prisma } from '@/lib/prisma'

// Deleting a season's bakers cascades to every pick, handshake and soggy
// bottom, and clears every episode result that named them. Once a season
// has any of that, refuse to delete its bakers (or the season) and say why.
export async function seasonDeleteBlocker(seasonId: string): Promise<string | null> {
  const [picks, scoredEpisodes] = await Promise.all([
    prisma.pick.count({ where: { seasonId } }),
    prisma.episode.count({
      where: {
        seasonId,
        OR: [
          { isCompleted: true },
          { starBakerId: { not: null } },
          { eliminatedId: { not: null } },
          { winnerId: { not: null } },
          { technicalChallengeWinnerId: { not: null } },
        ],
      },
    }),
  ])
  if (picks === 0 && scoredEpisodes === 0) return null

  const parts = [
    picks > 0 && `${picks} pick${picks === 1 ? '' : 's'}`,
    scoredEpisodes > 0 && `${scoredEpisodes} scored episode${scoredEpisodes === 1 ? '' : 's'}`,
  ].filter(Boolean)
  return `This season already has ${parts.join(' and ')}. Deleting its bakers would wipe them, so it's blocked.`
}
