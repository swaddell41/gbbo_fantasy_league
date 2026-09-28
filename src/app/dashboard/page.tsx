'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePolling } from '@/hooks/usePolling'
import ScoringRules from '@/components/ScoringRules'
import type { Baker } from './BakerGrid'
import FinalistPicker from './FinalistPicker'
import WeeklyPicker from './WeeklyPicker'

interface Season {
  id: string
  name: string
  year: number
}

interface Episode {
  id: string
  title: string
  episodeNumber: number
  isActive: boolean
}

interface MyPick {
  id: string
  contestantId: string
  episodeId: string | null
  pickType: 'FINALIST' | 'STAR_BAKER' | 'ELIMINATION'
}

interface SubmissionStatus {
  allUsersSubmitted: boolean
  submittedCount: number
  totalCount: number
  users: { id: string; name: string | null; hasSubmitted: boolean }[]
}

interface PlayerPicks {
  user: { id: string; name: string | null }
  weeklyPicks: { pickType: string; contestant: { name: string } }[]
}

interface Standing {
  rank: number
  userId: string
  userName: string | null
  totalScore: number
}

const firstName = (name: string | null) => (name ?? 'Someone').split(' ')[0]

function listNames(names: string[]) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  return res.ok ? res.json() : null
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [season, setSeason] = useState<Season | null | undefined>(undefined)
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [bakers, setBakers] = useState<Baker[]>([])
  const [myPicks, setMyPicks] = useState<MyPick[]>([])
  const [submission, setSubmission] = useState<SubmissionStatus | null>(null)
  const [everyonesPicks, setEveryonesPicks] = useState<PlayerPicks[]>([])
  const [standings, setStandings] = useState<Standing[]>([])
  const [editingWeekly, setEditingWeekly] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push('/auth/signin')
    } else if (session.user.mustChangePassword) {
      router.push('/change-password')
    } else if (session.user.isAdmin) {
      router.push('/admin')
    } else {
      getJson<Season[]>('/api/seasons').then(seasons => setSeason(seasons?.[0] ?? null))
    }
  }, [session, status, router])

  const seasonId = season?.id
  const refresh = useCallback(async () => {
    if (!seasonId) return
    const [episodes, contestants, picks, board] = await Promise.all([
      getJson<Episode[]>(`/api/episodes?seasonId=${seasonId}`),
      getJson<Baker[]>(`/api/contestants?seasonId=${seasonId}`),
      getJson<MyPick[]>(`/api/user/picks?seasonId=${seasonId}`),
      getJson<Standing[]>(`/api/scoring/leaderboard?seasonId=${seasonId}`),
    ])
    const active = episodes?.find(e => e.isActive) ?? null
    setEpisode(active)
    if (contestants) setBakers(contestants)
    if (picks) setMyPicks(picks)
    if (board) setStandings(board)

    if (!active) {
      setSubmission(null)
      setEveryonesPicks([])
      return
    }
    const statusNow = await getJson<SubmissionStatus>(`/api/episode-picks-status?episodeId=${active.id}`)
    setSubmission(statusNow)
    if (statusNow?.allUsersSubmitted) {
      const data = await getJson<{ picksByUser: PlayerPicks[] }>(
        `/api/public-picks?seasonId=${seasonId}&episodeId=${active.id}`
      )
      setEveryonesPicks(data?.picksByUser ?? [])
    } else {
      setEveryonesPicks([])
    }
  }, [seasonId])

  usePolling(refresh)

  const finalists = myPicks.filter(p => p.pickType === 'FINALIST')
  const weekly = myPicks.filter(p => p.episodeId && p.episodeId === episode?.id)
  const myStarBaker = weekly.find(p => p.pickType === 'STAR_BAKER')?.contestantId ?? null
  const myElimination = weekly.find(p => p.pickType === 'ELIMINATION')?.contestantId ?? null
  const hasWeeklyPicks = !!myStarBaker && !!myElimination
  const bakerName = (id: string | null) => bakers.find(b => b.id === id)?.name ?? '—'

  const starBakerUses = useMemo(() => {
    const uses = new Map<string, number>()
    for (const p of myPicks) {
      if (p.pickType === 'STAR_BAKER' && p.episodeId !== episode?.id) {
        uses.set(p.contestantId, (uses.get(p.contestantId) ?? 0) + 1)
      }
    }
    return uses
  }, [myPicks, episode?.id])

  const submitPicks = async (picks: Omit<MyPick, 'id'>[]) => {
    const res = await fetch('/api/user/picks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId, picks }),
    })
    if (!res.ok) {
      alert('Sorry, your picks could not be saved. Please try again.')
      return
    }
    setEditingWeekly(false)
    await refresh()
  }

  if (status === 'loading' || season === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" />
      </div>
    )
  }

  const waitingOn = submission?.users.filter(u => !u.hasSubmitted).map(u => firstName(u.name)) ?? []
  const needsFinalists = !!season && finalists.length < 3
  const needsWeekly = !!episode && !hasWeeklyPicks

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-700">🧁 Bake Off League</p>
            <h1 className="text-2xl font-bold text-gray-900">
              {season ? `${season.name} · ${season.year}` : 'Bake Off League'}
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/change-password" className="text-gray-500 hover:text-gray-800">
              Password
            </Link>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="text-gray-500 hover:text-gray-800">
              Sign out
            </button>
          </div>
        </header>

        {!season ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-gray-700">No season is running right now — check back when the next series starts.</p>
          </section>
        ) : (
          <>
            {/* To do */}
            <section className="rounded-2xl bg-white p-5 shadow-sm space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {needsFinalists || needsWeekly ? 'To do' : '✅ You’re all set'}
              </h2>

              {needsFinalists ? (
                <div className="rounded-xl border border-violet-200 p-4 space-y-3">
                  <h3 className="font-semibold text-violet-800">🏆 Pick your 3 finalists</h3>
                  <FinalistPicker
                    bakers={bakers}
                    onSave={ids => submitPicks(ids.map(contestantId => ({ contestantId, pickType: 'FINALIST', episodeId: null })))}
                  />
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  🏆 Your finalists: <span className="font-medium text-gray-900">{listNames(finalists.map(f => bakerName(f.contestantId)))}</span>
                </p>
              )}

              {!episode ? (
                <p className="text-sm text-gray-600">No episode is open for picks right now.</p>
              ) : needsWeekly || editingWeekly ? (
                <div className="rounded-xl border border-amber-200 p-4 space-y-3">
                  <h3 className="font-semibold text-amber-800">
                    Episode {episode.episodeNumber} · {episode.title}
                  </h3>
                  <WeeklyPicker
                    key={episode.id}
                    bakers={bakers}
                    initialStarBakerId={myStarBaker}
                    initialEliminationId={myElimination}
                    starBakerUses={starBakerUses}
                    onCancel={hasWeeklyPicks ? () => setEditingWeekly(false) : undefined}
                    onSave={(sb, elim) =>
                      submitPicks([
                        { contestantId: sb, pickType: 'STAR_BAKER', episodeId: episode.id },
                        { contestantId: elim, pickType: 'ELIMINATION', episodeId: episode.id },
                      ])
                    }
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <p className="text-gray-600">
                    Episode {episode.episodeNumber}: ⭐ <span className="font-medium text-gray-900">{bakerName(myStarBaker)}</span>
                    {' · '}👋 <span className="font-medium text-gray-900">{bakerName(myElimination)}</span>
                  </p>
                  <button onClick={() => setEditingWeekly(true)} className="shrink-0 text-amber-700 hover:underline">
                    Change
                  </button>
                </div>
              )}
            </section>

            {/* This week */}
            {episode && submission && (
              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">
                  Episode {episode.episodeNumber} · {episode.title}
                </h2>
                {submission.allUsersSubmitted ? (
                  <table className="mt-3 w-full text-sm">
                    <thead className="text-left text-gray-500">
                      <tr>
                        <th className="py-1 font-medium">Player</th>
                        <th className="py-1 font-medium">⭐ Star Baker</th>
                        <th className="py-1 font-medium">👋 Going home</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-900">
                      {everyonesPicks.map(p => (
                        <tr key={p.user.id}>
                          <td className="py-2">{firstName(p.user.name)}</td>
                          <td className="py-2">{p.weeklyPicks.find(w => w.pickType === 'STAR_BAKER')?.contestant.name}</td>
                          <td className="py-2">{p.weeklyPicks.find(w => w.pickType === 'ELIMINATION')?.contestant.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="mt-1 text-sm text-gray-600">
                    {submission.submittedCount} of {submission.totalCount} picks in — waiting on {listNames(waitingOn)}.
                    Everyone’s picks appear here once they’re all in.
                  </p>
                )}
              </section>
            )}

            {/* Standings */}
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Standings</h2>
              {standings.length === 0 ? (
                <p className="mt-1 text-sm text-gray-600">Points appear once the first picked episode is scored.</p>
              ) : (
                <ol className="mt-3 divide-y divide-gray-100">
                  {standings.map(s => (
                    <li
                      key={s.userId}
                      className={`flex items-center justify-between py-2 ${s.userId === session?.user?.id ? 'font-semibold' : ''}`}
                    >
                      <span className="text-gray-900">
                        <span className="inline-block w-6 text-gray-400">{s.rank}</span>
                        {s.userName}
                      </span>
                      <span className="text-gray-900">{s.totalScore} pts</span>
                    </li>
                  ))}
                </ol>
              )}
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-gray-500">How scoring works</summary>
                <ScoringRules embedded />
              </details>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
