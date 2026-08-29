/* ═══════════════════════════════════════════════════════════════
   AVISO DE CONSUMO — "seu pacote está acabando" / "acabou"

   Dois avisos, e só dois:
     · 80% do pacote usado, com saldo ainda de pé
     · saldo zerado — aí os lembretes DE VERDADE pararam

   ─── Por que push, e não WhatsApp ─────────────────────────────
   Mandar esse aviso por WhatsApp consumiria mensagem do pacote dela — o
   aviso comeria justamente o que está acabando. Vai por push do navegador,
   que é o canal que a dona já recebe e que não custa nada. Mesma lógica
   pela qual os avisos ao dono por WhatsApp foram desligados em 21/08.

   ─── Por que não tem aviso de "vence em 3 dias" ───────────────
   Porque o pacote não vence: ele acaba. O que ela pagou é dela até o saldo
   zerar, e a renovação vem no mesmo PIX da mensalidade — que já tem os
   próprios lembretes em D-3, D-2, D-1. Um aviso a mais ali seria só ruído
   em cima de uma cobrança que ela já está vendo.

   ─── Repetição ───────────────────────────────────────────────
   A trava é a chave UNIQUE do `message_log`, a mesma da resposta
   automática. `canal: 'push'` mantém essas linhas FORA da contagem da
   franquia, que só soma `canal = 'whatsapp'` — senão o aviso de que o
   pacote está acabando gastaria pacote.

   A chave inclui o início do ciclo: cada recarga volta a poder avisar, sem
   guardar estado em lugar nenhum.
   ═══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendWebPush } from '@/lib/notify-push'
import { consumoDoMes } from '@/lib/mensagens/franquia'
import { pacoteRecomendado, custoNoPacote } from '@/lib/mensagens/pacotes'

export const runtime = 'nodejs'

const LIMIAR_AVISO = 0.8

export async function GET(req: NextRequest) {
  // Auth: Vercel cron envia Bearer CRON_SECRET
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  /* Só quem tem pacote. Quem não contratou não tem o que acabar. */
  const { data: negocios } = await admin
    .from('businesses')
    .select('id, name, owner_id, avisos_pacote')
    .not('avisos_pacote', 'is', null)

  let avisados = 0
  let semPush = 0
  let repetidos = 0
  const mortas: string[] = []

  for (const n of (negocios ?? []) as {
    id: string
    name: string
    owner_id: string | null
    avisos_pacote: string
  }[]) {
    if (!n.owner_id) continue

    const c = await consumoDoMes(admin, n.id).catch(() => null)
    if (!c || !c.pacote || c.franquia <= 0) continue

    const usadoPct = c.usadas / c.franquia
    const tipo = c.saldo <= 0 ? 'esgotou' : usadoPct >= LIMIAR_AVISO ? 'acabando' : null
    if (!tipo) continue

    /* Sugere o degrau que sairia mais barato NO CONSUMO DELA — não o maior.
       O mesmo critério da tela: quem é empurrado pra cima desconfia da
       conta inteira. */
    const projetado = Math.max(c.usadas, c.franquia)
    const sugerido = pacoteRecomendado(projetado)
    const custoSugerido = custoNoPacote(sugerido, projetado)

    const payload =
      tipo === 'esgotou'
        ? {
            titulo: 'Seus avisos pararam',
            corpo:
              `As ${c.franquia} mensagens do pacote acabaram. Suas clientes não recebem lembrete ` +
              `até você renovar. O ${sugerido.nome} sairia R$ ${custoSugerido.toFixed(2).replace('.', ',')}.`,
            url: '/admin/whatsapp',
          }
        : {
            titulo: 'Seus avisos estão acabando',
            corpo:
              `Restam ${c.saldo} de ${c.franquia} mensagens. Quando acabarem, os lembretes param ` +
              `até você renovar — dá para renovar ou subir de pacote antes disso.`,
            url: '/admin/whatsapp',
          }

    /* A chave carrega o ciclo: recarregou, pode avisar de novo.
       Gravar ANTES de mandar — se a gravação falhar por já existir, ninguém
       recebe duas vezes. Mandar antes e gravar depois deixa janela. */
    const { error: jaAvisou } = await admin.from('message_log').insert({
      business_id: n.id,
      chave: `aviso_consumo:${n.id}:${tipo}:${c.inicioDoCiclo}`,
      tipo: 'confirmacao',
      canal: 'push', // fora da contagem da franquia, que só soma 'whatsapp'
      destino: n.owner_id,
      status: 'enviado',
    })
    if (jaAvisou) {
      repetidos++
      continue
    }

    const { data: devices } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', n.owner_id)

    if (!devices?.length) {
      semPush++
      continue
    }
    for (const d of devices) {
      const r = await sendWebPush({ endpoint: d.endpoint, p256dh: d.p256dh, auth: d.auth }, payload)
      if (r.ok) avisados++
      else if (r.gone) mortas.push(d.endpoint)
    }
  }

  if (mortas.length) {
    await admin.from('push_subscriptions').delete().in('endpoint', mortas)
  }

  return NextResponse.json({ ok: true, avisados, sem_push: semPush, repetidos, limpas: mortas.length })
}
