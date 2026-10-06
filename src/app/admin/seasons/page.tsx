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
  createdAt: string
}

export default function ManageSeasons() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear()
  })

  useEffect(() => {
    if (status === 'loading') return

    if (!session || !session.user || !session.user.canAdmin) {
      router.push('/auth/signin')
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
      }
    } catch (error) {
      console.error('Error fetching seasons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/admin/seasons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setFormData({ name: '', year: new Date().getFullYear() })
        setShowForm(false)
        fetchSeasons()
      }
    } catch (error) {
      console.error('Error creating season:', error)
    }
  }

  const deleteSeason = async (seasonId: string, seasonName: string) => {
    if (!confirm(`Are you sure you want to delete "${seasonName}" and ALL its contestants? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/seasons?seasonId=${seasonId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchSeasons()
        alert('Season and all contestants deleted successfully')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting season:', error)
      alert('Error deleting season')
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
              <h1 className="font-display font-normal text-[40px] md:text-[48px] leading-none text-ink">Manage Seasons</h1>
              <p className="text-ink-muted mt-2">Create and manage GBBO seasons</p>
            </div>
            <div className="space-x-4">
              <Link
                href="/admin"
                className="bg-oat text-ink font-bold hover:bg-line px-4 py-2 rounded-full transition-colors duration-200"
              >
                Back to Admin
              </Link>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-ink text-cream font-bold hover:bg-[#3d342e] px-4 py-2 rounded-full transition-colors duration-200"
              >
                {showForm ? 'Cancel' : 'Add Season'}
              </button>
            </div>
          </div>

          {showForm && (
            <div className="bg-oat p-6 rounded-2xl mb-8">
              <h3 className="font-display font-normal text-2xl text-ink mb-4">Create New Season</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-ink-muted">
                    Season Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-rose focus:border-rose text-ink"
                    placeholder="e.g., Season 14"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-ink-muted">
                    Year
                  </label>
                  <input
                    type="number"
                    id="year"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="mt-1 block w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-rose focus:border-rose text-ink"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="bg-ink text-cream font-bold hover:bg-[#3d342e] px-6 py-2 rounded-full transition-colors duration-200"
                >
                  Create Season
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {seasons.length === 0 ? (
              <div className="text-center py-8 text-ink-faint">
                No seasons created yet. Add your first season above!
              </div>
            ) : (
              seasons.map((season) => (
                <div
                  key={season.id}
                  className="bg-card border border-input rounded-2xl p-6 hover: transition- duration-200"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-display font-normal text-2xl text-ink">{season.name}</h3>
                      <p className="text-ink-muted">Year: {season.year}</p>
                      <p className="text-sm text-ink-faint">
                        Created: {new Date(season.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          season.isActive
                            ? 'bg-oat text-positive'
                            : 'bg-oat text-ink'
                        }`}
                      >
                        {season.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <Link
                        href={`/admin/contestants?seasonId=${season.id}`}
                        className="bg-ink text-cream font-bold hover:bg-[#3d342e] px-4 py-2 rounded-full text-sm transition-colors duration-200"
                      >
                        Manage Contestants
                      </Link>
                      <button
                        onClick={() => deleteSeason(season.id, season.name)}
                        className="bg-rose-deep text-cream font-bold hover:bg-rose-dark px-4 py-2 rounded-full text-sm transition-colors duration-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
