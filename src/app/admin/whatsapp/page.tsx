'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

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

export default function WhatsAppSharing() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null)
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [whatsappMessage, setWhatsappMessage] = useState<string>('')
  const [showMessage, setShowMessage] = useState(false)

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

    if (!session.user.isAdmin) {
      router.push('/dashboard')
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
        
        // Find the active season
        const activeSeason = data.find((season: Season) => season.isActive)
        if (activeSeason) {
          setSelectedSeason(activeSeason)
          fetchEpisodes(activeSeason.id)
        }
      }
    } catch (error) {
      console.error('Error fetching seasons:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEpisodes = async (seasonId: string) => {
    try {
      const response = await fetch(`/api/episodes?seasonId=${seasonId}`)
      if (response.ok) {
        const data = await response.json()
        setEpisodes(data)
        
        // Find the active episode
        const activeEpisode = data.find((ep: Episode) => ep.isActive)
        if (activeEpisode) {
          setSelectedEpisode(activeEpisode)
        }
      }
    } catch (error) {
      console.error('Error fetching episodes:', error)
    }
  }

  const generateWhatsAppMessage = async () => {
    if (!selectedEpisode || !selectedSeason) return

    setGenerating(true)
    try {
      const response = await fetch('/api/whatsapp/notify-picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId: selectedEpisode.id,
          seasonId: selectedSeason.id
        })
      })

      if (response.ok) {
        const data = await response.json()
        setWhatsappMessage(data.formattedMessage)
        setShowMessage(true)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error generating WhatsApp message:', error)
      alert('Error generating WhatsApp message')
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage)
      alert('Message copied to clipboard! You can now paste it into your WhatsApp group.')
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      alert('Error copying to clipboard. Please select and copy the text manually.')
    }
  }

  const openWhatsApp = () => {
    const encodedMessage = encodeURIComponent(whatsappMessage)
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank')
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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📱 WhatsApp Sharing
              </h1>
              <p className="text-gray-600">Generate and share picks with your WhatsApp group</p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/admin"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Back to Admin
              </Link>
              <button
                onClick={() => signOut()}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Season and Episode Selection */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Season
                </label>
                <select
                  value={selectedSeason?.id || ''}
                  onChange={(e) => {
                    const season = seasons.find(s => s.id === e.target.value)
                    setSelectedSeason(season || null)
                    if (season) {
                      fetchEpisodes(season.id)
                    }
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select a season</option>
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name} ({season.year})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Episode
                </label>
                <select
                  value={selectedEpisode?.id || ''}
                  onChange={(e) => {
                    const episode = episodes.find(ep => ep.id === e.target.value)
                    setSelectedEpisode(episode || null)
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  disabled={!selectedSeason}
                >
                  <option value="">Select an episode</option>
                  {episodes.map((episode) => (
                    <option key={episode.id} value={episode.id}>
                      Episode {episode.episodeNumber}: {episode.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">How it works:</h3>
                <ol className="text-sm text-blue-700 space-y-1">
                  <li>1. Select the season and episode</li>
                  <li>2. Click "Generate WhatsApp Message"</li>
                  <li>3. Copy the message or open WhatsApp</li>
                  <li>4. Paste into your group chat</li>
                </ol>
              </div>

              <button
                onClick={generateWhatsAppMessage}
                disabled={!selectedEpisode || generating}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors duration-200 font-semibold"
              >
                {generating ? 'Generating...' : 'Generate WhatsApp Message'}
              </button>
            </div>

            {/* Message Display */}
            <div>
              {showMessage && whatsappMessage && (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2">Generated Message:</h3>
                    <div className="bg-white p-4 rounded border border-green-200">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                        {whatsappMessage}
                      </pre>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={copyToClipboard}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-semibold"
                    >
                      📋 Copy to Clipboard
                    </button>
                    <button
                      onClick={openWhatsApp}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-semibold"
                    >
                      📱 Open WhatsApp
                    </button>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-amber-800 mb-2">Instructions:</h4>
                    <p className="text-sm text-amber-700">
                      After copying or opening WhatsApp, paste the message into your group chat. 
                      The message includes all players' picks for the selected episode.
                    </p>
                  </div>
                </div>
              )}

              {!showMessage && (
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <div className="text-4xl mb-4">📱</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Ready to Share</h3>
                  <p className="text-gray-600">
                    Select a season and episode, then generate a WhatsApp message to share with your group.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
