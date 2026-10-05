'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthFrame, { authButton, authInput, authLabel } from '@/components/tent/AuthFrame'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        const session = await getSession()
        if (session?.user?.isAdmin) {
          router.push('/admin')
        } else {
          router.push('/dashboard')
        }
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthFrame title="Welcome back to the tent." subtitle="Your mixing bowl is right where you left it.">
      <form className="flex flex-1 flex-col gap-7" onSubmit={handleSubmit}>
        {error && <div className="rounded-[14px] bg-rose-tint px-4 py-3 font-semibold text-rose-deep">{error}</div>}
        <div className="flex flex-col gap-3.5">
          <label className={authLabel}>
            Email
            <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={authInput} />
          </label>
          <label className={authLabel}>
            Password
            <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={authInput} />
          </label>
        </div>
        <button type="submit" disabled={loading} className={authButton}>
          {loading ? 'Preheating…' : 'On your marks, get set, sign in'}
        </button>
        <p className="mt-auto text-center text-[15px] text-ink-muted">
          New to the tent?{' '}
          <Link href="/auth/signup" className="font-bold text-rose-deep hover:text-rose-dark">
            Join the league
          </Link>
        </p>
      </form>
    </AuthFrame>
  )
}
