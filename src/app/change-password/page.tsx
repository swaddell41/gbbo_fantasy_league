'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Bunting from '@/components/tent/Bunting'
import Wordmark from '@/components/tent/Wordmark'

export default function ChangePassword() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Don't redirect admin users if they must change password
    if (session.user.isAdmin && !session.user.mustChangePassword) {
      router.push('/admin')
      return
    }
  }, [session, status, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      if (response.ok) {
        setMessage('Password changed successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        
        // Redirect to appropriate dashboard after successful change
        setTimeout(() => {
          if (session?.user.isAdmin) {
            router.push('/admin')
          } else {
            router.push('/dashboard')
          }
        }, 2000)
      } else {
        const error = await response.json()
        setMessage(error.error || 'Failed to change password')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      setMessage('An error occurred while changing password')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose mx-auto"></div>
          <p className="mt-4 text-ink-muted">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="px-[22px] pb-3 pt-5 md:px-12 md:py-5">
        <Wordmark />
      </header>
      <Bunting />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-card rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="font-display font-normal text-[40px] md:text-[48px] leading-none text-ink">Change Password</h1>
            {session.user.mustChangePassword ? (
              <div className="mt-4 p-4 bg-oat border border-line rounded-md">
                <p className="text-sm text-ink font-medium">
                  🔒 Your password has been reset by an administrator. Please choose a new password to continue.
                </p>
              </div>
            ) : (
              <p className="text-ink-muted mt-2">Update your account password</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-ink-muted">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-rose focus:border-rose sm:text-sm text-ink"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-ink-muted">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1 block w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-rose focus:border-rose sm:text-sm text-ink"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-muted">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1 block w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-rose focus:border-rose sm:text-sm text-ink"
              />
            </div>

            {message && (
              <div className={`p-3 rounded-md ${
                message.includes('successfully') 
                  ? 'bg-oat text-positive' 
                  : 'bg-oat text-rose-deep'
              }`}>
                {message}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-ink text-cream font-bold hover:bg-[#3d342e] px-4 py-2 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
              <Link
                href="/dashboard"
                className="flex-1 bg-oat hover:bg-line text-ink font-bold px-4 py-2 rounded-full transition-colors duration-200 text-center"
              >
                Cancel
              </Link>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-rose-deep hover:text-rose-deep text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
