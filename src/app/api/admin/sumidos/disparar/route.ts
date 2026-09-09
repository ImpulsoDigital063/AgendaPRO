/**
 * POST /api/admin/sumidos/disparar
 *
 * Envio AUTOMÁTICO de reativação pelo canal oficial (Cloud API), pras pessoas
 * que a dona escolheu na aba Sumidos. Body: { dias, clientIds: string[] }.
 *
 * ─────────────────────────────────────────────────────────────────────
 * ISTO MANDA MENSAGEM PRA PESSOA REAL. As travas, e por que cada uma:
 *
 * 1. SÓ O DONO. A recepção não decide gastar franquia do negócio.
 * 2. SÓ QUEM ESTÁ NA FAIXA. O client_id vem da tela, mas é reconferido
 *    contra a mesma régua da listagem — payload forjado não alcança quem
 *    não está sumido.
 * 3. TETO DE 60 POR CHAMADA. Reativação consome 7 unidades cada; 60 já são
 *    420, mais que o pacote Plus. Acima disso é engano, não intenção.
 * 4. SALDO CONFERIDO ANTES. Sem pacote ou sem saldo, nada sai.
 * 5. UMA VEZ POR PESSOA A CADA 30 DIAS. A chave do message_log carrega o
 *    mês; o UNIQUE da tabela recusa a segunda tentativa. Sem isso, dois
 *    toques no botão mandam duas vezes — e cobram duas vezes.
 *
 * O texto NÃO é editável: `agendapro_retorno` é template aprovado pela Meta e
 * o corpo é fixo. Quem quer mandar desconto usa o botão de cupom, que sai
 * pelo WhatsApp da própria dona e não passa pela Meta.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit-api'
import { todayBR, addDaysBR, formatDateBR } from '@/lib/date-br'
import { canalLiberado } from '@/lib/mensagens/liberado'
import { podeEnviar } from '@/lib/mensagens/franquia'
import { enviar } from '@/lib/mensagens/enviar'
import { UNIDADES_POR_TIPO } from '@/lib/mensagens/custo-sumidos'
import { SUMIDOS_ENVIO_AUTOMATICO } from '@/lib/feature-flags'

const DIAS_OPCOES = [15, 20, 25, 30, 40, 60]
const TETO_POR_CHAMADA = 60

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, { key: 'admin-sumidos-disparar', limit: 6, windowSeconds: 60 })
  if (rl) return rl

  /* Desligado enquanto o sistema de envios nao assenta (Eduardo, 08/09).
     A trava fica AQUI tambem, nao so na tela: esconder botao nao impede
     ninguem de chamar a rota. */
  if (!SUMIDOS_ENVIO_AUTOMATICO) {
    return NextResponse.json({ error: 'envio_automatico_desligado' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no_auth' }, { status: 401 })

  // 1 · só o dono
  const { data: biz } = await supabase
    .from('businesses')
    .select('id, name, phone')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!biz) return NextResponse.json({ error: 'only_owner' }, { status: 403 })

  if (!canalLiberado(biz.id)) {
    return NextResponse.json({ error: 'canal_nao_liberado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const ids: string[] = Array.isArray(body?.clientIds)
    ? body.clientIds.filter((x: unknown) => typeof x === 'string')
    : []
  const diasPedido = Number(body?.dias)
  const dias = diasPedido === 0 || DIAS_OPCOES.includes(diasPedido) ? diasPedido : 0

  if (ids.length === 0) return NextResponse.json({ error: 'lista_vazia' }, { status: 400 })
  // 3 · teto
  if (ids.length > TETO_POR_CHAMADA) {
    return NextResponse.json({ error: 'acima_do_teto', teto: TETO_POR_CHAMADA }, { status: 400 })
  }

  // 4 · saldo
  const perm = await podeEnviar(supabase, biz.id)
  if (!perm.pode) return NextResponse.json({ error: perm.motivo }, { status: 400 })

  // 2 · reconfere a faixa com a MESMA régua da listagem
  const hoje = todayBR()
  const idx = DIAS_OPCOES.indexOf(dias)
  const de = dias === 0 ? DIAS_OPCOES[0] : dias
  const ate = idx >= 0 && idx < DIAS_OPCOES.length - 1 ? DIAS_OPCOES[idx + 1] : Infinity
  const corteVelho = addDaysBR(hoje, -de)
  const cortePiso = ate === Infinity ? null : addDaysBR(hoje, -ate)

  const { data: ultimos } = await supabase.rpc('ultimo_agendamento_clientes', {
    p_business_id: biz.id,
  })
  const naFaixa = new Set<string>()
  const ultimaDe = new Map<string, string>()
  for (const r of ultimos ?? []) {
    const id = r.client_id as string | null
    const u = r.ultima as string | null
    if (!id || !u) continue
    if (u < corteVelho && (!cortePiso || u >= cortePiso)) {
      naFaixa.add(id)
      ultimaDe.set(id, u)
    }
  }
  const alvos = ids.filter((id) => naFaixa.has(id))
  if (alvos.length === 0) return NextResponse.json({ error: 'ninguem_na_faixa' }, { status: 400 })

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, phone')
    .in('id', alvos)

  // Último serviço de cada uma — entra na mensagem ("o intervalo do seu {{2}}")
  const { data: appts } = await supabase
    .from('appointments')
    .select('client_id, service_name, appointment_date')
    .eq('business_id', biz.id)
    .in('client_id', alvos)
    .order('appointment_date', { ascending: false })
  const servicoDe = new Map<string, string>()
  for (const a of appts ?? []) {
    const cid = a.client_id as string
    if (!servicoDe.has(cid) && a.service_name) servicoDe.set(cid, a.service_name as string)
  }

  const mes = hoje.slice(0, 7)
  let enviados = 0
  let ignorados = 0
  let falhas = 0
  const detalhe: Array<{ nome: string; status: string; motivo?: string }> = []

  for (const c of clients ?? []) {
    const fone = (c.phone as string) ?? ''
    const ultima = ultimaDe.get(c.id as string)
    const saida = await enviar(supabase, {
      businessId: biz.id,
      tipo: 'retorno',
      // 5 · uma vez por pessoa por mês; o UNIQUE do message_log barra o resto
      chave: `retorno:${c.id}:${mes}`,
      destino: { telefone: fone },
      variaveis: {
        cliente: (c.name as string) ?? '',
        salao: (biz.name as string) ?? '',
        data: ultima ? formatDateBR(ultima) : '',
        hora: '',
        servico: servicoDe.get(c.id as string) ?? '',
        telefoneSalao: (biz.phone as string) ?? null,
      },
    })
    if (saida.status === 'enviado') enviados++
    else if (saida.status === 'ignorado') ignorados++
    else falhas++
    detalhe.push({
      nome: (c.name as string) ?? '',
      status: saida.status,
      motivo: 'motivo' in saida ? saida.motivo : 'erro' in saida ? saida.erro : undefined,
    })
  }

  return NextResponse.json({
    ok: true,
    enviados,
    ignorados,
    falhas,
    unidadesGastas: enviados * UNIDADES_POR_TIPO.retorno,
    detalhe,
  })
}
