'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import WeeklyPicks from './weekly-picks'

interface Season {
  id: string
  name: string
  year: number
  isActive: boolean
}

interface Contestant {
  id: string
  name: string
  imageUrl?: string
  bio?: string
  isEliminated: boolean
}

interface Episode {
  id: string
  title: string
  episodeNumber: number
  airDate: string
  isActive: boolean
  starBakerId?: string
  eliminatedId?: string
  isCompleted?: boolean
}

interface UserPick {
  id: string
  contestantId: string
  episodeId?: string
  pickType: 'FINALIST' | 'STAR_BAKER' | 'ELIMINATION'
  contestant: Contestant
}

function UserDashboardContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null)
  const [contestants, setContestants] = useState<Contestant[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [userPicks, setUserPicks] = useState<UserPick[]>([])
  const [loading, setLoading] = useState(true)
  const [showFinalistPicks, setShowFinalistPicks] = useState(false)
  const [finalistPicks, setFinalistPicks] = useState<string[]>([])
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session || !session.user || session.user.isAdmin) {
      router.push('/auth/signin')
      return
    }

    // Check if user must change password
    if (session.user.mustChangePassword) {
      router.push('/change-password')
      return
    }

    fetchSeasons()
  }, [session, status, router])

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/seasons')
      if (response.ok) {
        const data = await response.json()
        setSeasons(data)
      }
    } catch (error) {
      console.error('Error fetching seasons:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchContestants = async (seasonId: string) => {
    try {
      const response = await fetch(`/api/contestants?seasonId=${seasonId}`)
      if (response.ok) {
        const data = await response.json()
        setContestants(data)
      }
    } catch (error) {
      console.error('Error fetching contestants:', error)
    }
  }

  const fetchEpisodes = async (seasonId: string) => {
    try {
      const response = await fetch(`/api/episodes?seasonId=${seasonId}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Episodes loaded:', data)
        setEpisodes(data)
        // Set the first active episode as selected
        const activeEpisode = data.find((ep: Episode) => ep.isActive)
        console.log('Active episode found:', activeEpisode)
        if (activeEpisode) {
          setSelectedEpisode(activeEpisode)
          console.log('Selected episode set to:', activeEpisode)
        } else {
          console.log('No active episode found, setting first episode as selected')
          if (data.length > 0) {
            setSelectedEpisode(data[0])
          }
        }
      }
    } catch (error) {
      console.error('Error fetching episodes:', error)
    }
  }

  const fetchUserPicks = async (seasonId: string) => {
    try {
      const response = await fetch(`/api/user/picks?seasonId=${seasonId}`)
      if (response.ok) {
        const data = await response.json()
        setUserPicks(data)
        
        // Check if user has made finalist picks
        const finalistPicks = data.filter((pick: UserPick) => pick.pickType === 'FINALIST')
        if (finalistPicks.length > 0) {
          setFinalistPicks(finalistPicks.map((pick: UserPick) => pick.contestantId))
        }
      }
    } catch (error) {
      console.error('Error fetching user picks:', error)
    }
  }

  const handleSeasonSelect = (season: Season) => {
    setSelectedSeason(season)
    fetchContestants(season.id)
    fetchEpisodes(season.id)
    fetchUserPicks(season.id)
  }

  const handleFinalistPick = (contestantId: string) => {
    if (finalistPicks.includes(contestantId)) {
      setFinalistPicks(finalistPicks.filter(id => id !== contestantId))
    } else if (finalistPicks.length < 3) {
      setFinalistPicks([...finalistPicks, contestantId])
    }
  }

  const submitFinalistPicks = async () => {
    if (finalistPicks.length !== 3) {
      alert('Please select exactly 3 finalists')
      return
    }

    console.log('Submitting finalist picks:', {
      seasonId: selectedSeason?.id,
      picks: finalistPicks.map(contestantId => ({
        contestantId,
        pickType: 'FINALIST'
      }))
    })

    try {
      const response = await fetch('/api/user/picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seasonId: selectedSeason?.id,
          picks: finalistPicks.map(contestantId => ({
            contestantId,
            pickType: 'FINALIST'
          }))
        }),
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (response.ok) {
        const result = await response.json()
        console.log('Success response:', result)
        setShowFinalistPicks(false)
        fetchUserPicks(selectedSeason!.id)
        alert('Finalist picks saved successfully!')
      } else {
        const error = await response.json()
        console.error('Error response:', error)
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving finalist picks:', error)
      alert('Error saving finalist picks')
    }
  }


  const handleWeeklyPicksSubmit = async (starBakerId: string, eliminationId: string) => {
    if (!selectedEpisode) {
      throw new Error('No episode selected')
    }

    const response = await fetch('/api/user/picks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        seasonId: selectedSeason?.id,
        picks: [
          {
            contestantId: starBakerId,
            pickType: 'STAR_BAKER',
            episodeId: selectedEpisode.id
          },
          {
            contestantId: eliminationId,
            pickType: 'ELIMINATION',
            episodeId: selectedEpisode.id
          }
        ]
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to save picks')
    }

    // Refresh picks data
    if (selectedSeason) {
      fetchUserPicks(selectedSeason.id)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Fantasy League Dashboard</h1>
              <p className="text-gray-600 mt-2">Welcome back, {session?.user?.name}!</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/dashboard"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Back to Dashboard
              </Link>
              <button
                onClick={() => signOut()}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Sign Out
              </button>
            </div>
          </div>

          {!selectedSeason ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Select a Season</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {seasons.map((season) => (
                  <button
                    key={season.id}
                    onClick={() => handleSeasonSelect(season)}
                    className="bg-amber-50 hover:bg-amber-100 p-6 rounded-lg border border-amber-200 transition-colors duration-200 text-left"
                  >
                    <h4 className="text-lg font-semibold text-amber-800">{season.name}</h4>
                    <p className="text-amber-700">Year: {season.year}</p>
                    <p className="text-sm text-amber-600 mt-2">
                      {season.isActive ? 'Active Season' : 'Inactive'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="bg-amber-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-amber-800">
                  {selectedSeason.name} ({selectedSeason.year})
                </h3>
                <button
                  onClick={() => setSelectedSeason(null)}
                  className="text-amber-600 hover:text-amber-700 text-sm mt-2"
                >
                  ← Change Season
                </button>
              </div>

              {/* Finalist Picks Section */}
              <div className="bg-blue-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">Finalist Picks</h3>
                <p className="text-blue-700 mb-4">
                  Select 3 contestants who you think will make it to the finale. These picks are locked for the entire season.
                </p>
                
                {finalistPicks.length === 0 ? (
                  <button
                    onClick={() => setShowFinalistPicks(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors duration-200"
                  >
                    Make Finalist Picks
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {finalistPicks.map(contestantId => {
                        const contestant = contestants.find(c => c.id === contestantId)
                        return contestant ? (
                          <div key={contestantId} className="bg-white p-3 rounded-lg border border-blue-200 flex items-center gap-2">
                            {contestant.imageUrl && (
                              <img
                                src={contestant.imageUrl}
                                alt={contestant.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            )}
                            <span className="font-medium text-blue-800">{contestant.name}</span>
                          </div>
                        ) : null
                      })}
                    </div>
                    <p className="text-sm text-blue-600">
                      ✅ Finalist picks locked for the season
                    </p>
                  </div>
                )}
              </div>

              {/* Weekly Picks Section */}
              {episodes.length === 0 ? (
                <div className="bg-green-50 p-6 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold text-green-800 mb-4">Weekly Picks</h3>
                  <p className="text-green-600">No episodes available yet. Check back when the season starts!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Episode Selection */}
                  <div className="bg-white p-4 rounded-lg border">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Episode
                    </label>
                    <select
                      value={selectedEpisode?.id || ''}
                      onChange={(e) => {
                        const episode = episodes.find(ep => ep.id === e.target.value)
                        setSelectedEpisode(episode || null)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="">Select an episode...</option>
                      {episodes.map((episode) => (
                        <option key={episode.id} value={episode.id}>
                          Episode {episode.episodeNumber}: {episode.title}
                          {episode.isActive ? ' (Active)' : ' (Inactive)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Weekly Picks Component */}
                  <WeeklyPicks
                    contestants={contestants}
                    selectedEpisode={selectedEpisode}
                    onSubmit={handleWeeklyPicksSubmit}
                  />
                </div>
              )}


              {/* Contestant Grid */}
              {showFinalistPicks && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Your 3 Finalists</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {contestants.map((contestant) => (
                      <button
                        key={contestant.id}
                        onClick={() => handleFinalistPick(contestant.id)}
                        disabled={!finalistPicks.includes(contestant.id) && finalistPicks.length >= 3}
                        className={`p-4 rounded-lg border-2 transition-colors duration-200 text-left ${
                          finalistPicks.includes(contestant.id)
                            ? 'border-blue-500 bg-blue-50'
                            : finalistPicks.length >= 3
                            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {contestant.imageUrl && (
                            <img
                              src={contestant.imageUrl}
                              alt={contestant.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <h4 className="font-semibold text-gray-900">{contestant.name}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {contestant.bio?.substring(0, 100)}...
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Selected: {finalistPicks.length}/3 finalists
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowFinalistPicks(false)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitFinalistPicks}
                        disabled={finalistPicks.length !== 3}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors duration-200"
                      >
                        Save Finalist Picks
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UserDashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserDashboardContent />
    </Suspense>
  )
}
