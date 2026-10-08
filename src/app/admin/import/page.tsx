'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
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

    if (!session || !session.user || !session.user.canAdmin) {
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
          source: 'gbbo-2026'
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
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose mx-auto"></div>
          <p className="mt-4 text-ink-muted">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-card rounded-2xl p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="font-display font-normal text-[40px] md:text-[48px] leading-none text-ink">Contestant Management</h1>
              <p className="text-ink-muted mt-2">Import contestants from the official GBBO website or manage them manually</p>
            </div>
            <Link
              href="/admin"
              className="bg-oat text-ink font-bold hover:bg-line px-4 py-2 rounded-full transition-colors duration-200"
            >
              Back to Admin
            </Link>
          </div>

          {!selectedSeason ? (
            <div className="text-center py-8">
              <h3 className="font-display font-normal text-2xl text-ink mb-4">Select a Season</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {seasons.map((season) => (
                  <button
                    key={season.id}
                    onClick={() => setSelectedSeason(season)}
                    className="bg-oat hover:bg-oat p-6 rounded-2xl border border-line transition-colors duration-200 text-left"
                  >
                    <h4 className="text-lg font-semibold text-ink">{season.name}</h4>
                    <p className="text-ink">Year: {season.year}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="bg-oat p-4 rounded-2xl mb-6">
                <h3 className="font-display font-normal text-2xl text-ink">
                  Managing contestants for: {selectedSeason.name} ({selectedSeason.year})
                </h3>
                <button
                  onClick={() => setSelectedSeason(null)}
                  className="text-rose-deep hover:text-rose-dark text-sm mt-2"
                >
                  ← Change Season
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-oat p-6 rounded-2xl">
                  <h3 className="font-display font-normal text-2xl text-ink mb-2">GBBO 2026 Contestants</h3>
                  <p className="text-ink mb-4">
                    This will import all 12 contestants from the official GBBO website with their photos and bios.
                  </p>
                  <button
                    onClick={importContestants}
                    disabled={importing}
                    className="bg-ink text-cream font-bold hover:bg-[#3d342e] px-6 py-3 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? 'Importing...' : 'Import GBBO 2026 Contestants'}
                  </button>
                </div>

                {/* Contestant Management Section */}
                <div className="bg-card border border-input rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-display font-normal text-2xl text-ink">
                      Current Contestants ({contestants.length})
                    </h3>
                    <div className="flex gap-2">
                      {contestants.length > 0 && (
                        <button
                          onClick={deleteAllContestants}
                          className="bg-rose-deep text-cream font-bold hover:bg-rose-dark px-4 py-2 rounded-full transition-colors duration-200"
                        >
                          Delete All
                        </button>
                      )}
                      <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-ink text-cream font-bold hover:bg-[#3d342e] px-4 py-2 rounded-full transition-colors duration-200"
                      >
                        {showForm ? 'Cancel' : 'Add Contestant'}
                      </button>
                    </div>
                  </div>

                  {showForm && (
                    <div className="bg-oat p-6 rounded-2xl mb-6">
                      <h4 className="text-lg font-semibold text-ink mb-4">Add New Contestant</h4>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-ink-muted">
                            Contestant Name
                          </label>
                          <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-rose focus:border-rose text-ink"
                            placeholder="e.g., Paul Hollywood"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="imageUrl" className="block text-sm font-medium text-ink-muted">
                            Image URL (optional)
                          </label>
                          <input
                            type="url"
                            id="imageUrl"
                            value={formData.imageUrl}
                            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-rose focus:border-rose text-ink"
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                        <div>
                          <label htmlFor="bio" className="block text-sm font-medium text-ink-muted">
                            Bio (optional)
                          </label>
                          <textarea
                            id="bio"
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            rows={3}
                            className="mt-1 block w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-rose focus:border-rose text-ink"
                            placeholder="Tell us about this contestant..."
                          />
                        </div>
                        <button
                          type="submit"
                          className="bg-ink text-cream font-bold hover:bg-[#3d342e] px-6 py-2 rounded-full transition-colors duration-200"
                        >
                          Add Contestant
                        </button>
                      </form>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contestants.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-ink-faint">
                        No contestants added yet. Import from GBBO or add manually above!
                      </div>
                    ) : (
                      contestants.map((contestant) => (
                        <div
                          key={contestant.id}
                          className="bg-card border border-input rounded-2xl p-6 hover: transition- duration-200"
                        >
                          <div className="text-center">
                            {contestant.imageUrl ? (
                              <img
                                src={contestant.imageUrl}
                                alt={contestant.name}
                                className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                              />
                            ) : (
                              <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-line flex items-center justify-center">
                                <span className="text-2xl">👨‍🍳</span>
                              </div>
                            )}
                            <h4 className="text-lg font-semibold text-ink">{contestant.name}</h4>
                            {contestant.bio && (
                              <p className="text-sm text-ink-muted mt-2">{contestant.bio}</p>
                            )}
                            <div className="mt-4">
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  contestant.isEliminated
                                    ? 'bg-oat text-rose-deep'
                                    : 'bg-oat text-positive'
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
                  <div className="bg-oat p-6 rounded-2xl">
                    <h3 className="font-display font-normal text-2xl text-positive mb-4">
                      Successfully Imported ({importedContestants.length} contestants)
                    </h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {importedContestants.map((contestant, index) => (
                        <div key={index} className="bg-card p-4 rounded-2xl border border-line">
                          <div className="text-center">
                            {contestant.imageUrl && (
                              <img
                                src={contestant.imageUrl}
                                alt={contestant.name}
                                className="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
                              />
                            )}
                            <h4 className="font-semibold text-ink">{contestant.name}</h4>
                            <p className="text-sm text-ink-muted mt-1 line-clamp-2">
                              {contestant.bio.substring(0, 100)}...
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-center">
                      <Link
                        href={`/admin/contestants?seasonId=${selectedSeason.id}`}
                        className="bg-ink text-cream font-bold hover:bg-[#3d342e] px-6 py-2 rounded-full transition-colors duration-200"
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
