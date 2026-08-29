/* ═══════════════════════════════════════════════════════════════
   WEBHOOK — o que volta da Meta cai aqui

   Reescrito em 28/08 pro formato da Cloud API. O anterior lia o payload da
   W-API (`body.phone`, `buttonsResponseMessage`) — estrutura que não existe
   mais. Aqui o corpo vem aninhado em `entry → changes → value`, e traz
   DUAS listas independentes no mesmo POST:

   · `messages[]` — o que a cliente mandou (botão tocado ou texto digitado)
   · `statuses[]` — o que aconteceu com o que NÓS mandamos

   `statuses[]` é a novidade que muda o produto. Até agora `enviado` no
   message_log significava "o provedor aceitou" e nada mais — em 21/08,
   cinco mensagens foram aceitas e três nunca chegaram em aparelho nenhum.
   Agora a entrega é fato gravado, não fé.

   ─── O que ele faz, e por quê ─────────────────────────────────
   1. BOTÃO "Confirmar presença" → confirma o atendimento na agenda sozinho.
      É o que ataca a FALTA sem pedir dinheiro antecipado.
   2. BOTÃO "Preciso remarcar" → devolve o WhatsApp do salão na hora. Sem
      isso a cliente fica no vácuo e quem ouve a reclamação é a dona.
   3. "PARE" → opt-out. Respeitar isso é o que separa aviso de spam — e
      denúncia é o que derruba número, não volume.
   4. STATUS → entregue / lido / falhou, com o código de erro da Meta.

   ─── Segurança ────────────────────────────────────────────────
   Agora TEM autenticação, e precisa ter. A rota confirma presença em
   agendamento: sem verificar assinatura, qualquer um que descubra a URL
   confirma horário alheio. A Meta assina todo POST com HMAC-SHA256 do
   corpo cru em `X-Hub-Signature-256`, e o GET de verificação responde o
   desafio com o nosso verify token.
   ═══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { normalizarTelefone, credencialDoSistema, enviarTexto } from '@/lib/mensagens/canal-cloud'
import { todayBR } from '@/lib/date-br'

export const runtime = 'nodejs'

/* ─── GET: a Meta assina a URL uma vez, no cadastro do webhook ─── */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN
  if (p.get('hub.mode') === 'subscribe' && esperado && p.get('hub.verify_token') === esperado) {
    /* Tem que voltar como texto puro. JSON aqui faz a Meta recusar a URL,
       e o erro dela não diz por quê. */
    return new NextResponse(p.get('hub.challenge') ?? '', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    })
  }
  return new NextResponse('forbidden', { status: 403 })
}

/**
 * Confere a assinatura da Meta contra o corpo CRU.
 *
 * Tem que ser o corpo cru: `JSON.parse` seguido de `stringify` reordena
 * chaves e muda espaço, e aí o hash nunca bate. Por isso o POST abaixo lê
 * `req.text()` e só depois faz o parse.
 */
function assinaturaConfere(cru: string, header: string | null): boolean {
  const segredo = process.env.WHATSAPP_APP_SECRET
  if (!segredo) return false
  if (!header?.startsWith('sha256=')) return false
  const nosso = crypto.createHmac('sha256', segredo).update(cru).digest('hex')
  const deles = header.slice('sha256='.length)
  if (nosso.length !== deles.length) return false
  // timingSafeEqual pra não vazar o hash pelo tempo de resposta.
  return crypto.timingSafeEqual(Buffer.from(nosso), Buffer.from(deles))
}

type Db = SupabaseClient

/* ═══ STATUS: o que aconteceu com o que a gente mandou ═══════════ */

type StatusMeta = {
  id?: string
  status?: string
  timestamp?: string
  errors?: { code?: number; title?: string; message?: string }[]
}

/**
 * A Meta manda até três callbacks por mensagem (sent, delivered, read) e
 * eles chegam FORA DE ORDEM. Por isso cada um escreve só o próprio campo,
 * em vez de sobrescrever um campo único de "situação": um `sent` atrasado
 * chegando depois do `delivered` apagaria a entrega.
 */
async function gravarStatus(db: Db, st: StatusMeta): Promise<string | null> {
  if (!st.id || !st.status) return null
  const quando = st.timestamp
    ? new Date(Number(st.timestamp) * 1000).toISOString()
    : new Date().toISOString()

  const campos: Record<string, unknown> = {}
  if (st.status === 'delivered') {
    campos.entregue_em = quando
  } else if (st.status === 'read') {
    campos.lido_em = quando
    /* Lida implica entregue. A Meta às vezes só manda o `read` quando a
       cliente abre rápido, e sem isso a linha ficaria "lida mas nunca
       entregue" — que não faz sentido pra quem for ler o relatório. */
    campos.entregue_em = quando
  } else if (st.status === 'failed') {
    const e = st.errors?.[0]
    campos.falhou_em = quando
    campos.falha_codigo = e?.code != null ? String(e.code) : null
    campos.falha_motivo = (e?.message ?? e?.title ?? 'sem detalhe').slice(0, 300)
    campos.status = 'falhou'
  } else {
    return st.status // 'sent' não muda nada: o insert do envio já cobre
  }

  await db.from('message_log').update(campos).eq('provider_id', st.id)
  return st.status
}

/* ═══ MENSAGEM: o que a cliente mandou ═══════════════════════════ */

type MsgMeta = {
  from?: string
  type?: string
  text?: { body?: string }
  button?: { payload?: string; text?: string }
  interactive?: { button_reply?: { id?: string; title?: string } }
}

type Acao = { tipo: 'confirmar' | 'remarcar' | 'pare'; appointmentId: string | null } | null

/**
 * Lê a intenção sem depender de um campo só.
 *
 * O payload do botão de template chega em `button.payload` e carrega o id
 * do agendamento — é a fonte boa, porque diz QUAL horário ela confirmou.
 * Mas o reconhecimento por TEXTO continua valendo, e não é redundância:
 * muita cliente digita "confirmo" em vez de tocar no botão, e em 21/08 o
 * clique chegou como texto puro. Duas portas, uma decisão.
 */
function lerAcao(m: MsgMeta): Acao {
  const payload = m.button?.payload ?? m.interactive?.button_reply?.id ?? ''
  const [verbo, appt] = payload.split(':')
  if (verbo === 'confirmar' || verbo === 'remarcar') {
    return { tipo: verbo, appointmentId: appt || null }
  }

  const t = (m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? '')
    .trim()
    .toLowerCase()
  if (['confirmo', 'confirmar', 'confirmado', 'sim', 'confirmar presença', 'confirmar presenca'].includes(t))
    return { tipo: 'confirmar', appointmentId: null }
  if (['remarcar', 'preciso remarcar', 'remarcar horario', 'remarcar horário'].includes(t))
    return { tipo: 'remarcar', appointmentId: null }
  if (['pare', 'parar', 'sair'].includes(t)) return { tipo: 'pare', appointmentId: null }
  return null
}

const CAMPOS_APPT =
  'id, business_id, client_phone, appointment_date, start_time, status, business:businesses(phone, name)'

type Appt = {
  id: string
  business_id: string
  client_phone: string | null
  business: { phone: string | null; name: string } | null
}

async function tratarMensagem(db: Db, m: MsgMeta): Promise<string> {
  const fone = m.from ? normalizarTelefone(m.from) : null
  if (!fone) return 'sem_telefone'

  /* Responder de verdade, e não só devolver no JSON: a Meta não responde
     por nós, e o número não é lido por ninguém. Número que manda e nunca
     responde é o perfil que rende denúncia de spam.
     Isto aqui é de graça: ela acabou de escrever, então a janela de 24h
     está aberta e texto livre dentro da janela não entra na fatura. */
  const responder = async (texto: string) => {
    const cred = credencialDoSistema()
    if (!cred) return false
    return (await enviarTexto(cred, fone, texto)).ok
  }

  const acao = lerAcao(m)

  if (!acao) {
    /* Uma resposta automática a cada 12h por telefone, pra conversa não
       virar ping-pong com robô. A trava é a mesma chave UNIQUE do
       message_log — sem estado extra em lugar nenhum.
       (O código anterior dizia 12h no comentário mas a chave girava de
       hora em hora. Agora o balde é de 12h de verdade.) */
    const balde = Math.floor(Date.now() / (12 * 3600_000))
    const { error: repetido } = await db.from('message_log').insert({
      chave: `auto_resposta:${fone}:${balde}`,
      tipo: 'confirmacao',
      canal: 'whatsapp',
      destino: fone,
      status: 'enviado',
    })
    if (!repetido) {
      await responder(
        /* Sem a palavra "salão": este mesmo texto chega pra cliente de
           clínica, barbearia e estúdio. Nada faz a dona desconfiar mais
           rápido de que o sistema não é pra ela. */
        'Este número só envia avisos automáticos e não é lido. ' +
          'Para remarcar ou tirar dúvida, fale pelo telefone que aparece na mensagem do seu horário.',
      )
    }
    return 'sem_acao'
  }

  if (acao.tipo === 'pare') {
    /* Opt-out global (business_id null): ela pediu pra parar, e ficar
       decidindo de qual salão era a mensagem pra continuar mandando das
       outras é o tipo de esperteza que rende denúncia. */
    await db.from('message_optout').insert({ telefone: fone, motivo: 'respondeu PARE' })
    return 'opt_out'
  }

  /* ACHAR O AGENDAMENTO.
     Com o id no payload é leitura direta — acabou a adivinhação. O caminho
     por telefone continua existindo pra quem DIGITA "confirmo", e é ele
     que erra quando a cliente tem dois horários marcados: pega o mais
     próximo, que é o melhor palpite possível, não uma certeza. */
  let alvo: Appt | null = null

  if (acao.appointmentId) {
    const { data } = await db
      .from('appointments')
      .select(CAMPOS_APPT)
      .eq('id', acao.appointmentId)
      .maybeSingle()
    const a = data as unknown as Appt | null
    /* Confere que o agendamento é MESMO de quem escreveu. Sem isso, quem
       adivinhar um id confirma horário de terceiro. */
    const doTelefone = String(a?.client_phone ?? '')
      .replace(/\D/g, '')
      .endsWith(fone.slice(-8))
    if (a && doTelefone) alvo = a
  }

  if (!alvo) {
    const { data: candidatos } = await db
      .from('appointments')
      .select(CAMPOS_APPT)
      .gte('appointment_date', todayBR())
      .in('status', ['pending', 'confirmed'])
      .order('appointment_date')
      .limit(200)
    /* Só os dígitos finais são comparados porque o cadastro guarda em
       formatos diferentes (com e sem DDI, com e sem máscara). */
    alvo =
      ((candidatos ?? []) as unknown as Appt[]).find((a) =>
        String(a.client_phone ?? '')
          .replace(/\D/g, '')
          .endsWith(fone.slice(-8)),
      ) ?? null
  }

  if (!alvo) return 'sem_agendamento'
  const negocio = alvo.business

  if (acao.tipo === 'confirmar') {
    await db.from('appointments').update({ status: 'confirmed' }).eq('id', alvo.id)
    await responder(
      negocio?.name ? `Presença confirmada! Até breve, ${negocio.name}.` : 'Presença confirmada! Até breve.',
    )
    return 'confirmado'
  }

  // remarcar: manda o contato do salão. Quem remarca é a dona, não o robô.
  await responder(
    negocio?.phone
      ? `Sem problema! Para remarcar, fale com ${negocio.name}: ${negocio.phone}`
      : negocio?.name
        ? `Sem problema! Fale com ${negocio.name} para remarcar.`
        : /* Sem nome do negócio, NÃO inventa categoria: 'o salão' chega em
             cliente de clínica e barbearia igual. Aponta pro telefone. */
          'Sem problema! Fale pelo telefone que aparece na mensagem do seu horário para remarcar.',
  )
  return 'remarcar'
}

/* ═══ POST: um evento traz várias mensagens E vários status ══════ */
export async function POST(req: NextRequest) {
  const cru = await req.text()
  if (!assinaturaConfere(cru, req.headers.get('x-hub-signature-256'))) {
    /* 403 sem detalhe: dizer POR QUE falhou ajuda quem está tentando. */
    return new NextResponse('forbidden', { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(cru)
  } catch {
    return NextResponse.json({ ok: true, ignorado: 'corpo_invalido' })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const feito: string[] = []
  /* Percorrer TUDO. Tratar só o primeiro e responder 200 faz a Meta achar
     que foi tudo processado — e o resto some sem deixar rastro. */
  for (const entry of (body?.entry as Record<string, unknown>[]) ?? []) {
    for (const change of (entry?.changes as Record<string, unknown>[]) ?? []) {
      const v = (change?.value as Record<string, unknown>) ?? {}
      for (const st of (v.statuses as StatusMeta[]) ?? []) {
        const r = await gravarStatus(db, st).catch(() => null)
        if (r) feito.push(`status:${r}`)
      }
      for (const m of (v.messages as MsgMeta[]) ?? []) {
        const r = await tratarMensagem(db, m).catch((e) => `erro:${String(e).slice(0, 80)}`)
        feito.push(`msg:${r}`)
      }
    }
  }

  /* Sempre 200 quando a assinatura confere. Erro nosso não é motivo pra
     Meta reenviar em loop — o que ela reenvia, ela reenvia por dias. */
  return NextResponse.json({ ok: true, feito })
}
