'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  isEliminated: boolean
}

interface Episode {
  id: string
  title: string
  episodeNumber: number
  airDate: string
  isActive: boolean
  isCompleted: boolean
  starBakerId?: string
  eliminatedId?: string
  technicalChallengeWinnerId?: string
  starBaker?: Contestant
  eliminated?: Contestant
  technicalChallengeWinner?: Contestant
  handshakes: Array<{ contestantId: string; contestant: Contestant }>
  soggyBottoms: Array<{ contestantId: string; contestant: Contestant }>
}

export default function ManageResults() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [contestants, setContestants] = useState<Contestant[]>([])
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const [results, setResults] = useState<{
    starBakerId?: string
    eliminatedId?: string
    technicalChallengeWinnerId?: string
    handshakes: Record<string, number>
    soggyBottoms: Record<string, number>
  }>({
    handshakes: {},
    soggyBottoms: {}
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session || !session.user?.isAdmin) {
      router.push('/auth/signin')
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

  useEffect(() => {
    if (selectedEpisode) {
      // Count handshakes and soggy bottoms per contestant
      const handshakeCounts: Record<string, number> = {}
      const soggyBottomCounts: Record<string, number> = {}
      
      selectedEpisode.handshakes?.forEach(h => {
        handshakeCounts[h.contestantId] = (handshakeCounts[h.contestantId] || 0) + 1
      })
      
      selectedEpisode.soggyBottoms?.forEach(s => {
        soggyBottomCounts[s.contestantId] = (soggyBottomCounts[s.contestantId] || 0) + 1
      })
      
      setResults({
        starBakerId: selectedEpisode.starBakerId || undefined,
        eliminatedId: selectedEpisode.eliminatedId || undefined,
        technicalChallengeWinnerId: selectedEpisode.technicalChallengeWinnerId || undefined,
        handshakes: handshakeCounts,
        soggyBottoms: soggyBottomCounts
      })
    }
  }, [selectedEpisode])

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/admin/seasons')
      if (response.ok) {
        const data = await response.json()
        setSeasons(data)
        if (data.length > 0) {
          setSelectedSeason(data[0])
        }
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

  const handleResultChange = (type: 'starBakerId' | 'eliminatedId' | 'technicalChallengeWinnerId', contestantId: string) => {
    setResults(prev => ({
      ...prev,
      [type]: prev[type] === contestantId ? undefined : contestantId
    }))
  }

  const handleHandshakeChange = (contestantId: string, delta: number) => {
    setResults(prev => ({
      ...prev,
      handshakes: {
        ...prev.handshakes,
        [contestantId]: Math.max(0, (prev.handshakes[contestantId] || 0) + delta)
      }
    }))
  }

  const handleSoggyBottomChange = (contestantId: string, delta: number) => {
    setResults(prev => ({
      ...prev,
      soggyBottoms: {
        ...prev.soggyBottoms,
        [contestantId]: Math.max(0, (prev.soggyBottoms[contestantId] || 0) + delta)
      }
    }))
  }

  const saveResults = async () => {
    if (!selectedEpisode) return

    try {
      // Save main results (Star Baker and Elimination)
      const resultsResponse = await fetch('/api/admin/episode-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId: selectedEpisode.id,
          starBakerId: results.starBakerId,
          eliminatedId: results.eliminatedId
        })
      })

      if (!resultsResponse.ok) {
        const error = await resultsResponse.json()
        alert(`Error saving main results: ${error.error}`)
        return
      }

      // Save technical challenge winner
      if (results.technicalChallengeWinnerId) {
        await fetch('/api/admin/episode-bonus-points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            episodeId: selectedEpisode.id,
            type: 'technical_challenge',
            contestantId: results.technicalChallengeWinnerId
          })
        })
      }

      // Save handshakes - handle multiple per contestant
      for (const [contestantId, count] of Object.entries(results.handshakes)) {
        if (count > 0) {
          // First, remove all existing handshakes for this contestant in this episode
          await fetch('/api/admin/episode-bonus-points', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              episodeId: selectedEpisode.id,
              type: 'handshake',
              contestantId
            })
          })
          
          // Then add the new count
          for (let i = 0; i < count; i++) {
            await fetch('/api/admin/episode-bonus-points', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                episodeId: selectedEpisode.id,
                type: 'handshake',
                contestantId
              })
            })
          }
        }
      }

      // Save soggy bottoms - handle multiple per contestant
      for (const [contestantId, count] of Object.entries(results.soggyBottoms)) {
        if (count > 0) {
          // First, remove all existing soggy bottoms for this contestant in this episode
          await fetch('/api/admin/episode-bonus-points', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              episodeId: selectedEpisode.id,
              type: 'soggy_bottom',
              contestantId
            })
          })
          
          // Then add the new count
          for (let i = 0; i < count; i++) {
            await fetch('/api/admin/episode-bonus-points', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                episodeId: selectedEpisode.id,
                type: 'soggy_bottom',
                contestantId
              })
            })
          }
        }
      }

      fetchEpisodes(selectedSeason!.id)
      alert('All results saved successfully!')
    } catch (error) {
      console.error('Error saving results:', error)
      alert('Error saving results')
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session || !session.user?.isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Unauthorized</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-black">Manage Episode Results</h1>
          <p className="text-black mt-2">Mark Star Baker, Elimination, and all bonus points for each episode</p>
        </div>

        {/* Season Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-black mb-4">Select Season</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seasons.map((season) => (
              <button
                key={season.id}
                onClick={() => setSelectedSeason(season)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedSeason?.id === season.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h3 className="font-semibold text-black">{season.name}</h3>
                <p className="text-sm text-black">Year: {season.year}</p>
              </button>
            ))}
          </div>
        </div>

        {selectedSeason && (
          <>
            {/* Episode Selection */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold text-black mb-4">Select Episode</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {episodes.map((episode) => (
                  <button
                    key={episode.id}
                    onClick={() => setSelectedEpisode(episode)}
                    className={`p-4 rounded-lg border-2 transition-colors text-left ${
                      selectedEpisode?.id === episode.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-semibold text-black">Episode {episode.episodeNumber}</h3>
                    <p className="text-sm text-black">{episode.title}</p>
                    <p className="text-xs text-black mt-1">
                      {episode.isCompleted ? '✅ Completed' : '⏳ Pending'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {selectedEpisode && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-black mb-6">
                  Results for Episode {selectedEpisode.episodeNumber}: {selectedEpisode.title}
                </h2>

                <div className="space-y-8">
                  {/* Main Results */}
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Star Baker Selection */}
                    <div>
                      <h3 className="text-lg font-semibold text-green-800 mb-4">Star Baker</h3>
                      <div className="space-y-2">
                        {contestants.filter(c => !c.isEliminated).map((contestant) => (
                          <button
                            key={`star-${contestant.id}`}
                            onClick={() => handleResultChange('starBakerId', contestant.id)}
                            className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
                              results.starBakerId === contestant.id
                                ? 'border-green-500 bg-green-100'
                                : 'border-gray-200 hover:border-green-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {contestant.imageUrl && (
                                <img
                                  src={contestant.imageUrl}
                                  alt={contestant.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              )}
                              <span className="font-medium text-black">{contestant.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Elimination Selection */}
                    <div>
                      <h3 className="text-lg font-semibold text-red-800 mb-4">Eliminated</h3>
                      <div className="space-y-2">
                        {contestants.filter(c => !c.isEliminated).map((contestant) => (
                          <button
                            key={`elim-${contestant.id}`}
                            onClick={() => handleResultChange('eliminatedId', contestant.id)}
                            className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
                              results.eliminatedId === contestant.id
                                ? 'border-red-500 bg-red-100'
                                : 'border-gray-200 hover:border-red-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {contestant.imageUrl && (
                                <img
                                  src={contestant.imageUrl}
                                  alt={contestant.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              )}
                              <span className="font-medium text-black">{contestant.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bonus Points Section */}
                  <div className="border-t pt-8">
                    <h3 className="text-lg font-semibold text-black mb-6">Bonus Points</h3>
                    
                    <div className="grid md:grid-cols-3 gap-6">
                      {/* Technical Challenge Winner */}
                      <div>
                        <h4 className="text-md font-semibold text-blue-800 mb-3">Technical Challenge Winner</h4>
                        <p className="text-sm text-black mb-3">+1 point for Star Baker picks</p>
                        <div className="space-y-2">
                          {contestants.filter(c => !c.isEliminated).map((contestant) => (
                            <button
                              key={`tech-${contestant.id}`}
                              onClick={() => handleResultChange('technicalChallengeWinnerId', contestant.id)}
                              className={`w-full p-2 rounded-lg border-2 transition-colors text-left ${
                                results.technicalChallengeWinnerId === contestant.id
                                  ? 'border-blue-500 bg-blue-100'
                                  : 'border-gray-200 hover:border-blue-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {contestant.imageUrl && (
                                  <img
                                    src={contestant.imageUrl}
                                    alt={contestant.name}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                )}
                                <span className="text-sm font-medium text-black">{contestant.name}</span>
                                {results.technicalChallengeWinnerId === contestant.id && ' ✓'}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Handshakes */}
                      <div>
                        <h4 className="text-md font-semibold text-yellow-800 mb-3">Paul Hollywood Handshakes</h4>
                        <p className="text-sm text-black mb-3">+1 point each for Star Baker picks</p>
                        <div className="space-y-2">
                          {contestants.filter(c => !c.isEliminated).map((contestant) => {
                            const count = results.handshakes[contestant.id] || 0
                            return (
                              <div key={`handshake-${contestant.id}`} className="flex items-center gap-2 p-2 rounded-lg border-2 border-gray-200">
                                <div className="flex items-center gap-2 flex-1">
                                  {contestant.imageUrl && (
                                    <img
                                      src={contestant.imageUrl}
                                      alt={contestant.name}
                                      className="w-6 h-6 rounded-full object-cover"
                                    />
                                  )}
                                  <span className="text-sm font-medium text-black flex-1">{contestant.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleHandshakeChange(contestant.id, -1)}
                                    disabled={count <= 0}
                                    className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center text-sm font-medium text-black">{count}</span>
                                  <button
                                    onClick={() => handleHandshakeChange(contestant.id, 1)}
                                    className="w-6 h-6 rounded-full bg-yellow-200 hover:bg-yellow-300 flex items-center justify-center text-sm font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Soggy Bottoms */}
                      <div>
                        <h4 className="text-md font-semibold text-red-800 mb-3">Soggy Bottoms</h4>
                        <p className="text-sm text-black mb-3">-1 point each for Star Baker picks</p>
                        <div className="space-y-2">
                          {contestants.filter(c => !c.isEliminated).map((contestant) => {
                            const count = results.soggyBottoms[contestant.id] || 0
                            return (
                              <div key={`soggy-${contestant.id}`} className="flex items-center gap-2 p-2 rounded-lg border-2 border-gray-200">
                                <div className="flex items-center gap-2 flex-1">
                                  {contestant.imageUrl && (
                                    <img
                                      src={contestant.imageUrl}
                                      alt={contestant.name}
                                      className="w-6 h-6 rounded-full object-cover"
                                    />
                                  )}
                                  <span className="text-sm font-medium text-black flex-1">{contestant.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleSoggyBottomChange(contestant.id, -1)}
                                    disabled={count <= 0}
                                    className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center text-sm font-medium text-black">{count}</span>
                                  <button
                                    onClick={() => handleSoggyBottomChange(contestant.id, 1)}
                                    className="w-6 h-6 rounded-full bg-red-200 hover:bg-red-300 flex items-center justify-center text-sm font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-center">
                  <button
                    onClick={saveResults}
                    disabled={!results.starBakerId || !results.eliminatedId}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg transition-colors duration-200"
                  >
                    Save All Results
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
