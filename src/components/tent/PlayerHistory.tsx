'use client'

import { useEffect, useState } from 'react'
import Bunting from './Bunting'
import { firstName, ordinal, pointsClass, signed } from './format'

export interface BakerRef {
  id: string
  name: string
  imageUrl: string | null
}

export interface History {
  user: { id: string; name: string | null }
  rank: number
  totalScore: number
  starBakerCalls: { right: number; of: number }
  eliminationCalls: { right: number; of: number }
  finalists: BakerRef[]
  starBakerMaxedOut: string[]
  rows: {
    episodeNumber: number
    title: string
    starBaker: (BakerRef & { points: number }) | null
    goingHome: (BakerRef & { points: number }) | null
    total: number
  }[]
}

export const pointsWord = (n: number) => `${n} ${Math.abs(n) === 1 ? 'point' : 'points'}`

// Per-episode table: Star Baker + going-home picks with the points each earned.
// Scrolls sideways on narrow phones rather than squashing the columns.
export function HistoryRows({ rows }: { rows: History['rows'] }) {
  const cols = 'grid min-w-[440px] grid-cols-[96px_1fr_1fr_44px] gap-3 md:grid-cols-[110px_1fr_1fr_48px]'
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className={`${cols} pb-2 text-[13px] font-bold uppercase tracking-[.08em] text-ink-faint`}>
        <span>Episode</span>
        <span>Star Baker</span>
        <span>Going home</span>
        <span className="text-right">Pts</span>
      </div>
      {rows.map(h => (
        <div key={h.episodeNumber} className={`${cols} items-center border-t border-line py-3 text-base`}>
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
  )
}

// Full-screen pick history for any player, opened from the leaderboard
export function PlayerHistorySheet({
  seasonId,
  userId,
  isMe,
  color,
  onClose,
}: {
  seasonId: string
  userId: string
  isMe: boolean
  color: string
  onClose: () => void
}) {
  const [history, setHistory] = useState<History | null>(null)

  useEffect(() => {
    fetch(`/api/player-history?seasonId=${seasonId}&userId=${userId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(setHistory)
  }, [seasonId, userId])

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-cream text-ink">
      <div className="mt-12 md:mt-6">
        <Bunting />
      </div>
      <div className="mx-auto max-w-3xl px-[22px] pb-16 pt-5">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-[15px] font-semibold text-ink-muted hover:text-ink">
            Close
          </button>
        </div>
        {!history ? (
          <div className="mx-auto mt-16 h-10 w-10 animate-spin rounded-full border-b-2 border-rose" />
        ) : (
          <div className="mt-2 rounded-3xl bg-card p-6 md:p-8">
            <div className="flex items-center gap-4">
              <div
                className="grid h-16 w-16 flex-none place-items-center rounded-full font-display text-[30px] text-white"
                style={{ background: color }}
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
              {pointsWord(history.totalScore)}, {ordinal(history.rank)} place.
              {history.rows.length > 0 && (
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
            <div className="mt-[22px]">
              {history.rows.length === 0 ? (
                <p className="text-base text-ink-muted">
                  No scored picks yet. Picks show up here once their episode has been scored.
                </p>
              ) : (
                <HistoryRows rows={history.rows} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
