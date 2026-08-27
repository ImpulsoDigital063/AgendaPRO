/* ═══════════════════════════════════════════════════════════════
   AVISO DE SINAL PRA VENCER — roda de hora em hora

   Por que existe: o prazo do sinal estourava em silêncio. O horário voltava
   pra agenda pública e o card seguia na agenda da dona com o mesmo selo
   "a confirmar" de sempre. Painel dizia cheio, link dizia livre, e ninguém
   avisava ninguém. A Wanessa descobriu porque uma cliente reclamou
   (26/08/2026), e nesse dia três agendamentos foram cancelados — um deles
   com o sinal JÁ PAGO, só não marcado.

   Por que avisar ANTES e não depois (Eduardo, 26/08): pode ser dinheiro que
   já entrou. A cliente paga o PIX, manda o comprovante no WhatsApp, a dona
   não marca "Recebi" a tempo — e o sistema solta o horário por cima de uma
   venda feita. Avisar depois é avisar quando o estrago já está pronto.

   Por que rota própria e não dentro de /api/mensagens/varrer: aquela rota é
   das mensagens PRA CLIENTE e sai cedo quando nenhuma regra está ligada —
   que é o caso de todo mundo hoje. O aviso morreria ali sem nunca disparar.
   Aqui pega carona no mesmo GitHub Action, no mesmo job: zero minuto a mais.

   Por que GitHub Action e não cron da Vercel: no Hobby o cron é diário, e um
   prazo de 4h não sobrevive a isso. Mesma razão do /api/mensagens/varrer.
   ═══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendWebPush } from '@/lib/notify-push'
import { sendSinalVencendo } from '@/lib/email'
import { minutosRestantes, SINAL_EXPIRA_PADRAO_MIN } from '@/lib/sinal-expira'
import { todayBR } from '@/lib/date-br'

export const runtime = 'nodejs'
export const maxDuration = 60

/* Avisa quando falta ISTO ou menos. Maior que a hora entre varreduras de
   propósito: o cron do GitHub atrasa e às vezes pula execução. Com janela
   justa, o atraso faz o aviso NÃO SAIR — e o silêncio é exatamente o defeito
   que estamos consertando. Melhor avisar um pouco cedo. */
const JANELA_MIN = 90

/* Teto por invocação: a função morre em 60s no Hobby. Cada envio é push +
   e-mail; mandar tudo de uma vez estoura no meio e deixa metade avisada sem
   ninguém saber. Devolve `restam` e o Action repete até zerar. */
const LOTE = 15

type ApptRow = {
  id: string
  client_name: string | null
  appointment_date: string
  start_time: string
  status: string | null
  sinal_valor: number | string | null
  sinal_pago_at: string | null
  created_at: string
  professional_id: string | null
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'nao_autorizado' }, { status: 401 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: negocios } = await admin
    .from('businesses')
    .select('id, name, owner_id, sinal_expira_minutos')
    .eq('sinal_enabled', true)

  if (!negocios || negocios.length === 0) {
    return NextResponse.json({ ok: true, negocios: 0, avisados: 0, restam: 0 })
  }

  const agora = Date.now()
  const hoje = todayBR()

  /* Monta a fila inteira antes de mandar qualquer coisa: assim o corte do
     LOTE é sobre o total real e o `restam` que volta pro Action é honesto. */
  const fila: { negocio: (typeof negocios)[number]; appt: ApptRow; faltam: number }[] = []

  for (const negocio of negocios) {
    const prazo = Number(negocio.sinal_expira_minutos ?? SINAL_EXPIRA_PADRAO_MIN)
    const { data: appts } = await admin
      .from('appointments')
      .select('id, client_name, appointment_date, start_time, status, sinal_valor, sinal_pago_at, created_at, professional_id')
      .eq('business_id', negocio.id)
      .eq('status', 'pending')
      .is('sinal_pago_at', null)
      .is('sinal_aviso_enviado_at', null)
      .not('sinal_valor', 'is', null)
      .gte('appointment_date', hoje)

    for (const a of (appts ?? []) as ApptRow[]) {
      if (!(Number(a.sinal_valor) > 0)) continue
      const faltam = minutosRestantes(a, prazo, agora)
      /* Inclui o que JÁ venceu e nunca foi avisado. O horário já está solto,
         mas a dona continua sem saber — e pode ser um PIX que caiu. Sem isto,
         quem venceu antes desta rota existir nunca seria avisado. */
      if (faltam > JANELA_MIN) continue
      fila.push({ negocio, appt: a, faltam })
    }
  }

  /* Quem está mais perto de vencer (ou já venceu) vai primeiro: se o lote
     cortar, corta o que ainda tem folga. */
  fila.sort((x, y) => x.faltam - y.faltam)
  const lote = fila.slice(0, LOTE)

  let avisados = 0
  for (const { negocio, appt, faltam } of lote) {
    const { data: prof } = appt.professional_id
      ? await admin
          .from('professionals')
          .select('name, email, auth_user_id')
          .eq('id', appt.professional_id)
          .maybeSingle()
      : { data: null }

    const hora = String(appt.start_time).slice(0, 5)
    const valor = Number(appt.sinal_valor)
    const quem = appt.client_name || 'Cliente'

    /* PUSH · o canal que acorda ela. Mesmos destinatários do /api/notify:
       o profissional do atendimento e o dono (Set desduplica quando são a
       mesma pessoa, que é o caso da dona que atende sozinha). */
    const destinatarios = [...new Set([prof?.auth_user_id, negocio.owner_id].filter(Boolean) as string[])]
    if (destinatarios.length > 0) {
      try {
        const { data: subs } = await admin
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .in('user_id', destinatarios)

        if (subs && subs.length > 0) {
          const corpo =
            faltam > 0
              ? `${quem} · ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · vence em ${faltam} min. Se o PIX caiu, toque pra confirmar.`
              : `${quem} · o prazo passou e o horário de ${hora} voltou pra agenda. Se o PIX caiu, toque pra confirmar.`
          const payload = {
            titulo: faltam > 0 ? 'Sinal pra vencer' : 'Sinal vencido',
            corpo,
            /* Agenda do DIA do atendimento, não a tela do atendimento: o botão
               "Recebi o sinal" mora no card da agenda. */
            url: `/admin?date=${appt.appointment_date}`,
          }
          const results = await Promise.all(subs.map((s) => sendWebPush(s, payload)))
          const mortas = subs.filter((_, i) => results[i]?.gone).map((s) => s.endpoint)
          if (mortas.length > 0) await admin.from('push_subscriptions').delete().in('endpoint', mortas)
        }
      } catch (err) {
        console.error('[sinal-vencendo] push falhou:', err)
      }
    }

    /* E-MAIL · rede de segurança pra quando o push não chega (aparelho no
       silencioso, notificação nunca ativada, assinatura morta). Falha aqui
       não pode impedir a marca de avisado — senão a rota tenta pra sempre. */
    if (prof?.email) {
      try {
        await sendSinalVencendo({
          donaEmail: prof.email,
          clientName: quem,
          businessName: negocio.name ?? '',
          date: appt.appointment_date,
          startTime: hora,
          sinalValor: valor,
          minutosRestantes: faltam,
        })
      } catch (err) {
        console.error('[sinal-vencendo] email falhou:', err)
      }
    }

    /* Carimba DEPOIS de tentar enviar. Se a função morrer antes daqui, o
       agendamento continua sem marca e entra na próxima volta — repetir um
       aviso é barato, perder o aviso é o defeito original. */
    const { error } = await admin
      .from('appointments')
      .update({ sinal_aviso_enviado_at: new Date().toISOString() })
      .eq('id', appt.id)
    if (!error) avisados++
  }

  return NextResponse.json({
    ok: true,
    negocios: negocios.length,
    candidatos: fila.length,
    avisados,
    restam: Math.max(0, fila.length - lote.length),
  })
}
