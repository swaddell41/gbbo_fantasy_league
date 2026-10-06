'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
  createdAt: string
}

function UserManagementContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [resetUser, setResetUser] = useState<User | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session || !session.user || !session.user.canAdmin) {
      router.push('/auth/signin')
      return
    }

    fetchUsers()
  }, [session, status, router])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (userId: string) => {
    const user = users.find(u => u.id === userId)
    const isAdmin = user?.isAdmin
    const confirmMessage = isAdmin 
      ? 'Are you sure you want to reset this admin user\'s password? They will need to change it on their next login.'
      : 'Are you sure you want to reset this user\'s password? They will need to change it on their next login.'
    
    if (!confirm(confirmMessage)) return

    setResetting(userId)
    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        const data = await response.json()
        setTempPassword(data.tempPassword)
        setResetUser(users.find(u => u.id === userId) || null)
        alert('Password reset successfully! The temporary password has been generated.')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      alert('Error resetting password')
    } finally {
      setResetting(null)
    }
  }

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone and will remove all their picks and data.`)) return

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        alert('User deleted successfully!')
        fetchUsers() // Refresh the user list
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Error deleting user')
    }
  }

  const closeModal = () => {
    setTempPassword(null)
    setResetUser(null)
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
              <h1 className="font-display font-normal text-[40px] md:text-[48px] leading-none text-ink">User Management</h1>
              <p className="text-ink-muted mt-2">Manage user accounts and reset passwords</p>
            </div>
          </div>

          <div className="mb-6">
            <Link
              href="/admin"
              className="text-rose-deep hover:text-rose-dark text-sm font-medium"
            >
              ← Back to Admin Dashboard
            </Link>
          </div>

          <div className="bg-oat p-6 rounded-2xl">
            <h3 className="font-display font-normal text-2xl text-ink mb-4">All Users ({users.length})</h3>
            {users.length === 0 ? (
              <p className="text-ink-muted">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-oat">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                        Role
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                        Joined
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-ink-muted uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-ink">{user.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-ink">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.isAdmin ? 'bg-oat text-ink' : 'bg-oat text-positive'
                          }`}>
                            {user.isAdmin ? 'Admin' : 'Player'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-faint">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-4 justify-end">
                            <button
                              onClick={() => resetPassword(user.id)}
                              disabled={resetting === user.id}
                              className="text-rose-deep hover:text-rose-dark disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {resetting === user.id ? 'Resetting...' : 'Reset Password'}
                            </button>
                            <button
                              onClick={() => deleteUser(user.id, user.name)}
                              className="text-ink-muted hover:text-rose-deep"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {tempPassword && resetUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="font-display font-normal text-2xl text-ink mb-4">Password Reset Successful</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-ink-muted">User: <span className="font-medium">{resetUser.name}</span></p>
                <p className="text-sm text-ink-muted">Email: <span className="font-medium">{resetUser.email}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Temporary Password:</label>
                <div className="bg-oat p-3 rounded-2xl font-mono text-lg text-center">
                  {tempPassword}
                </div>
                <p className="text-xs text-ink-faint mt-2">
                  Share this password with the user. They must change it on their next login.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeModal}
                  className="bg-oat hover:bg-line text-ink font-bold px-4 py-2 rounded-full transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function UserManagement() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserManagementContent />
    </Suspense>
  )
}
