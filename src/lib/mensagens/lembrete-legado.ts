import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Crons antigos de lembrete (/api/cron/reminders e /reminder-1h) — 03/11/2026.
 *
 * Eles nasceram antes da régua de mensagens (message_rules + varredura) e
 * mandavam e-mail e WhatsApp (Z-API) sem olhar a régua. Resultado: quem
 * DESLIGOU os lembretes (Rosy, 02/10, a pedido das clientes) continuava sendo
 * lembrada por e-mail, e quem LIGOU recebia em dobro (WhatsApp da varredura +
 * e-mail daqui).
 *
 * Regra agora: negócio que tem QUALQUER linha da régua para aquele lembrete
 * já decidiu — ligada, a varredura avisa; desligada, o dono não quer aviso.
 * O cron antigo só cobre quem nunca mexeu na régua, e só por e-mail.
 */
export async function negociosQueDecidiramNaRegua(
  db: SupabaseClient,
  businessIds: string[],
  tipo: 'lembrete_vespera' | 'lembrete_dia',
): Promise<Set<string>> {
  const ids = [...new Set(businessIds)]
  const decidiram = new Set<string>()
  // lotes de 100: `.in()` com lista longa estoura a URL
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await db
      .from('message_rules')
      .select('business_id')
      .eq('tipo', tipo)
      .in('business_id', ids.slice(i, i + 100))
    // Sem conseguir ler a régua, não arrisca mandar contra a vontade do dono.
    if (error) throw new Error('message_rules: ' + error.message)
    for (const r of data ?? []) decidiram.add(r.business_id as string)
  }
  return decidiram
}
