/* ═══════════════════════════════════════════════════════════════
   SAÚDE DO CANAL — o alarme do mundo novo

   O alarme antigo era "a sessão caiu". Na Cloud API não existe sessão: o
   número é registrado e fica. As falhas mudaram de natureza, e todas são
   silenciosas — o envio continua parecendo normal até parar de vez.

   Quatro coisas são vigiadas aqui:

   1. QUALIDADE DO NÚMERO (GREEN → YELLOW → RED). Cai quando as pessoas
      bloqueiam ou denunciam. É o único aviso que vem ANTES da Meta
      restringir o envio. Com número único, um salão exagerando derruba os
      avisos de todos os outros junto.

   2. TEMPLATE PAUSADO OU REPROVADO. A Meta pausa template que recebe
      feedback negativo demais. Pausado = aquele aviso simplesmente para de
      sair, sem erro em lugar nenhum.

   3. 🔴 RECLASSIFICAÇÃO DE CATEGORIA. Um lembrete aprovado como UTILITY
      pode virar MARKETING depois. O custo multiplica por ~7 e a franquia
      da dona estoura em uma semana. Nada na tela mostraria isso: a
      mensagem continua saindo igual, só que sete vezes mais cara.

   4. TOKEN. Se a chamada volta 190, o canal inteiro está mudo.

   Quem recebe é o Eduardo, por Telegram — não a dona. O número é
   compartilhado e a conta é da Impulso: são problemas de plataforma, e
   avisar dez donas sobre uma coisa que só ele resolve é ruído.

   Repetição: a trava é a chave UNIQUE do message_log, um alarme por dia
   por assunto. Alarme que repete de hora em hora vira alarme ignorado.
   ═══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendAlert } from '@/lib/alert'
import { TEMPLATES } from '@/lib/mensagens/templates-cloud'
import { todayBR } from '@/lib/date-br'
import type { TipoMensagem } from '@/lib/mensagens/tipos'

export const runtime = 'nodejs'

const BASE = process.env.WHATSAPP_BASE_URL || 'https://graph.facebook.com/v21.0'

/**
 * Categoria que a gente ESPERA de cada template nosso.
 *
 * Casa pelo TIPO (`agendapro_lembrete_vespera...`), não pelo nome exato do
 * padrão. É o que faz o alarme continuar valendo para:
 *   · a variante por negócio  — agendapro_lembrete_vespera_3b6246cb
 *   · a versão dela           — agendapro_lembrete_vespera_3b6246cb_v2
 *   · o próprio padrão renomeado — agendapro_confirmacao_v2
 *
 * Casar pelo nome do padrão deixaria as variantes de fora, e elas são
 * exatamente as que a dona escreveu — as mais capazes de virar marketing.
 */
function categoriaEsperada(nome: string): 'UTILITY' | 'MARKETING' | null {
  for (const tipo of Object.keys(TEMPLATES) as TipoMensagem[]) {
    const def = TEMPLATES[tipo]
    if (!def) continue
    const raiz = `agendapro_${tipo}`
    if (nome === raiz || nome.startsWith(raiz + '_')) return def.categoria
  }
  return null
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const waba = process.env.WHATSAPP_WABA_ID
  if (!token || !phoneId || !waba) {
    return NextResponse.json({ ok: true, ignorado: 'canal_nao_configurado' })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const hoje = todayBR()
  const alarmes: string[] = []

  /* Um por dia por assunto. Grava ANTES de mandar: se a chave já existe,
     ninguém recebe duas vezes. */
  const novo = async (assunto: string) => {
    const { error } = await db.from('message_log').insert({
      chave: `alarme_canal:${assunto}:${hoje}`,
      tipo: 'confirmacao',
      canal: 'alarme', // fora da contagem da franquia, que só soma 'whatsapp'
      destino: 'operador',
      status: 'enviado',
    })
    return !error
  }

  // ── 1 e 4. Número e token ────────────────────────────────────
  const rNum = await fetch(
    `${BASE}/${phoneId}?fields=display_phone_number,verified_name,quality_rating,throughput,code_verification_status`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  ).catch(() => null)

  if (!rNum || !rNum.ok) {
    const j = await rNum?.json().catch(() => null)
    const code = j?.error?.code
    /* 190 = token morto. É o único que para TUDO, e o único que ninguém
       percebe até a dona reclamar que a cliente não recebeu. */
    const assunto = code === 190 ? 'token' : `numero_http_${rNum?.status ?? 'sem_resposta'}`
    if (await novo(assunto)) {
      alarmes.push(assunto)
      await sendAlert(
        code === 190
          ? '🔴 <b>AgendaPRO · WhatsApp</b>\nO token da Cloud API não vale mais. <b>Nenhum aviso está saindo.</b>\nGerar outro em Usuários do sistema → agendapro-avisos.'
          : `🔴 <b>AgendaPRO · WhatsApp</b>\nO número não respondeu (HTTP ${rNum?.status ?? 'sem resposta'}). Os avisos podem estar parados.`,
      )
    }
  } else {
    const j = await rNum.json().catch(() => null)
    const q = j?.quality_rating as string | undefined
    if (q === 'RED' || q === 'YELLOW') {
      if (await novo(`qualidade_${q}`)) {
        alarmes.push(`qualidade_${q}`)
        await sendAlert(
          q === 'RED'
            ? '🔴 <b>AgendaPRO · WhatsApp</b>\nQualidade do número em <b>VERMELHO</b>. A Meta pode limitar o envio a qualquer momento.\nVer quem está mandando demais e desligar régua não essencial — o número é compartilhado, isso derruba TODOS os negócios juntos.'
            : '🟡 <b>AgendaPRO · WhatsApp</b>\nQualidade do número caiu para <b>AMARELO</b>. Ainda envia, mas é o aviso que vem antes da restrição.',
        )
      }
    }
  }

  // ── 2 e 3. Templates ─────────────────────────────────────────
  const rTpl = await fetch(
    `${BASE}/${waba}/message_templates?fields=name,status,category,rejected_reason&limit=200`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  ).catch(() => null)

  if (rTpl?.ok) {
    const j = await rTpl.json().catch(() => null)
    for (const t of (j?.data ?? []) as {
      name: string
      status?: string
      category?: string
      rejected_reason?: string
    }[]) {
      const esperada = categoriaEsperada(t.name)
      if (!esperada) continue // template que não é nosso

      /* 🔴 O mais caro e o mais invisível: a mensagem continua saindo igual,
         só que sete vezes mais cara, e a franquia da dona estoura. */
      if (t.category && t.category !== esperada) {
        if (await novo(`categoria_${t.name}`)) {
          alarmes.push(`categoria_${t.name}`)
          await sendAlert(
            `🔴 <b>AgendaPRO · WhatsApp</b>\nA Meta reclassificou <code>${t.name}</code> de <b>${esperada}</b> para <b>${t.category}</b>.\n` +
              'Custo por mensagem multiplica por ~7 e a franquia estoura. Reescrever o texto para voltar a utilidade, ou tirar do ar.',
          )
        }
      }

      if (t.status === 'PAUSED' || t.status === 'DISABLED') {
        if (await novo(`pausado_${t.name}`)) {
          alarmes.push(`pausado_${t.name}`)
          await sendAlert(
            `🟠 <b>AgendaPRO · WhatsApp</b>\nO template <code>${t.name}</code> está <b>${t.status}</b>.\nEsse aviso parou de sair — sem erro em lugar nenhum.`,
          )
        }
      }

      if (t.status === 'REJECTED') {
        if (await novo(`reprovado_${t.name}`)) {
          alarmes.push(`reprovado_${t.name}`)
          await sendAlert(
            `🟠 <b>AgendaPRO · WhatsApp</b>\nO template <code>${t.name}</code> foi <b>reprovado</b>` +
              `${t.rejected_reason && t.rejected_reason !== 'NONE' ? ` (${t.rejected_reason})` : ''}.`,
          )
        }
      }
    }
  }

  return NextResponse.json({ ok: true, alarmes })
}
