/* ═══════════════════════════════════════════════════════════════
   WEBHOOK — o que a cliente responde volta pra cá

   Faz três coisas, e cada uma resolve um problema real:

   1. BOTÃO "Confirmo" → marca o atendimento como confirmado na agenda da
      dona, sozinho. É o que ataca a FALTA sem pedir dinheiro antecipado —
      a mesma dor de R$ 5.395/30 dias que originou o sinal, por outro
      caminho. A dona abre o painel e vê quem confirmou.

   2. BOTÃO "Preciso remarcar" → responde na hora com o WhatsApp do salão.
      Sem isso a cliente fica no vácuo num número que não atende, e quem
      ouve a reclamação é a dona.

   3. "PARE" → registra o opt-out. Respeitar isso é o que separa aviso de
      spam pra quem recebe — e denúncia de spam é o que derruba número de
      WhatsApp, não volume.

   ⚠️ O FORMATO DO PAYLOAD É DA W-API e está a confirmar no painel deles.
   Por isso a leitura dos campos está isolada em `lerEvento()`: quando a
   conta existir, ajusta ali e o resto continua valendo.

   Sem autenticação por token porque webhook de provedor não manda header
   custom: a proteção é não confiar em nada do corpo. Só age sobre
   agendamento que ele mesmo achou pelo telefone, e a única escrita é
   confirmar presença.
   ═══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { normalizarTelefone, credencialDoSistema, enviarTexto } from '@/lib/mensagens/canal-whatsapp'
import { todayBR } from '@/lib/date-br'

export const runtime = 'nodejs'

type Evento = { telefone: string | null; texto: string; botaoId: string | null }

function lerEvento(body: Record<string, any>): Evento {
  const telefone =
    body?.phone ?? body?.sender?.id ?? body?.from ?? body?.data?.phone ?? null
  const texto = String(
    body?.text?.message ?? body?.message ?? body?.body ?? body?.data?.text ?? '',
  )
  const botaoId =
    body?.buttonsResponseMessage?.buttonId ??
    body?.buttonReply?.id ??
    body?.selectedButtonId ??
    null
  return { telefone: telefone ? String(telefone) : null, texto, botaoId }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const ev = lerEvento(body)
  const fone = ev.telefone ? normalizarTelefone(ev.telefone) : null
  if (!fone) return NextResponse.json({ ok: true, ignorado: 'sem_telefone' })

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const texto = ev.texto.trim().toLowerCase()
  const acao =
    ev.botaoId === 'confirmar' ? 'confirmar'
    : ev.botaoId === 'remarcar' ? 'remarcar'
    : texto === 'pare' || texto === 'parar' || texto === 'sair' ? 'pare'
    : null

  /* Responder de verdade, e nao so devolver o texto no JSON: o provedor nao
     envia a resposta por ti, e o aparelho do numero remetente vive
     DESLIGADO (Eduardo, 07/08) - ou seja, ninguem vai ler o que a cliente
     escrever. Sem resposta automatica, o numero vira "aquele que manda e
     nao responde", que e o perfil que rende denuncia de spam. */
  const responder = async (texto: string) => {
    const cred = credencialDoSistema()
    if (!cred) return false
    const r = await enviarTexto(cred, fone, texto)
    return r.ok
  }

  if (!acao) {
    /* Qualquer outra coisa que ela escreva: orienta pra onde ir. Uma vez a
       cada 12h por telefone, pra conversa nao virar ping-pong com robo -
       a trava e a mesma chave UNIQUE do message_log. */
    const janela = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 13)
    const { error: repetido } = await db.from('message_log').insert({
      chave: `auto_resposta:${fone}:${janela}`, tipo: 'confirmacao',
      canal: 'whatsapp', destino: fone, status: 'enviado',
    })
    if (!repetido) {
      await responder(
        'Este numero so envia avisos automaticos e nao e lido. ' +
        'Para remarcar ou tirar duvida, fale direto com o salao pelo telefone que aparece na mensagem do seu horario.',
      )
    }
    return NextResponse.json({ ok: true, ignorado: 'sem_acao', respondeu: !repetido })
  }

  if (acao === 'pare') {
    /* Opt-out global (business_id null): ela pediu pra parar de receber, e
       ficar decidindo de qual salão é a mensagem pra continuar mandando das
       outras é o tipo de esperteza que rende denúncia. */
    await db.from('message_optout').insert({ telefone: fone, motivo: 'respondeu PARE' })
    return NextResponse.json({ ok: true, acao: 'opt_out' })
  }

  /* Acha o agendamento futuro mais próximo desse telefone. Só os dígitos
     finais são comparados porque o cadastro guarda em formatos diferentes
     (com e sem DDI, com e sem máscara) — mesmo motivo do fix das fichas
     duplicadas em 05/08. */
  const ultimos8 = fone.slice(-8)
  const { data: candidatos } = await db
    .from('appointments')
    .select('id, business_id, client_phone, appointment_date, start_time, status, business:businesses(phone, name)')
    .gte('appointment_date', todayBR())
    .in('status', ['pending', 'confirmed'])
    .order('appointment_date')
    .limit(200)

  const alvo = (candidatos ?? []).find((a) =>
    String(a.client_phone ?? '').replace(/\D/g, '').endsWith(ultimos8),
  )
  if (!alvo) return NextResponse.json({ ok: true, ignorado: 'sem_agendamento' })

  const negocio = alvo.business as unknown as { phone: string | null; name: string } | null

  if (acao === 'confirmar') {
    await db.from('appointments').update({ status: 'confirmed' }).eq('id', alvo.id)
    await responder(`Presenca confirmada! Ate breve, ${negocio?.name ?? 'te esperamos'}.`)
    return NextResponse.json({ ok: true, acao: 'confirmado', appointmentId: alvo.id })
  }

  // remarcar: manda o contato do salao. Quem remarca e a dona, nao o robo.
  await responder(
    negocio?.phone
      ? `Sem problema! Para remarcar, fale com ${negocio.name}: ${negocio.phone}`
      : `Sem problema! Fale com ${negocio?.name ?? 'o salao'} para remarcar.`,
  )
  return NextResponse.json({ ok: true, acao: 'remarcar' })
}
