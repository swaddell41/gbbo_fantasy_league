'use client'

import { useState } from 'react'
import { PhotoGrid, PickerSheet, type Baker } from './PickerSheet'

// A baker can be your Star Baker pick at most this many times a season
const MAX_STAR_BAKER_PICKS = 2

interface WeeklyPickerProps {
  episode: { episodeNumber: number; title: string }
  bakers: Baker[]
  initialStarBakerId: string | null
  initialEliminationId: string | null
  initialTab: 'sb' | 'el'
  // How many times you've picked each baker as Star Baker in *other* episodes
  starBakerUses: Map<string, number>
  onSave: (starBakerId: string, eliminationId: string) => Promise<void>
  onClose: () => void
}

export default function WeeklyPicker({
  episode,
  bakers,
  initialStarBakerId,
  initialEliminationId,
  initialTab,
  starBakerUses,
  onSave,
  onClose,
}: WeeklyPickerProps) {
  const [tab, setTab] = useState(initialTab)
  const [sb, setSb] = useState(initialStarBakerId)
  const [el, setEl] = useState(initialEliminationId)
  const [saving, setSaving] = useState(false)
  const inTheTent = bakers.filter(b => !b.isEliminated)
  const name = (id: string | null) => bakers.find(b => b.id === id)?.name ?? ''

  const blockedReason = (b: Baker) => {
    if (tab === 'sb') {
      if (el === b.id) return 'Going home pick'
      const used = starBakerUses.get(b.id) ?? 0
      if (used >= MAX_STAR_BAKER_PICKS) return `Picked ${used}×`
    } else if (sb === b.id) {
      return 'Star Baker pick'
    }
    return null
  }

  const pick = (b: Baker) => {
    const current = tab === 'sb' ? sb : el
    if (blockedReason(b) && current !== b.id) return
    if (tab === 'sb') {
      setSb(current === b.id ? null : b.id)
      // Choosing a Star Baker moves you on to "Going home" if that's still empty
      if (current !== b.id && !el) setTab('el')
    } else {
      setEl(current === b.id ? null : b.id)
    }
  }

  const save = async () => {
    if (!sb) return setTab('sb')
    if (!el) return setTab('el')
    setSaving(true)
    try {
      await onSave(sb, el)
    } finally {
      setSaving(false)
    }
  }

  return (
    <PickerSheet
      eyebrow={`Episode ${episode.episodeNumber}`}
      title={episode.title}
      onClose={onClose}
      cta={{
        label: sb && el ? `Into the oven: ${name(sb)} & ${name(el)}` : sb ? 'Now pick who’s going home' : 'Pick your Star Baker',
        onClick: save,
        busy: saving,
      }}
    >
      <div className="mt-[18px] grid grid-cols-2 gap-1.5 rounded-full bg-oat-track p-1">
        {(['sb', 'el'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full p-2.5 text-[15px] font-bold text-ink ${tab === t ? 'bg-card' : ''}`}
          >
            {t === 'sb' ? 'Star Baker' : 'Going home'}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[15px] text-ink-muted">
        {tab === 'sb' ? 'Who earns the Hollywood handshake this week?' : 'Whose bake ends up a soggy mess?'}
      </p>
      <PhotoGrid
        bakers={inTheTent}
        photoHeight={104}
        onPick={pick}
        tile={b => {
          const selected = (tab === 'sb' ? sb : el) === b.id
          const reason = blockedReason(b)
          return {
            selected,
            ringColor: tab === 'sb' ? '#d9677a' : '#3f9bc4',
            note: selected ? (tab === 'sb' ? '★ Your Star Baker' : 'Going home') : reason ?? '',
            dimmed: !!reason && !selected,
          }
        }}
      />
    </PickerSheet>
  )
}
