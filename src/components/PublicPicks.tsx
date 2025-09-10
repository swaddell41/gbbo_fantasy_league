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
        {allUsersSubmitted && episodeId && (
          <button
            onClick={() => sendWhatsAppNotification()}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200"
          >
            📱 Send to WhatsApp
          </button>
        )}
      </div>

      <div className="space-y-6">
        {picks.map((userPicks) => (
          <div key={userPicks.user.id} className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3">{userPicks.user.name}</h4>
            
            {/* Finalist Picks */}
            {showFinalists && userPicks.finalistPicks.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-blue-600 mb-2">Finalist Picks</h5>
                <div className="flex flex-wrap gap-2">
                  {userPicks.finalistPicks.map((pick) => (
                    <div key={pick.id} className="bg-blue-50 px-3 py-2 rounded-lg flex items-center gap-2">
                      {pick.contestant.imageUrl && (
                        <img
                          src={pick.contestant.imageUrl}
                          alt={pick.contestant.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      )}
                      <span className="text-sm font-medium text-blue-800">
                        {pick.contestant.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Picks */}
            {showWeekly && userPicks.weeklyPicks.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-green-600 mb-2">Weekly Picks</h5>
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
          </div>
        ))}
      </div>
    </div>
  )

  async function sendWhatsAppNotification() {
    if (!episodeId) return
    
    try {
      const response = await fetch('/api/whatsapp/notify-picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId,
          seasonId
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        alert('WhatsApp notification sent!')
        console.log('WhatsApp message:', data.formattedMessage)
      } else {
        alert('Error sending WhatsApp notification')
      }
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error)
      alert('Error sending WhatsApp notification')
    }
  }
}
