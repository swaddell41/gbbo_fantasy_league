'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { usePolling } from '@/hooks/usePolling'
import ScoringRules from '@/components/ScoringRules'

interface Season {
  id: string
  name: string
  year: number
  isActive: boolean
}

interface Contestant {
  id: string
  name: string
  isFinalist: boolean
}

interface ScoreEntry {
  rank: number
  userId: string
  userName: string | null
  userEmail: string
  totalScore: number
  weeklyScore: number
  finalistScore: number
  correctStarBaker: number
  correctElimination: number
  wrongStarBaker: number
  wrongElimination: number
  handshakes: number
  soggyBottoms: number
  technicalChallengeWins: number
  scoredWeeklyPicks: number
}

export default function ScoringPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [scores, setScores] = useState<ScoreEntry[]>([])
  const [contestants, setContestants] = useState<Contestant[]>([])

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.isAdmin) {
      router.push('/admin')
      return
    }

    fetch('/api/admin/seasons')
      .then(r => (r.ok ? r.json() : []))
      .then((data: Season[]) => {
        setSeasons(data)
        const active = data.find(s => s.isActive)
        if (active) setSelectedSeasonId(active.id)
      })
      .catch(error => console.error('Error fetching seasons:', error))
  }, [session, status, router])

  const refresh = useCallback(async () => {
    if (!selectedSeasonId) return
    const [scoresRes, contestantsRes] = await Promise.all([
      fetch(`/api/scoring/leaderboard?seasonId=${selectedSeasonId}`),
      fetch(`/api/admin/contestants?seasonId=${selectedSeasonId}`),
    ])
    if (scoresRes.ok) setScores(await scoresRes.json())
    if (contestantsRes.ok) setContestants(await contestantsRes.json())
  }, [selectedSeasonId])

  usePolling(refresh)

  const toggleFinalist = async (contestant: Contestant) => {
    const response = await fetch('/api/admin/contestants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: contestant.id, isFinalist: !contestant.isFinalist }),
    })
    if (!response.ok) {
      alert('Error updating finalist')
      return
    }
    refresh()
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-wrap gap-4 justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Scoring</h1>
                <p className="text-gray-600 mt-2">
                  Scores are calculated live from picks and episode results — there is nothing to recalculate.
                </p>
              </div>
              <button
                onClick={() => router.push('/admin')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Back to Admin
              </button>
            </div>
            <select
              value={selectedSeasonId}
              onChange={e => {
                setSelectedSeasonId(e.target.value)
                setScores([])
                setContestants([])
              }}
              className="mt-4 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">Select a season...</option>
              {seasons.map(season => (
                <option key={season.id} value={season.id}>
                  {season.name} ({season.year})
                </option>
              ))}
            </select>
          </div>

          {contestants.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800">Finalists</h2>
              <p className="text-gray-600 text-sm mt-1 mb-4">
                Mark the bakers who reach the final. Each matching finalist pick scores immediately.
              </p>
              <div className="flex flex-wrap gap-2">
                {contestants.map(c => (
                  <button
                    key={c.id}
                    onClick={() => toggleFinalist(c)}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                      c.isFinalist
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-white border-gray-300 text-gray-800 hover:border-amber-400'
                    }`}
                  >
                    {c.isFinalist ? '🏆 ' : ''}
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedSeasonId && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Standings</h2>
              {scores.length === 0 ? (
                <p className="text-gray-600">No picks yet this season.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Player</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Weekly</th>
                        <th className="px-4 py-3">Finalist</th>
                        <th className="px-4 py-3">Star Baker ✓/✗</th>
                        <th className="px-4 py-3">Elimination ✓/✗</th>
                        <th className="px-4 py-3">🤝 / 🥧 / 🔧</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-gray-900">
                      {scores.map(score => (
                        <tr key={score.userId} className={score.rank <= 3 ? 'bg-yellow-50' : ''}>
                          <td className="px-4 py-3 font-medium">{score.rank}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{score.userName}</div>
                            <div className="text-gray-500">{score.userEmail}</div>
                          </td>
                          <td className="px-4 py-3 font-bold">{score.totalScore}</td>
                          <td className="px-4 py-3">{score.weeklyScore}</td>
                          <td className="px-4 py-3">{score.finalistScore}</td>
                          <td className="px-4 py-3">
                            <span className="text-green-600">{score.correctStarBaker}</span>
                            {' / '}
                            <span className="text-red-600">{score.wrongStarBaker}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-green-600">{score.correctElimination}</span>
                            {' / '}
                            <span className="text-red-600">{score.wrongElimination}</span>
                          </td>
                          <td className="px-4 py-3">
                            {score.handshakes} / {score.soggyBottoms} / {score.technicalChallengeWins}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <ScoringRules />
        </div>
      </div>
    </div>
  )
}
