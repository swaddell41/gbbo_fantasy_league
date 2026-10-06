'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { usePolling } from '@/hooks/usePolling'
import TentShell from '@/components/tent/TentShell'
import Avatar from '@/components/tent/Avatar'
import { HistoryRows, PlayerHistorySheet, pointsWord, type History } from '@/components/tent/PlayerHistory'
import { SCORING_RULES_TEXT } from '@/lib/scoring'
import {
  firstName,
  listNames,
  movementLabel,
  ordinal,
  playerColors,
  pointsClass,
  signed,
} from '@/components/tent/format'
import type { Baker } from './PickerSheet'
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
  weeklyPicks: { pickType: string; contestant: { id: string; name: string; imageUrl: string | null } }[]
}

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

interface Recap {
  episode: { episodeNumber: number; title: string }
  starBaker: BakerRef | null
  starBakerHandshake: boolean
  eliminated: BakerRef | null
  anyPicks: boolean
  players: { userId: string; name: string | null; points: number; reason: string; picked: boolean }[]
}

type Picker = { kind: 'weekly'; tab: 'sb' | 'el' } | { kind: 'finalists' } | null

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  return res.ok ? res.json() : null
}

const eyebrow = 'text-[13px] md:text-[15px] font-bold uppercase tracking-[.1em] text-rose-deep'

function PickCard({
  label,
  labelClass,
  baker,
  onPick,
  locked = false,
}: {
  label: string
  labelClass: string
  baker: BakerRef | null
  onPick: () => void
  locked?: boolean
}) {
  if (!baker) {
    return (
      <button onClick={onPick} className="flex flex-col overflow-hidden rounded-[18px] border-2 border-dashed border-dash bg-card text-left md:rounded-[20px]">
        <div className="grid h-[130px] w-full place-items-center bg-oat md:h-[240px]">
          <div className="text-center">
            <div className="font-display text-[44px] leading-none text-dash md:text-[56px]">?</div>
            <div className="mt-1.5 hidden text-base text-ink-muted md:block">Still proving…</div>
          </div>
        </div>
        <div className="flex w-full items-center justify-between px-3 py-2.5 md:px-5 md:py-4">
          <div>
            <div className={`text-[11px] font-bold uppercase tracking-[.08em] md:text-[13px] ${labelClass}`}>{label}</div>
            <div className="font-display text-2xl text-ink-faint md:text-[30px]">
              <span className="md:hidden">Pick one</span>
              <span className="hidden md:inline">Not picked</span>
            </div>
          </div>
          <span className="hidden rounded-full bg-ink px-[18px] py-2.5 text-[15px] font-bold text-cream md:inline">Pick</span>
        </div>
      </button>
    )
  }
  const Frame = locked ? 'div' : 'button'
  return (
    <Frame onClick={locked ? undefined : onPick} className="overflow-hidden rounded-[18px] border-2 border-rose bg-card text-left md:rounded-[20px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={baker.imageUrl ?? ''} alt="" className="block h-[130px] w-full object-cover object-[50%_20%] md:h-[240px]" />
      <div className="flex items-center justify-between px-3 py-2.5 md:px-5 md:py-4">
        <div>
          <div className={`text-[11px] font-bold uppercase tracking-[.08em] md:text-[13px] ${labelClass}`}>{label}</div>
          <div className="font-display text-2xl md:text-[30px]">{baker.name}</div>
        </div>
        {locked ? (
          <span className="hidden text-sm font-semibold text-ink-faint md:inline">🔒 Locked in</span>
        ) : (
          <span className="hidden font-semibold text-rose-deep hover:text-rose-dark md:inline">Change</span>
        )}
      </div>
    </Frame>
  )
}

function BakerChip({ baker, children, size = 44 }: { baker: BakerRef; children: React.ReactNode; size?: number }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-card py-1 pl-1 pr-3 text-sm md:gap-3 md:py-1.5 md:pl-1.5 md:pr-[18px] md:text-base">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={baker.imageUrl ?? ''} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />
      <span>{children}</span>
    </div>
  )
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const myId = session?.user?.id

  const [season, setSeason] = useState<Season | null | undefined>(undefined)
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [bakers, setBakers] = useState<Baker[]>([])
  const [myPicks, setMyPicks] = useState<MyPick[]>([])
  const [submission, setSubmission] = useState<SubmissionStatus | null>(null)
  const [everyonesPicks, setEveryonesPicks] = useState<PlayerPicks[]>([])
  const [standings, setStandings] = useState<Standing[]>([])
  const [recap, setRecap] = useState<Recap | null>(null)
  const [bakesSoFar, setBakesSoFar] = useState(0)
  const [history, setHistory] = useState<History | null>(null)
  const [picker, setPicker] = useState<Picker>(null)
  // Whose pick history is open, from tapping a leaderboard row
  const [viewing, setViewing] = useState<string | null>(null)

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
    const [episodes, contestants, picks, board, recapData, mine] = await Promise.all([
      getJson<Episode[]>(`/api/episodes?seasonId=${seasonId}`),
      getJson<Baker[]>(`/api/contestants?seasonId=${seasonId}`),
      getJson<MyPick[]>(`/api/user/picks?seasonId=${seasonId}`),
      getJson<Standing[]>(`/api/scoring/leaderboard?seasonId=${seasonId}`),
      getJson<{ summary: { completedEpisodes: number }; recap: Recap | null }>(`/api/season-recap?seasonId=${seasonId}`),
      getJson<History>(`/api/player-history?seasonId=${seasonId}&userId=me`),
    ])
    const active = episodes?.find(e => e.isActive) ?? null
    setEpisode(active)
    if (contestants) setBakers(contestants)
    if (picks) setMyPicks(picks)
    if (board) setStandings(board)
    if (recapData) {
      setRecap(recapData.recap)
      setBakesSoFar(recapData.summary.completedEpisodes)
    }
    if (mine) setHistory(mine)

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

  const colors = useMemo(() => playerColors(standings.map(s => s.userId)), [standings])
  const colorOf = (id: string | undefined) => (id && colors.get(id)) || '#3f9bc4'
  const bakerById = (id: string | null | undefined) => {
    const b = bakers.find(x => x.id === id)
    return b ? { id: b.id, name: b.name, imageUrl: b.imageUrl ?? null } : null
  }

  const finalists = myPicks.filter(p => p.pickType === 'FINALIST')
  const weekly = myPicks.filter(p => p.episodeId && p.episodeId === episode?.id)
  const myStarBaker = weekly.find(p => p.pickType === 'STAR_BAKER')?.contestantId ?? null
  const myElimination = weekly.find(p => p.pickType === 'ELIMINATION')?.contestantId ?? null
  // Saved picks are locked; only an admin can reset them
  const weeklyLocked = !!myStarBaker && !!myElimination

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
      const body = await res.json().catch(() => null)
      alert(res.status === 409 && body?.error ? body.error : 'Sorry, your picks could not be saved. Please try again.')
      setPicker(null)
      await refresh()
      return
    }
    setPicker(null)
    await refresh()
  }

  if (status === 'loading' || season === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-rose" />
      </div>
    )
  }

  if (picker?.kind === 'weekly' && episode) {
    return (
      <WeeklyPicker
        key={episode.id}
        episode={episode}
        bakers={bakers}
        initialStarBakerId={myStarBaker}
        initialEliminationId={myElimination}
        initialTab={picker.tab}
        starBakerUses={starBakerUses}
        onClose={() => setPicker(null)}
        onSave={(sb, el) =>
          submitPicks([
            { contestantId: sb, pickType: 'STAR_BAKER', episodeId: episode.id },
            { contestantId: el, pickType: 'ELIMINATION', episodeId: episode.id },
          ])
        }
      />
    )
  }
  if (viewing && seasonId) {
    return (
      <PlayerHistorySheet
        seasonId={seasonId}
        userId={viewing}
        isMe={viewing === myId}
        color={colorOf(viewing)}
        onClose={() => setViewing(null)}
      />
    )
  }
  if (picker?.kind === 'finalists') {
    return (
      <FinalistPicker
        bakers={bakers}
        onClose={() => setPicker(null)}
        onSave={ids => submitPicks(ids.map(contestantId => ({ contestantId, pickType: 'FINALIST', episodeId: null })))}
      />
    )
  }

  const submitted = submission?.users.filter(u => u.hasSubmitted) ?? []
  const waitingOn =
    submission?.users.filter(u => !u.hasSubmitted).map(u => (u.id === myId ? 'you' : firstName(u.name))) ?? []
  const allIn = !!submission?.allUsersSubmitted
  const me = recap?.players.find(p => p.userId === myId)
  const topWeek = recap?.players[0]

  // "Nikki is the popular choice: 3 of 4 backing her" style consensus line
  const consensus = (() => {
    if (!allIn || everyonesPicks.length === 0) return null
    const tally = new Map<string, number>()
    for (const p of everyonesPicks) {
      const sb = p.weeklyPicks.find(w => w.pickType === 'STAR_BAKER')?.contestant.name
      if (sb) tally.set(sb, (tally.get(sb) ?? 0) + 1)
    }
    const [top, n] = [...tally].sort((a, b) => b[1] - a[1])[0] ?? []
    if (!top || n < 2) return <>Everyone’s gone their own way for Star Baker this week.</>
    return (
      <>
        <b className="text-ink">{top}</b> is the popular choice: {n} of {everyonesPicks.length} picked them for Star Baker.
      </>
    )
  })()

  return (
    <TentShell myColor={colorOf(myId)}>
      {!season ? (
        <div className="px-[22px] py-10 md:px-12">
          <h2 className="font-display text-[46px] leading-none md:text-[76px]">The tent’s packed away</h2>
          <p className="mt-3 text-[17px] text-ink-muted md:text-[19px]">No series is running right now. See you when the ovens are back on.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-[18px] px-[22px] pt-5 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:gap-10 md:px-12 md:pb-6 md:pt-10">
            <div className="flex flex-col gap-[18px] md:gap-6">
              {!episode ? (
                <div>
                  <p className={eyebrow}>{season.name}</p>
                  <h2 className="mt-1 font-display text-[46px] leading-none md:mt-1.5 md:text-[76px]">Between bakes</h2>
                  <p className="mt-3 max-w-[520px] text-[17px] text-ink-muted md:text-[19px]">
                    No episode is open for picks yet. Check back once the next one is set up.
                  </p>
                </div>
              ) : allIn ? (
                <div>
                  <p className={eyebrow}>
                    Episode {episode.episodeNumber} · {episode.title} · all {submission!.totalCount} picks in
                  </p>
                  <h2 className="mb-2 mt-1.5 font-display text-[46px] leading-none md:text-[64px]">The ovens are on</h2>
                  <p className="mb-6 text-[17px] text-ink-muted md:text-lg">Here’s who everyone’s backing this week.</p>
                  <div className={`grid gap-3.5 sm:grid-cols-2 ${everyonesPicks.length > 4 ? 'md:grid-cols-3' : ''}`}>
                    {everyonesPicks.map(p => {
                      const sb = p.weeklyPicks.find(w => w.pickType === 'STAR_BAKER')?.contestant
                      const el = p.weeklyPicks.find(w => w.pickType === 'ELIMINATION')?.contestant
                      const mine = p.user.id === myId
                      return (
                        <div key={p.user.id} className={`rounded-[20px] border-2 bg-card p-[18px] ${mine ? 'border-rose' : 'border-transparent'}`}>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={p.user.name} color={colorOf(p.user.id)} size={34} />
                            <b className="text-lg">{mine ? 'You' : firstName(p.user.name)}</b>
                          </div>
                          <div className="mt-3.5 flex gap-2.5">
                            {[
                              { label: 'Star Baker', cls: 'text-rose-deep', b: sb },
                              { label: 'Going home', cls: 'text-blue-deep', b: el },
                            ].map(({ label, cls, b }) => (
                              <div key={label} className="min-w-0 flex-1">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={b?.imageUrl ?? ''} alt="" className="block aspect-[4/3] w-full rounded-xl object-cover object-[50%_20%]" />
                                <div className={`mt-1.5 text-xs font-bold uppercase tracking-[.08em] ${cls}`}>{label}</div>
                                <div className="truncate font-display text-[22px]">{b?.name}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-[18px] text-base text-ink-muted">
                    {consensus}
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <p className={eyebrow}>Episode {episode.episodeNumber}</p>
                    <h2 className="mt-1 font-display text-[46px] leading-none md:mt-1.5 md:text-[76px]">{episode.title}</h2>
                    <p className="mt-3 hidden max-w-[520px] text-[19px] text-ink-muted [text-wrap:pretty] md:block">
                      Who’s going to rise, and whose bake is going to collapse? Get your picks in before the oven door shuts.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 md:gap-5">
                    <PickCard label="Star Baker" labelClass="text-rose-deep" baker={bakerById(myStarBaker)} locked={weeklyLocked} onPick={() => setPicker({ kind: 'weekly', tab: 'sb' })} />
                    <PickCard
                      label="Going home"
                      labelClass="text-blue-deep"
                      baker={bakerById(myElimination)}
                      locked={weeklyLocked}
                      onPick={() => setPicker({ kind: 'weekly', tab: myStarBaker ? 'el' : 'sb' })}
                    />
                  </div>
                  {submission && (
                    <div className="flex items-center gap-3.5 text-[15px] text-ink-muted md:text-base">
                      {submitted.length > 0 && (
                        <div className="hidden pl-1.5 md:flex">
                          {submitted.map(u => (
                            <Avatar key={u.id} name={u.name} color={colorOf(u.id)} size={34} ring className="-ml-1.5" />
                          ))}
                        </div>
                      )}
                      <span>
                        <b className="text-ink">
                          {submission.submittedCount} of {submission.totalCount}
                        </b>{' '}
                        in the tent. {waitingOn.length > 0 && <>Still waiting on {listNames(waitingOn)}.</>}
                        {weeklyLocked && <> Your picks are locked in.</>}
                      </span>
                    </div>
                  )}
                </>
              )}

              {finalists.length < 3 && (
                <div className="flex items-center justify-between gap-4 rounded-[20px] bg-oat p-[18px] md:rounded-3xl md:p-7">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.1em] text-rose-deep md:text-[13px]">Once a series</p>
                    <h3 className="mt-1 font-display text-[26px] leading-tight md:text-[34px]">Who’ll make the final?</h3>
                    <p className="mt-1 text-[15px] text-ink-muted">Pick your 3 finalists. +3 for each one who makes it.</p>
                  </div>
                  <button onClick={() => setPicker({ kind: 'finalists' })} className="flex-none rounded-full bg-ink px-[18px] py-2.5 text-[15px] font-bold text-cream hover:bg-[#3d342e]">
                    Pick
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 rounded-[20px] bg-card p-[18px] md:rounded-3xl md:p-7">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-[26px] md:text-[34px]">
                  <span className="md:hidden">Leaderboard</span>
                  <span className="hidden md:inline">The leaderboard</span>
                </h3>
                <span className="text-sm text-ink-muted">
                  after {bakesSoFar} {bakesSoFar === 1 ? 'bake' : 'bakes'}
                </span>
              </div>
              <ol className="mt-2 flex flex-col md:mt-2.5">
                {standings.map(s => {
                  const mine = s.userId === myId
                  const move = movementLabel(s.movement)
                  return (
                    <li key={s.userId}>
                      <button
                        onClick={() => setViewing(s.userId)}
                        title={`See ${mine ? 'your' : `${firstName(s.userName)}’s`} picks`}
                        className={`grid w-full grid-cols-[28px_1fr_auto_auto] items-center gap-2.5 rounded-xl px-2.5 py-[9px] text-left md:grid-cols-[40px_1fr_auto_56px] md:gap-3 md:rounded-[14px] md:px-3.5 md:py-3 ${mine ? 'bg-rose-tint' : 'hover:bg-oat'}`}
                      >
                      <span className="font-display text-xl text-ink-faint md:text-[26px]">{s.rank}</span>
                      <span className={`text-base md:text-lg ${mine ? 'font-bold' : 'font-medium'}`}>
                        {firstName(s.userName)}
                        {mine && ' (you)'}
                      </span>
                      <span className={`text-sm font-semibold ${move.className}`}>{move.text}</span>
                      <span className="text-right font-display text-xl md:text-[26px]">{s.totalScore}</span>
                      </button>
                    </li>
                  )
                })}
              </ol>
              <p className="mt-1 px-2.5 text-[13px] text-ink-faint md:px-3.5">Tap a name to see their picks.</p>
              <details className="mt-3 px-2.5 text-[15px] md:px-3.5">
                <summary className="cursor-pointer font-semibold text-ink-muted">How scoring works</summary>
                <div className="mt-3 flex flex-col gap-1.5">
                  {SCORING_RULES_TEXT.map(r => (
                    <div key={r.label} className="flex justify-between gap-4">
                      <span>{r.label}</span>
                      <b className={pointsClass(r.points)}>{signed(r.points)}</b>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>

          <div className="grid gap-[18px] px-[22px] pb-6 pt-[18px] md:grid-cols-2 md:gap-10 md:px-12 md:pb-12 md:pt-4">
            {recap && (
              <div className="rounded-[20px] bg-oat p-[18px] md:rounded-3xl md:p-7">
                <p className="text-xs font-bold uppercase tracking-[.1em] text-rose-deep md:text-[13px]">
                  Last week · {recap.episode.title}
                </p>
                <h3 className="mb-[18px] mt-1 hidden font-display text-[34px] md:block">The verdict from the tent</h3>
                <div className="mt-2.5 flex flex-wrap gap-2.5 md:mb-5 md:mt-0 md:gap-4">
                  {recap.starBaker && (
                    <BakerChip baker={recap.starBaker}>
                      <b>{recap.starBaker.name}</b> Star Baker{recap.starBakerHandshake && ' + handshake'}
                    </BakerChip>
                  )}
                  {recap.eliminated && (
                    <BakerChip baker={recap.eliminated}>
                      <b>{recap.eliminated.name}</b> went home
                    </BakerChip>
                  )}
                </div>
                {!recap.anyPicks ? (
                  <p className="mt-3 text-[15px] text-ink-muted md:mt-0 md:text-base">A watch-and-meet week: no picks, no points.</p>
                ) : (
                  <>
                    <p className="mt-3 text-[15px] text-ink-muted md:hidden">
                      {me?.picked ? (
                        <>
                          You scored <b className={pointsClass(me.points)}>{signed(me.points)}</b>.{' '}
                        </>
                      ) : (
                        <>You didn’t pick that week. </>
                      )}
                      {topWeek && topWeek.userId !== myId && topWeek.points > 0 && (
                        <>
                          {firstName(topWeek.name)} had the best week with <b className="text-ink">{signed(topWeek.points)}</b>.
                        </>
                      )}
                    </p>
                    <div className="hidden flex-col gap-2.5 md:flex">
                      {recap.players.map(p => (
                        <div key={p.userId} className="grid grid-cols-[80px_1fr_52px] items-center gap-3 text-base">
                          <b>{firstName(p.name)}</b>
                          <span className="text-ink-muted">{p.reason}</span>
                          <span className={`text-right font-bold ${pointsClass(p.points)}`}>{signed(p.points)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {history && (
              <div className="rounded-[20px] bg-card p-[18px] md:rounded-3xl md:p-7">
                <p className="text-[13px] font-bold uppercase tracking-[.1em] text-blue-deep">Your bakes so far</p>
                <h3 className="mb-[18px] mt-1 font-display text-[26px] md:text-[34px]">
                  {pointsWord(history.totalScore)}, {ordinal(history.rank)} place
                </h3>
                {history.rows.length === 0 ? (
                  <p className="text-base text-ink-muted">Nothing scored yet. Your first points land after the next episode.</p>
                ) : (
                  <HistoryRows rows={history.rows} />
                )}
                {history.finalists.length > 0 && (
                  <p className="mt-3.5 text-[15px] text-ink-muted">
                    Finalists: {listNames(history.finalists.map(f => f.name))}.
                    {history.starBakerMaxedOut.length > 0 && (
                      <> You’ve used both Star Baker picks on {listNames(history.starBakerMaxedOut)}.</>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </TentShell>
  )
}
