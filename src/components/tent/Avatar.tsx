import { initial } from './format'

export default function Avatar({
  name,
  color,
  size = 36,
  ring = false,
  className = '',
}: {
  name: string | null | undefined
  color: string
  size?: number
  ring?: boolean
  className?: string
}) {
  return (
    <div
      className={`grid flex-none place-items-center rounded-full font-bold text-white ${ring ? 'border-[3px] border-cream' : ''} ${className}`}
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.4) }}
    >
      {initial(name)}
    </div>
  )
}
