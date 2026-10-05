'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import Avatar from './Avatar'
import Bunting from './Bunting'
import Wordmark from './Wordmark'
import { firstName } from './format'

export type TentTab = 'tent' | 'standings' | 'mine'

const TABS: { id: TentTab; label: string; href: string }[] = [
  { id: 'tent', label: 'The Tent', href: '/dashboard' },
  { id: 'standings', label: 'Standings', href: '/standings' },
  { id: 'mine', label: 'My bakes', href: '/standings?player=me' },
]

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

export default function TentShell({
  active,
  myColor,
  children,
}: {
  active: TentTab | null
  myColor: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="flex items-center justify-between px-[22px] pb-3 pt-5 md:px-12 md:py-5">
        <Wordmark />
        <nav className="hidden gap-8 text-base font-semibold md:flex">
          {TABS.map(t => (
            <Link
              key={t.id}
              href={t.href}
              className={
                t.id === active
                  ? 'border-b-2 border-rose pb-0.5 text-ink'
                  : 'text-ink-muted hover:text-ink'
              }
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <AccountMenu color={myColor} />
      </header>
      <Bunting />

      <main className="pb-28 md:pb-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-3 border-t border-line bg-card px-3 pb-7 pt-2.5 text-center text-[13px] font-bold md:hidden">
        {TABS.map(t => (
          <Link
            key={t.id}
            href={t.href}
            className={`flex flex-col items-center gap-1 ${t.id === active ? 'text-ink' : 'text-ink-faint'}`}
          >
            <span className={`h-1 w-7 rounded-sm ${t.id === active ? 'bg-rose' : ''}`} />
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
