// Small display helpers shared by the player-facing "Tent" pages

const PLAYER_COLORS = ['#d9677a', '#2f7ea3', '#3f9bc4', '#8a7d72', '#b9ada2', '#b8475c']

// Stable, distinct avatar colours: assigned by sorted user id across the league
export function playerColors(userIds: string[]) {
  return new Map([...userIds].sort().map((id, i) => [id, PLAYER_COLORS[i % PLAYER_COLORS.length]]))
}

export const firstName = (name: string | null | undefined) => (name ?? 'Someone').split(' ')[0]

export const initial = (name: string | null | undefined) => (name?.trim()[0] ?? '?').toUpperCase()

export const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`)

export const pointsClass = (n: number) => (n > 0 ? 'text-positive' : n < 0 ? 'text-rose-deep' : 'text-ink-faint')

export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function listNames(names: string[]) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export function movementLabel(movement: number | null) {
  if (!movement) return { text: '—', className: 'text-dash' }
  return movement > 0
    ? { text: `▲${movement}`, className: 'text-positive' }
    : { text: `▼${-movement}`, className: 'text-rose-deep' }
}
