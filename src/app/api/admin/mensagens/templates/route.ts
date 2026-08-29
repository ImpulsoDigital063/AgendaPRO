/* ═══════════════════════════════════════════════════════════════
   TEXTO PRÓPRIO DO NEGÓCIO — a dona escreve, a Meta aprova

   GET  → o texto padrão, o texto dela e em que pé está a aprovação
   PUT  → envia um texto novo pra análise da Meta

   ─── Por que não é só salvar ──────────────────────────────────
   Fora da janela de 24h o WhatsApp só entrega TEMPLATE APROVADO. Não existe
   "salvar e usar": todo texto novo passa por análise da Meta, que leva de
   minutos a cerca de um dia. Enquanto isso, o aviso continua saindo com o
   texto padrão — a dona não pode ficar sem lembrete porque está esperando
   aprovação.

   ─── Versão nova a cada envio ─────────────────────────────────
   Cada submissão cria um template com nome novo (`..._v2`, `..._v3`) em vez
   de editar o anterior. Dois motivos: a Meta não deixa editar template em
   análise, e apagar-e-recriar trava por ~1 minuto no "está sendo excluído"
   (erro 2388023, visto em 29/08). Nome novo não esbarra em nenhum dos dois.

   ─── Quem edita ───────────────────────────────────────────────
   Só o dono. É a mensagem que sai em nome do negócio para a cliente dele —
   recepção não decide isso, mesma régua do financeiro e dos pacotes.
   ═══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { TEMPLATES, validarCorpo, nomeMetaDoNegocio } from '@/lib/mensagens/templates-cloud'
import type { TipoMensagem } from '@/lib/mensagens/tipos'

export const runtime = 'nodejs'

/* Só os tipos que a varredura realmente executa. Mostrar editor de aviso que
   o motor não manda é prometer na tela o que o sistema não faz. */
const EDITAVEIS: TipoMensagem[] = ['confirmacao', 'lembrete_vespera', 'lembrete_dia', 'aniversario', 'retorno']

const ROTULO: Partial<Record<TipoMensagem, string>> = {
  confirmacao: 'Confirmação do agendamento',
  lembrete_vespera: 'Lembrete da véspera',
  lembrete_dia: 'Lembrete do dia',
  aniversario: 'Aniversário',
  retorno: 'Hora de voltar',
}

const BASE = process.env.WHATSAPP_BASE_URL || 'https://graph.facebook.com/v21.0'

function admin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function donoOuNada(): Promise<{ businessId: string } | { erro: NextResponse }> {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return { erro: NextResponse.json({ error: 'sem_acesso' }, { status: 403 }) }
  const { data: { user } } = await supabase.auth.getUser()
  const { data: neg } = await supabase.from('businesses').select('owner_id').eq('id', businessId).maybeSingle()
  if (!user || (neg as { owner_id?: string } | null)?.owner_id !== user.id) {
    return { erro: NextResponse.json({ error: 'so_o_dono_edita' }, { status: 403 }) }
  }
  return { businessId }
}

/**
 * Atualiza o status dos que estão em análise, lendo da Meta.
 *
 * Sem cron: sincroniza quando a dona abre a tela, que é exatamente quando
 * ela quer saber. Um cron pra isso rodaria o dia todo pra atender uma
 * pergunta que só existe enquanto ela está olhando.
 */
async function sincronizarStatus(db: ReturnType<typeof admin>, businessId: string) {
  const { data: pendentes } = await db
    .from('message_templates_negocio')
    .select('id, nome_meta')
    .eq('business_id', businessId)
    .eq('status', 'PENDING')
  if (!pendentes?.length) return

  const token = process.env.WHATSAPP_TOKEN
  const waba = process.env.WHATSAPP_WABA_ID
  if (!token || !waba) return

  const nomes = (pendentes as { id: string; nome_meta: string }[]).map((p) => p.nome_meta)
  const res = await fetch(
    `${BASE}/${waba}/message_templates?fields=name,status,rejected_reason&limit=200`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  ).catch(() => null)
  if (!res?.ok) return
  const j = await res.json().catch(() => null)
  const naMeta = new Map<string, { status?: string; rejected_reason?: string }>(
    (j?.data ?? []).map((t: { name: string; status?: string; rejected_reason?: string }) => [t.name, t]),
  )

  for (const p of pendentes as { id: string; nome_meta: string }[]) {
    if (!nomes.includes(p.nome_meta)) continue
    const t = naMeta.get(p.nome_meta)
    if (!t?.status || t.status === 'PENDING') continue
    await db
      .from('message_templates_negocio')
      .update({
        status: t.status,
        motivo: t.rejected_reason && t.rejected_reason !== 'NONE' ? t.rejected_reason : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', p.id)
  }
}

export async function GET() {
  const r = await donoOuNada()
  if ('erro' in r) return r.erro
  const db = admin()

  await sincronizarStatus(db, r.businessId).catch(() => null)

  const { data: meus } = await db
    .from('message_templates_negocio')
    .select('tipo, corpo, status, motivo, updated_at')
    .eq('business_id', r.businessId)
  const porTipo = new Map(
    ((meus ?? []) as { tipo: string }[]).map((m) => [m.tipo, m]),
  )

  return NextResponse.json({
    avisos: EDITAVEIS.map((tipo) => {
      const def = TEMPLATES[tipo]!
      const meu = porTipo.get(tipo) as
        | { corpo: string; status: string; motivo: string | null; updated_at: string }
        | undefined
      return {
        tipo,
        rotulo: ROTULO[tipo] ?? tipo,
        corpoPadrao: def.corpo,
        campos: def.campos,
        /* MARKETING avisa na tela: consome 7 do pacote em vez de 1. */
        marketing: def.categoria === 'MARKETING',
        meuTexto: meu?.corpo ?? null,
        status: meu?.status ?? null,
        motivo: meu?.motivo ?? null,
        atualizadoEm: meu?.updated_at ?? null,
      }
    }),
  })
}

export async function PUT(req: NextRequest) {
  const r = await donoOuNada()
  if ('erro' in r) return r.erro

  const body = await req.json().catch(() => ({}))
  const tipo = body?.tipo as TipoMensagem
  const corpo = String(body?.corpo ?? '')

  if (!EDITAVEIS.includes(tipo)) {
    return NextResponse.json({ error: 'aviso_invalido' }, { status: 400 })
  }

  /* Valida ANTES de gastar chamada na Meta. Erro dela volta genérico
     ("Invalid parameter") e a dona não teria como entender o que fazer. */
  const v = validarCorpo(tipo, corpo)
  if (!v.ok) return NextResponse.json({ error: 'texto_invalido', erros: v.erros }, { status: 400 })

  const token = process.env.WHATSAPP_TOKEN
  const waba = process.env.WHATSAPP_WABA_ID
  if (!token || !waba) {
    return NextResponse.json({ error: 'canal_nao_configurado' }, { status: 503 })
  }

  const db = admin()
  const { data: atual } = await db
    .from('message_templates_negocio')
    .select('nome_meta')
    .eq('business_id', r.businessId)
    .eq('tipo', tipo)
    .maybeSingle()

  /* Versão nova a cada envio: a Meta não deixa editar template em análise,
     e apagar-e-recriar fica ~1 min preso em "está sendo excluído". */
  const anterior = (atual as { nome_meta?: string } | null)?.nome_meta
  const versao = anterior ? Number(anterior.match(/_v(\d+)$/)?.[1] ?? 1) + 1 : 1
  const nome = nomeMetaDoNegocio(tipo, r.businessId) + (versao > 1 ? `_v${versao}` : '')

  const def = TEMPLATES[tipo]!
  const components: Record<string, unknown>[] = [
    {
      type: 'BODY',
      text: corpo,
      /* O exemplo é obrigatório e tem que ter um valor por campo. */
      example: { body_text: [def.campos.map((c) => c.toUpperCase().slice(0, 20))] },
    },
  ]
  if (def.categoria === 'MARKETING') {
    components.push({ type: 'FOOTER', text: 'Responda PARE para não receber mais mensagens.' })
  }
  if (def.botoes?.length) {
    components.push({
      type: 'BUTTONS',
      buttons: [
        { type: 'QUICK_REPLY', text: 'Confirmar presença' },
        { type: 'QUICK_REPLY', text: 'Preciso remarcar' },
      ],
    })
  }

  const res = await fetch(`${BASE}/${waba}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nome, language: def.idioma, category: def.categoria, components }),
  })
  const j = await res.json().catch(() => null)
  if (!res.ok) {
    /* `error.message` da Meta é sempre "Invalid parameter". O motivo real
       vive em error_user_title/error_user_msg — foi o que custou uma rodada
       inteira de tentativas em 29/08. */
    const e = j?.error
    return NextResponse.json(
      {
        error: 'meta_recusou',
        titulo: e?.error_user_title ?? e?.message ?? 'A Meta recusou o texto.',
        detalhe: e?.error_user_msg ?? null,
      },
      { status: 400 },
    )
  }

  const { error: upErr } = await db.from('message_templates_negocio').upsert(
    {
      business_id: r.businessId,
      tipo,
      nome_meta: nome,
      corpo,
      status: 'PENDING',
      motivo: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_id,tipo' },
  )
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  /* Read-after-write: aqui o valor decide qual texto a cliente vai receber. */
  const { data: conf } = await db
    .from('message_templates_negocio')
    .select('nome_meta, status')
    .eq('business_id', r.businessId)
    .eq('tipo', tipo)
    .maybeSingle()
  if ((conf as { nome_meta?: string } | null)?.nome_meta !== nome) {
    return NextResponse.json({ error: 'nao_persistiu' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: 'PENDING' })
}
