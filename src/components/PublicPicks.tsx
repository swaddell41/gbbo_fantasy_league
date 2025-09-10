'use client'

import { useState, useEffect } from 'react'

interface Contestant {
  id: string
  name: string
  imageUrl?: string
}

interface UserPick {
  id: string
  pickType: 'FINALIST' | 'STAR_BAKER' | 'ELIMINATION'
  episodeId?: string
  contestant: Contestant
}

interface EpisodePick {
  id: string
  pickType: string
  contestant: Contestant
}

interface EpisodePicks {
  episode: {
    id: string
    title: string
    episodeNumber: number
    isCompleted: boolean
  }
  picks: EpisodePick[]
}

interface UserPicks {
  user: {
    id: string
    name: string
  }
  finalistPicks: UserPick[]
  weeklyPicks: UserPick[]
}

interface PublicPicksProps {
  seasonId: string
  episodeId?: string
  showFinalists?: boolean
  showWeekly?: boolean
}

export default function PublicPicks({ 
  seasonId, 
  episodeId, 
  showFinalists = true, 
  showWeekly = true 
}: PublicPicksProps) {
  const [picks, setPicks] = useState<UserPicks[]>([])
  const [loading, setLoading] = useState(true)
  const [allUsersSubmitted, setAllUsersSubmitted] = useState(false)
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [pickHistory, setPickHistory] = useState<Map<string, EpisodePicks[]>>(new Map())
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPicks()
    if (episodeId) {
      checkSubmissionStatus()
    }
  }, [seasonId, episodeId])

  const fetchPicks = async () => {
    try {
      const url = `/api/public-picks?seasonId=${seasonId}${episodeId ? `&episodeId=${episodeId}` : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setPicks(data.picksByUser)
      }
    } catch (error) {
      console.error('Error fetching public picks:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkSubmissionStatus = async () => {
    if (!episodeId) return
    
    try {
      const response = await fetch(`/api/episode-picks-status?episodeId=${episodeId}`)
      if (response.ok) {
        const data = await response.json()
        setAllUsersSubmitted(data.allUsersSubmitted)
      }
    } catch (error) {
      console.error('Error checking submission status:', error)
    }
  }

  const fetchPickHistory = async (userId: string) => {
    if (pickHistory.has(userId)) return // Already loaded
    
    setLoadingHistory(prev => new Set(prev).add(userId))
    
    try {
      const response = await fetch(`/api/user/pick-history?userId=${userId}&seasonId=${seasonId}`)
      if (response.ok) {
        const data = await response.json()
        setPickHistory(prev => new Map(prev).set(userId, data.pickHistory))
      }
    } catch (error) {
      console.error('Error fetching pick history:', error)
    } finally {
      setLoadingHistory(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
    } else {
      newExpanded.add(userId)
      fetchPickHistory(userId)
    }
    setExpandedUsers(newExpanded)
  }

  if (loading) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Loading picks...</h3>
      </div>
    )
  }

  if (picks.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">No picks available</h3>
        <p className="text-gray-600">No players have made picks yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {episodeId ? 'Weekly Picks' : 'All Picks'}
          {allUsersSubmitted && episodeId && (
            <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
              All Submitted! 🎉
            </span>
          )}
        </h3>
      </div>

      <div className="space-y-6">
        {picks.map((userPicks) => (
          <div key={userPicks.user.id} className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-800">{userPicks.user.name}</h4>
              <button
                onClick={() => toggleUserExpansion(userPicks.user.id)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                {expandedUsers.has(userPicks.user.id) ? '▼' : '▶'} 
                {expandedUsers.has(userPicks.user.id) ? 'Hide History' : 'Show History'}
              </button>
            </div>
            

            {/* Weekly Picks */}
            {showWeekly && userPicks.weeklyPicks.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-green-600 mb-2">Picks</h5>
                <div className="space-y-2">
                  {userPicks.weeklyPicks.map((pick) => (
                    <div key={pick.id} className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        pick.pickType === 'STAR_BAKER' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {pick.pickType === 'STAR_BAKER' ? '⭐' : '❌'}
                      </span>
                      <span className="text-sm text-gray-700">{pick.contestant.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expanded Pick History */}
            {expandedUsers.has(userPicks.user.id) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h5 className="text-sm font-medium text-gray-700 mb-3">Season Pick History</h5>
                {loadingHistory.has(userPicks.user.id) ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading history...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* All Picks (including finalist picks from API) */}
                    {pickHistory.get(userPicks.user.id)?.map((episodePicks) => (
                      <div key={episodePicks.episode.id} className={`p-3 rounded-lg ${
                        episodePicks.episode.id === 'finalist' ? 'bg-blue-50' : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <h6 className={`font-medium ${
                            episodePicks.episode.id === 'finalist' ? 'text-blue-800' : 'text-gray-800'
                          }`}>
                            {episodePicks.episode.id === 'finalist' 
                              ? `🏆 ${episodePicks.episode.title}`
                              : `Episode ${episodePicks.episode.episodeNumber}: ${episodePicks.episode.title}`
                            }
                          </h6>
                          {episodePicks.episode.id !== 'finalist' && (
                            <span className={`text-xs px-2 py-1 rounded ${
                              episodePicks.episode.isCompleted 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {episodePicks.episode.isCompleted ? 'Completed' : 'Pending'}
                            </span>
                          )}
                        </div>
                        {episodePicks.episode.id === 'finalist' ? (
                          // Finalist picks display as grid
                          <div className="flex flex-wrap gap-2">
                            {episodePicks.picks.map((pick) => (
                              <div key={pick.id} className="bg-blue-100 px-3 py-2 rounded-lg flex items-center gap-2">
                                {pick.contestant.imageUrl && (
                                  <img
                                    src={pick.contestant.imageUrl}
                                    alt={pick.contestant.name}
                                    className="w-5 h-5 rounded-full object-cover"
                                  />
                                )}
                                <span className="text-sm font-medium text-blue-800">
                                  {pick.contestant.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Episode picks display as list
                          <div className="space-y-1">
                            {episodePicks.picks.map((pick) => (
                              <div key={pick.id} className="flex items-center gap-2 text-sm">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  pick.pickType === 'STAR_BAKER' 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : pick.pickType === 'ELIMINATION'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {pick.pickType === 'STAR_BAKER' ? '⭐' : 
                                   pick.pickType === 'ELIMINATION' ? '❌' : '🏆'} 
                                  {pick.pickType.replace('_', ' ')}
                                </span>
                                <div className="flex items-center gap-2">
                                  {pick.contestant.imageUrl && (
                                    <img
                                      src={pick.contestant.imageUrl}
                                      alt={pick.contestant.name}
                                      className="w-5 h-5 rounded-full object-cover"
                                    />
                                  )}
                                  <span className="text-gray-700">{pick.contestant.name}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {pickHistory.get(userPicks.user.id)?.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No pick history available</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

}
