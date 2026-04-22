/**
 * Helpers de exibição compartilhados entre AppointmentCard, ClientesView, etc.
 * Mantém consistência visual (avatar, máscara) em qualquer lugar que mostra cliente.
 */

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_PALETTE: [string, string][] = [
  ['#3B82F6', '#06B6D4'],
  ['#8B5CF6', '#EC4899'],
  ['#10B981', '#06B6D4'],
  ['#F59E0B', '#EF4444'],
  ['#6366F1', '#A855F7'],
  ['#0EA5E9', '#22D3EE'],
]

export function avatarGradient(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  const [from, to] = AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
  return `linear-gradient(135deg, ${from}, ${to})`
}

/**
 * Formata telefone brasileiro: 11999999999 → (11) 99999-9999.
 * Aceita string com qualquer não-dígito; tolera tamanhos diferentes (8/9 dígitos).
 */
export function maskPhone(raw: string): string {
  const d = (raw || '').replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  if (d.length === 9)  return `${d.slice(0, 5)}-${d.slice(5)}`
  if (d.length === 8)  return `${d.slice(0, 4)}-${d.slice(4)}`
  return raw
}

/** Diferença em dias entre duas datas (date strings YYYY-MM-DD ou ISO). */
export function daysBetween(a: string | Date, b: string | Date = new Date()): number {
  const da = typeof a === 'string' ? new Date(a + (a.length === 10 ? 'T00:00:00' : '')) : a
  const db = typeof b === 'string' ? new Date(b + (b.length === 10 ? 'T00:00:00' : '')) : b
  return Math.floor((db.getTime() - da.getTime()) / 86400000)
}
