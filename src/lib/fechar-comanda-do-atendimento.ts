import type { SupabaseClient } from '@supabase/supabase-js'
import { linhasDoSinal, NOTA_SINAL } from './sinal-da-comanda'
import { reservarComanda } from './reserva-comanda'
import { acertarValorDosProdutosDaComanda } from './produto-desconto'

export type PagamentoDoAtendimento = {
  payment_method: string | null
  paid_at: string
  payment_device_id?: string | null
  payment_card_brand?: string | null
  payment_card_type?: string | null
  payment_installments?: number | null
  payment_fee_percent?: number | null
}

/**
 * Atendimento pago DIRETO (fora da tela da comanda) fecha a comanda dele.
 *
 * Bug Olímpio 09/06: o atendimento já pertence a uma comanda (toda comanda
 * nasce no agendamento · trigger v70/v77) e, pago direto, a comanda ficava
 * aberta — o valor sumia do Fluxo/Início, que contam atendimento com comanda
 * pelo pagamento da comanda. Auditoria 29/09: comanda com vários itens e com
 * sinal segue a mesma regra do "Receber pagamento" (/invoices/[id]/pay):
 * sinal vira linha própria na data dele, o resto entra no método escolhido,
 * os outros atendimentos e os produtos ficam pagos junto.
 *
 * Usado pela agenda da dona/recepção (/appointments/[id]/payment) e pela área
 * da profissional (/profissional/action · Eduardo 29/09: "se ela tiver
 * autorização pode fazer sim" — a rota confere prof_registra_pagamento).
 * Não-fatal: se falhar, o atendimento segue marcado pago e o erro vai pro log.
 */
export async function fecharComandaDoAtendimento(
  admin: SupabaseClient,
  appointmentId: string,
  pag: PagamentoDoAtendimento,
): Promise<void> {
  try {
    const { data: full } = await admin
      .from('appointments')
      .select('invoice_item_id, total_price')
      .eq('id', appointmentId)
      .maybeSingle()
    if (!full?.invoice_item_id) return
    const { data: item } = await admin
      .from('invoice_items')
      .select('invoice_id')
      .eq('id', full.invoice_item_id)
      .maybeSingle()
    if (!item?.invoice_id) return
    const { data: inv } = await admin
      .from('invoices')
      .select('id, status, total')
      .eq('id', item.invoice_id)
      .maybeSingle()
    if (!inv || inv.status !== 'open' || !(await reservarComanda(admin, inv.id))) return

    const { data: itens } = await admin
      .from('invoice_items')
      .select('item_type, reference_id')
      .eq('invoice_id', inv.id)
    const apptIds = (itens ?? []).filter((i) => i.item_type === 'appointment' && i.reference_id).map((i) => i.reference_id as string)
    const saleIds = (itens ?? []).filter((i) => i.item_type === 'product' && i.reference_id).map((i) => i.reference_id as string)

    const { count } = await admin
      .from('invoice_payments')
      .select('id', { count: 'exact', head: true })
      .eq('invoice_id', inv.id)
      .or(`notes.is.null,notes.neq.${NOTA_SINAL}`)
    if ((count ?? 0) === 0) {
      const sinal = await linhasDoSinal(admin, apptIds)
      const { count: sinalJaLancado } = await admin
        .from('invoice_payments')
        .select('id', { count: 'exact', head: true })
        .eq('invoice_id', inv.id)
        .eq('notes', NOTA_SINAL)
      if (!sinalJaLancado && sinal.linhas.length > 0) {
        await admin.from('invoice_payments').insert(
          sinal.linhas.map((l) => ({ invoice_id: inv.id, ...l, installments: 1, fee_percent: 0, notes: NOTA_SINAL })),
        )
      }
      const resto = Math.max(0, Math.round((Number(inv.total ?? full.total_price ?? 0) - sinal.total) * 100) / 100)
      if (resto > 0) {
        await admin.from('invoice_payments').insert({
          invoice_id: inv.id,
          payment_method: pag.payment_method,
          amount: resto,
          paid_at: pag.paid_at,
          device_id: pag.payment_device_id ?? null,
          card_brand: pag.payment_card_brand ?? null,
          card_type: pag.payment_card_type ?? null,
          installments: pag.payment_installments ?? 1,
          fee_percent: pag.payment_fee_percent ?? 0,
        })
      }
    }

    const outrosAppts = apptIds.filter((a) => a !== appointmentId)
    if (outrosAppts.length > 0) {
      await admin.from('appointments')
        .update({ status: 'completed', payment_method: pag.payment_method })
        .in('id', outrosAppts)
      await admin.from('appointments').update({ paid_at: pag.paid_at }).in('id', outrosAppts).is('paid_at', null)
    }
    if (saleIds.length > 0) {
      await acertarValorDosProdutosDaComanda(admin, inv.id)
      await admin.from('sales').update({ status: 'paid', payment_method: pag.payment_method }).in('id', saleIds)
      await admin.from('sales').update({ paid_at: pag.paid_at }).in('id', saleIds).is('paid_at', null)
    }

    await admin
      .from('invoices')
      .update({ status: 'closed', closed_at: pag.paid_at, fechando_desde: null })
      .eq('id', inv.id)
  } catch (e) {
    console.error('[fecharComandaDoAtendimento] (não-fatal):', e)
  }
}
