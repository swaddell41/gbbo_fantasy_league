import { test } from 'node:test'
import assert from 'node:assert/strict'
import { finalistIdsFor, scoreSeason, type ScoringEpisode, type ScoringPick } from './scoring.ts'

const episode = (overrides: Partial<ScoringEpisode> = {}): ScoringEpisode => ({
  id: 'ep1',
  isCompleted: true,
  starBakerId: 'sb',
  eliminatedId: 'out',
  technicalChallengeWinnerId: null,
  isFinal: false,
  winnerId: null,
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

test('finalists come from bakers still in once the final is open', () => {
  const bakers = [
    { id: 'a', isEliminated: false, isFinalist: false },
    { id: 'b', isEliminated: false, isFinalist: false },
    { id: 'c', isEliminated: false, isFinalist: false },
    { id: 'd', isEliminated: true, isFinalist: false },
  ]
  const final = (o: { isActive?: boolean; isCompleted?: boolean } = {}) =>
    ({ isFinal: true, isActive: false, isCompleted: false, ...o })
  const week = { isFinal: false, isActive: true, isCompleted: false }

  assert.deepEqual(finalistIdsFor(bakers, [week]), new Set())
  assert.deepEqual(finalistIdsFor(bakers, [final()]), new Set())
  assert.deepEqual(finalistIdsFor(bakers, [final({ isActive: true })]), new Set(['a', 'b', 'c']))
  assert.deepEqual(finalistIdsFor(bakers, [final({ isCompleted: true })]), new Set(['a', 'b', 'c']))
  // Admin marks override the automatic list
  const marked = bakers.map(b => ({ ...b, isFinalist: b.id === 'a' }))
  assert.deepEqual(finalistIdsFor(marked, [final({ isActive: true })]), new Set(['a']))

  const picks = [pick('FINALIST', 'a'), pick('FINALIST', 'b'), pick('FINALIST', 'd')]
  assert.equal(total(picks, [], [...finalistIdsFor(bakers, [final({ isActive: true })])]).finalistScore, 6)
})

test('scoring is idempotent — same inputs, same totals', () => {
  const picks = [pick('STAR_BAKER', 'sb'), pick('ELIMINATION', 'out')]
  const eps = [episode({ handshakeContestantIds: ['sb'] })]
  assert.deepEqual(scoreSeason(picks, eps, new Set()), scoreSeason(picks, eps, new Set()))
})

test('final: winner pick scores only when that baker wins the series', () => {
  const final = episode({ id: 'final', isFinal: true, starBakerId: null, eliminatedId: null, winnerId: 'champ' })
  const right = total([pick('WINNER', 'champ', 'final')], [final])
  assert.equal(right.totalScore, 3)
  assert.equal(right.correctWinner, 1)
  assert.equal(right.weeklyScore, 3)
  assert.equal(total([pick('WINNER', 'x', 'final')], [final]).totalScore, 0)
})

test('final: nothing scores until the result is in', () => {
  const final = episode({ id: 'final', isFinal: true, isCompleted: false, starBakerId: null, eliminatedId: null })
  assert.equal(total([pick('WINNER', 'champ', 'final')], [final]).totalScore, 0)
})

test('final adds to the running season total', () => {
  const final = episode({ id: 'final', isFinal: true, starBakerId: null, eliminatedId: null, winnerId: 'champ' })
  const u = total(
    [pick('STAR_BAKER', 'sb'), pick('ELIMINATION', 'out'), pick('WINNER', 'champ', 'final'), pick('FINALIST', 'champ')],
    [episode(), final],
    ['champ'],
  )
  assert.equal(u.totalScore, 5 + 3 + 3)
})
