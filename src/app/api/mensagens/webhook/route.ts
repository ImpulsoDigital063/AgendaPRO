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
import { normalizarTelefone } from '@/lib/mensagens/canal-whatsapp'
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

  if (!acao) return NextResponse.json({ ok: true, ignorado: 'sem_acao' })

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

  if (acao === 'confirmar') {
    await db.from('appointments').update({ status: 'confirmed' }).eq('id', alvo.id)
    return NextResponse.json({ ok: true, acao: 'confirmado', appointmentId: alvo.id })
  }

  // remarcar: devolve o contato do salão. Quem remarca é a dona, não o robô.
  const negocio = alvo.business as unknown as { phone: string | null; name: string } | null
  return NextResponse.json({
    ok: true,
    acao: 'remarcar',
    responder: negocio?.phone
      ? `Sem problema! Pra remarcar, fale com ${negocio.name}: ${negocio.phone}`
      : `Sem problema! Fale com ${negocio?.name ?? 'o salão'} para remarcar.`,
  })
}
