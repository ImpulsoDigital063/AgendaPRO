/* ═══════════════════════════════════════════════════════════════
   CONEXÃO DO NÚMERO — conectou / desconectou

   O provedor avisa quando a sessão do WhatsApp cai. Isso é MUITO melhor
   que o jeito que eu tinha feito (deduzir pelo lote inteiro falhando):
   ali a gente só descobria na próxima hora, e só se houvesse mensagem pra
   mandar. Aqui a gente sabe no segundo em que cai.

   Importa porque o aparelho do número remetente vive desligado e é ligado
   ~1x por semana (Eduardo, 07/08). O WhatsApp derruba a sessão se o
   aparelho principal não aparecer em ~14 dias, e a partir daí TODOS os
   avisos param em silêncio — ninguém descobre até uma cliente reclamar
   que não foi lembrada.

   Vai pro mesmo Telegram que já recebe o monitor.
   ═══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server'
import { sendAlert } from '@/lib/alert'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  /* Formato do provedor a confirmar — por isso olha vários campos e, no
     limite, o texto cru do corpo. Errar a leitura aqui só custa um alerta
     a mais; deixar de avisar custa uma semana de mensagem não enviada. */
  const cru = JSON.stringify(body).toLowerCase()
  const desconectou =
    body?.connected === false ||
    /disconnect|desconect|logout|close|offline/.test(cru)
  const conectou =
    body?.connected === true ||
    /"connected"|connect|online/.test(cru) && !desconectou

  if (desconectou) {
    await sendAlert(
      '🔴 WHATSAPP DESCONECTADO (AgendaPRO Avisos)\n\n' +
      'Os lembretes e confirmações PARARAM. Ligue o aparelho do número remetente ' +
      'e reconecte a instância no painel da W-API.',
    )
    return NextResponse.json({ ok: true, evento: 'desconectado', alertado: true })
  }

  if (conectou) {
    await sendAlert('🟢 WhatsApp reconectado (AgendaPRO Avisos). Os avisos voltaram a sair.')
    return NextResponse.json({ ok: true, evento: 'conectado', alertado: true })
  }

  return NextResponse.json({ ok: true, evento: 'ignorado' })
}
