import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoreSeason, type ScoringEpisode, type ScoringPick } from './scoring.ts'

const episode = (overrides: Partial<ScoringEpisode> = {}): ScoringEpisode => ({
  id: 'ep1',
  isCompleted: true,
  starBakerId: 'sb',
  eliminatedId: 'out',
  technicalChallengeWinnerId: null,
  handshakeContestantIds: [],
  soggyBottomContestantIds: [],
  ...overrides,
})

let n = 0
const pick = (pickType: ScoringPick['pickType'], contestantId: string, episodeId: string | null = 'ep1', userId = 'u1'): ScoringPick => ({
  id: `p${n++}`,
  userId,
  contestantId,
  episodeId: pickType === 'FINALIST' ? null : episodeId,
  pickType,
})

const total = (picks: ScoringPick[], episodes: ScoringEpisode[], finalists: string[] = []) =>
  scoreSeason(picks, episodes, new Set(finalists)).users.get('u1')!

test('correct Star Baker and elimination picks', () => {
  const u = total([pick('STAR_BAKER', 'sb'), pick('ELIMINATION', 'out')], [episode()])
  assert.equal(u.totalScore, 5)
  assert.equal(u.correctStarBaker, 1)
  assert.equal(u.correctElimination, 1)
})

test('wrong-way penalties', () => {
  const u = total([pick('STAR_BAKER', 'out'), pick('ELIMINATION', 'sb')], [episode()])
  assert.equal(u.totalScore, -6)
  assert.equal(u.wrongStarBaker, 1)
  assert.equal(u.wrongElimination, 1)
})

test('neutral picks score zero', () => {
  const u = total([pick('STAR_BAKER', 'x'), pick('ELIMINATION', 'y')], [episode()])
  assert.equal(u.totalScore, 0)
})

test('technical bonus only when Star Baker pick actually won', () => {
  assert.equal(total([pick('STAR_BAKER', 'sb')], [episode({ technicalChallengeWinnerId: 'sb' })]).totalScore, 4)
  assert.equal(total([pick('STAR_BAKER', 'x')], [episode({ technicalChallengeWinnerId: 'x' })]).totalScore, 0)
})

test('handshake and soggy bottom count for Star Baker pick even if they did not win', () => {
  const ep = episode({ handshakeContestantIds: ['x'], soggyBottomContestantIds: [] })
  assert.equal(total([pick('STAR_BAKER', 'x')], [ep]).totalScore, 1)

  const soggy = episode({ soggyBottomContestantIds: ['x'] })
  assert.equal(total([pick('STAR_BAKER', 'x')], [soggy]).totalScore, -1)

  // Eliminated with a handshake: -3 + 1
  const outWithHandshake = episode({ handshakeContestantIds: ['out'] })
  assert.equal(total([pick('STAR_BAKER', 'out')], [outWithHandshake]).totalScore, -2)
})

test('handshakes do not apply to elimination picks', () => {
  const ep = episode({ handshakeContestantIds: ['x'] })
  assert.equal(total([pick('ELIMINATION', 'x')], [ep]).totalScore, 0)
})

test('incomplete episodes are not scored', () => {
  const u = total([pick('STAR_BAKER', 'sb')], [episode({ isCompleted: false })])
  assert.equal(u.totalScore, 0)
  assert.equal(u.totalEpisodesWithPicks, 1)
  assert.equal(u.scoredWeeklyPicks, 0)
})

test('finalists score only once finalists are marked', () => {
  const picks = [pick('FINALIST', 'a'), pick('FINALIST', 'b'), pick('FINALIST', 'c')]
  assert.equal(total(picks, []).totalScore, 0)
  const u = total(picks, [], ['a', 'c', 'z'])
  assert.equal(u.finalistScore, 6)
  assert.equal(u.totalScore, 6)
})

test('scoring is idempotent — same inputs, same totals', () => {
  const picks = [pick('STAR_BAKER', 'sb'), pick('ELIMINATION', 'out')]
  const eps = [episode({ handshakeContestantIds: ['sb'] })]
  assert.deepEqual(scoreSeason(picks, eps, new Set()), scoreSeason(picks, eps, new Set()))
})
