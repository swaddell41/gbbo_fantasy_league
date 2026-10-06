'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import Avatar from './Avatar'
import Bunting from './Bunting'
import Wordmark from './Wordmark'
import { firstName } from './format'

function AccountMenu({ color }: { color: string }) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const name = session?.user?.name

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2.5 text-[15px]" aria-label="Account">
        <span className="hidden text-ink-muted md:inline">{firstName(name)}</span>
        <Avatar name={name} color={color} size={34} className="md:h-9 md:w-9" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-2xl bg-card p-2 text-[15px] shadow-[0_8px_30px_rgb(43_36_32/.15)]">
          <Link href="/change-password" className="block rounded-xl px-3 py-2 text-ink hover:bg-oat">
            Change password
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="block w-full rounded-xl px-3 py-2 text-left text-ink hover:bg-oat"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

// The one player page has no navigation: just the wordmark and account menu
export default function TentShell({ myColor, children }: { myColor: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="flex items-center justify-between px-[22px] pb-3 pt-5 md:px-12 md:py-5">
        <Wordmark />
        <AccountMenu color={myColor} />
      </header>
      <Bunting />

      <main>{children}</main>
    </div>
  )
}
