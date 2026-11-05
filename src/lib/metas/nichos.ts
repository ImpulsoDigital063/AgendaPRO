/* ═══════════════════════════════════════════════════════════════
   ABA METAS · O QUE MUDA POR NICHO (04/11/2026)

   Eduardo: "não dá pra usar a mesma imagem e mesma copy pra uma barbearia".
   Tudo que a aba Metas mostra e que depende do tipo de negócio mora AQUI:
   imagem padrão do sonho, exemplos de sonho, texto da ação de hoje e o tom.
   Automático pela categoria do negócio (lib/segmento · resolveCategoria),
   sem configuração. Nicho novo = um bloco a mais neste arquivo.

   Imagens: public/metas/nichos/<nicho>-640.webp (+ <nicho>.webp 1280 px
   pro passo do sonho), FOTO REAL do espaço de trabalho, sem pessoa. Envato,
   licença "AgendaPRO · aba Metas": barbearia PLEEH4W · salao C225KH6 ·
   unhas ATKAR5M · cilios APFF32N · clinica J5Z4XLY · geral JZ2PYBU.
   Registro: verbo-studio/saida/agendapro-site/midia-web/MANIFESTO.md,
   seção "Aba Metas".
   ═══════════════════════════════════════════════════════════════ */

import { termoPessoa, type TermoPessoa } from '@/lib/segmento'

export type NichoMetas = {
  chave: 'barbearia' | 'salao' | 'unhas' | 'cilios' | 'clinica' | 'tatuagem' | 'personal' | 'geral'
  /** imagem padrão do sonho (sem foto própria) */
  imagem: string
  /** 3 exemplos curtos que aparecem como atalho no passo do sonho */
  exemplosSonho: string[]
  /** placeholder do campo "O quê" */
  placeholderSonho: string
  /** dias sem voltar que contam como "sumiu" na ação de hoje */
  diasSumido: number
  /** frase curta abaixo do título da aba (o tom do nicho) */
  tom: string
  /** quando bate a meta */
  bateu: string
  /** pergunta do passo 1 ({mes} vira o nome do mês) */
  perguntaMeta: string
  /** pergunta do passo 2 (sonho) */
  perguntaSonho: string
  /** botão de pular o sonho */
  pular: string
  /** botão da ação "horários livres" quando há quem chamar */
  botaoChamar: string
  pessoa: TermoPessoa
}

const BASE: Record<NichoMetas['chave'], Omit<NichoMetas, 'pessoa'>> = {
  barbearia: {
    chave: 'barbearia',
    imagem: '/metas/nichos/barbearia-640.webp',
    exemplosSonho: ['Cadeira nova', 'Reformar a barbearia', 'Contratar mais um barbeiro'],
    placeholderSonho: 'Ex.: cadeira nova',
    diasSumido: 30,
    tom: 'Quanto a barbearia fez no mês e o que dá pra fazer hoje.',
    bateu: 'Bateu!',
    perguntaMeta: 'Meta de {mes}?',
    perguntaSonho: 'Juntando pra quê?',
    pular: 'Pular',
    botaoChamar: 'Chamar clientes',
  },
  salao: {
    chave: 'salao',
    imagem: '/metas/nichos/salao-640.webp',
    exemplosSonho: ['Lavatório novo', 'Renovar o salão', 'Fazer um curso'],
    placeholderSonho: 'Ex.: lavatório novo',
    diasSumido: 45,
    tom: 'Quanto o salão fez no mês e o que dá pra fazer hoje.',
    bateu: 'Você chegou lá!',
    perguntaMeta: 'Quanto você quer faturar em {mes}?',
    perguntaSonho: 'Tem um sonho por trás dessa meta?',
    pular: 'Agora não',
    botaoChamar: 'Chamar clientes',
  },
  unhas: {
    chave: 'unhas',
    imagem: '/metas/nichos/unhas-640.webp',
    exemplosSonho: ['Cabine nova', 'Curso de alongamento', 'Tirar férias'],
    placeholderSonho: 'Ex.: cabine nova',
    diasSumido: 30,
    tom: 'Quanto você fez no mês e o que dá pra fazer hoje.',
    bateu: 'Você chegou lá!',
    perguntaMeta: 'Quanto você quer faturar em {mes}?',
    perguntaSonho: 'Tem um sonho por trás dessa meta?',
    pular: 'Agora não',
    botaoChamar: 'Chamar clientes',
  },
  cilios: {
    chave: 'cilios',
    imagem: '/metas/nichos/cilios-640.webp',
    exemplosSonho: ['Maca nova', 'Curso de técnica nova', 'Tirar férias'],
    placeholderSonho: 'Ex.: maca nova',
    diasSumido: 30,
    tom: 'Quanto você fez no mês e o que dá pra fazer hoje.',
    bateu: 'Você chegou lá!',
    perguntaMeta: 'Quanto você quer faturar em {mes}?',
    perguntaSonho: 'Tem um sonho por trás dessa meta?',
    pular: 'Agora não',
    botaoChamar: 'Chamar pra manutenção',
  },
  clinica: {
    chave: 'clinica',
    imagem: '/metas/nichos/clinica-640.webp',
    exemplosSonho: ['Aparelho novo', 'Reformar a recepção', 'Contratar mais um profissional'],
    placeholderSonho: 'Ex.: aparelho novo',
    diasSumido: 60,
    tom: 'Quanto a clínica faturou no mês e o próximo passo de hoje.',
    bateu: 'Você chegou lá!',
    perguntaMeta: 'Quanto você quer faturar em {mes}?',
    perguntaSonho: 'Tem um sonho por trás dessa meta?',
    pular: 'Agora não',
    botaoChamar: 'Chamar pacientes',
  },
  tatuagem: {
    chave: 'tatuagem',
    imagem: '/metas/nichos/geral-640.webp',
    exemplosSonho: ['Máquina nova', 'Reformar o estúdio', 'Convenção de tatuagem'],
    placeholderSonho: 'Ex.: máquina nova',
    diasSumido: 60,
    tom: 'Quanto o estúdio fez no mês e o que dá pra fazer hoje.',
    bateu: 'Bateu!',
    perguntaMeta: 'Meta de {mes}?',
    perguntaSonho: 'Juntando pra quê?',
    pular: 'Pular',
    botaoChamar: 'Chamar clientes',
  },
  personal: {
    chave: 'personal',
    imagem: '/metas/nichos/geral-640.webp',
    exemplosSonho: ['Equipamento novo', 'Curso ou certificação', 'Tirar férias'],
    placeholderSonho: 'Ex.: equipamento novo',
    diasSumido: 30,
    tom: 'Quanto você fez no mês e o que dá pra fazer hoje.',
    bateu: 'Bateu!',
    perguntaMeta: 'Quanto você quer faturar em {mes}?',
    perguntaSonho: 'Juntando pra quê?',
    pular: 'Pular',
    botaoChamar: 'Chamar alunos',
  },
  geral: {
    chave: 'geral',
    imagem: '/metas/nichos/geral-640.webp',
    exemplosSonho: ['Renovar o espaço', 'Fazer um curso', 'Tirar férias'],
    placeholderSonho: 'Ex.: renovar o espaço',
    diasSumido: 60,
    tom: 'Quanto você fez no mês e o que dá pra fazer hoje.',
    bateu: 'Você chegou lá!',
    perguntaMeta: 'Quanto você quer faturar em {mes}?',
    perguntaSonho: 'Tem um sonho por trás dessa meta?',
    pular: 'Agora não',
    botaoChamar: 'Chamar clientes',
  },
}

function chaveDaCategoria(categoria: string | null | undefined): NichoMetas['chave'] {
  switch ((categoria ?? '').trim()) {
    case 'Barbearia': return 'barbearia'
    case 'Salão de beleza': return 'salao'
    case 'Nail designer':
    case 'Manicure': return 'unhas'
    case 'Cílios e sobrancelhas': return 'cilios'
    case 'Clínica estética':
    case 'Fisioterapia':
    case 'Clínica / consultório':
    case 'Psicólogo / Terapeuta': return 'clinica'
    case 'Estúdio de tatuagem': return 'tatuagem'
    case 'Personal trainer': return 'personal'
    default: return 'geral'
  }
}

/** Conteúdo da aba Metas para a categoria do negócio (resolveCategoria). */
export function nichoMetas(categoria: string | null | undefined): NichoMetas {
  return { ...BASE[chaveDaCategoria(categoria)], pessoa: termoPessoa(categoria) }
}

/** "3 clientes" · "1 paciente" — singular/plural do termo do nicho. */
export function pessoas(n: number, t: TermoPessoa): string {
  return `${n} ${n === 1 ? t.s : t.p}`
}
