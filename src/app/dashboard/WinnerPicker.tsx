'use client'

import { useState } from 'react'
import { SCORING_RULES } from '@/lib/scoring'
import { PhotoGrid, PickerSheet, type Baker } from './PickerSheet'

interface WinnerPickerProps {
  episode: { episodeNumber: number; title: string }
  bakers: Baker[]
  initialWinnerId: string | null
  onSave: (winnerId: string) => Promise<void>
  onClose: () => void
}

// The final: one pick, who wins the series
export default function WinnerPicker({ episode, bakers, initialWinnerId, onSave, onClose }: WinnerPickerProps) {
  const [winner, setWinner] = useState(initialWinnerId)
  const [saving, setSaving] = useState(false)
  const inTheTent = bakers.filter(b => !b.isEliminated)
  const name = (id: string | null) => bakers.find(b => b.id === id)?.name ?? ''

  const save = async () => {
    if (!winner) return
    if (!confirm(`Lock in ${name(winner)} to win the series? You can’t change it once it’s saved.`)) return
    setSaving(true)
    try {
      await onSave(winner)
    } finally {
      setSaving(false)
    }
  }

  return (
    <PickerSheet
      eyebrow={`The final · Episode ${episode.episodeNumber}`}
      title={episode.title}
      onClose={onClose}
      cta={{
        label: winner ? `Crown ${name(winner)}` : 'Pick your winner',
        onClick: save,
        dim: !winner,
        busy: saving,
      }}
    >
      <p className="mt-2.5 text-[15px] text-ink-muted [text-wrap:pretty]">
        Who lifts the cake stand? One pick this week: +{SCORING_RULES.WINNER_CORRECT} if your baker wins the series.
      </p>
      <PhotoGrid
        bakers={inTheTent}
        photoHeight={120}
        onPick={b => setWinner(winner === b.id ? null : b.id)}
        tile={b => {
          const selected = winner === b.id
          return { selected, ringColor: '#d9677a', note: selected ? '🏆 Your winner' : '', dimmed: !!winner && !selected }
        }}
      />
    </PickerSheet>
  )
}
