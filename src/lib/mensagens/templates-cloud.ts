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

import type { SupabaseClient } from '@supabase/supabase-js'
import type { TipoMensagem } from './tipos'
import { formatarTelefone, type Variaveis } from './textos'
import { generateSinalToken } from '@/lib/token'

export type DefTemplate = {
  /** Nome exato aprovado na conta. Prefixo agendapro_ pra não colidir. */
  nome: string
  idioma: string
  /** UTILITY é o que a Meta aceitou; MARKETING custa ~7× e consome 7 da franquia. */
  categoria: 'UTILITY' | 'MARKETING'
  /** O texto aprovado, com os campos como {{1}}, {{2}}...
   *  FONTE ÚNICA: a tela de edição mostra este texto, e o script que
   *  submete à Meta lê daqui. Duas cópias divergiriam na primeira mudança. */
  corpo: string
  /** O que cada campo significa, NA MESMA ORDEM dos params. É o que a tela
   *  mostra pra dona ("{{3}} é a data"). Vive aqui, colado na ordem, porque
   *  em arquivo separado divergiria no primeiro ajuste. */
  campos: string[]
  /** Params NA ORDEM de {{1}}, {{2}}... do texto acima. */
  params: (v: Variaveis) => string[]
  /** Sufixos dos payloads dos botões, na ordem em que estão no template. */
  /** Botões no formato exato da Meta, pra quando o template NÃO é só
   *  resposta rápida. O sinal tem link com sufixo dinâmico, e a base da URL
   *  faz parte da aprovação — se a dona editar o texto e a versão nova sair
   *  sem este bloco, o botão de pagar some e o link morre. */
  botoesMeta?: Record<string, unknown>[]
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

/* SERVICO + PROFISSIONAL no mesmo parametro.
   Eduardo, 01/09: "nao tem o nome da profissional que foi feito o
   agendamento". Ele esta certo — a cliente le "Servico: Hidratacao Profunda"
   e nao sabe COM QUEM.

   O nome ja chegava nas variaveis (os quatro caminhos de envio passam
   `profissional`), so nao era usado por nenhum `params`.

   Vai junto do servico de proposito, em vez de virar um {{7}} novo: mudar o
   CORPO do template obriga a reenviar pra Meta e esperar aprovacao, com os
   avisos saindo no texto antigo enquanto isso. Mudar o CONTEUDO de um
   parametro que ja existe vale na proxima mensagem, sem aprovacao nenhuma.

   Sem profissional definida (o campo aceita nulo), sai so o servico. */
const servicoCom = (v: Variaveis) => {
  const servico = t(v.servico, 'seu horário')
  const quem = (v.profissional ?? '').trim().split(/\s+/)[0]
  return quem ? `${servico} com ${quem}` : servico
}

export const TEMPLATES: Partial<Record<TipoMensagem, DefTemplate>> = {
  confirmacao: {
    nome: 'agendapro_confirmacao_v2',
    campos: ['nome da cliente', 'nome do seu negócio', 'data', 'horário', 'serviço', 'seu telefone'],
    idioma: 'pt_BR',
    corpo:
      'Oi {{1}}, tudo bem? Seu horário no {{2}} ficou marcado. Anota aí:\n\nDia: {{3}}\nHorário: {{4}}\nServiço: {{5}}\n\nSe precisar remarcar ou tirar alguma dúvida, é só falar com a gente pelo telefone {{6}}. Até breve!',
    categoria: 'UTILITY',
    params: (v) => [nome(v.cliente), t(v.salao), t(v.data), t(v.hora), servicoCom(v), fone(v)],
  },
  /* ── SINAL PENDENTE ───────────────────────────────────────────
     Submetido em 01/09 e ACEITO com os dois tipos de botão no mesmo
     template — link ("Pagar o sinal") e resposta rápida ("Já paguei").
     Eu não sabia se a Meta permitia a mistura e não quis afirmar: submeti
     e li a resposta. Passou como UTILITY, então custa o mesmo de um
     lembrete e não os 9x da categoria de divulgação.

     O "Já paguei" existe por dois motivos, e o segundo é o que importa:
     ele avisa a dona, e ele ABRE A JANELA DE 24H. Tocar em botão de link
     não manda mensagem nenhuma pra Meta; resposta rápida manda. Com a
     janela aberta, a confirmação que sai depois do pagamento é grátis. */
  sinal_pendente: {
    nome: 'agendapro_sinal_pendente',
    campos: ['nome da cliente', 'nome do seu negócio', 'data', 'horário', 'serviço', 'valor do sinal', 'prazo para pagar'],
    idioma: 'pt_BR',
    corpo:
      'Oi {{1}}, tudo bem? Seu horário no {{2}} está reservado. Pra confirmar, falta o sinal:\n\n' +
      'Dia: {{3}}\nHorário: {{4}}\nServiço: {{5}}\nSinal: {{6}}\n\n' +
      'É só tocar no botão abaixo para pagar. Se não for pago até {{7}}, o horário fica livre para outra pessoa.',
    categoria: 'UTILITY',
    params: (v) => [
      nome(v.cliente),
      t(v.salao),
      t(v.data),
      t(v.hora),
      servicoCom(v),
      t(v.sinal, 'o sinal combinado'),
      t(v.prazo, 'o prazo combinado'),
    ],
    /* Viaja junto com o texto em toda nova submissao. O `example` do link e
       obrigatorio e a Meta valida o formato — URL completa, nao so o
       sufixo. */
    botoesMeta: [
      {
        type: 'URL',
        text: 'Pagar o sinal',
        url: 'https://www.agendapro.net.br/sinal?{{1}}',
        example: [
          'https://www.agendapro.net.br/sinal?id=00000000-0000-0000-0000-000000000000&token=abcdef123456',
        ],
      },
      { type: 'QUICK_REPLY', text: 'Já paguei' },
    ],
  },
  lembrete_vespera: {
    nome: 'agendapro_lembrete_vespera',
    campos: ['nome da cliente', 'nome do seu negócio', 'data', 'horário', 'serviço', 'seu telefone'],
    idioma: 'pt_BR',
    corpo:
      'Oi {{1}}, tudo bem? Passando para lembrar que você tem horário marcado amanhã no {{2}}.\n\nDia: {{3}}\nHorário: {{4}}\nServiço: {{5}}\n\nSe precisar remarcar ou tirar alguma dúvida, é só falar com a gente pelo telefone {{6}}. Até amanhã!',
    categoria: 'UTILITY',
    params: (v) => [nome(v.cliente), t(v.salao), t(v.data), t(v.hora), servicoCom(v), fone(v)],
    botoes: ['confirmar', 'remarcar'],
  },
  lembrete_dia: {
    nome: 'agendapro_lembrete_dia',
    campos: ['nome da cliente', 'nome do seu negócio', 'horário', 'serviço', 'seu telefone'],
    idioma: 'pt_BR',
    corpo:
      'Oi {{1}}, tudo bem? Passando para lembrar que o seu horário no {{2}} é hoje.\n\nHorário: {{3}}\nServiço: {{4}}\n\nTe esperamos! Se precisar falar com a gente, o telefone é {{5}}. Até mais tarde!',
    categoria: 'UTILITY',
    params: (v) => [nome(v.cliente), t(v.salao), t(v.hora), servicoCom(v), fone(v)],
    botoes: ['confirmar', 'remarcar'],
  },
  aniversario: {
    nome: 'agendapro_aniversario',
    campos: ['nome da cliente', 'nome do seu negócio', 'seu telefone'],
    idioma: 'pt_BR',
    corpo:
      'Oi {{1}}, feliz aniversário!\n\nHoje é o seu dia, e a equipe do {{2}} passou aqui só para desejar tudo de bom para você. Que seja um ano cheio de saúde e de alegria.\n\nQuando quiser marcar um horário para se cuidar, é só chamar pelo telefone {{3}}. Vai ser um prazer receber você.',
    categoria: 'MARKETING', // 🔴 ~7x mais caro, e consome 7 da franquia
    params: (v) => [nome(v.cliente), t(v.salao), fone(v)],
  },
  retorno: {
    nome: 'agendapro_retorno',
    campos: ['nome da cliente', 'serviço', 'nome do seu negócio', 'data do último', 'seu telefone'],
    idioma: 'pt_BR',
    corpo:
      'Oi {{1}}, tudo bem? Passando para avisar que já deu o intervalo do seu {{2}}.\n\nO último que você fez no {{3}} foi em {{4}}, e agora é uma boa hora para repetir.\n\nSe quiser marcar, é só chamar pelo telefone {{5}}. A gente separa um horário para você.',
    categoria: 'MARKETING', // 🔴 ~7x mais caro, e consome 7 da franquia
    params: (v) => [nome(v.cliente), t(v.servico, 'procedimento'), t(v.salao), t(v.data), fone(v)],
  },
  dono_novo_agendamento: {
    nome: 'agendapro_dono_novo_agendamento',
    campos: ['nome do seu negócio', 'nome da cliente', 'data', 'horário', 'serviço'],
    idioma: 'pt_BR',
    corpo:
      'Você tem um agendamento novo no {{1}}. Veja os detalhes:\n\nCliente: {{2}}\nDia: {{3}}\nHorário: {{4}}\nServiço: {{5}}\n\nJá entrou na sua agenda automaticamente, é só conferir quando puder.',
    categoria: 'UTILITY',
    params: (v) => [t(v.salao), t(v.cliente), t(v.data), t(v.hora), t(v.servico, 'serviço')],
  },
  dono_cancelamento: {
    nome: 'agendapro_dono_cancelamento_v2',
    campos: ['nome do seu negócio', 'nome da cliente', 'data', 'horário'],
    idioma: 'pt_BR',
    corpo:
      'Um horário foi liberado na agenda do {{1}}. Veja o que abriu:\n\nCliente: {{2}}\nDia: {{3}}\nHorário: {{4}}\n\nO cancelamento já entrou no sistema. Ainda dá tempo de oferecer esse horário para outra pessoa.',
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
/**
 * Botões quando o template mistura link e resposta rápida.
 *
 * Só o sinal usa. O link leva pra página de pagamento, que tem QR, botão
 * de copiar só o código e o nome do salão em cima — a mensagem não carrega
 * copia-e-cola no corpo de propósito: no celular a cliente toca e segura e
 * copia a mensagem INTEIRA, e colar isso no banco não funciona.
 *
 * `sufixo` é só o que vem depois da base cravada na aprovação. A Meta
 * concatena com `.../sinal?`; mandar a URL completa faz o envio ser
 * recusado.
 */
export function botoesDoTipo(
  tipo: TipoMensagem,
  appointmentId: string | null | undefined,
):
  | Array<{ tipo: 'quick_reply'; payload: string } | { tipo: 'url'; sufixo: string }>
  | undefined {
  if (tipo !== 'sinal_pendente' || !appointmentId) return undefined
  return [
    { tipo: 'url', sufixo: `id=${appointmentId}&token=${generateSinalToken(appointmentId)}` },
    { tipo: 'quick_reply', payload: `japaguei:${appointmentId}` },
  ]
}

export function payloadsDosBotoes(
  tipo: TipoMensagem,
  appointmentId: string | null | undefined,
): string[] | undefined {
  const def = TEMPLATES[tipo]
  if (!def?.botoes || !appointmentId) return undefined
  return def.botoes.map((b) => `${b}:${appointmentId}`)
}

/* ═══════════════════════════════════════════════════════════════
   TEXTO PRÓPRIO DO NEGÓCIO (v144)

   A conta do WhatsApp é uma só, da AgendaPRO. Se a dona editasse o texto
   direto, mudaria para TODOS os negócios. A saída é uma VARIANTE por
   negócio dentro da mesma conta: o CAF ganha um
   `agendapro_lembrete_vespera_3b6246cb` com o texto dele, e o motor usa a
   variante quando ela existe E está aprovada.

   Fora disso, cai no texto padrão — sempre. Template reprovado, pausado ou
   ainda em análise não pode deixar a dona sem aviso nenhum.
   ═══════════════════════════════════════════════════════════════ */

/** Quantas variáveis o texto daquele tipo tem que conter. */
export function quantasVariaveis(tipo: TipoMensagem): number {
  const def = TEMPLATES[tipo]
  if (!def) return 0
  /* Roda a função de params com um objeto de teste só pra contar. É a única
     fonte confiável: se alguém mexer no mapa e esquecer daqui, a contagem
     acompanha sozinha. */
  return def.params({
    cliente: 'x', salao: 'x', data: 'x', hora: 'x', servico: 'x',
    telefoneSalao: 'x', profissional: 'x',
  }).length
}

/** Nome do template na Meta. Só [a-z0-9_] — é o limite dela. */
export function nomeMetaDoNegocio(tipo: TipoMensagem, businessId: string): string {
  const sufixo = businessId.replace(/-/g, '').slice(0, 8).toLowerCase()
  return `agendapro_${tipo}_${sufixo}`
}

export type Validacao = { ok: true } | { ok: false; erros: string[] }

/**
 * Barra o texto ANTES de gastar chamada na Meta.
 *
 * As três primeiras regras vêm de erro real levando 400 em 29/08; a quarta
 * é nossa e é a mais importante: se a dona apagar o {{4}}, os parâmetros
 * desalinham e a mensagem sai com o serviço no lugar da hora. A Meta
 * aprovaria isso sem reclamar — quem tem que barrar somos nós.
 */
export function validarCorpo(tipo: TipoMensagem, corpo: string): Validacao {
  const erros: string[] = []
  const texto = (corpo ?? '').trim()

  if (texto.length < 30) erros.push('O texto está curto demais.')
  if (texto.length > 1024) erros.push('O texto passa de 1024 caracteres, que é o limite do WhatsApp.')

  /* [2388299] O ponto final NÃO conta como texto: terminar em
     "...telefone {{6}}." é terminar com variável. */
  if (/^\{\{/.test(texto)) erros.push('O texto não pode começar com um campo automático.')
  if (/\{\{\d+\}\}[.!?\s]*$/.test(texto)) {
    erros.push('O texto não pode terminar com um campo automático — escreva uma frase depois dele.')
  }

  /* [2388293] A Meta exige texto fixo suficiente pro número de campos. */
  const encontradas = texto.match(/\{\{\d+\}\}/g) ?? []
  const palavras = texto.replace(/\{\{\d+\}\}/g, ' ').split(/\s+/).filter(Boolean).length
  if (encontradas.length && palavras / encontradas.length < 4) {
    erros.push('Faltam palavras para a quantidade de campos automáticos. Escreva um pouco mais.')
  }

  /* Nossa: todos os campos, uma vez cada, na ordem. */
  const esperadas = quantasVariaveis(tipo)
  for (let i = 1; i <= esperadas; i++) {
    const n = encontradas.filter((v) => v === `{{${i}}}`).length
    if (n === 0) erros.push(`O campo {{${i}}} sumiu do texto e ele é obrigatório.`)
    else if (n > 1) erros.push(`O campo {{${i}}} aparece ${n} vezes; pode aparecer só uma.`)
  }
  for (const v of new Set(encontradas)) {
    const num = Number(v.replace(/\D/g, ''))
    if (num < 1 || num > esperadas) erros.push(`O campo ${v} não existe neste aviso.`)
  }

  return erros.length ? { ok: false, erros } : { ok: true }
}

/**
 * Qual template usar pra este negócio: o dele, se aprovado; o padrão, se não.
 *
 * Uma consulta a mais por envio. Vale: sem ela, o texto que a dona pagou
 * pra ter aprovado nunca sairia.
 */
export async function resolverTemplate(
  db: SupabaseClient,
  businessId: string,
  tipo: TipoMensagem,
): Promise<DefTemplate | null> {
  const padrao = TEMPLATES[tipo]
  if (!padrao) return null

  const { data } = await db
    .from('message_templates_negocio')
    .select('nome_meta, status')
    .eq('business_id', businessId)
    .eq('tipo', tipo)
    .maybeSingle()

  const r = data as { nome_meta?: string; status?: string } | null
  /* Só APPROVED. PENDING, REJECTED e PAUSED caem no padrão — a dona não
     pode ficar sem aviso porque o texto dela ainda está em análise. */
  if (r?.status === 'APPROVED' && r.nome_meta) {
    return { ...padrao, nome: r.nome_meta }
  }
  return padrao
}
