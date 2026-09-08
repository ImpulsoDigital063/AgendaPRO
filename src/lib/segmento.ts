/**
 * Segmento do negócio — fonte única dos exemplos que o dono vê no painel.
 *
 * POR QUE ESSE ARQUIVO EXISTE (19/08/2026, pedido do Gustavo · CAF Fisioterapia):
 * o sistema mostrava "Corte masculino", "Barba" e "Manicure" como exemplo pra
 * QUALQUER negócio que não batesse numa lista de categorias. Clínica abrindo o
 * painel e lendo "Corte masculino" parece sistema de salão adaptado na marra —
 * espanta cliente de outro nicho.
 *
 * A causa não era a falta de tradução por nicho (isso já existia, espalhado em
 * 4 componentes). Era o CAMPO usado pra decidir o nicho: o painel lia
 * `businesses.description`, que o cadastro preenchia com a categoria MAS que o
 * dono edita livremente em Configurações → Negócio. No instante em que ele
 * troca "Clínica estética" por "Estética, Saúde & Bem-estar", o match morre e
 * todo mundo cai no exemplo de salão. Por isso agora existe `category` (coluna
 * própria, escolhida numa lista) e `description` volta a ser só texto livre.
 *
 * Regra: exemplo que não casa com o nicho é pior que exemplo nenhum. Quando o
 * segmento é desconhecido, usar os neutros — servem pra clínica, barbearia,
 * estúdio ou consultório sem constranger ninguém.
 */

/** Lista oficial — cadastro e Configurações usam a MESMA. */
export const CATEGORIAS = [
  'Barbearia',
  'Salão de beleza',
  'Nail designer',
  'Manicure',
  'Cílios e sobrancelhas',
  'Clínica estética',
  'Fisioterapia',
  'Clínica / consultório',
  'Estúdio de tatuagem',
  'Psicólogo / Terapeuta',
  'Personal trainer',
  'Outro',
] as const

export type Categoria = (typeof CATEGORIAS)[number]

/* ═══════════════════════════════════════════════════════════════
   COMO O NEGÓCIO CHAMA QUEM ELE ATENDE

   Eduardo, 01/09: "de fato o CAF não trata cliente, ele trata paciente, e
   clínicas também seguem por esse rumo".

   O painel inteiro foi escrito em linguagem de salão — "a cliente", "sua
   cliente", "ela". Numa clínica de fisioterapia isso soa errado duas vezes:
   erra o termo E erra o gênero, porque metade dos pacientes é homem.

   O gênero acompanha o termo de propósito. Em salão a base é feminina e
   escrever "a cliente" é o que soa natural para a dona; em clínica o
   masculino é a forma não marcada. Não é descuido — é a linguagem de cada
   lugar.
   ═══════════════════════════════════════════════════════════════ */
export type TermoPessoa = {
  /** cliente · paciente · aluno */
  s: string
  /** clientes · pacientes · alunos */
  p: string
  /** a · o — artigo definido */
  art: string
  /** sua · seu — possessivo antes do singular */
  poss: string
  /** suas · seus */
  possP: string
  /** dela · dele */
  de: string
  /** ela · ele */
  pron: string
}

const CLIENTE: TermoPessoa = { s: 'cliente', p: 'clientes', art: 'a', poss: 'sua', possP: 'suas', de: 'dela', pron: 'ela' }
const PACIENTE: TermoPessoa = { s: 'paciente', p: 'pacientes', art: 'o', poss: 'seu', possP: 'seus', de: 'dele', pron: 'ele' }
const ALUNO: TermoPessoa = { s: 'aluno', p: 'alunos', art: 'o', poss: 'seu', possP: 'seus', de: 'dele', pron: 'ele' }

/** O termo que ESTE negócio usa. Sem categoria, cai em cliente. */
export function termoPessoa(categoria: string | null | undefined): TermoPessoa {
  switch ((categoria ?? '').trim()) {
    case 'Fisioterapia':
    case 'Clínica / consultório':
    case 'Psicólogo / Terapeuta':
      return PACIENTE
    case 'Personal trainer':
      return ALUNO
    default:
      return CLIENTE
  }
}

/** Neutros: nenhum termo de salão. Servem pra qualquer segmento. */
export const SERVICOS_NEUTROS = ['Atendimento', 'Avaliação', 'Sessão', 'Consulta', 'Retorno']
export const RECOMPENSAS_NEUTRAS = [
  'Atendimento grátis',
  '20% off no próximo',
  '10% off no próximo',
  'Sessão grátis',
  'Brinde surpresa',
]

const SERVICOS_POR_CATEGORIA: Record<string, string[]> = {
  'Barbearia': ['Corte simples', 'Corte + Barba', 'Barba', 'Pezinho', 'Sobrancelha'],
  'Salão de beleza': ['Escova', 'Corte feminino', 'Coloração', 'Hidratação', 'Manicure'],
  'Nail designer': ['Esmaltação simples', 'Gel', 'Fibra de vidro', 'Alongamento', 'Manutenção'],
  'Manicure': ['Mão', 'Pé', 'Mão e pé', 'Esmaltação em gel', 'Spa dos pés'],
  'Cílios e sobrancelhas': ['Extensão de cílios', 'Manutenção de cílios', 'Design de sobrancelha', 'Henna', 'Lash lifting'],
  'Clínica estética': ['Limpeza de pele', 'Drenagem linfática', 'Peeling', 'Microagulhamento', 'Massagem relaxante'],
  'Fisioterapia': ['Avaliação fisioterapêutica', 'Sessão de fisioterapia', 'Pilates clínico', 'Reabilitação pós-cirúrgica', 'Retorno'],
  'Clínica / consultório': ['Consulta', 'Primeira consulta', 'Retorno', 'Avaliação', 'Procedimento'],
  'Estúdio de tatuagem': ['Tatuagem pequena', 'Tatuagem média', 'Sessão de retoque', 'Cover up', 'Piercing'],
  'Psicólogo / Terapeuta': ['Sessão individual', 'Sessão online', 'Avaliação inicial', 'Sessão de casal', 'Sessão familiar'],
  'Personal trainer': ['Avaliação física', 'Sessão individual', 'Pacote 4 sessões', 'Pacote 8 sessões', 'Treino online'],
}

const RECOMPENSAS_POR_CATEGORIA: Record<string, string[]> = {
  'Barbearia': ['Corte grátis', 'Barba grátis', 'Corte + Barba grátis', '20% off no próximo', 'Sobrancelha grátis'],
  'Salão de beleza': ['Escova grátis', 'Corte grátis', '20% off', 'Hidratação grátis', 'Manicure grátis'],
  'Nail designer': ['Esmaltação grátis', 'Manutenção grátis', '20% off no próximo', 'Alongamento com desconto', 'Spa dos pés grátis'],
  'Manicure': ['Mão grátis', 'Pé grátis', '20% off no spa', 'Esmaltação em gel grátis', 'Mão e pé grátis'],
  'Cílios e sobrancelhas': ['Manutenção grátis', 'Design grátis', '20% off no próximo', 'Henna grátis', 'Lash lifting com desconto'],
  'Clínica estética': ['Limpeza de pele grátis', 'Sessão de drenagem grátis', '20% off no próximo', 'Massagem grátis', 'Avaliação grátis'],
  'Fisioterapia': ['Sessão grátis', 'Avaliação grátis', '20% off no pacote', 'Sessão de pilates grátis', 'Retorno sem custo'],
  'Clínica / consultório': ['Consulta de retorno grátis', 'Avaliação grátis', '20% off no próximo', '10% off no pacote', 'Procedimento com desconto'],
  'Estúdio de tatuagem': ['Retoque grátis', '20% off na próxima', 'Piercing grátis', 'Desconto no cover up', 'Sessão com desconto'],
  'Psicólogo / Terapeuta': ['Sessão grátis', 'Avaliação grátis', '20% off no pacote', 'Sessão online grátis', '10% off no próximo'],
  'Personal trainer': ['Sessão grátis', 'Avaliação física grátis', '20% off no pacote', 'Treino online grátis', 'Aula extra grátis'],
}

/**
 * Descobre o segmento de um negócio.
 *
 * 1º a coluna `category` (escolhida numa lista, é a verdade).
 * 2º compatibilidade: `description` só vale se bater EXATO com uma categoria
 *    conhecida — é o que o cadastro antigo gravava lá. Descrição livre
 *    ("Estética, Saúde & Bem-estar") NÃO vira palpite de nicho.
 */
export function resolveCategoria(business: {
  category?: string | null
  description?: string | null
}): string | null {
  const cat = business.category?.trim()
  if (cat && cat !== 'Outro') return cat
  const desc = business.description?.trim()
  if (desc && desc !== 'Outro' && SERVICOS_POR_CATEGORIA[desc]) return desc
  return null
}

/** Sugestões de serviço do nicho — neutras quando o nicho é desconhecido. */
export function sugestoesDeServico(categoria: string | null): string[] {
  if (!categoria) return SERVICOS_NEUTROS
  return SERVICOS_POR_CATEGORIA[categoria] ?? SERVICOS_NEUTROS
}

/** Sugestões de recompensa de fidelidade do nicho. */
export function sugestoesDeRecompensa(categoria: string | null): string[] {
  if (!categoria) return RECOMPENSAS_NEUTRAS
  return RECOMPENSAS_POR_CATEGORIA[categoria] ?? RECOMPENSAS_NEUTRAS
}

/**
 * Dois serviços de exemplo pra telas de PREVIEW (aparência, mensagens), onde o
 * negócio pode ainda não ter serviço cadastrado. Mesmo critério: sem nicho,
 * sem termo de salão.
 */
export function servicosDeExemplo(categoria: string | null): Array<{ nome: string; preco: number; minutos: number }> {
  const [a, b] = sugestoesDeServico(categoria)
  return [
    { nome: a, preco: 50, minutos: 30 },
    { nome: b, preco: 30, minutos: 20 },
  ]
}

/**
 * Prazo de "sumido" sugerido por segmento · usado no tour da aba Sumidos
 * (08/09/2026). Mora aqui, e não em coupon-templates, pelo mesmo motivo que
 * este arquivo existe: nicho se decide por `category`, não pelo texto livre
 * de `description`, que o dono edita quando quer.
 *
 * Fisioterapia e consultório entram com ciclo próprio — o CAF abria o tour e
 * lia sugestão de salão. Cada segmento tem seu ritmo de retorno.
 */
export function prazoSumidoSugerido(categoria: string | null): string {
  switch ((categoria ?? '').trim()) {
    case 'Barbearia':
      return 'Corte e barba costumam pedir 15 ou 20 dias.'
    case 'Nail designer':
    case 'Manicure':
      return 'Manutenção de unha costuma pedir 15 ou 20 dias.'
    case 'Cílios e sobrancelhas':
      return 'Manutenção de cílios costuma pedir 15 ou 20 dias.'
    case 'Salão de beleza':
      return 'Retoque de raiz costuma pedir 20 ou 30 dias; corte, 40.'
    case 'Clínica estética':
      return 'Sessão de manutenção costuma pedir 20 ou 30 dias.'
    case 'Fisioterapia':
      return 'Tratamento tem sessões seguidas: 15 dias sem voltar já quebra a sequência.'
    case 'Clínica / consultório':
      return 'Retorno costuma ser marcado em 30 dias; passou disso, vale chamar.'
    case 'Psicólogo / Terapeuta':
      return 'Em atendimento semanal ou quinzenal, 15 ou 20 dias já é falta.'
    case 'Personal trainer':
      return 'Quem treina toda semana: 15 dias parado já é sinal.'
    case 'Estúdio de tatuagem':
      return 'Retoque e sessão seguinte costumam levar 30 ou 40 dias.'
    default:
      return 'Escolha o prazo que faz sentido pro seu tipo de atendimento.'
  }
}
