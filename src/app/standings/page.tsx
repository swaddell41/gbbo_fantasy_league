'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { usePolling } from '@/hooks/usePolling'
import { SCORING_RULES_TEXT } from '@/lib/scoring'
import TentShell from '@/components/tent/TentShell'
import Avatar from '@/components/tent/Avatar'
import { firstName, movementLabel, ordinal, playerColors, pointsClass, signed } from '@/components/tent/format'

interface Standing {
  rank: number
  userId: string
  userName: string | null
  totalScore: number
  movement: number | null
}

interface BakerRef {
  id: string
  name: string
  imageUrl: string | null
}

interface History {
  user: { id: string; name: string | null }
  rank: number
  totalScore: number
  starBakerCalls: { right: number; of: number }
  eliminationCalls: { right: number; of: number }
  finalists: BakerRef[]
  rows: {
    episodeNumber: number
    title: string
    starBaker: (BakerRef & { points: number }) | null
    goingHome: (BakerRef & { points: number }) | null
    total: number
  }[]
}

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  return res.ok ? res.json() : null
}

function StandingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useSearchParams()
  const myId = session?.user?.id
  const showingMine = params.get('player') === 'me'

  const [seasonId, setSeasonId] = useState<string | null | undefined>(undefined)
  const [standings, setStandings] = useState<Standing[]>([])
  const [summary, setSummary] = useState<{ completedEpisodes: number; bakersLeft: number } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [history, setHistory] = useState<History | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push('/auth/signin')
    } else if (session.user.isAdmin) {
      router.push('/admin')
    } else {
      getJson<{ id: string }[]>('/api/seasons').then(s => setSeasonId(s?.[0]?.id ?? null))
    }
  }, [session, status, router])

  // "My bakes" in the nav always lands on your own history
  useEffect(() => {
    if (showingMine && myId) setSelected(myId)
  }, [showingMine, myId])

  const selectedId = selected ?? myId
  const refresh = useCallback(async () => {
    if (!seasonId) return
    const [board, recap] = await Promise.all([
      getJson<Standing[]>(`/api/scoring/leaderboard?seasonId=${seasonId}`),
      getJson<{ summary: { completedEpisodes: number; bakersLeft: number } }>(`/api/season-recap?seasonId=${seasonId}`),
    ])
    if (board) setStandings(board)
    if (recap) setSummary(recap.summary)
  }, [seasonId])
  usePolling(refresh)

  useEffect(() => {
    if (!seasonId || !selectedId) return
    getJson<History>(`/api/player-history?seasonId=${seasonId}&userId=${selectedId}`).then(setHistory)
  }, [seasonId, selectedId, standings])

  const colors = useMemo(() => playerColors(standings.map(s => s.userId)), [standings])
  const colorOf = (id: string | undefined) => (id && colors.get(id)) || '#3f9bc4'

  if (status === 'loading' || seasonId === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-rose" />
      </div>
    )
  }

  const isMe = history?.user.id === myId
  const scoredEpisodes = history?.rows.length ?? 0

  return (
    <TentShell active={showingMine ? 'mine' : 'standings'} myColor={colorOf(myId)}>
      <div className="grid gap-8 px-[22px] pb-10 pt-5 md:grid-cols-2 md:gap-10 md:px-12 md:pb-12 md:pt-10">
        <div>
          {summary && (
            <p className="text-[13px] font-bold uppercase tracking-[.1em] text-rose-deep md:text-[15px]">
              After {summary.completedEpisodes} {summary.completedEpisodes === 1 ? 'bake' : 'bakes'} · {summary.bakersLeft} bakers left
            </p>
          )}
          <h2 className="mb-6 mt-1.5 font-display text-[44px] leading-none md:text-[64px]">The leaderboard</h2>
          <div className="flex flex-col gap-1.5">
            {standings.map(s => {
              const mine = s.userId === myId
              const active = s.userId === selectedId
              const move = movementLabel(s.movement)
              return (
                <button
                  key={s.userId}
                  onClick={() => {
                    setSelected(s.userId)
                    if (showingMine) router.replace('/standings')
                  }}
                  className={`grid grid-cols-[32px_36px_1fr_44px_48px] items-center gap-2.5 rounded-2xl border-2 px-3.5 py-3 text-left md:grid-cols-[44px_40px_1fr_60px_64px] md:gap-3.5 md:px-[18px] md:py-3.5 ${
                    active ? 'border-rose bg-card' : 'border-transparent'
                  }`}
                >
                  <span className="font-display text-2xl text-ink-faint md:text-[30px]">{s.rank}</span>
                  <Avatar name={s.userName} color={colorOf(s.userId)} size={36} className="md:h-10 md:w-10" />
                  <span className={`text-[17px] md:text-[19px] ${mine ? 'font-bold' : 'font-medium'}`}>
                    {firstName(s.userName)}
                    {mine && ' (you)'}
                  </span>
                  <span className={`text-right text-sm font-semibold ${move.className}`}>{move.text}</span>
                  <span className="text-right font-display text-2xl md:text-[30px]">{s.totalScore}</span>
                </button>
              )
            })}
          </div>
          <details className="mt-5 text-[15px]">
            <summary className="cursor-pointer font-semibold text-ink-muted">How scoring works</summary>
            <div className="mt-3 flex flex-col gap-1.5 rounded-2xl bg-card px-5 py-[18px]">
              {SCORING_RULES_TEXT.map(r => (
                <div key={r.label} className="flex justify-between gap-4">
                  <span>{r.label}</span>
                  <b className={pointsClass(r.points)}>{signed(r.points)}</b>
                </div>
              ))}
            </div>
          </details>
        </div>

        {history && (
          <div className="self-start rounded-3xl bg-card p-6 md:p-8">
            <div className="flex items-center gap-4">
              <div
                className="grid h-16 w-16 flex-none place-items-center rounded-full font-display text-[30px] text-white"
                style={{ background: colorOf(history.user.id) }}
              >
                {(history.user.name ?? '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-[.1em] text-blue-deep">Pick history</p>
                <h3 className="mt-0.5 font-display text-[32px] leading-[1.05] md:text-[38px]">
                  {isMe ? 'Your bakes' : `${firstName(history.user.name)}’s bakes`}
                </h3>
              </div>
            </div>
            <p className="mt-4 text-base text-ink-muted">
              {history.totalScore} {Math.abs(history.totalScore) === 1 ? 'point' : 'points'}, {ordinal(history.rank)} place.
              {scoredEpisodes > 0 && (
                <>
                  {' '}
                  {history.starBakerCalls.right} of {history.starBakerCalls.of} Star Baker calls right,{' '}
                  {history.eliminationCalls.right} of {history.eliminationCalls.of} eliminations right.
                </>
              )}
            </p>
            {history.finalists.length > 0 && (
              <div className="mt-[18px] flex flex-wrap items-center gap-2.5">
                <span className="text-[13px] font-bold uppercase tracking-[.08em] text-ink-muted">Finalists</span>
                {history.finalists.map(f => (
                  <span key={f.id} className="flex items-center gap-2 rounded-full bg-oat py-1 pl-1 pr-3.5 font-semibold">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.imageUrl ?? ''} alt="" className="h-[30px] w-[30px] rounded-full object-cover" />
                    {f.name}
                  </span>
                ))}
              </div>
            )}
            {scoredEpisodes === 0 ? (
              <p className="mt-6 text-base text-ink-muted">
                No scored picks yet. Picks show up here once their episode has been scored.
              </p>
            ) : (
              <div className="mt-[22px] flex flex-col overflow-x-auto">
                <div className="grid min-w-[440px] grid-cols-[96px_1fr_1fr_44px] gap-3 pb-2 text-[13px] font-bold uppercase tracking-[.08em] text-ink-faint md:grid-cols-[110px_1fr_1fr_48px]">
                  <span>Episode</span>
                  <span>Star Baker</span>
                  <span>Going home</span>
                  <span className="text-right">Pts</span>
                </div>
                {history.rows.map(h => (
                  <div key={h.episodeNumber} className="grid min-w-[440px] grid-cols-[96px_1fr_1fr_44px] items-center gap-3 border-t border-line py-3 text-base md:grid-cols-[110px_1fr_1fr_48px]">
                    <span className="text-ink-muted">
                      Ep {h.episodeNumber} · {h.title.replace(/ Week$/, '')}
                    </span>
                    {[h.starBaker, h.goingHome].map((b, k) => (
                      <span key={k} className="flex items-center gap-2">
                        {b && (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={b.imageUrl ?? ''} alt="" className="h-8 w-8 rounded-full object-cover" />
                            {b.name} <b className={pointsClass(b.points)}>{signed(b.points)}</b>
                          </>
                        )}
                      </span>
                    ))}
                    <span className="text-right font-display text-[22px]">{signed(h.total)}</span>
                  </div>
                ))}
              </div>
            )}
            {isMe && history.finalists.length === 0 && (
              <p className="mt-4 text-[15px] text-ink-muted">
                You haven’t picked your finalists yet. <Link href="/dashboard" className="font-semibold text-rose-deep hover:text-rose-dark">Pick them in the tent</Link>.
              </p>
            )}
          </div>
        )}
      </div>
    </TentShell>
  )
}

export default function Standings() {
  return (
    <Suspense>
      <StandingsPage />
    </Suspense>
  )
}
