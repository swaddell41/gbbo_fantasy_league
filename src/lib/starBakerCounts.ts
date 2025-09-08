import { prisma } from './prisma'

export interface StarBakerCount {
  contestantId: string
  contestantName: string
  count: number
  remaining: number
}

/**
 * Get the number of times a user has picked each contestant as Star Baker in a season
 */
export async function getStarBakerCounts(
  userId: string, 
  seasonId: string
): Promise<StarBakerCount[]> {
  // Get all contestants for the season
  const contestants = await prisma.contestant.findMany({
    where: { seasonId },
    select: { id: true, name: true }
  })

  // Get all Star Baker picks for this user in this season
  const starBakerPicks = await prisma.pick.findMany({
    where: {
      userId,
      seasonId,
      pickType: 'STAR_BAKER'
    },
    select: { contestantId: true }
  })

  // Count picks per contestant
  const counts = new Map<string, number>()
  starBakerPicks.forEach(pick => {
    const current = counts.get(pick.contestantId) || 0
    counts.set(pick.contestantId, current + 1)
  })

  // Create result array
  return contestants.map(contestant => {
    const count = counts.get(contestant.id) || 0
    return {
      contestantId: contestant.id,
      contestantName: contestant.name,
      count,
      remaining: Math.max(0, 2 - count) // Max 2 picks per contestant
    }
  })
}

/**
 * Check if a user can still pick a contestant as Star Baker
 */
export async function canPickStarBaker(
  userId: string,
  contestantId: string,
  seasonId: string
): Promise<boolean> {
  const counts = await getStarBakerCounts(userId, seasonId)
  const contestantCount = counts.find(c => c.contestantId === contestantId)
  return contestantCount ? contestantCount.remaining > 0 : false
}
