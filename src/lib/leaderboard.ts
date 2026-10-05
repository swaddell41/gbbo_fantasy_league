import { prisma } from '@/lib/prisma'
import {
  emptyBreakdown,
  scoreEliminationPick,
  scoreSeason,
  scoreStarBakerPick,
  type ScoringEpisode,
  type ScoringPick,
  type SeasonScores,
} from '@/lib/scoring'

type SeasonEpisode = ScoringEpisode & { episodeNumber: number; title: string; isActive: boolean }

// Everything the scoring views need for one season, loaded in one go.
async function loadSeason(seasonId: string) {
  const [picks, episodes, contestants, users] = await Promise.all([
    prisma.pick.findMany({
      where: { seasonId, user: { isAdmin: false } },
      select: { id: true, userId: true, contestantId: true, episodeId: true, pickType: true },
    }),
    prisma.episode.findMany({
      where: { seasonId },
      orderBy: { episodeNumber: 'asc' },
      select: {
        id: true,
        title: true,
        episodeNumber: true,
        isActive: true,
        isCompleted: true,
        starBakerId: true,
        eliminatedId: true,
        technicalChallengeWinnerId: true,
        handshakes: { select: { contestantId: true } },
        soggyBottoms: { select: { contestantId: true } },
      },
    }),
    prisma.contestant.findMany({
      where: { seasonId },
      select: { id: true, name: true, imageUrl: true, isEliminated: true, isFinalist: true },
    }),
    // Every non-admin user is in the league, so list them even before they pick
    prisma.user.findMany({
      where: { isAdmin: false },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const seasonEpisodes: SeasonEpisode[] = episodes.map(({ handshakes, soggyBottoms, ...e }) => ({
    ...e,
    handshakeContestantIds: handshakes.map(h => h.contestantId),
    soggyBottomContestantIds: soggyBottoms.map(s => s.contestantId),
  }))
  const finalistIds = new Set(contestants.filter(c => c.isFinalist).map(c => c.id))

  return { picks: picks as ScoringPick[], episodes: seasonEpisodes, contestants, users, finalistIds }
}

type Season = Awaited<ReturnType<typeof loadSeason>>

const lastCompleted = (episodes: SeasonEpisode[]) => episodes.filter(e => e.isCompleted).at(-1) ?? null

// Tied scores share a rank
function ranksFor(scores: SeasonScores, userIds: string[]) {
  const totals = userIds.map(id => scores.users.get(id)?.totalScore ?? 0)
  return new Map(userIds.map((id, i) => [id, 1 + totals.filter(t => t > totals[i]).length]))
}

export async function computeSeasonScores(seasonId: string): Promise<SeasonScores> {
  const { picks, episodes, finalistIds } = await loadSeason(seasonId)
  return scoreSeason(picks, episodes, finalistIds)
}

export async function getLeaderboard(seasonId: string) {
  const season = await loadSeason(seasonId)
  const { picks, episodes, users, finalistIds } = season
  const scores = scoreSeason(picks, episodes, finalistIds)
  const userIds = users.map(u => u.id)
  const ranks = ranksFor(scores, userIds)

  // Movement compares against the standings before the latest completed
  // episode — but only once an earlier episode has actually been picked on.
  const latest = lastCompleted(episodes)
  const earlierPicked = latest
    ? episodes.some(
        e => e.isCompleted && e.episodeNumber < latest.episodeNumber && picks.some(p => p.episodeId === e.id)
      )
    : false
  const previousRanks = earlierPicked
    ? ranksFor(
        scoreSeason(
          picks,
          episodes.map(e => (e.id === latest!.id ? { ...e, isCompleted: false } : e)),
          finalistIds
        ),
        userIds
      )
    : null

  const usersById = new Map(users.map(u => [u.id, u]))
  return users
    .map(u => scores.users.get(u.id) ?? emptyBreakdown(u.id))
    .sort((a, b) => b.totalScore - a.totalScore)
    .map(entry => {
      const user = usersById.get(entry.userId)
      const correct = entry.correctStarBaker + entry.correctElimination
      const rank = ranks.get(entry.userId)!
      return {
        ...entry,
        rank,
        // Positive = moved up, null = nothing to compare against yet
        movement: previousRanks ? previousRanks.get(entry.userId)! - rank : null,
        userName: user?.name ?? null,
        userEmail: user?.email ?? '',
        totalEpisodes: scores.completedEpisodes,
        accuracy: entry.scoredWeeklyPicks > 0 ? Math.round((correct / entry.scoredWeeklyPicks) * 100) : 0,
      }
    })
}

export async function getSeasonSummary(seasonId: string) {
  const { episodes, contestants } = await loadSeason(seasonId)
  return {
    completedEpisodes: episodes.filter(e => e.isCompleted).length,
    bakersLeft: contestants.filter(c => !c.isEliminated).length,
  }
}

function bakerLookup(season: Season) {
  const byId = new Map(season.contestants.map(c => [c.id, c]))
  return (id: string | null | undefined) => {
    const c = id ? byId.get(id) : undefined
    return c ? { id: c.id, name: c.name, imageUrl: c.imageUrl } : null
  }
}

// Plain-English reason for a player's points in one episode
function recapReason(
  sbPick: string | null,
  elPick: string | null,
  ep: SeasonEpisode,
  name: (id: string) => string
) {
  if (!sbPick && !elPick) return 'No picks'
  const parts: string[] = []
  if (sbPick) {
    const sb = scoreStarBakerPick(sbPick, ep)
    if (sb.correct) parts.push(`${name(sbPick)} SB`)
    if (sb.wrong) parts.push(`Star Baker pick ${name(sbPick)} went home`)
    if (sb.technical) parts.push('technical')
    if (sb.handshakes) parts.push(sb.correct ? 'handshake' : `Handshake for ${name(sbPick)}`)
    if (sb.soggyBottoms) parts.push(`Soggy bottom on ${name(sbPick)}`)
  }
  if (elPick) {
    const el = scoreEliminationPick(elPick, ep)
    if (el.correct) parts.push(`${name(elPick)} home`)
    if (el.wrong) parts.push(`Going-home pick ${name(elPick)} won Star Baker`)
  }
  return parts.length ? parts.join(', ') : 'No points'
}

// "Last week" panel: the most recent completed episode and what everyone got
export async function getRecap(seasonId: string) {
  const season = await loadSeason(seasonId)
  const ep = lastCompleted(season.episodes)
  if (!ep) return null

  const baker = bakerLookup(season)
  const name = (id: string) => baker(id)?.name ?? 'Someone'
  const { pickPoints } = scoreSeason(season.picks, season.episodes, season.finalistIds)
  const epPicks = season.picks.filter(p => p.episodeId === ep.id)

  const players = season.users
    .map(u => {
      const mine = epPicks.filter(p => p.userId === u.id)
      const sb = mine.find(p => p.pickType === 'STAR_BAKER')?.contestantId ?? null
      const el = mine.find(p => p.pickType === 'ELIMINATION')?.contestantId ?? null
      return {
        userId: u.id,
        name: u.name,
        points: mine.reduce((sum, p) => sum + (pickPoints.get(p.id) ?? 0), 0),
        reason: recapReason(sb, el, ep, name),
        picked: mine.length > 0,
      }
    })
    .sort((a, b) => b.points - a.points)

  return {
    episode: { episodeNumber: ep.episodeNumber, title: ep.title },
    starBaker: baker(ep.starBakerId),
    starBakerHandshake: !!ep.starBakerId && ep.handshakeContestantIds.includes(ep.starBakerId),
    eliminated: baker(ep.eliminatedId),
    // A watch-only week (nobody picked) has no player rows worth showing
    anyPicks: epPicks.length > 0,
    players,
  }
}

// One player's finalists and per-episode picks with points. Only completed
// episodes are shown, so nobody sees picks for the episode still being picked.
export async function getPlayerHistory(seasonId: string, userId: string) {
  const season = await loadSeason(seasonId)
  const user = season.users.find(u => u.id === userId)
  if (!user) return null

  const baker = bakerLookup(season)
  const scores = scoreSeason(season.picks, season.episodes, season.finalistIds)
  const breakdown = scores.users.get(userId) ?? emptyBreakdown(userId)
  const ranks = ranksFor(scores, season.users.map(u => u.id))
  const mine = season.picks.filter(p => p.userId === userId)

  const withPoints = (pick: ScoringPick | undefined) => {
    const b = pick ? baker(pick.contestantId) : null
    return b ? { ...b, points: scores.pickPoints.get(pick!.id) ?? 0 } : null
  }

  const rows = season.episodes
    .filter(e => e.isCompleted)
    .map(e => {
      const sb = withPoints(mine.find(p => p.episodeId === e.id && p.pickType === 'STAR_BAKER'))
      const el = withPoints(mine.find(p => p.episodeId === e.id && p.pickType === 'ELIMINATION'))
      return { episodeNumber: e.episodeNumber, title: e.title, starBaker: sb, goingHome: el, total: (sb?.points ?? 0) + (el?.points ?? 0) }
    })
    .filter(r => r.starBaker || r.goingHome)
    .reverse()

  const starBakerUses = new Map<string, number>()
  for (const p of mine) {
    if (p.pickType === 'STAR_BAKER') starBakerUses.set(p.contestantId, (starBakerUses.get(p.contestantId) ?? 0) + 1)
  }

  return {
    user: { id: user.id, name: user.name },
    rank: ranks.get(userId)!,
    totalScore: breakdown.totalScore,
    starBakerCalls: { right: breakdown.correctStarBaker, of: rows.filter(r => r.starBaker).length },
    eliminationCalls: { right: breakdown.correctElimination, of: rows.filter(r => r.goingHome).length },
    finalists: mine.filter(p => p.pickType === 'FINALIST').map(p => baker(p.contestantId)!).filter(Boolean),
    // Bakers this player has already used for both of their Star Baker picks
    starBakerMaxedOut: [...starBakerUses].filter(([, n]) => n >= 2).map(([id]) => baker(id)!.name),
    rows,
  }
}
