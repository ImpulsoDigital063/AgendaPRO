/* ═══════════════════════════════════════════════════════════════
   Pergunte ao seu negócio · catálogo (21/10/2026)

   Perguntas prontas, SEM IA (custo zero · plano aprovado pelo Eduardo).
   Cada pergunta tem palavras-chave pra caixa de busca entender outros
   jeitos de perguntar, e a resposta sai das MESMAS contas das telas
   (lib/perguntas/responder.ts) — nunca de conta paralela.

   Este arquivo roda no navegador e no servidor: só dado e texto aqui.
   ═══════════════════════════════════════════════════════════════ */

export type Grupo = 'faturamento' | 'despesas' | 'equipe' | 'clientes' | 'agenda'

export const GRUPOS: { id: Grupo; titulo: string }[] = [
  { id: 'faturamento', titulo: 'Faturamento' },
  { id: 'despesas', titulo: 'Despesas e lucro' },
  { id: 'equipe', titulo: 'Equipe' },
  { id: 'clientes', titulo: 'Clientes' },
  { id: 'agenda', titulo: 'Agenda' },
]

/** hoje · ontem · semana (7 dias) · mes (1º até hoje) · mes_passado · 30dias · ano · m:AAAA-MM */
export type PeriodoId = string

export const PERIODOS_FIXOS: { id: PeriodoId; rotulo: string }[] = [
  { id: 'hoje', rotulo: 'Hoje' },
  { id: 'ontem', rotulo: 'Ontem' },
  { id: 'semana', rotulo: 'Últimos 7 dias' },
  { id: 'mes', rotulo: 'Este mês' },
  { id: 'mes_passado', rotulo: 'Mês passado' },
  { id: '30dias', rotulo: 'Últimos 30 dias' },
  { id: 'ano', rotulo: 'Este ano' },
]

export type Pergunta = {
  id: string
  grupo: Grupo
  texto: string
  /** Palavras e trechos que indicam esta pergunta (sem acento, minúsculo). */
  palavras: string[]
  /** Escolhe período? (as de cliente de "sempre" não escolhem) */
  periodo?: PeriodoId
  /** Aceita filtrar por profissional */
  profissional?: boolean
  /** Aceita escolher dias (sumidas) */
  dias?: number
}

export const PERGUNTAS: Pergunta[] = [
  // ── Faturamento ──────────────────────────────────────────────
  { id: 'faturei', grupo: 'faturamento', texto: 'Quanto faturei?', periodo: 'mes', profissional: true,
    palavras: ['faturei', 'faturamento', 'faturou', 'ganhei', 'ganho', 'entrou', 'recebi', 'receita', 'vendi', 'quanto fiz', 'quanto deu', 'dinheiro', 'rendeu', 'faturar'] },
  { id: 'comparar', grupo: 'faturamento', texto: 'Faturei mais ou menos que antes?', periodo: 'mes',
    palavras: ['comparado', 'comparar', 'comparacao', 'mais que', 'menos que', 'cresci', 'crescimento', 'caiu', 'melhorou', 'piorou', 'anterior', 'versus', ' vs '] },
  { id: 'ticket', grupo: 'faturamento', texto: 'Qual meu ticket médio?', periodo: 'mes',
    palavras: ['ticket', 'tiket', 'media por cliente', 'gasta em media', 'valor medio', 'media por atendimento'] },
  { id: 'servico_fatura', grupo: 'faturamento', texto: 'Qual serviço mais fatura?', periodo: 'mes',
    palavras: ['servico que mais fatura', 'servico mais lucrativo', 'servico que mais da dinheiro', 'servico que mais rende', 'melhor servico', 'servicos que mais faturam'] },
  { id: 'servico_qtd', grupo: 'faturamento', texto: 'Qual serviço mais vendido?', periodo: 'mes',
    palavras: ['servico mais vendido', 'servico mais procurado', 'servico mais feito', 'mais pedido', 'servico favorito', 'servicos mais vendidos', 'servico mais vende', 'servico que mais vende', 'servicos que mais vendem', 'procedimento mais feito'] },
  { id: 'produtos', grupo: 'faturamento', texto: 'Quanto vendi de produtos?', periodo: 'mes',
    palavras: ['produtos', 'produto', 'venda de produto', 'vendi de produto', 'loja', 'cosmetico', 'revenda'] },
  { id: 'produto_top', grupo: 'faturamento', texto: 'Qual produto mais vende?', periodo: 'mes',
    palavras: ['produto mais vendido', 'produto que mais vende', 'produto mais vende', 'melhor produto', 'produtos mais vendidos', 'produtos que mais vendem'] },
  { id: 'formas', grupo: 'faturamento', texto: 'Quanto recebi em Pix, cartão e dinheiro?', periodo: 'mes',
    palavras: ['pix', 'cartao', 'dinheiro vivo', 'especie', 'forma de pagamento', 'formas de pagamento', 'debito', 'credito', 'como pagaram', 'no pix', 'em pix', 'no cartao', 'em dinheiro', 'no dinheiro', 'forma de pagamento mais usada'] },
  { id: 'taxas', grupo: 'faturamento', texto: 'Quanto paguei de taxa de maquininha?', periodo: 'mes',
    palavras: ['taxa', 'taxas', 'maquininha', 'maquina', 'tarifa', 'desconto do cartao'] },
  { id: 'a_receber', grupo: 'faturamento', texto: 'Quanto tenho a receber?', periodo: 'mes',
    palavras: ['a receber', 'receber', 'falta receber', 'nao pagou', 'nao pagaram', 'devendo', 'em aberto', 'fiado', 'pendente'] },
  { id: 'melhor_dia', grupo: 'faturamento', texto: 'Qual foi meu melhor dia?', periodo: 'mes',
    palavras: ['melhor dia', 'dia que mais faturei', 'dia mais forte', 'recorde', 'maior faturamento'] },

  // ── Despesas e lucro ─────────────────────────────────────────
  { id: 'gastei', grupo: 'despesas', texto: 'Quanto gastei?', periodo: 'mes',
    palavras: ['gastei', 'gasto', 'gastos', 'despesa', 'despesas', 'paguei', 'saiu', 'custo', 'custos', 'conta'] },
  { id: 'maior_despesa', grupo: 'despesas', texto: 'Qual minha maior despesa?', periodo: 'mes',
    palavras: ['maior despesa', 'maior gasto', 'mais gastei', 'mais caro', 'onde gasto mais'] },
  { id: 'lucro', grupo: 'despesas', texto: 'Quanto sobrou? (lucro)', periodo: 'mes',
    palavras: ['lucro', 'lucrei', 'sobrou', 'sobra', 'resultado', 'liquido', 'no bolso', 'ganhei de verdade', 'prejuizo'] },
  { id: 'sinal', grupo: 'despesas', texto: 'Quanto entrou de sinal?', periodo: 'mes',
    palavras: ['sinal', 'sinais', 'adiantamento', 'entrada', 'reserva'] },

  // ── Equipe ───────────────────────────────────────────────────
  { id: 'prof_top', grupo: 'equipe', texto: 'Quem mais faturou na equipe?', periodo: 'mes',
    palavras: ['quem mais faturou', 'profissional que mais', 'melhor profissional', 'ranking', 'equipe', 'quem mais vendeu', 'faturou cada'] },
  { id: 'comissao', grupo: 'equipe', texto: 'Quanto de comissão a equipe gerou?', periodo: 'mes', profissional: true,
    palavras: ['comissao', 'comissoes', 'pagar a equipe', 'pagar pra', 'pagar para', 'repasse', 'remuneracao', 'quanto devo'] },
  { id: 'prof_atend', grupo: 'equipe', texto: 'Quantos atendimentos cada uma fez?', periodo: 'mes',
    palavras: ['atendimentos cada', 'quantos atendimentos', 'quantas clientes atendeu', 'quem mais atendeu', 'produtividade'] },
  { id: 'prof_ticket', grupo: 'equipe', texto: 'Qual o ticket médio de cada profissional?', periodo: 'mes',
    palavras: ['ticket de cada', 'ticket por profissional', 'media de cada profissional'] },
  { id: 'prof_fieis', grupo: 'equipe', texto: 'Quem tem mais clientes que voltam?',
    palavras: ['clientes que voltam', 'fidelidade da equipe', 'clientes fieis', 'quem fideliza', 'retorno de cada'] },
  { id: 'prof_faltas', grupo: 'equipe', texto: 'Quem tem mais faltas e cancelamentos na agenda?', periodo: 'mes',
    palavras: ['falta por profissional', 'cancelamento por profissional', 'agenda de quem cancela', 'quem perde mais'] },

  // ── Clientes ─────────────────────────────────────────────────
  { id: 'novas', grupo: 'clientes', texto: 'Quantas clientes novas vieram?', periodo: 'mes',
    palavras: ['novas', 'novos', 'nova cliente', 'cliente nova', 'clientes novas', 'primeira vez', 'chegaram'] },
  { id: 'melhores', grupo: 'clientes', texto: 'Quem são minhas melhores clientes?',
    palavras: ['melhores clientes', 'melhor cliente', 'quem mais gasta', 'mais gastou', 'vip', 'top clientes', 'clientes que mais gastam'] },
  { id: 'frequentes', grupo: 'clientes', texto: 'Quem vem com mais frequência?',
    palavras: ['frequencia', 'frequente', 'frequentes', 'mais vem', 'mais vezes', 'assidua', 'quem mais aparece'] },
  { id: 'sumidas', grupo: 'clientes', texto: 'Quem sumiu?', dias: 60,
    palavras: ['sumiu', 'sumiram', 'sumida', 'sumidas', 'sumido', 'nao volta', 'nao voltou', 'parou de vir', 'pararam de vir', 'parou de aparecer', 'abandonou', 'perdi', 'inativa', 'inativas', 'nao voltam', 'nao voltaram', 'nao vem mais', 'nao aparece mais', 'sumindo'] },
  { id: 'aniversario', grupo: 'clientes', texto: 'Quem faz aniversário este mês?',
    palavras: ['aniversario', 'aniversariante', 'aniversariantes', 'niver', 'faz anos', 'parabens'] },
  { id: 'voltaram', grupo: 'clientes', texto: 'Quantas clientes voltaram depois da primeira vez?',
    palavras: ['voltaram', 'retorno', 'retornaram', 'voltar', 'segunda vez', 'retencao', 'fidelizei'] },
  { id: 'pontos', grupo: 'clientes', texto: 'Quem tem mais pontos de fidelidade?',
    palavras: ['pontos', 'ponto', 'fidelidade', 'clube', 'recompensa', 'resgate'] },

  // ── Agenda ───────────────────────────────────────────────────
  { id: 'dia_cheio', grupo: 'agenda', texto: 'Qual meu dia da semana mais cheio?', periodo: '30dias',
    palavras: ['dia mais cheio', 'dia da semana', 'dia mais movimentado', 'dia mais fraco', 'dia mais vazio', 'qual dia'] },
  { id: 'horario_cheio', grupo: 'agenda', texto: 'Qual meu horário mais cheio?', periodo: '30dias',
    palavras: ['horario', 'horarios', 'hora mais cheia', 'pico', 'movimentado', 'mais vazio', 'horario vazio', 'que horas'] },
  { id: 'faltas', grupo: 'agenda', texto: 'Quantas faltas tive?', periodo: 'mes',
    palavras: ['falta', 'faltas', 'faltou', 'faltaram', 'nao veio', 'nao apareceu', 'bolo', 'furou', 'no show'] },
  { id: 'cancelamentos', grupo: 'agenda', texto: 'Quantos cancelamentos tive?', periodo: 'mes',
    palavras: ['cancelamento', 'cancelamentos', 'cancelou', 'cancelaram', 'cancelado', 'desmarcou', 'desmarcaram'] },
  { id: 'proxima_semana', grupo: 'agenda', texto: 'Quantos agendamentos tenho na próxima semana?',
    palavras: ['proxima semana', 'proximos dias', 'semana que vem', 'agenda da semana', 'tenho marcado', 'agendados', 'amanha'] },
]

export const PERGUNTA_POR_ID: Record<string, Pergunta> = Object.fromEntries(PERGUNTAS.map((p) => [p.id, p]))

export type Resposta = {
  titulo: string
  /** Frase principal, já com o número. */
  frase: string
  itens?: { rotulo: string; valor: string }[]
  link?: { href: string; rotulo: string }
  /** Nota pequena (de onde vem o número, regra usada). */
  nota?: string
}
