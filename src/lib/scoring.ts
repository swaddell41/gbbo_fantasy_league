// The one place league scoring lives. Scores are always derived from picks +
// episode results — nothing is stored — so re-saving or correcting a result
// can never double-count.

export const SCORING_RULES = {
  STAR_BAKER_CORRECT: 3,
  ELIMINATION_CORRECT: 2,
  STAR_BAKER_PICK_ELIMINATED: -3,
  ELIMINATION_PICK_STAR_BAKER: -3,
  // Only when your Star Baker pick actually won Star Baker
  TECHNICAL_WIN: 1,
  // Apply to your Star Baker pick whether or not they won Star Baker
  HANDSHAKE: 1,
  SOGGY_BOTTOM: -1,
  FINALIST_CORRECT: 3,
} as const

export const SCORING_RULES_TEXT: { label: string; points: number }[] = [
  { label: 'Star Baker pick wins Star Baker', points: SCORING_RULES.STAR_BAKER_CORRECT },
  { label: 'Elimination pick goes home', points: SCORING_RULES.ELIMINATION_CORRECT },
  { label: 'Star Baker pick goes home', points: SCORING_RULES.STAR_BAKER_PICK_ELIMINATED },
  { label: 'Elimination pick wins Star Baker', points: SCORING_RULES.ELIMINATION_PICK_STAR_BAKER },
  { label: 'Correct Star Baker pick also won the technical', points: SCORING_RULES.TECHNICAL_WIN },
  { label: 'Hollywood handshake for your Star Baker pick', points: SCORING_RULES.HANDSHAKE },
  { label: 'Soggy bottom for your Star Baker pick', points: SCORING_RULES.SOGGY_BOTTOM },
  { label: 'Each finalist pick who makes the final', points: SCORING_RULES.FINALIST_CORRECT },
]

export type PickType = 'FINALIST' | 'STAR_BAKER' | 'ELIMINATION'

export interface ScoringPick {
  id: string
  userId: string
  contestantId: string
  episodeId: string | null
  pickType: PickType
}

export interface ScoringEpisode {
  id: string
  isCompleted: boolean
  starBakerId: string | null
  eliminatedId: string | null
  technicalChallengeWinnerId: string | null
  handshakeContestantIds: string[]
  soggyBottomContestantIds: string[]
}

export interface UserScoreBreakdown {
  userId: string
  totalScore: number
  weeklyScore: number
  finalistScore: number
  correctStarBaker: number
  correctElimination: number
  wrongStarBaker: number
  wrongElimination: number
  technicalChallengeWins: number
  handshakes: number
  soggyBottoms: number
  totalEpisodesWithPicks: number
  // Weekly picks in completed episodes — the denominator for accuracy
  scoredWeeklyPicks: number
}

export interface SeasonScores {
  users: Map<string, UserScoreBreakdown>
  // Points each pick earned; unscored picks (episode not complete) are absent
  pickPoints: Map<string, number>
  completedEpisodes: number
}

function emptyBreakdown(userId: string): UserScoreBreakdown {
  return {
    userId,
    totalScore: 0,
    weeklyScore: 0,
    finalistScore: 0,
    correctStarBaker: 0,
    correctElimination: 0,
    wrongStarBaker: 0,
    wrongElimination: 0,
    technicalChallengeWins: 0,
    handshakes: 0,
    soggyBottoms: 0,
    totalEpisodesWithPicks: 0,
    scoredWeeklyPicks: 0,
  }
}

const count = (ids: string[], id: string) => ids.filter(x => x === id).length

export function scoreStarBakerPick(contestantId: string, ep: ScoringEpisode) {
  const R = SCORING_RULES
  let points = 0
  const correct = ep.starBakerId === contestantId
  const wrong = ep.eliminatedId === contestantId
  const technical = correct && ep.technicalChallengeWinnerId === contestantId
  const handshakes = count(ep.handshakeContestantIds, contestantId)
  const soggyBottoms = count(ep.soggyBottomContestantIds, contestantId)

  if (correct) points += R.STAR_BAKER_CORRECT
  if (wrong) points += R.STAR_BAKER_PICK_ELIMINATED
  if (technical) points += R.TECHNICAL_WIN
  points += handshakes * R.HANDSHAKE
  points += soggyBottoms * R.SOGGY_BOTTOM

  return { points, correct, wrong, technical, handshakes, soggyBottoms }
}

export function scoreEliminationPick(contestantId: string, ep: ScoringEpisode) {
  const R = SCORING_RULES
  const correct = ep.eliminatedId === contestantId
  const wrong = ep.starBakerId === contestantId
  const points = (correct ? R.ELIMINATION_CORRECT : 0) + (wrong ? R.ELIMINATION_PICK_STAR_BAKER : 0)
  return { points, correct, wrong }
}

export function scoreSeason(
  picks: ScoringPick[],
  episodes: ScoringEpisode[],
  finalistContestantIds: Set<string>,
): SeasonScores {
  const users = new Map<string, UserScoreBreakdown>()
  const pickPoints = new Map<string, number>()
  const episodesById = new Map(episodes.map(e => [e.id, e]))
  const episodesWithPicks = new Map<string, Set<string>>()

  const userFor = (userId: string) => {
    let u = users.get(userId)
    if (!u) {
      u = emptyBreakdown(userId)
      users.set(userId, u)
    }
    return u
  }

  for (const pick of picks) {
    const u = userFor(pick.userId)

    if (pick.pickType === 'FINALIST') {
      if (finalistContestantIds.size === 0) continue
      const points = finalistContestantIds.has(pick.contestantId) ? SCORING_RULES.FINALIST_CORRECT : 0
      u.finalistScore += points
      u.totalScore += points
      pickPoints.set(pick.id, points)
      continue
    }

    if (!pick.episodeId) continue
    if (!episodesWithPicks.has(pick.userId)) episodesWithPicks.set(pick.userId, new Set())
    episodesWithPicks.get(pick.userId)!.add(pick.episodeId)

    const ep = episodesById.get(pick.episodeId)
    if (!ep?.isCompleted) continue

    let points: number
    if (pick.pickType === 'STAR_BAKER') {
      const r = scoreStarBakerPick(pick.contestantId, ep)
      points = r.points
      if (r.correct) u.correctStarBaker++
      if (r.wrong) u.wrongStarBaker++
      if (r.technical) u.technicalChallengeWins++
      u.handshakes += r.handshakes
      u.soggyBottoms += r.soggyBottoms
    } else {
      const r = scoreEliminationPick(pick.contestantId, ep)
      points = r.points
      if (r.correct) u.correctElimination++
      if (r.wrong) u.wrongElimination++
    }

    u.scoredWeeklyPicks++
    u.weeklyScore += points
    u.totalScore += points
    pickPoints.set(pick.id, points)
  }

  for (const [userId, eps] of episodesWithPicks) {
    userFor(userId).totalEpisodesWithPicks = eps.size
  }

  return {
    users,
    pickPoints,
    completedEpisodes: episodes.filter(e => e.isCompleted).length,
  }
}
