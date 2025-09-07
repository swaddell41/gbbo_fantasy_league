'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Season {
  id: string
  name: string
  year: number
}

interface Contestant {
  id: string
  name: string
  imageUrl?: string
  bio?: string
  isEliminated: boolean
  createdAt: string
}

interface ContestantData {
  name: string
  bio: string
  imageUrl?: string
}

function ImportContestantsContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null)
  const [importing, setImporting] = useState(false)
  const [importedContestants, setImportedContestants] = useState<ContestantData[]>([])
  const [contestants, setContestants] = useState<Contestant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    imageUrl: '',
    bio: ''
  })

  useEffect(() => {
    if (status === 'loading') return

    if (!session || !session.user || !session.user.isAdmin) {
      router.push('/auth/signin')
      return
    }

    fetchSeasons()
  }, [session, status, router])

  useEffect(() => {
    if (selectedSeason) {
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
    } finally {
      setLoading(false)
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

  const importContestants = async () => {
    if (!selectedSeason) return

    setImporting(true)
    try {
      const response = await fetch('/api/admin/import-contestants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seasonId: selectedSeason.id,
          source: 'gbbo-2025'
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setImportedContestants(data.contestants)
        fetchContestants(selectedSeason.id) // Refresh the contestants list
        alert(`Successfully imported ${data.contestants.length} contestants!`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error importing contestants:', error)
      alert('Error importing contestants')
    } finally {
      setImporting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSeason) return

    try {
      const response = await fetch('/api/admin/contestants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          seasonId: selectedSeason.id
        }),
      })

      if (response.ok) {
        setFormData({ name: '', imageUrl: '', bio: '' })
        setShowForm(false)
        fetchContestants(selectedSeason.id)
      }
    } catch (error) {
      console.error('Error creating contestant:', error)
    }
  }

  const deleteAllContestants = async () => {
    if (!selectedSeason) return
    
    if (!confirm(`Are you sure you want to delete ALL contestants for ${selectedSeason.name}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/contestants?seasonId=${selectedSeason.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchContestants(selectedSeason.id)
        alert('All contestants deleted successfully')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting contestants:', error)
      alert('Error deleting contestants')
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
              <h1 className="text-3xl font-bold text-gray-900">Contestant Management</h1>
              <p className="text-gray-600 mt-2">Import contestants from the official GBBO website or manage them manually</p>
            </div>
            <Link
              href="/admin"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              Back to Admin
            </Link>
          </div>

          {!selectedSeason ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Select a Season</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {seasons.map((season) => (
                  <button
                    key={season.id}
                    onClick={() => setSelectedSeason(season)}
                    className="bg-amber-50 hover:bg-amber-100 p-6 rounded-lg border border-amber-200 transition-colors duration-200 text-left"
                  >
                    <h4 className="text-lg font-semibold text-amber-800">{season.name}</h4>
                    <p className="text-amber-700">Year: {season.year}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="bg-amber-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-amber-800">
                  Managing contestants for: {selectedSeason.name} ({selectedSeason.year})
                </h3>
                <button
                  onClick={() => setSelectedSeason(null)}
                  className="text-amber-600 hover:text-amber-700 text-sm mt-2"
                >
                  ← Change Season
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">GBBO 2025 Contestants</h3>
                  <p className="text-blue-700 mb-4">
                    This will import all 12 contestants from the official GBBO website with their photos and bios.
                  </p>
                  <button
                    onClick={importContestants}
                    disabled={importing}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? 'Importing...' : 'Import GBBO 2025 Contestants'}
                  </button>
                </div>

                {/* Contestant Management Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Current Contestants ({contestants.length})
                    </h3>
                    <div className="flex gap-2">
                      {contestants.length > 0 && (
                        <button
                          onClick={deleteAllContestants}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                        >
                          Delete All
                        </button>
                      )}
                      <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                      >
                        {showForm ? 'Cancel' : 'Add Contestant'}
                      </button>
                    </div>
                  </div>

                  {showForm && (
                    <div className="bg-gray-50 p-6 rounded-lg mb-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Add New Contestant</h4>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Contestant Name
                          </label>
                          <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 text-gray-900"
                            placeholder="e.g., Paul Hollywood"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
                            Image URL (optional)
                          </label>
                          <input
                            type="url"
                            id="imageUrl"
                            value={formData.imageUrl}
                            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 text-gray-900"
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                        <div>
                          <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                            Bio (optional)
                          </label>
                          <textarea
                            id="bio"
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            rows={3}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 text-gray-900"
                            placeholder="Tell us about this contestant..."
                          />
                        </div>
                        <button
                          type="submit"
                          className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                        >
                          Add Contestant
                        </button>
                      </form>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contestants.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-gray-500">
                        No contestants added yet. Import from GBBO or add manually above!
                      </div>
                    ) : (
                      contestants.map((contestant) => (
                        <div
                          key={contestant.id}
                          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
                        >
                          <div className="text-center">
                            {contestant.imageUrl ? (
                              <img
                                src={contestant.imageUrl}
                                alt={contestant.name}
                                className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                              />
                            ) : (
                              <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gray-200 flex items-center justify-center">
                                <span className="text-2xl">👨‍🍳</span>
                              </div>
                            )}
                            <h4 className="text-lg font-semibold text-gray-900">{contestant.name}</h4>
                            {contestant.bio && (
                              <p className="text-sm text-gray-600 mt-2">{contestant.bio}</p>
                            )}
                            <div className="mt-4">
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  contestant.isEliminated
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {contestant.isEliminated ? 'Eliminated' : 'Active'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {importedContestants.length > 0 && (
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-800 mb-4">
                      Successfully Imported ({importedContestants.length} contestants)
                    </h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {importedContestants.map((contestant, index) => (
                        <div key={index} className="bg-white p-4 rounded-lg border border-green-200">
                          <div className="text-center">
                            {contestant.imageUrl && (
                              <img
                                src={contestant.imageUrl}
                                alt={contestant.name}
                                className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
                              />
                            )}
                            <h4 className="font-semibold text-gray-900">{contestant.name}</h4>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {contestant.bio.substring(0, 100)}...
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-center">
                      <Link
                        href={`/admin/contestants?seasonId=${selectedSeason.id}`}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                      >
                        View All Contestants
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ImportContestants() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ImportContestantsContent />
    </Suspense>
  )
}
