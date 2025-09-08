'use client'

import { useState, useEffect } from 'react'

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
  isActive: boolean
  starBakerId?: string
  eliminatedId?: string
}

interface StarBakerCount {
  contestantId: string
  contestantName: string
  count: number
  remaining: number
}

interface WeeklyPicksProps {
  contestants: Contestant[]
  selectedEpisode: Episode | null
  seasonId: string
  onSubmit: (starBakerId: string, eliminationId: string) => Promise<void>
}

export default function WeeklyPicks({ contestants, selectedEpisode, seasonId, onSubmit }: WeeklyPicksProps) {
  const [starBakerId, setStarBakerId] = useState<string | null>(null)
  const [eliminationId, setEliminationId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [starBakerCounts, setStarBakerCounts] = useState<StarBakerCount[]>([])
  const [loadingCounts, setLoadingCounts] = useState(false)

  // Reset picks when episode changes
  useEffect(() => {
    setStarBakerId(null)
    setEliminationId(null)
  }, [selectedEpisode?.id])

  // Fetch Star Baker counts when season changes
  useEffect(() => {
    if (seasonId) {
      fetchStarBakerCounts()
    }
  }, [seasonId])

  const fetchStarBakerCounts = async () => {
    setLoadingCounts(true)
    try {
      const response = await fetch(`/api/user/star-baker-counts?seasonId=${seasonId}`)
      if (response.ok) {
        const data = await response.json()
        setStarBakerCounts(data.counts)
      }
    } catch (error) {
      console.error('Error fetching star baker counts:', error)
    } finally {
      setLoadingCounts(false)
    }
  }

  const getStarBakerCount = (contestantId: string): StarBakerCount | null => {
    return starBakerCounts.find(c => c.contestantId === contestantId) || null
  }

  const handleStarBakerClick = (contestantId: string) => {
    console.log('Star Baker clicked:', contestantId)
    
    // Check if already selected (deselect)
    if (starBakerId === contestantId) {
      setStarBakerId(null)
      return
    }

    // Check if user can still pick this contestant
    const count = getStarBakerCount(contestantId)
    if (count && count.remaining <= 0) {
      alert(`You've already picked ${count.contestantName} as Star Baker twice this season!`)
      return
    }

    setStarBakerId(contestantId)
  }

  const handleEliminationClick = (contestantId: string) => {
    console.log('Elimination clicked:', contestantId)
    setEliminationId(eliminationId === contestantId ? null : contestantId)
  }

  const handleSubmit = async () => {
    if (!starBakerId || !eliminationId) {
      alert('Please select both Star Baker and Elimination picks')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(starBakerId, eliminationId)
      alert('Picks saved successfully!')
    } catch (error) {
      console.error('Error saving picks:', error)
      alert('Error saving picks')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!selectedEpisode) {
    return (
      <div className="bg-green-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-green-800 mb-4">Weekly Picks</h3>
        <p className="text-green-700">Please select an episode to make your picks.</p>
      </div>
    )
  }

  return (
    <div className="bg-green-50 p-6 rounded-lg mb-6">
      <h3 className="text-lg font-semibold text-green-800 mb-4">Weekly Picks</h3>
      <p className="text-green-700 mb-4">
        Make your weekly picks for Star Baker and Elimination for {selectedEpisode.title}.
      </p>

      {/* Debug Display */}
      <div className="mb-4 p-3 bg-blue-100 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Debug:</strong> Star Baker: {starBakerId || 'None'} | Elimination: {eliminationId || 'None'}
        </p>
      </div>

      {/* Star Baker Section */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-green-800 mb-3">
          Star Baker Pick
          <span className="text-sm font-normal text-green-600 ml-2">
            (Max 2 picks per contestant this season)
          </span>
        </h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {contestants.map((contestant) => {
            const isSelected = starBakerId === contestant.id
            const isStarBaker = selectedEpisode.starBakerId === contestant.id
            const isEliminated = contestant.isEliminated
            const count = getStarBakerCount(contestant.id)
            const canPick = !count || count.remaining > 0

            return (
              <button
                key={`star-${contestant.id}`}
                onClick={() => handleStarBakerClick(contestant.id)}
                disabled={isEliminated || !selectedEpisode.isActive || !canPick}
                className={`p-3 rounded-lg border-2 transition-colors duration-200 text-left ${
                  isSelected
                    ? 'border-green-500 bg-green-100'
                    : isStarBaker
                    ? 'border-yellow-500 bg-yellow-100'
                    : isEliminated
                    ? 'border-gray-300 bg-gray-100 opacity-60'
                    : !canPick
                    ? 'border-red-300 bg-red-50 opacity-60'
                    : selectedEpisode.isActive
                    ? 'border-green-200 bg-white hover:border-green-300 hover:bg-green-50'
                    : 'border-gray-300 bg-gray-100 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {contestant.imageUrl && (
                      <img
                        src={contestant.imageUrl}
                        alt={contestant.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <span className="font-medium text-green-800">
                      {contestant.name}
                      {isStarBaker && ' (⭐ Star Baker)'}
                      {isEliminated && ' (Eliminated)'}
                      {isSelected && ' ✓'}
                    </span>
                  </div>
                  {count && (
                    <div className="text-xs text-gray-600">
                      <div className="text-center">
                        <div className="font-semibold">
                          {count.remaining}/{2}
                        </div>
                        <div className="text-xs">
                          {count.remaining === 0 ? 'Maxed' : 'left'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        {loadingCounts && (
          <div className="text-center text-sm text-gray-600 mt-2">
            Loading pick counts...
          </div>
        )}
      </div>

      {/* Elimination Section */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-red-800 mb-3">Elimination Pick</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {contestants.map((contestant) => {
            const isSelected = eliminationId === contestant.id
            const isEliminated = selectedEpisode.eliminatedId === contestant.id
            const isEliminatedContestant = contestant.isEliminated

            return (
              <button
                key={`elim-${contestant.id}`}
                onClick={() => handleEliminationClick(contestant.id)}
                disabled={isEliminatedContestant || !selectedEpisode.isActive}
                className={`p-3 rounded-lg border-2 transition-colors duration-200 text-left ${
                  isSelected
                    ? 'border-red-500 bg-red-100'
                    : isEliminated
                    ? 'border-orange-500 bg-orange-100'
                    : isEliminatedContestant
                    ? 'border-gray-300 bg-gray-100 opacity-60'
                    : selectedEpisode.isActive
                    ? 'border-red-200 bg-white hover:border-red-300 hover:bg-red-50'
                    : 'border-gray-300 bg-gray-100 opacity-60'
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
                  <span className="font-medium text-red-800">
                    {contestant.name}
                    {isEliminated && ' (❌ Eliminated)'}
                    {isEliminatedContestant && ' (Eliminated)'}
                    {isSelected && ' ✓'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={!starBakerId || !eliminationId || !selectedEpisode.isActive || isSubmitting}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors duration-200"
        >
          {isSubmitting 
            ? 'Saving...' 
            : selectedEpisode.isActive 
            ? 'Save Weekly Picks' 
            : 'Episode Not Active Yet'
          }
        </button>
      </div>

      {!selectedEpisode.isActive && (
        <div className="text-center mt-4">
          <p className="text-green-600">This episode is not active yet. Picks will be available when the episode airs.</p>
        </div>
      )}
    </div>
  )
}
