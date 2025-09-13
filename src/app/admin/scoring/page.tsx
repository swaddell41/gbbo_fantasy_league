'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Season {
  id: string
  name: string
  year: number
}

interface ScoreEntry {
  userId: string
  userName: string
  userEmail: string
  totalScore: number
  weeklyPoints: number
  finalistPoints: number
  correctStarBaker: number
  correctElimination: number
  wrongStarBaker: number
  wrongElimination: number
  totalEpisodes: number
  totalEpisodesWithPicks: number
}

export default function ScoringPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null)
  const [scores, setScores] = useState<ScoreEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (!session || !session.user || !session.user.isAdmin) {
      router.push('/admin')
      return
    }

    fetchSeasons()
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

  const calculateScores = async () => {
    if (!selectedSeason) return

    setCalculating(true)
    try {
      const response = await fetch('/api/scoring/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seasonId: selectedSeason.id
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setScores(data.scores)
        alert('Scores calculated successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error calculating scores:', error)
      alert('Error calculating scores')
    } finally {
      setCalculating(false)
    }
  }

  const recalculateScores = async () => {
    if (!selectedSeason) return

    if (!confirm('This will reset all scores for this season and recalculate them with the correct scoring rules. Are you sure?')) {
      return
    }

    setCalculating(true)
    try {
      const response = await fetch('/api/scoring/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seasonId: selectedSeason.id,
          recalculate: true
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setScores(data.scores)
        alert('Scores recalculated successfully with correct scoring rules!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error recalculating scores:', error)
      alert('Error recalculating scores')
    } finally {
      setCalculating(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Scoring Management</h1>
                <p className="text-gray-600 mt-2">Calculate and manage user scores for the fantasy league</p>
              </div>
              <button
                onClick={() => router.push('/admin')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Back to Admin
              </button>
            </div>
          </div>

          {/* Season Selection */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Season</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Scoring Fix Available</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>There was a scoring calculation bug where episode results were awarding 10 points instead of the correct 3/2 points. Use "Recalculate Scores (Fix)" to correct all existing scores.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Season
                </label>
                <select
                  value={selectedSeason?.id || ''}
                  onChange={(e) => {
                    const season = seasons.find(s => s.id === e.target.value)
                    setSelectedSeason(season || null)
                    setScores([])
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Select a season...</option>
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name} ({season.year})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={calculateScores}
                  disabled={!selectedSeason || calculating}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors duration-200"
                >
                  {calculating ? 'Calculating...' : 'Calculate Scores'}
                </button>
                <button
                  onClick={recalculateScores}
                  disabled={!selectedSeason || calculating}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors duration-200"
                >
                  {calculating ? 'Recalculating...' : 'Recalculate Scores (Fix)'}
                </button>
              </div>
            </div>
          </div>

          {/* Scores Display */}
          {scores.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Scores</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Weekly
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Finalist
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Star Baker
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Elimination
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scores.map((score, index) => (
                      <tr key={score.userId} className={index < 3 ? 'bg-yellow-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{score.userName}</div>
                            <div className="text-sm text-gray-500">{score.userEmail}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {score.totalScore}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {score.weeklyPoints}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {score.finalistPoints}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="text-green-600">{score.correctStarBaker}</span>
                          <span className="text-gray-400">/{score.totalEpisodesWithPicks || score.totalEpisodes}</span>
                          {score.wrongStarBaker > 0 && (
                            <span className="text-red-600 ml-1">({score.wrongStarBaker} wrong)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="text-green-600">{score.correctElimination}</span>
                          <span className="text-gray-400">/{score.totalEpisodesWithPicks || score.totalEpisodes}</span>
                          {score.wrongElimination > 0 && (
                            <span className="text-red-600 ml-1">({score.wrongElimination} wrong)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
