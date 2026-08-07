/* ═══════════════════════════════════════════════════════════════
   TEXTO DAS MENSAGENS AUTOMÁTICAS

   Fase 1 o remetente é UM número do AgendaPRO mandando por todos os
   salões. Duas consequências que mandam no texto:

   1. O NOME DO SALÃO tem que estar na primeira linha. A cliente não
      conhece o número; se ela não identificar o salão em meio segundo,
      é spam pra ela — e denúncia é o que derruba número.
   2. O TELEFONE DO SALÃO tem que estar no fim. Ela vai querer responder,
      e responder ali não adianta: este número só envia. Sem esse
      caminho, a dona colhe reclamação de uma coisa que ela nem sabia
      que existia.

   Sem emoji. Mensagem de salão com emoji demais tem cara de disparo em
   massa, que é exatamente a leitura que a gente não quer.
   ═══════════════════════════════════════════════════════════════ */

import type { TipoMensagem } from './tipos'
import { EH_PROMOCIONAL } from './tipos'

export type Variaveis = {
  cliente: string
  salao: string
  data: string        // "sex, 08/08"
  hora: string        // "14:00"
  servico: string
  telefoneSalao: string | null
  profissional?: string
}

const primeiroNome = (nome: string) => (nome || '').trim().split(/\s+/)[0] || 'tudo bem'

/** Rodapé: para onde responder, e como sair. */
function rodape(v: Variaveis, promocional: boolean): string {
  const contato = v.telefoneSalao
    ? `\n\nPara remarcar ou tirar dúvida, fale com ${v.salao}: ${v.telefoneSalao}`
    : `\n\nPara remarcar ou tirar dúvida, fale direto com ${v.salao}.`
  /* Opt-out só nas promocionais. Oferecer "PARE" num lembrete do horário
     que ela marcou é convidar a cliente a desligar o aviso que ela quer —
     e transacional não é o que gera denúncia. */
  const sair = promocional ? '\n\nResponda PARE para não receber mais mensagens.' : ''
  return contato + sair
}

const CORPO: Record<TipoMensagem, (v: Variaveis) => string> = {
  confirmacao: (v) =>
    `${v.salao}\n\n` +
    `Oi ${primeiroNome(v.cliente)}! Seu horário está marcado:\n` +
    `${v.data} às ${v.hora} — ${v.servico}` +
    (v.profissional ? `\ncom ${v.profissional}` : ''),

  lembrete_vespera: (v) =>
    `${v.salao}\n\n` +
    `Oi ${primeiroNome(v.cliente)}! Lembrando do seu horário amanhã:\n` +
    `${v.data} às ${v.hora} — ${v.servico}`,

  lembrete_dia: (v) =>
    `${v.salao}\n\n` +
    `Oi ${primeiroNome(v.cliente)}! Seu horário é hoje às ${v.hora} — ${v.servico}.\n` +
    `Te esperamos!`,

  aniversario: (v) =>
    `${v.salao}\n\n` +
    `Oi ${primeiroNome(v.cliente)}, feliz aniversário!\n` +
    `Que seu dia seja ótimo. Quando quiser se cuidar, é só chamar.`,

  retorno: (v) =>
    `${v.salao}\n\n` +
    `Oi ${primeiroNome(v.cliente)}! Já faz um tempo desde o seu último atendimento.\n` +
    `Se quiser agendar, é só falar com a gente.`,

  dono_novo_agendamento: (v) =>
    `Novo agendamento em ${v.salao}\n\n` +
    `${v.cliente} — ${v.data} às ${v.hora}\n${v.servico}` +
    (v.profissional ? `\nProfissional: ${v.profissional}` : ''),

  dono_cancelamento: (v) =>
    `Horário liberado em ${v.salao}\n\n` +
    `${v.cliente} cancelou — ${v.data} às ${v.hora}\n${v.servico}\n\n` +
    `Dá tempo de oferecer pra outra cliente.`,
}

/**
 * Monta o texto final. `template` da dona (Fase 2) substitui o corpo, com
 * as mesmas variáveis; o rodapé é acrescentado de qualquer jeito — nem a
 * dona pode remover o "de quem é" e o "como sair", que são o que mantêm o
 * número vivo.
 */
export function montarTexto(
  tipo: TipoMensagem,
  v: Variaveis,
  template?: string | null,
): string {
  const corpo = template
    ? template
        .replace(/\{cliente\}/g, primeiroNome(v.cliente))
        .replace(/\{salao\}/g, v.salao)
        .replace(/\{data\}/g, v.data)
        .replace(/\{hora\}/g, v.hora)
        .replace(/\{servico\}/g, v.servico)
        .replace(/\{profissional\}/g, v.profissional ?? '')
    : CORPO[tipo](v)

  // Mensagem pro dono não leva rodapé de cliente: ele sabe de quem é.
  const paraDono = tipo.startsWith('dono_')
  return paraDono ? corpo : corpo + rodape(v, EH_PROMOCIONAL[tipo])
}

/**
 * Botões (plano PRO da W-API). Só o lembrete os usa — é onde eles pagam:
 * a cliente confirma num toque e a agenda da dona atualiza sozinha, sem
 * ninguém ligar pra ninguém. É a mesma dor do sinal (falta), resolvida
 * sem pedir dinheiro antecipado.
 */
export function botoesDe(tipo: TipoMensagem): { id: string; texto: string }[] | null {
  if (tipo !== 'lembrete_vespera' && tipo !== 'lembrete_dia') return null
  return [
    { id: 'confirmar', texto: 'Confirmo' },
    { id: 'remarcar', texto: 'Preciso remarcar' },
  ]
}
