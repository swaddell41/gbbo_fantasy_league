'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [seasons, setSeasons] = useState([])
  const [stats, setStats] = useState({
    totalSeasons: 0,
    totalContestants: 0,
    totalEpisodes: 0,
    totalUsers: 0,
    totalPicks: 0,
    completedEpisodes: 0,
    activeSeason: null as { name: string; contestantCount: number; episodeCount: number } | null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Check if user must change password
    if (session.user.mustChangePassword) {
      router.push('/change-password')
      return
    }

    if (!session.user.canAdmin) {
      router.push('/dashboard')
      return
    }

    // Fetch seasons data and stats
    fetchSeasons()
    fetchStats()
  }, [session, status, router])

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/admin/seasons')
      if (response.ok) {
        const data = await response.json()
        setSeasons(data)
      }
    } catch (error) {
      console.error('Error fetching seasons:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose mx-auto"></div>
          <p className="mt-4 text-ink-muted">Loading...</p>
        </div>
      </div>
    )
  }

    if (!session || !session.user || !session.user.canAdmin) {
    return null
  }

  return (
    <div>
      <div className="mx-auto max-w-6xl px-[22px] py-8 md:px-12">
        <div>
          <div className="mb-8">
            <p className="text-[13px] font-bold uppercase tracking-[.1em] text-rose-deep">Behind the scenes</p>
            <h1 className="mt-1 font-display text-[40px] leading-none md:text-[56px]">Admin</h1>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Link
              href="/admin/seasons"
              className="bg-oat hover:bg-line p-6 rounded-2xl transition-colors duration-200"
            >
              <div className="text-4xl mb-4">📅</div>
              <h3 className="font-display font-normal text-2xl text-ink mb-2">Manage Seasons</h3>
              <p className="text-ink-muted">Create and manage GBBO seasons</p>
            </Link>
            
            <Link
              href="/admin/import"
              className="bg-oat hover:bg-line p-6 rounded-2xl transition-colors duration-200"
            >
              <div className="text-4xl mb-4">👨‍🍳</div>
              <h3 className="font-display font-normal text-2xl text-ink mb-2">Contestant Management</h3>
              <p className="text-ink-muted">Import and manage contestant information</p>
            </Link>
            
            <Link
              href="/admin/episodes"
              className="bg-oat hover:bg-line p-6 rounded-2xl transition-colors duration-200"
            >
              <div className="text-4xl mb-4">📺</div>
              <h3 className="font-display font-normal text-2xl text-ink mb-2">Episode Management</h3>
              <p className="text-ink-muted">Create episodes and manage results</p>
            </Link>
            

            <Link
              href="/admin/scoring"
              className="bg-oat hover:bg-line p-6 rounded-2xl transition-colors duration-200"
            >
              <div className="text-4xl mb-4">📊</div>
              <h3 className="font-display font-normal text-2xl text-ink mb-2">Scoring System</h3>
              <p className="text-ink-muted">Calculate scores and view leaderboards</p>
            </Link>

            <Link
              href="/admin/picks"
              className="bg-oat hover:bg-line p-6 rounded-2xl transition-colors duration-200"
            >
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="font-display font-normal text-2xl text-ink mb-2">Picks</h3>
              <p className="text-ink-muted">See everyone’s picks and reset locked ones</p>
            </Link>

            <Link
              href="/admin/users"
              className="bg-oat hover:bg-line p-6 rounded-2xl transition-colors duration-200"
            >
              <div className="text-4xl mb-4">👥</div>
              <h3 className="font-display font-normal text-2xl text-ink mb-2">User Management</h3>
              <p className="text-ink-muted">Manage user accounts and reset passwords</p>
            </Link>

            <Link
              href="/admin/whatsapp"
              className="bg-oat hover:bg-line p-6 rounded-2xl transition-colors duration-200"
            >
              <div className="text-4xl mb-4">📱</div>
              <h3 className="font-display font-normal text-2xl text-ink mb-2">WhatsApp Sharing</h3>
              <p className="text-ink-muted">Share picks and results to WhatsApp group</p>
            </Link>

          </div>

          <div className="bg-oat p-6 rounded-2xl">
            <h3 className="font-display font-normal text-2xl text-ink mb-4">Fantasy League Overview</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center bg-card p-4 rounded-2xl border">
                <div className="font-display text-[34px] leading-tight text-ink">{stats.totalSeasons}</div>
                <div className="text-sm text-ink-muted">Total Seasons</div>
              </div>
              <div className="text-center bg-card p-4 rounded-2xl border">
                <div className="font-display text-[34px] leading-tight text-ink">{stats.totalContestants}</div>
                <div className="text-sm text-ink-muted">Contestants</div>
              </div>
              <div className="text-center bg-card p-4 rounded-2xl border">
                <div className="font-display text-[34px] leading-tight text-ink">{stats.totalEpisodes}</div>
                <div className="text-sm text-ink-muted">Episodes</div>
              </div>
              <div className="text-center bg-card p-4 rounded-2xl border">
                <div className="font-display text-[34px] leading-tight text-ink">{stats.totalUsers}</div>
                <div className="text-sm text-ink-muted">Players</div>
              </div>
            </div>
            
            {stats.activeSeason && (
              <div className="mt-6 p-4 bg-oat rounded-2xl border border-line">
                <h4 className="font-semibold text-ink mb-2">Current Season</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-lg font-bold text-ink">{stats.activeSeason.name}</div>
                    <div className="text-sm text-rose-deep">Active Season</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-ink">{stats.activeSeason.contestantCount}</div>
                    <div className="text-sm text-rose-deep">Contestants</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-ink">{stats.activeSeason.episodeCount}</div>
                    <div className="text-sm text-rose-deep">Episodes</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <div className="text-center bg-card p-4 rounded-2xl border">
                <div className="font-display text-[34px] leading-tight text-ink">{stats.totalPicks}</div>
                <div className="text-sm text-ink-muted">Total Picks Made</div>
              </div>
              <div className="text-center bg-card p-4 rounded-2xl border">
                <div className="font-display text-[34px] leading-tight text-ink">{stats.completedEpisodes || 0}</div>
                <div className="text-sm text-ink-muted">Completed Episodes</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
