'use client'

import { useState } from 'react'
import BakerGrid, { type Baker } from './BakerGrid'

// A baker can be your Star Baker pick at most this many times a season
const MAX_STAR_BAKER_PICKS = 2

interface WeeklyPickerProps {
  bakers: Baker[]
  initialStarBakerId: string | null
  initialEliminationId: string | null
  // How many times you've picked each baker as Star Baker in *other* episodes
  starBakerUses: Map<string, number>
  onSave: (starBakerId: string, eliminationId: string) => Promise<void>
  onCancel?: () => void
}

export default function WeeklyPicker({
  bakers,
  initialStarBakerId,
  initialEliminationId,
  starBakerUses,
  onSave,
  onCancel,
}: WeeklyPickerProps) {
  const [starBakerId, setStarBakerId] = useState(initialStarBakerId)
  const [eliminationId, setEliminationId] = useState(initialEliminationId)
  const [saving, setSaving] = useState(false)
  const inTheTent = bakers.filter(b => !b.isEliminated)

  const save = async () => {
    if (!starBakerId || !eliminationId) return
    setSaving(true)
    try {
      await onSave(starBakerId, eliminationId)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h4 className="mb-2 font-semibold text-gray-900">⭐ Star Baker</h4>
        <BakerGrid
          bakers={inTheTent}
          selectedIds={starBakerId ? [starBakerId] : []}
          onToggle={id => setStarBakerId(starBakerId === id ? null : id)}
          disabledReason={b => {
            if (b.id === eliminationId) return 'Your elimination pick'
            const used = starBakerUses.get(b.id) ?? 0
            return used >= MAX_STAR_BAKER_PICKS ? `Picked ${used}×` : null
          }}
          accent="amber"
        />
      </div>

      <div>
        <h4 className="mb-2 font-semibold text-gray-900">👋 Going home</h4>
        <BakerGrid
          bakers={inTheTent}
          selectedIds={eliminationId ? [eliminationId] : []}
          onToggle={id => setEliminationId(eliminationId === id ? null : id)}
          disabledReason={b => (b.id === starBakerId ? 'Your Star Baker pick' : null)}
          accent="rose"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={!starBakerId || !eliminationId || saving}
          className="flex-1 sm:flex-none rounded-lg bg-amber-600 px-5 py-2.5 font-medium text-white hover:bg-amber-700 disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save picks'}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="rounded-lg px-4 py-2.5 text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
