/* ═══════════════════════════════════════════════════════════════
   TEMPLATES DA CLOUD API — o de-para entre a régua e o que a Meta aprovou

   Na W-API o texto era montado na hora (textos.ts) e saía como estava.
   Aqui não: fora da janela de 24h a Meta só aceita TEMPLATE APROVADO, com
   variáveis posicionais. Então cada tipo da régua precisa de um template
   aprovado e de uma função que devolva os parâmetros NA ORDEM do texto
   aprovado — trocar a ordem aqui não dá erro, entrega a mensagem com o
   nome do salão no lugar da hora. Por isso a ordem vive num lugar só.

   🔴 CATEGORIA É DINHEIRO, e quem decide é a Meta, não a gente.
   Utilidade ≈ R$0,05 · Marketing ≈ R$0,35 (~7×). Lembrete de horário que a
   cliente marcou é utilidade. Aniversário e "hora de voltar" são marketing:
   ela não pediu. Submeter marketing como utilidade não dá desconto, dá
   reprovação — e no pacote de 120 msgs cada marketing come 7 unidades.

   textos.ts CONTINUA VIVO: é ele que monta o corpo do email, que é o
   fallback quando o WhatsApp não dá conta.
   ═══════════════════════════════════════════════════════════════ */

import type { TipoMensagem } from './tipos'
import { formatarTelefone, type Variaveis } from './textos'

export type DefTemplate = {
  /** Nome exato aprovado na conta. Prefixo agendapro_ pra não colidir. */
  nome: string
  idioma: string
  /** UTILITY é o que a Meta aceitou; MARKETING custa ~7× e consome 7 da franquia. */
  categoria: 'UTILITY' | 'MARKETING'
  /** Params NA ORDEM de {{1}}, {{2}}... do texto aprovado. */
  params: (v: Variaveis) => string[]
  /** Sufixos dos payloads dos botões, na ordem em que estão no template. */
  botoes?: string[]
}

/* Param vazio faz a Meta recusar a mensagem inteira (131008). Um traço
   entrega; um undefined derruba o lembrete. */
const t = (s: string | null | undefined, alt = '-') => {
  const v = (s ?? '').trim()
  return v.length ? v : alt
}

/* Só o primeiro nome. "Oi Maria das Graças Ferreira" não é como ninguém
   fala com cliente. Mesma regra do textos.ts. */
const nome = (s: string) => (s || '').trim().split(/\s+/)[0] || 'tudo bem'

/* Telefone formatado na hora de montar, não como foi salvo: no banco ele
   aparece de todo jeito porque cada dono digita como quer. Os 29 negócios
   da base têm telefone, então o fallback existe só pra não quebrar. */
const fone = (v: Variaveis) =>
  v.telefoneSalao ? formatarTelefone(v.telefoneSalao) : t(v.salao)

export const TEMPLATES: Partial<Record<TipoMensagem, DefTemplate>> = {
  confirmacao: {
    nome: 'agendapro_confirmacao',
    idioma: 'pt_BR',
    categoria: 'UTILITY',
    params: (v) => [nome(v.cliente), t(v.salao), t(v.data), t(v.hora), t(v.servico, 'seu horário'), fone(v)],
  },
  lembrete_vespera: {
    nome: 'agendapro_lembrete_vespera',
    idioma: 'pt_BR',
    categoria: 'UTILITY',
    params: (v) => [nome(v.cliente), t(v.salao), t(v.data), t(v.hora), t(v.servico, 'seu horário'), fone(v)],
    botoes: ['confirmar', 'remarcar'],
  },
  lembrete_dia: {
    nome: 'agendapro_lembrete_dia',
    idioma: 'pt_BR',
    categoria: 'UTILITY',
    params: (v) => [nome(v.cliente), t(v.salao), t(v.hora), t(v.servico, 'seu horário'), fone(v)],
    botoes: ['confirmar', 'remarcar'],
  },
  aniversario: {
    nome: 'agendapro_aniversario',
    idioma: 'pt_BR',
    categoria: 'MARKETING', // 🔴 ~7x mais caro, e consome 7 da franquia
    params: (v) => [nome(v.cliente), t(v.salao), fone(v)],
  },
  retorno: {
    nome: 'agendapro_retorno',
    idioma: 'pt_BR',
    categoria: 'MARKETING', // 🔴 ~7x mais caro, e consome 7 da franquia
    params: (v) => [nome(v.cliente), t(v.servico, 'procedimento'), t(v.salao), t(v.data), fone(v)],
  },
  dono_novo_agendamento: {
    nome: 'agendapro_dono_novo_agendamento',
    idioma: 'pt_BR',
    categoria: 'UTILITY',
    params: (v) => [t(v.salao), t(v.cliente), t(v.data), t(v.hora), t(v.servico, 'serviço')],
  },
  dono_cancelamento: {
    nome: 'agendapro_dono_cancelamento',
    idioma: 'pt_BR',
    categoria: 'UTILITY',
    params: (v) => [t(v.salao), t(v.cliente), t(v.data), t(v.hora)],
  },
}

/** Quantas unidades da franquia a mensagem consome. Marketing custa ~7×. */
export function unidadesDaFranquia(tipo: TipoMensagem): number {
  return TEMPLATES[tipo]?.categoria === 'MARKETING' ? 7 : 1
}

/**
 * Payload de cada botão. Carrega o id do agendamento porque no webhook a
 * gente precisa saber QUAL horário ela confirmou — hoje o webhook adivinha
 * pelo telefone, e adivinha errado quando ela tem dois horários marcados.
 */
export function payloadsDosBotoes(
  tipo: TipoMensagem,
  appointmentId: string | null | undefined,
): string[] | undefined {
  const def = TEMPLATES[tipo]
  if (!def?.botoes || !appointmentId) return undefined
  return def.botoes.map((b) => `${b}:${appointmentId}`)
}
