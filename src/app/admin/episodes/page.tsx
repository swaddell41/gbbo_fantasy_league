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

export default function ManageEpisodes() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [contestants, setContestants] = useState<Contestant[]>([])
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    episodeNumber: 1,
    airDate: '',
    isActive: false
  })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSeason) return

    try {
      const url = editingEpisode ? '/api/admin/episodes' : '/api/admin/episodes'
      const method = editingEpisode ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          seasonId: selectedSeason.id,
          airDate: new Date(formData.airDate).toISOString(),
          ...(editingEpisode && { episodeId: editingEpisode.id })
        })
      })

      if (response.ok) {
        setFormData({ title: '', episodeNumber: 1, airDate: '', isActive: false })
        setShowForm(false)
        setEditingEpisode(null)
        fetchEpisodes(selectedSeason.id)
        alert(`Episode ${editingEpisode ? 'updated' : 'created'} successfully!`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error(`Error ${editingEpisode ? 'updating' : 'creating'} episode:`, error)
      alert(`Error ${editingEpisode ? 'updating' : 'creating'} episode`)
    }
  }

  const startEditing = (episode: Episode) => {
    setEditingEpisode(episode)
    setFormData({
      title: episode.title,
      episodeNumber: episode.episodeNumber,
      airDate: new Date(episode.airDate).toISOString().slice(0, 16), // Format for datetime-local
      isActive: episode.isActive
    })
    setShowForm(true)
  }

  const cancelEdit = () => {
    setEditingEpisode(null)
    setFormData({ title: '', episodeNumber: 1, airDate: '', isActive: false })
    setShowForm(false)
  }

  const deleteEpisode = async (episodeId: string, episodeTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${episodeTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/episodes?episodeId=${episodeId}`, { method: 'DELETE' })
      if (response.ok) {
        fetchEpisodes(selectedSeason!.id)
        alert('Episode deleted successfully')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting episode:', error)
      alert('Error deleting episode')
    }
  }

  const toggleEpisodeActive = async (episodeId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/episodes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId,
          isActive: !currentStatus
        })
      })

      if (response.ok) {
        fetchEpisodes(selectedSeason!.id)
        alert(`Episode ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error toggling episode status:', error)
      alert('Error updating episode status')
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

  const recalculateEliminationStatus = async () => {
    if (!selectedSeason) return

    try {
      const response = await fetch('/api/admin/recalculate-elimination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: selectedSeason.id })
      })

      if (response.ok) {
        fetchContestants(selectedSeason.id)
        alert('Elimination status recalculated successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error recalculating elimination status:', error)
      alert('Error recalculating elimination status')
    }
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

      // Refresh both episodes and contestants to reflect updated elimination status
      fetchEpisodes(selectedSeason!.id)
      fetchContestants(selectedSeason!.id)
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
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Episode Management</h1>
          <p className="text-gray-600 mt-2">Create, manage episodes, and set results for each season</p>
        </div>

        {/* Season Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Select Season</h2>
            {selectedSeason && (
              <button
                onClick={recalculateEliminationStatus}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Recalculate Elimination Status
              </button>
            )}
          </div>
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
                <h3 className="font-semibold">{season.name}</h3>
                <p className="text-sm text-gray-600">Year: {season.year}</p>
                <p className={`text-sm ${season.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                  {season.isActive ? 'Active' : 'Inactive'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {selectedSeason && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Episodes List */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Episodes for {selectedSeason.name}</h2>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  {showForm ? 'Cancel' : 'Add Episode'}
                </button>
              </div>

              {episodes.length === 0 ? (
                <p className="text-gray-500">No episodes created yet</p>
              ) : (
                <div className="space-y-3">
                  {episodes.map((episode) => (
                    <div key={episode.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-black">Episode {episode.episodeNumber}: {episode.title}</h3>
                          <p className="text-sm text-black">
                            Air Date: {new Date(episode.airDate).toLocaleDateString()}
                          </p>
                          <p className={`text-sm ${episode.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                            {episode.isActive ? 'Active' : 'Inactive'}
                          </p>
                          <p className="text-xs text-black mt-1">
                            {episode.isCompleted ? '✅ Completed' : '⏳ Pending'}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setSelectedEpisode(episode)
                              setShowResults(true)
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors duration-200"
                          >
                            Results
                          </button>
                          <button
                            onClick={() => startEditing(episode)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors duration-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleEpisodeActive(episode.id, episode.isActive)}
                            className={`px-3 py-1 rounded text-xs transition-colors duration-200 ${
                              episode.isActive 
                                ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {episode.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => deleteEpisode(episode.id, episode.title)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors duration-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - Episode Form or Results */}
            <div className="bg-white rounded-lg shadow p-6">
              {showResults && selectedEpisode ? (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-black">
                      Results for Episode {selectedEpisode.episodeNumber}: {selectedEpisode.title}
                    </h2>
                    <button
                      onClick={() => setShowResults(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Star Baker Selection */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-black mb-3">Star Baker</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {contestants
                        .sort((a, b) => {
                          // Sort eliminated contestants to the bottom
                          if (a.isEliminated && !b.isEliminated) return 1
                          if (!a.isEliminated && b.isEliminated) return -1
                          return 0
                        })
                        .map((contestant) => {
                        const isEliminated = contestant.isEliminated
                        const isSelected = results.starBakerId === contestant.id
                        return (
                          <button
                            key={`star-${contestant.id}`}
                            onClick={() => !isEliminated && handleResultChange('starBakerId', contestant.id)}
                            disabled={isEliminated}
                            className={`p-2 rounded-lg border-2 transition-colors text-left ${
                              isSelected
                                ? 'border-yellow-500 bg-yellow-100'
                                : isEliminated
                                ? 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                                : 'border-gray-200 hover:border-yellow-300'
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
                              <span className="font-medium text-black">
                                {contestant.name}
                                {isEliminated && ' (Eliminated)'}
                                {isSelected && ' ✓'}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Elimination Selection */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-black mb-3">Elimination</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {contestants
                        .sort((a, b) => {
                          // Sort eliminated contestants to the bottom
                          if (a.isEliminated && !b.isEliminated) return 1
                          if (!a.isEliminated && b.isEliminated) return -1
                          return 0
                        })
                        .map((contestant) => {
                        const isEliminated = contestant.isEliminated
                        const isSelected = results.eliminatedId === contestant.id
                        return (
                          <button
                            key={`elim-${contestant.id}`}
                            onClick={() => !isEliminated && handleResultChange('eliminatedId', contestant.id)}
                            disabled={isEliminated}
                            className={`p-2 rounded-lg border-2 transition-colors text-left ${
                              isSelected
                                ? 'border-red-500 bg-red-100'
                                : isEliminated
                                ? 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                                : 'border-gray-200 hover:border-red-300'
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
                              <span className="font-medium text-black">
                                {contestant.name}
                                {isEliminated && ' (Eliminated)'}
                                {isSelected && ' ✓'}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Technical Challenge Winner */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-blue-800 mb-3">Technical Challenge Winner</h4>
                    <p className="text-sm text-black mb-3">+1 point for Star Baker picks</p>
                    <div className="space-y-2">
                      {contestants
                        .sort((a, b) => {
                          // Sort eliminated contestants to the bottom
                          if (a.isEliminated && !b.isEliminated) return 1
                          if (!a.isEliminated && b.isEliminated) return -1
                          return 0
                        })
                        .map((contestant) => {
                        const isEliminated = contestant.isEliminated
                        const isSelected = results.technicalChallengeWinnerId === contestant.id
                        return (
                          <button
                            key={`tech-${contestant.id}`}
                            onClick={() => !isEliminated && handleResultChange('technicalChallengeWinnerId', contestant.id)}
                            disabled={isEliminated}
                            className={`w-full p-2 rounded-lg border-2 transition-colors text-left ${
                              isSelected
                                ? 'border-blue-500 bg-blue-100'
                                : isEliminated
                                ? 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
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
                              <span className="text-sm font-medium text-black">
                                {contestant.name}
                                {isEliminated && ' (Eliminated)'}
                                {isSelected && ' ✓'}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Handshakes */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-black mb-3">Handshakes</h3>
                    <p className="text-sm text-black mb-3">+1 point for Star Baker picks</p>
                    <div className="space-y-2">
                      {contestants
                        .sort((a, b) => {
                          // Sort eliminated contestants to the bottom
                          if (a.isEliminated && !b.isEliminated) return 1
                          if (!a.isEliminated && b.isEliminated) return -1
                          return 0
                        })
                        .map((contestant) => {
                        const isEliminated = contestant.isEliminated
                        const count = results.handshakes[contestant.id] || 0
                        return (
                          <div key={`handshake-${contestant.id}`} className={`flex items-center gap-2 p-2 border rounded-lg ${
                            isEliminated ? 'opacity-60' : ''
                          }`}>
                            {contestant.imageUrl && (
                              <img
                                src={contestant.imageUrl}
                                alt={contestant.name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            )}
                            <span className="text-sm font-medium text-black flex-1">
                              {contestant.name}
                              {isEliminated && ' (Eliminated)'}
                            </span>
                            <button
                              onClick={() => !isEliminated && handleHandshakeChange(contestant.id, -1)}
                              disabled={isEliminated}
                              className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white w-6 h-6 rounded-full text-sm"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-black">{count}</span>
                            <button
                              onClick={() => !isEliminated && handleHandshakeChange(contestant.id, 1)}
                              disabled={isEliminated}
                              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white w-6 h-6 rounded-full text-sm"
                            >
                              +
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Soggy Bottoms */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-black mb-3">Soggy Bottoms</h3>
                    <p className="text-sm text-black mb-3">-1 point for Star Baker picks</p>
                    <div className="space-y-2">
                      {contestants
                        .sort((a, b) => {
                          // Sort eliminated contestants to the bottom
                          if (a.isEliminated && !b.isEliminated) return 1
                          if (!a.isEliminated && b.isEliminated) return -1
                          return 0
                        })
                        .map((contestant) => {
                        const isEliminated = contestant.isEliminated
                        const count = results.soggyBottoms[contestant.id] || 0
                        return (
                          <div key={`soggy-${contestant.id}`} className={`flex items-center gap-2 p-2 border rounded-lg ${
                            isEliminated ? 'opacity-60' : ''
                          }`}>
                            {contestant.imageUrl && (
                              <img
                                src={contestant.imageUrl}
                                alt={contestant.name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            )}
                            <span className="text-sm font-medium text-black flex-1">
                              {contestant.name}
                              {isEliminated && ' (Eliminated)'}
                            </span>
                            <button
                              onClick={() => !isEliminated && handleSoggyBottomChange(contestant.id, -1)}
                              disabled={isEliminated}
                              className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white w-6 h-6 rounded-full text-sm"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-black">{count}</span>
                            <button
                              onClick={() => !isEliminated && handleSoggyBottomChange(contestant.id, 1)}
                              disabled={isEliminated}
                              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white w-6 h-6 rounded-full text-sm"
                            >
                              +
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <button
                    onClick={saveResults}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors duration-200"
                  >
                    Save All Results
                  </button>
                </div>
              ) : showForm ? (
                <div>
                  <h2 className="text-xl font-semibold mb-4">
                    {editingEpisode ? 'Edit Episode' : 'Add New Episode'}
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Episode Title
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Episode Number
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.episodeNumber}
                        onChange={(e) => setFormData({ ...formData, episodeNumber: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Air Date
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.airDate}
                        onChange={(e) => setFormData({ ...formData, airDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        required
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                        Active (users can make picks for this episode)
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                      >
                        {editingEpisode ? 'Update Episode' : 'Create Episode'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>Select an episode to manage results, or add a new episode</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}