'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import PublicPicks from '@/components/PublicPicks'
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates'

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
  isCompleted: boolean
}

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

export default function Dashboard() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null)
  const [allUsersSubmitted, setAllUsersSubmitted] = useState(false)

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

    if (session.user.isAdmin) {
      router.push('/admin')
      return
    }

    // Fetch data for regular users
    if (session && !session.user.isAdmin) {
      fetchSeasons()
    }
  }, [session, status, router])

  // Real-time updates
  const activeSeason = seasons.find(s => s.isActive)
  useRealtimeUpdates(activeSeason?.id || null, (update) => {
    console.log('Real-time update received:', update)
    
    if (update.type === 'picks_updated') {
      // Refresh leaderboard and check submission status
      if (activeSeason) {
        fetchLeaderboard(activeSeason.id)
        if (activeEpisode) {
          checkAllUsersSubmitted()
        }
      }
    } else if (update.type === 'leaderboard_updated') {
      // Refresh leaderboard
      if (activeSeason) {
        fetchLeaderboard(activeSeason.id)
      }
    }
  })

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/seasons')
      if (response.ok) {
        const data = await response.json()
        setSeasons(data)
        
        // Find the active season and fetch leaderboard and episodes
        const activeSeason = data.find((season: Season) => season.isActive)
        if (activeSeason) {
          fetchLeaderboard(activeSeason.id)
          fetchEpisodes(activeSeason.id)
        }
      }
    } catch (error) {
      console.error('Error fetching seasons:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLeaderboard = async (seasonId: string) => {
    try {
      const response = await fetch(`/api/scoring/leaderboard?seasonId=${seasonId}`)
      if (response.ok) {
        const data = await response.json()
        setLeaderboard(data)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    }
  }

  const fetchEpisodes = async (seasonId: string) => {
    try {
      const response = await fetch(`/api/episodes?seasonId=${seasonId}`)
      if (response.ok) {
        const data = await response.json()
        setEpisodes(data)
        
        // Find the active episode
        const active = data.find((ep: Episode) => ep.isActive)
        if (active) {
          setActiveEpisode(active)
          checkAllUsersSubmitted(active.id)
        }
      }
    } catch (error) {
      console.error('Error fetching episodes:', error)
    }
  }

  const checkAllUsersSubmitted = async (episodeId?: string) => {
    const episodeToCheck = episodeId || activeEpisode?.id
    if (!episodeToCheck) return
    
    try {
      const response = await fetch(`/api/episode-picks-status?episodeId=${episodeToCheck}`)
      if (response.ok) {
        const data = await response.json()
        setAllUsersSubmitted(data.allUsersSubmitted)
      }
    } catch (error) {
      console.error('Error checking submission status:', error)
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

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Welcome back, {session.user.name}! 👋
          </h1>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Current Season - Smaller, more informational */}
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h3 className="text-md font-semibold text-amber-800 mb-2">Current Season</h3>
              {seasons.length > 0 ? (
                <div>
                  <p className="text-amber-700 font-medium">
                    {seasons.find(s => s.isActive)?.name || 'No active season'}
                  </p>
                  <p className="text-sm text-amber-600 mt-1">
                    {seasons.find(s => s.isActive)?.year || 'Check back soon!'}
                  </p>
                </div>
              ) : (
                <p className="text-amber-700">No seasons available yet</p>
              )}
            </div>
            
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Make Picks</h3>
              <p className="text-blue-700">Make your weekly picks and finalist selections</p>
              <p className="text-sm text-blue-600 mt-2">Compete with your friends!</p>
              <Link
                href="/user-dashboard"
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200 inline-block"
              >
                Go to Fantasy League
              </Link>
            </div>
            
            {/* Leaderboard Preview */}
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Your Position</h3>
              {leaderboard.length > 0 ? (
                <div>
                  <p className="text-green-700 font-medium">
                    Position: #{leaderboard.find(entry => entry.userId === session.user?.id)?.rank || 'N/A'}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    {leaderboard.find(entry => entry.userId === session.user?.id)?.totalScore || 0} points
                  </p>
                </div>
              ) : (
                <p className="text-green-700">Start playing to see your ranking!</p>
              )}
            </div>
          </div>

          {/* Episode Status */}
          {activeEpisode && (
            <div className="mt-8">
              <div className="bg-amber-50 p-4 rounded-lg mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-amber-800">
                      {activeEpisode.title} - Episode {activeEpisode.episodeNumber}
                    </h4>
                    <p className="text-sm text-amber-700">
                      {allUsersSubmitted 
                        ? '🎉 All players have submitted their picks!' 
                        : '⏳ Waiting for all players to submit their picks...'
                      }
                    </p>
                  </div>
                  {allUsersSubmitted && (
                    <div className="text-right">
                      <div className="text-2xl">🎉</div>
                      <div className="text-xs text-amber-600">Ready to watch!</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Full Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">League Leaderboard</h3>
                <button 
                  onClick={() => {
                    const activeSeason = seasons.find(s => s.isActive)
                    if (activeSeason) fetchLeaderboard(activeSeason.id)
                  }}
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
          )}

          {/* Public Picks - Show when all users have submitted */}
          {allUsersSubmitted && activeEpisode && activeSeason && (
            <div className="mt-8">
              <div className="bg-green-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-green-800 mb-4">
                  🎉 All Picks Are In! 
                  <span className="text-sm font-normal text-green-600 ml-2">
                    Here's what everyone picked for {activeEpisode.title}
                  </span>
                </h3>
                <PublicPicks
                  seasonId={activeSeason.id}
                  episodeId={activeEpisode.id}
                  showFinalists={false}
                  showWeekly={true}
                />
              </div>
            </div>
          )}


          {/* Getting Started - Only show if no leaderboard data */}
          {leaderboard.length === 0 && (
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Getting Started</h3>
              <p className="text-gray-600">
                The admin will set up the current season and contestants soon. Once that&apos;s done, 
                you&apos;ll be able to make your weekly picks and start competing with your friends!
              </p>
            </div>
          )}
          
          <div className="mt-6 text-center space-x-4">
            <Link
              href="/change-password"
              className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 inline-block"
            >
              Change Password
            </Link>
            <button
              onClick={async () => {
                setRefreshing(true)
                await update()
                setRefreshing(false)
              }}
              disabled={refreshing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50"
            >
              {refreshing ? 'Refreshing...' : 'Refresh Session'}
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
