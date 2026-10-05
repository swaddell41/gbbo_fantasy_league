'use client'

import Bunting from '@/components/tent/Bunting'

export interface Baker {
  id: string
  name: string
  imageUrl?: string | null
  isEliminated: boolean
}

// Full-screen picking view (designs 1b / 2d): bunting, heading, a photo grid
// and a sticky call-to-action over a fade
export function PickerSheet({
  eyebrow,
  title,
  onClose,
  children,
  cta,
}: {
  eyebrow: string
  title: string
  onClose?: () => void
  children: React.ReactNode
  cta: { label: string; onClick: () => void; dim?: boolean; busy?: boolean }
}) {
  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-cream text-ink">
      <div className="mt-12 md:mt-6">
        <Bunting />
      </div>
      <div className="mx-auto max-w-3xl px-[22px] pb-36 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[.1em] text-rose-deep">{eyebrow}</p>
            <h2 className="mt-1 font-display text-[40px] leading-[1.02] md:text-[56px]">{title}</h2>
          </div>
          {onClose && (
            <button onClick={onClose} className="mt-1 text-[15px] font-semibold text-ink-muted hover:text-ink">
              Cancel
            </button>
          )}
        </div>
        {children}
      </div>
      <div className="fixed inset-x-0 bottom-0 bg-[linear-gradient(transparent,#faf6ef_30%)] px-[22px] pb-[34px] pt-4">
        <button
          onClick={cta.onClick}
          disabled={cta.busy}
          className={`mx-auto block w-full max-w-3xl rounded-full bg-ink p-[17px] text-[17px] font-bold text-cream hover:bg-[#3d342e] ${cta.dim ? 'opacity-40' : ''}`}
        >
          {cta.busy ? 'Saving…' : cta.label}
        </button>
      </div>
    </div>
  )
}

export function PhotoGrid({
  bakers,
  photoHeight,
  tile,
  onPick,
}: {
  bakers: Baker[]
  photoHeight: number
  tile: (b: Baker) => { selected: boolean; ringColor: string; note: string; dimmed: boolean }
  onPick: (b: Baker) => void
}) {
  return (
    <div className="mt-3.5 grid grid-cols-3 gap-2.5 md:grid-cols-4">
      {bakers.map(b => {
        const t = tile(b)
        return (
          <button
            key={b.id}
            onClick={() => onPick(b)}
            className="flex flex-col overflow-hidden rounded-2xl bg-card text-left"
            style={{ boxShadow: t.selected ? `0 0 0 3px ${t.ringColor}` : 'none', opacity: t.dimmed ? 0.4 : 1 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.imageUrl ?? ''} alt="" className="block w-full flex-none object-cover" style={{ height: photoHeight }} />
            <div className="px-2.5 py-2">
              <div className="text-[15px] font-bold text-ink">{b.name}</div>
              <div className="min-h-[15px] text-xs text-ink-muted">{t.note}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
