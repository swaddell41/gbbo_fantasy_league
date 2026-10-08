'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import Bunting from './Bunting'
import Wordmark from './Wordmark'

// Header for every /admin page: same wordmark + bunting as The Tent
export default function AdminHeader() {
  const { data: session } = useSession()
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 bg-cream px-[22px] pb-3 pt-5 text-ink md:px-12 md:py-5">
        <Link href="/admin" className="flex items-center gap-3">
          <Wordmark />
          <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold uppercase tracking-[.08em] text-cream">Admin</span>
        </Link>
        <nav className="flex items-center gap-5 text-[15px] font-semibold">
          {session?.user && !session.user.isAdmin && (
            <Link href="/dashboard" className="text-ink-muted hover:text-ink">
              The Tent
            </Link>
          )}
          <button onClick={() => signOut({ callbackUrl: '/' })} className="text-ink-muted hover:text-ink">
            Sign out
          </button>
        </nav>
      </header>
      <Bunting />
    </>
  )
}
