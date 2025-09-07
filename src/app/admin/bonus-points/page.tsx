'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Season {
  id: string
  name: string
  year: number
}

interface Contestant {
  id: string
  name: string
  imageUrl?: string
}

interface Episode {
  id: string
  title: string
  episodeNumber: number
  seasonId: string
  airDate: string
  isActive: boolean
  starBakerId?: string
  eliminatedId?: string
  isCompleted: boolean
  technicalChallengeWinnerId?: string
  handshakes: Array<{ contestantId: string; contestant: Contestant }>
  soggyBottoms: Array<{ contestantId: string; contestant: Contestant }>
}

export default function BonusPointsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [contestants, setContestants] = useState<Contestant[]>([])
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (!session || !session.user || !session.user.isAdmin) {
      router.push('/admin')
      return
    }

    fetchSeasons()
  }, [session, status, router])

  useEffect(() => {
    if (selectedSeason) {
      fetchEpisodes(selectedSeason.id)
      fetchContestants(selectedSeason.id)
    }
  }, [selectedSeason])

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

  const fetchEpisodes = async (seasonId: string) => {
    try {
      const response = await fetch(`/api/admin/episodes?seasonId=${seasonId}`)
      if (response.ok) {
        const data = await response.json()
        setEpisodes(data)
      }
    } catch (error) {
      console.error('Error fetching episodes:', error)
    }
  }

  const fetchContestants = async (seasonId: string) => {
    try {
      const response = await fetch(`/api/admin/contestants?seasonId=${seasonId}`)
      if (response.ok) {
        const data = await response.json()
        setContestants(data)
      }
    } catch (error) {
      console.error('Error fetching contestants:', error)
    }
  }

  const handleTechnicalChallengeWinner = async (contestantId: string) => {
    if (!selectedEpisode) return

    try {
      const response = await fetch('/api/admin/episode-bonus-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId: selectedEpisode.id,
          type: 'technical_challenge',
          contestantId: contestantId
        }),
      })

      if (response.ok) {
        // Refresh episodes
        if (selectedSeason) {
          fetchEpisodes(selectedSeason.id)
        }
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating technical challenge winner:', error)
      alert('Error updating technical challenge winner')
    }
  }

  const handleHandshake = async (contestantId: string) => {
    if (!selectedEpisode) return

    try {
      const response = await fetch('/api/admin/episode-bonus-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId: selectedEpisode.id,
          type: 'handshake',
          contestantId: contestantId
        }),
      })

      if (response.ok) {
        // Refresh episodes
        if (selectedSeason) {
          fetchEpisodes(selectedSeason.id)
        }
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating handshake:', error)
      alert('Error updating handshake')
    }
  }

  const handleSoggyBottom = async (contestantId: string) => {
    if (!selectedEpisode) return

    try {
      const response = await fetch('/api/admin/episode-bonus-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId: selectedEpisode.id,
          type: 'soggy_bottom',
          contestantId: contestantId
        }),
      })

      if (response.ok) {
        // Refresh episodes
        if (selectedSeason) {
          fetchEpisodes(selectedSeason.id)
        }
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating soggy bottom:', error)
      alert('Error updating soggy bottom')
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
                <h1 className="text-3xl font-bold text-gray-900">Bonus Points Management</h1>
                <p className="text-gray-600 mt-2">Manage technical challenges, handshakes, and soggy bottoms</p>
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
            <select
              value={selectedSeason?.id || ''}
              onChange={(e) => {
                const season = seasons.find(s => s.id === e.target.value)
                setSelectedSeason(season || null)
                setSelectedEpisode(null)
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

          {/* Episode Selection */}
          {selectedSeason && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Episode</h2>
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
                    {episode.isCompleted ? ' (Completed)' : ' (Not Completed)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bonus Points Management */}
          {selectedEpisode && (
            <div className="space-y-6">
              {/* Technical Challenge Winner */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Technical Challenge Winner</h3>
                <p className="text-gray-600 mb-4">Select who won the technical challenge (+1 point for Star Baker picks)</p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {contestants.map((contestant) => (
                    <button
                      key={contestant.id}
                      onClick={() => handleTechnicalChallengeWinner(contestant.id)}
                      className={`p-3 rounded-lg border-2 transition-colors duration-200 text-left ${
                        selectedEpisode.technicalChallengeWinnerId === contestant.id
                          ? 'border-green-500 bg-green-100'
                          : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {contestant.imageUrl && (
                          <img
                            src={contestant.imageUrl}
                            alt={contestant.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        )}
                        <span className="font-medium text-gray-900">
                          {contestant.name}
                          {selectedEpisode.technicalChallengeWinnerId === contestant.id && ' ✓'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Handshakes */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Paul Hollywood Handshakes</h3>
                <p className="text-gray-600 mb-4">Select contestants who received handshakes (+1 point each for Star Baker picks)</p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {contestants.map((contestant) => {
                    const hasHandshake = selectedEpisode.handshakes?.some(h => h.contestantId === contestant.id) || false
                    return (
                      <button
                        key={contestant.id}
                        onClick={() => handleHandshake(contestant.id)}
                        className={`p-3 rounded-lg border-2 transition-colors duration-200 text-left ${
                          hasHandshake
                            ? 'border-yellow-500 bg-yellow-100'
                            : 'border-gray-200 bg-white hover:border-yellow-300 hover:bg-yellow-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {contestant.imageUrl && (
                            <img
                              src={contestant.imageUrl}
                              alt={contestant.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          )}
                          <span className="font-medium text-gray-900">
                            {contestant.name}
                            {hasHandshake && ' 🤝'}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Soggy Bottoms */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Soggy Bottoms</h3>
                <p className="text-gray-600 mb-4">Select contestants who got soggy bottom comments (-1 point each for Star Baker picks)</p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {contestants.map((contestant) => {
                    const hasSoggyBottom = selectedEpisode.soggyBottoms?.some(s => s.contestantId === contestant.id) || false
                    return (
                      <button
                        key={contestant.id}
                        onClick={() => handleSoggyBottom(contestant.id)}
                        className={`p-3 rounded-lg border-2 transition-colors duration-200 text-left ${
                          hasSoggyBottom
                            ? 'border-red-500 bg-red-100'
                            : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {contestant.imageUrl && (
                            <img
                              src={contestant.imageUrl}
                              alt={contestant.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          )}
                          <span className="font-medium text-gray-900">
                            {contestant.name}
                            {hasSoggyBottom && ' 💧'}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
