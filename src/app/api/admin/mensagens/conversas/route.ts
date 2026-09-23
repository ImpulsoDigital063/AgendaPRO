/* ═══════════════════════════════════════════════════════════════
   A CONVERSA, DO JEITO QUE A CLIENTE VIU

   Eduardo, 22/09/2026: "simula a tela do whatsapp, assim as clientes vão
   entender só de bater o olho".

   A lista de "enviado / entregue / lido" já existia e ainda era relatório —
   a dona lia rótulo e status, não a conversa. Aqui ela vê o balão que saiu,
   o balão que a cliente respondeu, e os tiquinhos. Nada pra interpretar.

   ─── Por que o texto é remontado, e não lido do banco ──────────

   `message_log` guarda O QUE foi enviado (tipo, hora, status), nunca o
   CORPO. Remontar usa a mesma fonte do envio: o modelo do negócio (ou o
   padrão) + os dados reais daquele atendimento. É o mesmo caminho da prévia
   da aba, então o que aparece aqui é o que a cliente leu.

   O limite honesto disso: se a dona editou o modelo DEPOIS de enviar, o
   balão mostra o texto de hoje, não o de ontem. Pra ficar exato seria
   preciso gravar o corpo no envio (coluna nova) — vale quando alguém
   reclamar de diferença, não antes.
   ═══════════════════════════════════════════════════════════════ */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { rotuloDoAviso, situacaoDoAviso, ehResposta } from '@/lib/mensagens/rotulos'
import { TEMPLATES } from '@/lib/mensagens/templates-cloud'
import { dataCurta, formatarTelefone } from '@/lib/mensagens/textos'
import { telefoneCanonico } from '@/lib/phone-variants'
import type { TipoMensagem } from '@/lib/mensagens/tipos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type LinhaLog = {
  id: string
  tipo: string
  status: string | null
  entregue_em: string | null
  lido_em: string | null
  created_at: string
  destino: string | null
  appointment_id: string | null
  customer_id: string | null
}

type Atendimento = {
  id: string
  client_name: string | null
  appointment_date: string
  start_time: string
  service_name: string | null
  sinal_valor: number | null
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export async function GET() {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const [{ data: logs }, { data: recebidas }, { data: negocio }, { data: meusTemplates }] =
    await Promise.all([
      db
        .from('message_log')
        .select('id, tipo, status, entregue_em, lido_em, created_at, destino, appointment_id, customer_id')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(60),
      db
        .from('message_inbox')
        .select('id, telefone, cliente_nome, texto, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(30),
      db.from('businesses').select('name, phone').eq('id', businessId).maybeSingle(),
      db.from('message_templates_negocio').select('tipo, corpo').eq('business_id', businessId),
    ])

  const enviadas = ((logs ?? []) as LinhaLog[]).filter((m) => !ehResposta(m.tipo))

  /* Dados de apoio em lote — nunca uma consulta por mensagem. */
  const idsAtend = [...new Set(enviadas.map((m) => m.appointment_id).filter(Boolean))] as string[]
  const idsFicha = [...new Set(enviadas.map((m) => m.customer_id).filter(Boolean))] as string[]
  const [{ data: atends }, { data: fichas }] = await Promise.all([
    idsAtend.length
      ? db
          .from('appointments')
          .select('id, client_name, appointment_date, start_time, service_name, sinal_valor')
          .in('id', idsAtend)
      : Promise.resolve({ data: [] as Atendimento[] }),
    idsFicha.length
      ? db.from('customers').select('id, name, phone').in('id', idsFicha)
      : Promise.resolve({ data: [] as { id: string; name: string; phone: string }[] }),
  ])

  const porAtendimento = new Map(((atends ?? []) as Atendimento[]).map((a) => [a.id, a]))
  const porFicha = new Map(((fichas ?? []) as { id: string; name: string; phone: string }[]).map((c) => [c.id, c]))
  const corpoDoNegocio = new Map(
    ((meusTemplates ?? []) as { tipo: string; corpo: string }[]).map((t) => [t.tipo, t.corpo]),
  )
  const nomeNegocio = (negocio as { name?: string } | null)?.name ?? 'seu negócio'
  const telNegocio = (negocio as { phone?: string } | null)?.phone ?? ''

  /** O texto que a cliente leu, remontado do modelo + dados reais. */
  function textoDe(m: LinhaLog): string | null {
    const def = TEMPLATES[m.tipo as TipoMensagem]
    if (!def) return null
    const a = m.appointment_id ? porAtendimento.get(m.appointment_id) : null
    const ficha = m.customer_id ? porFicha.get(m.customer_id) : null
    const corpo = corpoDoNegocio.get(m.tipo) ?? def.corpo
    const valores = def.params({
      cliente: a?.client_name ?? ficha?.name ?? 'Cliente',
      salao: nomeNegocio,
      data: a ? dataCurta(a.appointment_date) : '',
      hora: a ? String(a.start_time).slice(0, 5) : '',
      servico: a?.service_name ?? '',
      telefoneSalao: telNegocio ? formatarTelefone(telNegocio) : null,
      sinal: a?.sinal_valor ? brl(Number(a.sinal_valor)) : undefined,
      prazo: undefined,
    })
    /* Campo que a gente não tem daquele envio some do texto, em vez de
       aparecer como {{4}} — merge tag crua é o que faz parecer ferramenta
       de TI (a mesma regra da prévia). */
    return corpo.replace(/\{\{(\d+)\}\}/g, (_, n) => valores[Number(n) - 1] ?? '').trim()
  }

  type Item = {
    id: string
    de: 'negocio' | 'cliente'
    texto: string
    rotulo?: string
    situacao?: string
    quando: string
  }
  const conversas = new Map<
    string,
    { telefone: string; cliente: string | null; appointmentId: string | null; itens: Item[] }
  >()

  const entrar = (telefone: string | null, cliente: string | null, appointmentId: string | null) => {
    const chave = telefoneCanonico(telefone ?? '') || (telefone ?? '?')
    const atual = conversas.get(chave)
    if (atual) {
      if (!atual.cliente && cliente) atual.cliente = cliente
      if (!atual.appointmentId && appointmentId) atual.appointmentId = appointmentId
      return atual
    }
    const nova = { telefone: telefone ?? '', cliente, appointmentId, itens: [] as Item[] }
    conversas.set(chave, nova)
    return nova
  }

  for (const m of enviadas) {
    const texto = textoDe(m)
    if (!texto) continue
    const a = m.appointment_id ? porAtendimento.get(m.appointment_id) : null
    const ficha = m.customer_id ? porFicha.get(m.customer_id) : null
    const c = entrar(m.destino, a?.client_name ?? ficha?.name ?? null, m.appointment_id)
    c.itens.push({
      id: m.id,
      de: 'negocio',
      texto,
      rotulo: rotuloDoAviso(m.tipo),
      situacao: situacaoDoAviso(m),
      quando: m.created_at,
    })
  }

  for (const r of (recebidas ?? []) as {
    id: string
    telefone: string
    cliente_nome: string | null
    texto: string
    created_at: string
  }[]) {
    const c = entrar(r.telefone, r.cliente_nome, null)
    c.itens.push({ id: r.id, de: 'cliente', texto: r.texto, quando: r.created_at })
  }

  /* Conversa é linha do tempo: item mais antigo em cima, igual WhatsApp.
     A conversa inteira entra pela mais recente. */
  const lista = [...conversas.values()]
    .map((c) => ({ ...c, itens: c.itens.sort((x, y) => x.quando.localeCompare(y.quando)).slice(-6) }))
    .filter((c) => c.itens.length > 0)
    .sort((a, b) => b.itens[b.itens.length - 1].quando.localeCompare(a.itens[a.itens.length - 1].quando))
    .slice(0, 8)

  return NextResponse.json({ conversas: lista })
}
