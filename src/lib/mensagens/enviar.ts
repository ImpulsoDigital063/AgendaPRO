/* ═══════════════════════════════════════════════════════════════
   ENVIO — a porta única por onde toda mensagem automática sai

   Ninguém chama o canal direto. Tudo passa aqui, porque é aqui que moram
   as quatro travas que fazem a diferença entre um número que dura e um
   número que cai em duas semanas:

   1. IDEMPOTÊNCIA — `message_log.chave` é UNIQUE. A trava é do Postgres,
      não da lógica: dois crons rodando junto não furam. Cliente que recebe
      o mesmo lembrete duas vezes não acha o sistema redundante, acha ele
      quebrado, e denuncia.
   2. OPT-OUT — quem respondeu PARE não recebe promocional nunca mais.
   3. REGRA DESLIGADA — nasce tudo off; só sai o que a dona ligou.
   4. FALLBACK — WhatsApp é o padrão, email é a rede de segurança. Nunca
      os dois pra mesma pessoa (isso é ruído e faz desligar as duas).
   ═══════════════════════════════════════════════════════════════ */

import type { SupabaseClient } from '@supabase/supabase-js'
import { PADRAO, DESTINATARIO, EH_PROMOCIONAL, type Regra, type TipoMensagem } from './tipos'
import { montarTexto, botoesDe, type Variaveis } from './textos'
import {
  credencialDoSistema, enviarTexto, enviarComBotoes, normalizarTelefone,
  type CredencialWapp,
} from './canal-whatsapp'

export type Destino = {
  telefone?: string | null
  email?: string | null
}

export type PedidoEnvio = {
  businessId: string
  tipo: TipoMensagem
  chave: string
  destino: Destino
  variaveis: Variaveis
  appointmentId?: string | null
  customerId?: string | null
  /** Fallback por email quando o WhatsApp não deu conta. */
  enviarEmail?: () => Promise<boolean>
}

export type Saida =
  | { status: 'enviado'; canal: 'whatsapp' | 'email' }
  | { status: 'ignorado'; motivo: string }
  | { status: 'falhou'; erro: string }

/** Regra do negócio, com o padrão de fábrica por baixo. */
export async function regraDe(
  db: SupabaseClient,
  businessId: string,
  tipo: TipoMensagem,
): Promise<Regra> {
  const { data } = await db
    .from('message_rules')
    .select('enabled, offset_minutos, hora_do_dia, retorno_dias, template')
    .eq('business_id', businessId)
    .eq('tipo', tipo)
    .maybeSingle()

  if (!data) return PADRAO[tipo]
  return {
    tipo,
    enabled: data.enabled === true,
    offsetMinutos: Number(data.offset_minutos ?? PADRAO[tipo].offsetMinutos),
    horaDoDia: String(data.hora_do_dia ?? PADRAO[tipo].horaDoDia).slice(0, 5),
    retornoDias: data.retorno_dias ?? PADRAO[tipo].retornoDias,
    template: data.template ?? null,
  }
}

/**
 * O negócio pode falar com a base dele agora?
 *
 * Três travas que vieram da auditoria de 07/08 sobre a base real:
 *
 * 1. DEMO NUNCA MANDA. As três contas de demonstração somam 479 agendamentos
 *    em 30 dias — mais que a base pagante inteira — com telefones que não
 *    são de clientes de verdade. Ligar mensagem numa demo dispara dezenas de
 *    avisos pra números aleatórios, e mensagem pra quem não conhece o
 *    remetente é exatamente o que vira denúncia e derruba o número.
 *
 * 2. NEGÓCIO BLOQUEADO NÃO FALA EM NOME DO SISTEMA. Dois negócios com
 *    assinatura vencida ainda têm agendamento entrando (Amanda Freitas,
 *    Lopes Studio). Continuar mandando WhatsApp em nome de quem não paga é
 *    entregar serviço fora do contrato — e some com a razão de voltar.
 *
 * 3. SEM TELEFONE DO SALÃO, NÃO MANDA. A mensagem sai de um número que não
 *    é lido; o telefone do salão no rodapé é o único caminho de volta da
 *    cliente. Sem ele, ela recebe um aviso e não tem pra onde responder —
 *    pior do que não receber. Achado na Barbearia Guia Lopes, telefone
 *    inválido no cadastro.
 */
async function podeFalarPelo(
  db: SupabaseClient,
  businessId: string,
): Promise<{ pode: boolean; motivo?: string }> {
  const { data: neg } = await db
    .from('businesses')
    .select('phone')
    .eq('id', businessId)
    .maybeSingle()

  const digitos = String(neg?.phone ?? '').replace(/\D/g, '')
  const semDDI = digitos.startsWith('55') ? digitos.slice(2) : digitos
  if (semDDI.length !== 10 && semDDI.length !== 11) {
    return { pode: false, motivo: 'negocio_sem_telefone' }
  }

  const { data: ass } = await db
    .from('subscriptions')
    .select('status, permanent_courtesy, grace_ends_at')
    .eq('business_id', businessId)
    .maybeSingle()

  if (ass?.permanent_courtesy === true) return { pode: false, motivo: 'conta_demo' }

  const graceVenceu = ass?.grace_ends_at && new Date(ass.grace_ends_at) < new Date()
  if (ass?.status === 'cancelled' || (ass?.status === 'past_due' && graceVenceu)) {
    return { pode: false, motivo: 'assinatura_bloqueada' }
  }

  return { pode: true }
}

/** Credencial do negócio (Fase 2) ou a do sistema (Fase 1). */
async function credencialDe(
  db: SupabaseClient,
  businessId: string,
): Promise<CredencialWapp | null> {
  const { data } = await db
    .from('businesses')
    .select('wapp_instance_id, wapp_token')
    .eq('id', businessId)
    .maybeSingle()

  if (data?.wapp_instance_id && data?.wapp_token) {
    return { instanceId: data.wapp_instance_id, token: data.wapp_token }
  }
  return credencialDoSistema()
}

async function pediuPraSair(
  db: SupabaseClient,
  businessId: string,
  telefone: string,
): Promise<boolean> {
  const fone = normalizarTelefone(telefone)
  if (!fone) return false
  const { data } = await db
    .from('message_optout')
    .select('id')
    .eq('telefone', fone)
    .or(`business_id.eq.${businessId},business_id.is.null`)
    .limit(1)
  return (data?.length ?? 0) > 0
}

/**
 * Manda — se for pra mandar. Devolve o que aconteceu e REGISTRA sempre,
 * inclusive o ignorado: sem registro do que não saiu, a primeira pergunta
 * do dono ("por que a fulana não recebeu?") não tem resposta.
 */
export async function enviar(db: SupabaseClient, p: PedidoEnvio): Promise<Saida> {
  const regra = await regraDe(db, p.businessId, p.tipo)

  const registrar = async (
    status: string, canal: string, destino: string, erro?: string, providerId?: string,
  ) => {
    await db.from('message_log').insert({
      business_id: p.businessId, chave: p.chave, tipo: p.tipo,
      canal, destino, status, erro: erro ?? null, provider_id: providerId ?? null,
      appointment_id: p.appointmentId ?? null, customer_id: p.customerId ?? null,
    })
  }

  if (!regra.enabled) return { status: 'ignorado', motivo: 'regra_desligada' }

  const permissao = await podeFalarPelo(db, p.businessId)
  if (!permissao.pode) return { status: 'ignorado', motivo: permissao.motivo! }

  /* A trava de duplicidade vem ANTES de qualquer envio: tenta gravar a
     chave primeiro. Se o UNIQUE recusar, alguém já mandou — encerra sem
     mandar de novo. É o único jeito à prova de concorrência; checar antes
     e gravar depois deixa janela entre os dois. */
  const { error: jaFoi } = await db.from('message_log').insert({
    business_id: p.businessId, chave: p.chave, tipo: p.tipo,
    canal: 'pendente', destino: p.destino.telefone ?? p.destino.email ?? '-',
    status: 'processando',
    appointment_id: p.appointmentId ?? null, customer_id: p.customerId ?? null,
  })
  if (jaFoi) {
    // 23505 = unique_violation. Qualquer outro erro também para aqui, de
    // propósito: sem registro garantido, não manda.
    return { status: 'ignorado', motivo: jaFoi.code === '23505' ? 'ja_enviado' : jaFoi.message }
  }

  const concluir = async (
    status: string, canal: string, destino: string, erro?: string, providerId?: string,
  ) => {
    await db.from('message_log')
      .update({ status, canal, destino, erro: erro ?? null, provider_id: providerId ?? null })
      .eq('chave', p.chave)
  }

  const paraCliente = DESTINATARIO[p.tipo] === 'cliente'
  const tel = p.destino.telefone

  if (paraCliente && tel && EH_PROMOCIONAL[p.tipo] && (await pediuPraSair(db, p.businessId, tel))) {
    await concluir('ignorado', 'whatsapp', tel, 'opt_out')
    return { status: 'ignorado', motivo: 'opt_out' }
  }

  const texto = montarTexto(p.tipo, p.variaveis, regra.template)
  const cred = tel ? await credencialDe(db, p.businessId) : null

  if (cred && tel) {
    const botoes = botoesDe(p.tipo)
    const r = botoes
      ? await enviarComBotoes(cred, tel, texto, botoes)
      : await enviarTexto(cred, tel, texto)

    if (r.ok) {
      await concluir('enviado', 'whatsapp', tel, undefined, r.providerId)
      return { status: 'enviado', canal: 'whatsapp' }
    }
    /* Falhou o WhatsApp: cai pro email em vez de sumir. É exatamente o
       cenário do aquecimento, quando a maioria dos negócios ainda não
       está no canal novo. */
    if (p.enviarEmail && p.destino.email) {
      const ok = await p.enviarEmail()
      await concluir(ok ? 'enviado' : 'falhou', 'email', p.destino.email, r.erro)
      return ok ? { status: 'enviado', canal: 'email' } : { status: 'falhou', erro: r.erro ?? 'email_falhou' }
    }
    await concluir('falhou', 'whatsapp', tel, r.erro)
    return { status: 'falhou', erro: r.erro ?? 'envio_falhou' }
  }

  if (p.enviarEmail && p.destino.email) {
    const ok = await p.enviarEmail()
    await concluir(ok ? 'enviado' : 'falhou', 'email', p.destino.email, cred ? undefined : 'sem_whatsapp')
    return ok ? { status: 'enviado', canal: 'email' } : { status: 'falhou', erro: 'email_falhou' }
  }

  await concluir('ignorado', 'nenhum', p.destino.telefone ?? p.destino.email ?? '-', 'sem_canal')
  return { status: 'ignorado', motivo: 'sem_canal' }
}
