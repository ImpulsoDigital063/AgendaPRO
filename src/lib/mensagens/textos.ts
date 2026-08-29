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

/* O telefone sai formatado na HORA DE MONTAR, nao como foi salvo. No banco
   ele aparece de todo jeito — "(63) 99955-2211", "63999552211",
   "27997748518" — porque cada dono digita como quer e nenhuma tela obriga
   mascara. Formatar aqui pega os tres casos de uma vez; arrumar no
   cadastro so valeria pra quem cadastrasse depois.

   O que nao for celular ou fixo brasileiro sai como veio: melhor mandar
   "+1 305 555 0199" cru do que picotar numero estrangeiro. */
/* "sáb, 22/08" — a data como a cliente lê. Vive aqui, e não em quem
   dispara, porque hoje são dois caminhos (varredura horária e envio no
   ato do agendamento) e dois formatadores divergem no primeiro ajuste. */
export function dataCurta(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(y, m - 1, d, 12)
  const semana = dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  return `${semana}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}
export function formatarTelefone(bruto: string): string {
  /* DDI explicito que nao seja o Brasil sai intocado: '+1 305 555 0199'
     tem 11 digitos e passaria por celular brasileiro, virando
     '(13) 05555-0199'. Pego no teste, nao na leitura. */
  if (bruto.trim().startsWith('+') && !bruto.replace(/D/g, '').startsWith('55')) return bruto
  const d = (bruto || '').replace(/D/g, '')
  const semDDI = d.startsWith('55') && d.length > 11 ? d.slice(2) : d
  if (semDDI.length === 11) return `(${semDDI.slice(0, 2)}) ${semDDI.slice(2, 7)}-${semDDI.slice(7)}`
  if (semDDI.length === 10) return `(${semDDI.slice(0, 2)}) ${semDDI.slice(2, 6)}-${semDDI.slice(6)}`
  return bruto
}
const primeiroNome = (nome: string) => (nome || '').trim().split(/\s+/)[0] || 'tudo bem'

/** Rodapé: para onde responder, e como sair. */
function rodape(v: Variaveis, promocional: boolean): string {
  const contato = v.telefoneSalao
    ? `\n\nPara remarcar ou tirar dúvida, fale com ${v.salao}: ${formatarTelefone(v.telefoneSalao)}`
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

  /* Texto pedido pela clínica: precisa dizer QUAL procedimento, QUANDO foi e
     que já pode repetir. "Faz um tempo que você não vem" é cobrança; isto
     aqui é informação clínica que a paciente quer receber — o intervalo do
     procedimento dela fechou. */
  retorno: (v) =>
    `${v.salao}\n\n` +
    `Oi ${primeiroNome(v.cliente)}! Seu último ${v.servico} foi em ${v.data}.\n` +
    `Já deu o intervalo para repetir — se quiser agendar, é só chamar.`,

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
/* O TEXTO PADRAO, DO JEITO QUE A DONA EDITA.
   ─────────────────────────────────────────────────────────────────
   A tela precisa mostrar o texto que o sistema manda hoje, com as
   variaveis a vista — senao a dona comeca de uma caixa vazia e escreve
   algo pior que o padrao, ou nem mexe.

   Em vez de duplicar os textos aqui (duas fontes que divergem no primeiro
   ajuste), roda o proprio CORPO passando os placeholders COMO valor:
   {cliente} entra onde o nome entraria. O texto sai identico ao real,
   com as chaves no lugar certo, e nunca sai de sincronia. */
export function corpoEditavel(tipo: TipoMensagem): string {
  return CORPO[tipo]({
    cliente: '{cliente}',
    salao: '{salao}',
    data: '{data}',
    hora: '{hora}',
    servico: '{servico}',
    profissional: '{profissional}',
    telefoneSalao: null,
  })
}

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
 * Botões de resposta rápida do template. Só o lembrete os usa — é onde eles pagam:
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
