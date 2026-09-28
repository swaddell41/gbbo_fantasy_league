'use client'

export interface Baker {
  id: string
  name: string
  imageUrl?: string | null
  isEliminated: boolean
}

interface BakerGridProps {
  bakers: Baker[]
  selectedIds: string[]
  onToggle: (id: string) => void
  // Returns a short reason when a baker can't be chosen, e.g. "Picked 2×"
  disabledReason?: (baker: Baker) => string | null
  accent: 'amber' | 'rose' | 'violet'
}

const ACCENTS = {
  amber: 'border-amber-500 bg-amber-50 ring-2 ring-amber-400',
  rose: 'border-rose-500 bg-rose-50 ring-2 ring-rose-400',
  violet: 'border-violet-500 bg-violet-50 ring-2 ring-violet-400',
}

export default function BakerGrid({ bakers, selectedIds, onToggle, disabledReason, accent }: BakerGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {bakers.map(baker => {
        const selected = selectedIds.includes(baker.id)
        const reason = disabledReason?.(baker) ?? null
        return (
          <button
            key={baker.id}
            type="button"
            disabled={!!reason && !selected}
            onClick={() => onToggle(baker.id)}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-sm transition ${
              selected ? ACCENTS[accent] : 'border-gray-200 bg-white hover:border-gray-400'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {baker.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={baker.imageUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-gray-200" />
            )}
            <span className="font-medium text-gray-900">{baker.name}</span>
            {reason && <span className="text-[11px] text-gray-500">{reason}</span>}
          </button>
        )
      })}
    </div>
  )
}
