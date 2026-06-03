import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Bloqueios de horário · lógica compartilhada (portado do palace-system).
 *
 * Fonte única pra: (1) renderizar bloqueio na grade de atendimentos e
 * (2) impedir agendamento por cima de bloqueio no admin E na recepção.
 *
 * Schema business_blocks (v53) idêntico nas duas bases · zero migration.
 */

export type BlockRow = {
  id: string
  professional_id: string | null
  block_type: 'recurring' | 'specific'
  day_of_week: number | null
  block_date: string | null
  start_time: string // 'HH:MM:SS'
  end_time: string // 'HH:MM:SS'
  reason: string | null
}

const SELECT_COLS =
  'id, professional_id, block_type, day_of_week, block_date, start_time, end_time, reason'

export function blockTimeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

/**
 * Bloqueio se aplica a esse profissional nessa data?
 * professional_id null = bloqueio de TODO o salão (aplica a todos).
 * recurring = por dia da semana · specific = por data exata.
 */
export function blockAppliesTo(b: BlockRow, profId: string, dateISO: string): boolean {
  if (b.professional_id && b.professional_id !== profId) return false
  if (b.block_type === 'recurring') {
    const dow = new Date(dateISO + 'T00:00:00').getDay()
    return b.day_of_week === dow
  }
  return b.block_type === 'specific' && b.block_date === dateISO
}

/**
 * Motivo do 1º bloqueio que conflita com o intervalo [startMin, endMin), ou null.
 * Mesma semântica de sobreposição do resto do sistema: start < bEnd && end > bStart.
 */
export function findBlockConflict(
  blocks: BlockRow[],
  profId: string,
  dateISO: string,
  startMin: number,
  endMin: number,
): string | null {
  for (const b of blocks) {
    if (!blockAppliesTo(b, profId, dateISO)) continue
    const bStart = blockTimeToMinutes(b.start_time)
    const bEnd = blockTimeToMinutes(b.end_time)
    if (startMin < bEnd && endMin > bStart) {
      return b.reason?.trim() || 'Horário bloqueado'
    }
  }
  return null
}

/**
 * Busca bloqueios ativos + checa conflito num intervalo. Usar ANTES de inserir
 * appointment (defesa real, não só visual). Retorna o motivo ou null se livre.
 */
export async function checkBlockConflict(
  supabase: SupabaseClient,
  args: { businessId: string; profId: string; dateISO: string; startMin: number; endMin: number },
): Promise<string | null> {
  const { data } = await supabase
    .from('business_blocks')
    .select(SELECT_COLS)
    .eq('business_id', args.businessId)
    .eq('active', true)
  return findBlockConflict(
    (data ?? []) as BlockRow[],
    args.profId,
    args.dateISO,
    args.startMin,
    args.endMin,
  )
}
