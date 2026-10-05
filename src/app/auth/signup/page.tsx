'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthFrame, { authButton, authInput, authLabel } from '@/components/tent/AuthFrame'

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      })

      if (response.ok) {
        router.push('/auth/signin?message=Account created successfully!')
      } else {
        const data = await response.json()
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthFrame title="Grab an apron and a workstation." subtitle="A few friends, twelve bakers, one very shiny cake stand.">
      <form className="flex flex-1 flex-col gap-6" onSubmit={handleSubmit}>
        {error && <div className="rounded-[14px] bg-rose-tint px-4 py-3 font-semibold text-rose-deep">{error}</div>}
        <div className="flex flex-col gap-3.5">
          <label className={authLabel}>
            Your name
            <input name="name" required autoComplete="name" value={formData.name} onChange={handleChange} placeholder="What Paul should call you" className={authInput} />
          </label>
          <label className={authLabel}>
            Email
            <input name="email" type="email" required autoComplete="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" className={authInput} />
          </label>
          <label className={authLabel}>
            Password
            <input name="password" type="password" required autoComplete="new-password" value={formData.password} onChange={handleChange} placeholder="At least 6 characters" className={authInput} />
          </label>
          <label className={authLabel}>
            Password again
            <input name="confirmPassword" type="password" required autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} placeholder="Just to be sure" className={authInput} />
          </label>
        </div>
        <button type="submit" disabled={loading} className={authButton}>
          {loading ? 'Setting up your station…' : 'Join the league'}
        </button>
        <p className="mt-auto text-center text-[15px] text-ink-muted">
          Already in the tent?{' '}
          <Link href="/auth/signin" className="font-bold text-rose-deep hover:text-rose-dark">
            Sign in
          </Link>
        </p>
      </form>
    </AuthFrame>
  )
}
