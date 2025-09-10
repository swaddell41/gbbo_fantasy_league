'use client'

import { useState, useEffect } from 'react'

interface LeaderboardEntry {
  rank: number
  userId: string
  userName: string
  userEmail: string
  totalScore: number
  weeklyScore: number
  finalistScore: number
  correctStarBaker: number
  correctElimination: number
  wrongStarBaker: number
  wrongElimination: number
  totalEpisodes: number
  technicalChallengeWins: number
  handshakes: number
  soggyBottoms: number
  accuracy: number
}

interface LeaderboardProps {
  seasonId: string
}

export default function Leaderboard({ seasonId }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLeaderboard()
  }, [seasonId])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/scoring/leaderboard?seasonId=${seasonId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard')
      }
      
      const data = await response.json()
      setLeaderboard(data)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      setError('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Leaderboard</h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Leaderboard</h3>
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchLeaderboard}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Leaderboard</h3>
        <div className="text-center py-8">
          <p className="text-gray-600">No scores yet. Make some picks to see the leaderboard!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Leaderboard</h3>
        <button 
          onClick={fetchLeaderboard}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {leaderboard.map((entry) => (
          <div
            key={entry.userId}
            className={`p-4 rounded-lg border-2 transition-colors duration-200 ${
              entry.rank === 1
                ? 'border-yellow-400 bg-yellow-50'
                : entry.rank === 2
                ? 'border-gray-300 bg-gray-50'
                : entry.rank === 3
                ? 'border-orange-400 bg-orange-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  entry.rank === 1
                    ? 'bg-yellow-400 text-yellow-900'
                    : entry.rank === 2
                    ? 'bg-gray-300 text-gray-900'
                    : entry.rank === 3
                    ? 'bg-orange-400 text-orange-900'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {entry.rank}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{entry.userName}</h4>
                  <p className="text-sm text-gray-600">{entry.userEmail}</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{entry.totalScore}</div>
                <div className="text-sm text-gray-600">points</div>
              </div>
            </div>

            {/* Detailed stats */}
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-black">Weekly Score</div>
                <div className="font-semibold">{entry.weeklyScore}</div>
              </div>
              <div>
                <div className="text-black">Accuracy</div>
                <div className="font-semibold">{entry.accuracy}%</div>
              </div>
              <div>
                <div className="text-gray-600">Star Baker</div>
                <div className="font-semibold text-green-600">
                  {entry.correctStarBaker}/{entry.totalEpisodes}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Elimination</div>
                <div className="font-semibold text-green-600">
                  {entry.correctElimination}/{entry.totalEpisodes}
                </div>
              </div>
            </div>

            {/* Bonus Points */}
            <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Technical Wins</div>
                <div className="font-semibold text-blue-600">+{entry.technicalChallengeWins}</div>
              </div>
              <div>
                <div className="text-gray-600">Handshakes</div>
                <div className="font-semibold text-yellow-600">+{entry.handshakes}</div>
              </div>
              <div>
                <div className="text-gray-600">Soggy Bottoms</div>
                <div className="font-semibold text-red-600">-{entry.soggyBottoms}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scoring Rules */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-800 mb-2">Scoring Rules</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• Star Baker correct: +3 points</div>
          <div>• Elimination correct: +2 points</div>
          <div>• Star Baker wrong (eliminated): -3 points</div>
          <div>• Elimination wrong (Star Baker): -3 points</div>
          <div>• Technical Challenge win: +1 point (for Star Baker picks)</div>
          <div>• Paul Hollywood handshake: +1 point each (for Star Baker picks)</div>
          <div>• Soggy bottom comment: -1 point each (for Star Baker picks)</div>
          <div>• Finalist correct: +3 points (scored at season end)</div>
        </div>
      </div>
    </div>
  )
}
