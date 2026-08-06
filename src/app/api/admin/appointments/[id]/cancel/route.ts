import { NextRequest, NextResponse } from 'next/server'
import { aplicarRegraDoSinal, composicaoDoSinal } from '@/lib/sinal-cancelamento'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/rate-limit-api'

/**
 * POST /api/admin/appointments/[id]/cancel
 *
 * Cancela um agendamento (status='cancelled').
 *
 * Autorizado: dono do business OU recepcionista (is_receptionist=true)
 * do mesmo business.
 *
 * Read-after-write: relê a row após o update e devolve o status,
 * pra UI ter prova real do banco e não confiar só em res.ok.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkRateLimit(req, { key: 'admin-appt-cancel', limit: 60, windowSeconds: 60 })
  if (rl) return rl

  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  // Validação: appointment + business
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, business_id, professional_id, status, invoice_item_id, paid_at')
    .eq('id', id)
    .single()
  if (!appt) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Autorização: dono, recepcionista OU profissional (v98 · 30/07/2026).
  //
  // Eduardo 30/07: "vamos deixar igual do adm, afinal eles não têm recepção —
  // quem marca, agenda e marca como pago são as próprias profissionais".
  // Negócio sem recepcionista (caso Realli) quebrava aqui: a profissional
  // marcava a cliente mas não conseguia fechar o ciclo do atendimento.
  //
  // CANCELAR é o único poder que NÃO acompanha a flag de equipe.
  // Eduardo 30/07, depois de testar: "cada uma pode cancelar somente o seu.
  // Quem pode cancelar o de qualquer uma é só a adm". Marcar e receber pela
  // colega ajuda (elas se cobrem no balcão); desmarcar a cliente da outra é
  // estrago que ninguém desfaz — some da agenda de quem nem estava por perto.
  const [{ data: business }, { data: prof }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id')
      .eq('id', appt.business_id)
      .eq('owner_id', user.id)
      .maybeSingle(),
    supabase
      .from('professionals')
      .select('id, is_receptionist')
      .eq('business_id', appt.business_id)
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .maybeSingle(),
  ])
  const isOwner = !!business
  const isReceptionist = prof?.is_receptionist === true
  // Profissional: SÓ o próprio atendimento, sempre — não existe flag que abra
  // o cancelamento do atendimento da colega.
  const ehDela = !!prof && !prof.is_receptionist && prof.id === appt.professional_id
  if (!isOwner && !isReceptionist && !ehDela) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Depois de PAGO, profissional não cancela mais — só a dona (Eduardo 30/07).
  // Cancelar um atendimento pago desfaz dinheiro: zera paid_at, solta o
  // invoice_item, cancela a comanda, estorna estoque e apaga o pagamento (vide
  // cascata abaixo). Isso é decisão de quem responde pelo caixa.
  // Recepção NÃO entra na trava: em negócio com recepcionista ela é quem opera
  // o caixa hoje, e restringir aqui seria mudar o comportamento de quem já usa.
  if (!isOwner && !isReceptionist && appt.paid_at) {
    return NextResponse.json({
      error: 'ja_pago',
      detail: 'Atendimento já pago. Só a administração pode cancelar depois do pagamento.',
    }, { status: 403 })
  }

  /* DESTINO DO SINAL (06/08) · quem cancela pelo painel é a dona, e o motivo
     varia: a cliente pediu, ela não vai conseguir atender, deu problema na
     agenda. Às vezes o certo é guardar como crédito; às vezes ela já
     devolveu o PIX na hora e só quer registrar. Decidir por ela erraria
     metade das vezes, então a tela pergunta e a resposta chega aqui.

     Default 'credito' porque é o que protege as duas — e porque chamada
     antiga sem o campo (algum caminho que eu não mapeei) continua fazendo o
     que fazia antes. */
  const corpo = await req.json().catch(() => ({}))
  const destinoSinal = corpo?.destinoSinal === 'devolucao' ? 'devolucao' : 'credito'

  /* Tudo isto roda ANTES do cancelamento, enquanto o atendimento ainda tem os
     dados. Cancelado pelo painel vira crédito em qualquer prazo: se quem
     desmarcou foi a dona, a cliente não pode perder dinheiro.

     O erro NÃO é engolido: até 06/08 o insert era recusado pelo CHECK de
     customer_credits.origin e ninguém ficava sabendo — a tela dizia
     "cancelado" e o dinheiro da cliente sumia. Se o crédito não gravar, o
     cancelamento PARA: melhor a dona ver erro e tentar de novo do que achar
     que a cliente tem saldo que não existe.

     O sinal pode ter sido pago em PIX, em crédito que a cliente já tinha, ou
     nos dois. Só a parte em PIX é dinheiro que entrou no caixa — e é só sobre
     ela que faz sentido a dona escolher entre guardar e devolver.

     A parte paga com crédito volta pra ficha SEMPRE. Foi assim que o teste do
     Eduardo em 06/08 pegou dinheiro sumindo: um sinal de R$ 18 quitado com o
     crédito dele foi cancelado como "já devolvi em dinheiro". O salão nunca
     tinha recebido esses R$ 18, e mesmo assim a cliente ficou sem eles. */
  const composicao = await composicaoDoSinal(supabase, id)
  const valorPraCreditar =
    destinoSinal === 'credito' ? composicao.total : composicao.emCredito

  if (valorPraCreditar > 0) {
    try {
      await aplicarRegraDoSinal(supabase, id, { porDono: true, apenasValor: valorPraCreditar })
    } catch (err) {
      console.error('cancel · crédito do sinal falhou:', err)
      return NextResponse.json({
        error: 'credito_nao_gravou',
        detail: 'Não consegui registrar o crédito do sinal na ficha da cliente. O atendimento NÃO foi cancelado — tente de novo.',
      }, { status: 500 })
    }
  }

  /* Devolvido em dinheiro: fica o registro no atendimento, que é o que
     responde "e o sinal da fulana?" três semanas depois. Só a parte em PIX
     entra no carimbo — devolver o que era crédito seria tirar do caixa um
     valor que nunca entrou. */
  if (destinoSinal === 'devolucao' && composicao.emDinheiro > 0) {
    const { data: comSinal } = await supabase
      .from('appointments')
      .select('notes')
      .eq('id', id)
      .maybeSingle()
    const emReais = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`
    const parteCredito =
      composicao.emCredito > 0
        ? ` Os outros ${emReais(composicao.emCredito)} eram crédito dela e voltaram pra ficha.`
        : ''
    const carimbo =
      `Sinal: ${emReais(composicao.emDinheiro)} devolvidos em dinheiro no cancelamento ` +
      `(${new Date().toLocaleDateString('pt-BR')}).${parteCredito}`
    await supabase
      .from('appointments')
      .update({ notes: comSinal?.notes ? `${comSinal.notes}\n${carimbo}` : carimbo })
      .eq('id', id)
  }

  const { error: updateErr } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', paid_at: null, invoice_item_id: null, payment_method: null })
    .eq('id', id)

  if (updateErr) {
    console.error('cancel update error:', updateErr)
    return NextResponse.json({ error: 'update_failed', detail: updateErr.message }, { status: 500 })
  }

  // CASCATA · cancela a comanda vinculada (se houver)
  // Lógica simétrica ao PATCH /api/admin/invoices/[id] action=cancel:
  //  - acha invoice via invoice_item_id
  //  - cancela sales product_sale + devolve estoque (entry +qty)
  //  - apaga invoice_payments
  //  - cancela outros invoice_items (que linkam appointments) → resetam aqueles também
  //  - marca invoice como cancelled
  if (appt.invoice_item_id) {
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    const { data: item } = await admin
      .from('invoice_items')
      .select('invoice_id')
      .eq('id', appt.invoice_item_id)
      .maybeSingle()
    const invoiceId = item?.invoice_id as string | undefined

    if (invoiceId) {
      // Pega TODOS os items pra cascatear cada um
      const { data: allItems } = await admin
        .from('invoice_items')
        .select('id, item_type, reference_id')
        .eq('invoice_id', invoiceId)

      const productSaleIds = (allItems ?? [])
        .filter((i) => i.item_type === 'product' && i.reference_id)
        .map((i) => i.reference_id as string)
      const otherAppts = (allItems ?? [])
        .filter((i) => i.item_type === 'appointment' && i.reference_id && i.reference_id !== id)
        .map((i) => i.reference_id as string)

      // Reverte outros appointments (não toca status pra não cancelar atendimento
      // que ainda vai acontecer · só solta paid + invoice_item_id)
      if (otherAppts.length > 0) {
        await admin
          .from('appointments')
          .update({ paid_at: null, invoice_item_id: null, payment_method: null })
          .in('id', otherAppts)
      }

      // Reverte sales de produto + devolve estoque
      if (productSaleIds.length > 0) {
        const { data: saleItems } = await admin
          .from('sale_items')
          .select('sale_id, product_id, quantity')
          .in('sale_id', productSaleIds)
        const compensations = (saleItems ?? [])
          .filter((s) => s.product_id)
          .map((s) => ({
            business_id: appt.business_id,
            product_id: s.product_id as string,
            type: 'entry' as const,
            quantity: Number(s.quantity ?? 0),
            reason: 'Cancelamento do atendimento (cascata)',
            created_by: user.id,
          }))
        if (compensations.length > 0) {
          await admin.from('stock_movements').insert(compensations)
        }
        await admin
          .from('sales')
          .update({ status: 'cancelled', paid_at: null })
          .in('id', productSaleIds)
      }

      // Apaga pagamentos da invoice
      await admin.from('invoice_payments').delete().eq('invoice_id', invoiceId)

      // Marca invoice como cancelled
      await admin
        .from('invoices')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', invoiceId)
    }
  }

  // λ.prova-na-fonte · relê a row e confirma que mudou
  const { data: after } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('id', id)
    .single()

  if (after?.status !== 'cancelled') {
    console.error('cancel verification failed · status ainda é', after?.status)
    return NextResponse.json(
      { error: 'verification_failed', actual_status: after?.status ?? null },
      { status: 500 },
    )
  }

  revalidatePath('/admin')
  revalidatePath('/admin/financeiro')
  return NextResponse.json({ ok: true, status: after.status })
}
