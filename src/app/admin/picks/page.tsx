'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Season {
  id: string
  name: string
  year: number
  isActive: boolean
}

interface Episode {
  id: string
  title: string
  episodeNumber: number
  isActive: boolean
}

interface PlayerPicks {
  user: { id: string; name: string | null }
  finalistPicks: { id: string; contestant: { name: string } }[]
  weeklyPicks: { id: string; pickType: string; contestant: { name: string } }[]
}

// Picks lock once a player submits them; this page is the admin override.
export default function AdminPicksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [seasonId, setSeasonId] = useState('')
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [episodeId, setEpisodeId] = useState('')
  const [weekly, setWeekly] = useState<PlayerPicks[]>([])
  const [finalists, setFinalists] = useState<PlayerPicks[]>([])

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.canAdmin) {
      router.push('/admin')
      return
    }
    fetch('/api/admin/seasons')
      .then(r => (r.ok ? r.json() : []))
      .then((data: Season[]) => {
        setSeasons(data)
        setSeasonId(data.find(s => s.isActive)?.id ?? '')
      })
  }, [session, status, router])

  useEffect(() => {
    if (!seasonId) return
    fetch(`/api/episodes?seasonId=${seasonId}`)
      .then(r => (r.ok ? r.json() : []))
      .then((data: Episode[]) => {
        setEpisodes(data)
        setEpisodeId(data.find(e => e.isActive)?.id ?? data.at(-1)?.id ?? '')
      })
  }, [seasonId])

  const refresh = useCallback(async () => {
    if (!seasonId) return
    const [all, ep] = await Promise.all([
      fetch(`/api/public-picks?seasonId=${seasonId}`).then(r => (r.ok ? r.json() : null)),
      episodeId ? fetch(`/api/public-picks?seasonId=${seasonId}&episodeId=${episodeId}`).then(r => (r.ok ? r.json() : null)) : null,
    ])
    setFinalists(all?.picksByUser ?? [])
    setWeekly(ep?.picksByUser ?? [])
  }, [seasonId, episodeId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const reset = async (p: PlayerPicks, what: 'weekly' | 'finalists') => {
    const name = p.user.name ?? 'this player'
    const label = what === 'weekly' ? `${name}'s picks for this episode` : `${name}'s finalists`
    if (!confirm(`Reset ${label}? They'll be able to pick again.`)) return
    const res = await fetch('/api/admin/picks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        what === 'weekly'
          ? { userId: p.user.id, seasonId, episodeId }
          : { userId: p.user.id, seasonId, finalists: true }
      ),
    })
    if (!res.ok) alert('Could not reset picks')
    refresh()
  }

  const pickName = (p: PlayerPicks, type: string) => p.weeklyPicks.find(w => w.pickType === type)?.contestant.name ?? '—'

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-card rounded-2xl p-6">
            <div className="flex flex-wrap gap-4 justify-between items-center">
              <div>
                <h1 className="font-display font-normal text-[40px] md:text-[48px] leading-none text-ink">Picks</h1>
                <p className="text-ink-muted mt-2">
                  Players can’t change picks once submitted. Reset a player’s picks here to let them pick again.
                </p>
              </div>
              <button
                onClick={() => router.push('/admin')}
                className="bg-oat text-ink font-bold hover:bg-line px-4 py-2 rounded-full transition-colors duration-200"
              >
                Back to Admin
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <select
                value={seasonId}
                onChange={e => setSeasonId(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-2xl text-ink"
              >
                {seasons.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.year})
                  </option>
                ))}
              </select>
              <select
                value={episodeId}
                onChange={e => setEpisodeId(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-2xl text-ink"
              >
                {episodes.map(e => (
                  <option key={e.id} value={e.id}>
                    Episode {e.episodeNumber}: {e.title}
                    {e.isActive ? ' (open)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6">
            <h2 className="font-display font-normal text-[28px] text-ink mb-4">Weekly picks</h2>
            <table className="w-full text-sm text-ink">
              <thead className="text-left text-xs uppercase tracking-wider text-ink-faint">
                <tr>
                  <th className="py-2">Player</th>
                  <th className="py-2">Star Baker</th>
                  <th className="py-2">Going home</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {weekly.map(p => (
                  <tr key={p.user.id}>
                    <td className="py-3 font-medium">{p.user.name}</td>
                    <td className="py-3">{pickName(p, 'STAR_BAKER')}</td>
                    <td className="py-3">{pickName(p, 'ELIMINATION')}</td>
                    <td className="py-3 text-right">
                      {p.weeklyPicks.length > 0 && (
                        <button onClick={() => reset(p, 'weekly')} className="text-rose-deep hover:text-rose-deep font-medium">
                          Reset
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-card rounded-2xl p-6">
            <h2 className="font-display font-normal text-[28px] text-ink mb-4">Finalists</h2>
            <table className="w-full text-sm text-ink">
              <tbody className="divide-y divide-gray-200">
                {finalists.map(p => (
                  <tr key={p.user.id}>
                    <td className="py-3 font-medium">{p.user.name}</td>
                    <td className="py-3">
                      {p.finalistPicks.length ? p.finalistPicks.map(f => f.contestant.name).join(', ') : '—'}
                    </td>
                    <td className="py-3 text-right">
                      {p.finalistPicks.length > 0 && (
                        <button onClick={() => reset(p, 'finalists')} className="text-rose-deep hover:text-rose-deep font-medium">
                          Reset
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
