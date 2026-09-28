'use client'

import { useState } from 'react'
import BakerGrid, { type Baker } from './BakerGrid'

interface FinalistPickerProps {
  bakers: Baker[]
  onSave: (contestantIds: string[]) => Promise<void>
}

export default function FinalistPicker({ bakers, onSave }: FinalistPickerProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const toggle = (id: string) =>
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
    )

  const save = async () => {
    if (!confirm('Finalist picks are locked for the whole season. Save these three?')) return
    setSaving(true)
    try {
      await onSave(selected)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Choose the 3 bakers you think will make the final. +3 for each one who does. These are locked once saved.
      </p>
      <BakerGrid
        bakers={bakers.filter(b => !b.isEliminated)}
        selectedIds={selected}
        onToggle={toggle}
        accent="violet"
      />
      <button
        onClick={save}
        disabled={selected.length !== 3 || saving}
        className="w-full sm:w-auto rounded-lg bg-violet-600 px-5 py-2.5 font-medium text-white hover:bg-violet-700 disabled:opacity-40"
      >
        {saving ? 'Saving…' : `Save finalists (${selected.length}/3)`}
      </button>
    </div>
  )
}
