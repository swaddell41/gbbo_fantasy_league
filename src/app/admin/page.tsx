'use client'

import { useSession, signOut } from 'next-auth/react'
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

    if (!session.user.isAdmin) {
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

    if (!session || !session.user || !session.user.isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard 🛠️
            </h1>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              Sign Out
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Link
              href="/admin/seasons"
              className="bg-amber-50 hover:bg-amber-100 p-6 rounded-lg border border-amber-200 transition-colors duration-200"
            >
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-lg font-semibold text-amber-800 mb-2">Manage Seasons</h3>
              <p className="text-amber-700">Create and manage GBBO seasons</p>
            </Link>
            
            <Link
              href="/admin/import"
              className="bg-blue-50 hover:bg-blue-100 p-6 rounded-lg border border-blue-200 transition-colors duration-200"
            >
              <div className="text-4xl mb-4">👨‍🍳</div>
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Contestant Management</h3>
              <p className="text-blue-700">Import and manage contestant information</p>
            </Link>
            
            <Link
              href="/admin/episodes"
              className="bg-green-50 hover:bg-green-100 p-6 rounded-lg border border-green-200 transition-colors duration-200"
            >
              <div className="text-4xl mb-4">📺</div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">Episode Management</h3>
              <p className="text-green-700">Create episodes and manage results</p>
            </Link>
            

            <Link
              href="/admin/scoring"
              className="bg-purple-50 hover:bg-purple-100 p-6 rounded-lg border border-purple-200 transition-colors duration-200"
            >
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-purple-800 mb-2">Scoring System</h3>
              <p className="text-purple-700">Calculate scores and view leaderboards</p>
            </Link>

            <Link
              href="/admin/users"
              className="bg-red-50 hover:bg-red-100 p-6 rounded-lg border border-red-200 transition-colors duration-200"
            >
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">User Management</h3>
              <p className="text-red-700">Manage user accounts and reset passwords</p>
            </Link>

            <Link
              href="/admin/whatsapp"
              className="bg-green-50 hover:bg-green-100 p-6 rounded-lg border border-green-200 transition-colors duration-200"
            >
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">WhatsApp Sharing</h3>
              <p className="text-green-700">Share picks and results to WhatsApp group</p>
            </Link>

          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Fantasy League Overview</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-amber-600">{stats.totalSeasons}</div>
                <div className="text-sm text-gray-600">Total Seasons</div>
              </div>
              <div className="text-center bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-blue-600">{stats.totalContestants}</div>
                <div className="text-sm text-gray-600">Contestants</div>
              </div>
              <div className="text-center bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-green-600">{stats.totalEpisodes}</div>
                <div className="text-sm text-gray-600">Episodes</div>
              </div>
              <div className="text-center bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-purple-600">{stats.totalUsers}</div>
                <div className="text-sm text-gray-600">Players</div>
              </div>
            </div>
            
            {stats.activeSeason && (
              <div className="mt-6 p-4 bg-amber-100 rounded-lg border border-amber-200">
                <h4 className="font-semibold text-amber-800 mb-2">Current Season</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-lg font-bold text-amber-700">{stats.activeSeason.name}</div>
                    <div className="text-sm text-amber-600">Active Season</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-amber-700">{stats.activeSeason.contestantCount}</div>
                    <div className="text-sm text-amber-600">Contestants</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-amber-700">{stats.activeSeason.episodeCount}</div>
                    <div className="text-sm text-amber-600">Episodes</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <div className="text-center bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-indigo-600">{stats.totalPicks}</div>
                <div className="text-sm text-gray-600">Total Picks Made</div>
              </div>
              <div className="text-center bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-red-600">{stats.completedEpisodes || 0}</div>
                <div className="text-sm text-gray-600">Completed Episodes</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
