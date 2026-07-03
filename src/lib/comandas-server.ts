import type { SupabaseClient } from '@supabase/supabase-js'
import type { InvoiceListItem } from '@/components/admin/comandas/ComandasView'

// Data efetiva da comanda em fuso de Brasília (en-CA = YYYY-MM-DD). Bucketizar
// created_at em UTC jogava comanda pro dia errado perto da meia-noite.
function brDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

/**
 * Lista de comandas com a data efetiva (ref_date) pra agrupar por dia.
 *  - Comanda ligada a atendimento → data do ATENDIMENTO (não a de criação · uma
 *    comanda de agendamento futuro aparecia hoje).
 *  - Comanda avulsa (só produto) → data de criação (fuso BR).
 * Usado pela /admin/comandas e /recepcao/comandas (mesma lógica).
 */
export async function fetchComandaList(admin: SupabaseClient, businessId: string): Promise<InvoiceListItem[]> {
  const { data: invoices } = await admin
    .from('invoices')
    .select(`
      id, invoice_number, status, subtotal, discount, total,
      created_at, closed_at,
      customer:customers(id, name, phone),
      items:invoice_items(id, item_type, reference_id)
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(300)

  // Datas dos atendimentos referenciados (item_type=appointment → reference_id)
  const apptRefIds: string[] = []
  for (const inv of invoices ?? []) {
    const items = Array.isArray(inv.items) ? inv.items : []
    for (const it of items) {
      if (it.item_type === 'appointment' && it.reference_id) apptRefIds.push(it.reference_id as string)
    }
  }
  let apptDateById: Record<string, string> = {}
  if (apptRefIds.length) {
    const { data: appts } = await admin
      .from('appointments')
      .select('id, appointment_date')
      .in('id', apptRefIds)
    apptDateById = Object.fromEntries((appts ?? []).map((a) => [a.id as string, a.appointment_date as string]))
  }

  return (invoices ?? []).map((inv) => {
    const customer = Array.isArray(inv.customer) ? inv.customer[0] : inv.customer
    const items = Array.isArray(inv.items) ? inv.items : []
    const apptItem = items.find(
      (i) => i.item_type === 'appointment' && i.reference_id && apptDateById[i.reference_id as string],
    )
    const refDate = apptItem
      ? apptDateById[apptItem.reference_id as string]
      : brDate(inv.created_at as string)
    return {
      id: inv.id as string,
      invoice_number: inv.invoice_number as number,
      status: inv.status as 'open' | 'closed' | 'cancelled',
      total: Number(inv.total ?? 0),
      created_at: inv.created_at as string,
      closed_at: inv.closed_at as string | null,
      ref_date: refDate,
      customer_name: customer?.name ?? null,
      items_count: items.length,
      has_service: items.some((i) => i.item_type === 'appointment'),
      has_product: items.some((i) => i.item_type === 'product'),
    }
  })
}
