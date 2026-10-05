'use client'

import { useState } from 'react'
import { PhotoGrid, PickerSheet, type Baker } from './PickerSheet'

interface FinalistPickerProps {
  bakers: Baker[]
  onSave: (contestantIds: string[]) => Promise<void>
  onClose: () => void
}

export default function FinalistPicker({ bakers, onSave, onClose }: FinalistPickerProps) {
  const [finals, setFinals] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const inTheTent = bakers.filter(b => !b.isEliminated)
  const baker = (id: string | undefined) => bakers.find(b => b.id === id)

  const toggle = (b: Baker) =>
    setFinals(prev =>
      prev.includes(b.id) ? prev.filter(x => x !== b.id) : prev.length < 3 ? [...prev, b.id] : prev
    )

  const save = async () => {
    if (finals.length !== 3) return
    if (!confirm('Finalist picks are locked for the whole season. Lock in these three?')) return
    setSaving(true)
    try {
      await onSave(finals)
    } finally {
      setSaving(false)
    }
  }

  return (
    <PickerSheet
      eyebrow="Once a series"
      title="Who’ll make the final?"
      onClose={onClose}
      cta={{
        label: finals.length === 3 ? 'Lock in my finalists' : `Pick ${3 - finals.length} more`,
        onClick: save,
        dim: finals.length !== 3,
        busy: saving,
      }}
    >
      <p className="mt-2.5 text-[15px] text-ink-muted [text-wrap:pretty]">
        Choose 3. +3 for each one who makes it. Locked once saved, so no wobbly custards.
      </p>
      <div className="mt-3.5 flex gap-2">
        {[0, 1, 2].map(k => {
          const b = baker(finals[k])
          return (
            <div
              key={k}
              className={`flex min-h-10 flex-1 items-center gap-2 rounded-full border-2 border-dashed py-1 pl-1 pr-2.5 text-sm font-bold ${
                b ? 'border-rose bg-card' : 'border-dash'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {b && <img src={b.imageUrl ?? ''} alt="" className="h-7 w-7 rounded-full object-cover" />}
              <span className={b ? '' : 'pl-2 text-ink-muted'}>{b ? b.name : `Pick ${k + 1}`}</span>
            </div>
          )
        })}
      </div>
      <PhotoGrid
        bakers={inTheTent}
        photoHeight={96}
        onPick={toggle}
        tile={b => {
          const selected = finals.includes(b.id)
          return {
            selected,
            ringColor: '#d9677a',
            note: selected ? '★ Finalist' : '',
            dimmed: finals.length >= 3 && !selected,
          }
        }}
      />
    </PickerSheet>
  )
}
