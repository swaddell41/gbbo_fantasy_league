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

    if (!session || !session.user || !session.user.isAdmin) {
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
              <h1 className="text-3xl font-bold text-gray-900">Manage Seasons</h1>
              <p className="text-gray-600 mt-2">Create and manage GBBO seasons</p>
            </div>
            <div className="space-x-4">
              <Link
                href="/admin"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Back to Admin
              </Link>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                {showForm ? 'Cancel' : 'Add Season'}
              </button>
            </div>
          </div>

          {showForm && (
            <div className="bg-gray-50 p-6 rounded-lg mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Season</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Season Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 text-gray-900"
                    placeholder="e.g., Season 14"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                    Year
                  </label>
                  <input
                    type="number"
                    id="year"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 text-gray-900"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
                >
                  Create Season
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {seasons.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No seasons created yet. Add your first season above!
              </div>
            ) : (
              seasons.map((season) => (
                <div
                  key={season.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{season.name}</h3>
                      <p className="text-gray-600">Year: {season.year}</p>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(season.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          season.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {season.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <Link
                        href={`/admin/contestants?seasonId=${season.id}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200"
                      >
                        Manage Contestants
                      </Link>
                      <button
                        onClick={() => deleteSeason(season.id, season.name)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200"
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
