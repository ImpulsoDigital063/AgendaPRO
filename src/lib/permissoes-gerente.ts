/**
 * Permissões da GERENTE por área do painel (v156 · 10/10/2026).
 *
 * A gerente entra no /admin do dono (v155). A dona escolhe, no cadastro da
 * colaboradora, quais áreas ela acessa. No banco fica a lista das áreas
 * BLOQUEADAS (`professionals.gerente_areas_bloqueadas`, vazio = tudo liberado)
 * — assim toda gerente nasce com tudo ativo, inclusive as que já existiam
 * (Marília / Studio MOOD).
 *
 * Este arquivo é o mapa único rota → área. Menu, telas (layout) e API usam
 * ele, pra não ficarem desencontrados. Agenda/atendimentos é a base e não
 * trava. A Assinatura é do dono e nem entra aqui (v155).
 */

export const AREAS_GERENTE = [
  { id: 'clientes', label: 'Clientes', desc: 'Clientes, sumidos e importar' },
  { id: 'vendas', label: 'Vendas e caixa', desc: 'Comandas, vendas, caixa, fechar o dia, pacotes e cartão presente' },
  { id: 'estoque', label: 'Produtos e estoque', desc: 'Produtos, entrada de estoque e combos' },
  { id: 'financeiro', label: 'Financeiro', desc: 'Relatório financeiro, despesas, fluxo de caixa, sinal, análises e relatórios' },
  { id: 'equipe', label: 'Equipe e remunerações', desc: 'Colaboradores, comissões e salários' },
  { id: 'mensagens', label: 'Mensagens e marketing', desc: 'Avisos automáticos e manuais, cupons' },
  { id: 'configuracoes', label: 'Configurações do negócio', desc: 'Serviços, horários, bloqueios, aparência, fidelidade, maquininhas, link e QR' },
] as const

export type AreaGerente = (typeof AREAS_GERENTE)[number]['id']

const IDS = new Set<string>(AREAS_GERENTE.map((a) => a.id))

/** Limpa o que veio do banco (text[] livre) pra só áreas conhecidas. */
export function areasBloqueadas(valor: unknown): AreaGerente[] {
  if (!Array.isArray(valor)) return []
  return valor.filter((v): v is AreaGerente => typeof v === 'string' && IDS.has(v))
}

/* Abas de /admin/configuracoes que não são "configurações do negócio". */
const ABA_CONFIG: Record<string, AreaGerente> = {
  profissionais: 'equipe',
  mensagens: 'mensagens',
  importar: 'clientes',
}

/* Ordem importa: o prefixo mais específico vem antes (remunerações antes de
   financeiro, produtos/vender antes de produtos, clientes/campanhas antes de
   clientes). */
const ROTAS: Array<[string, AreaGerente]> = [
  ['/admin/financeiro/remuneracoes', 'equipe'],
  ['/admin/colaboradores', 'equipe'],
  ['/admin/financeiro/vendas', 'vendas'],
  ['/admin/produtos/vender', 'vendas'],
  ['/admin/comandas', 'vendas'],
  ['/admin/caixa', 'vendas'],
  ['/admin/fechar-dia', 'vendas'],
  ['/admin/pacotes', 'vendas'],
  ['/admin/cartao-presente', 'vendas'],
  ['/admin/produtos', 'estoque'],
  ['/admin/combos', 'estoque'],
  ['/admin/financeiro', 'financeiro'],
  ['/admin/relatorios', 'financeiro'],
  ['/admin/convenios', 'financeiro'],
  ['/admin/clientes/campanhas', 'mensagens'],
  ['/admin/whatsapp', 'mensagens'],
  ['/admin/avisos-manuais', 'mensagens'],
  ['/admin/cupons', 'mensagens'],
  ['/admin/clientes', 'clientes'],
  ['/admin/sumidos', 'clientes'],
  ['/admin/importar', 'clientes'],
]

/** Área de uma rota do admin (aceita `?tab=` de Configurações). null = livre. */
export function areaDaRota(href: string): AreaGerente | null {
  const [caminho, query] = href.split('?')
  if (caminho === '/admin/configuracoes' || caminho.startsWith('/admin/configuracoes/')) {
    const tab = new URLSearchParams(query ?? '').get('tab')
    // sem aba = Negócio (a aba padrão da tela)
    return (tab && ABA_CONFIG[tab]) || 'configuracoes'
  }
  for (const [prefixo, area] of ROTAS) {
    if (caminho === prefixo || caminho.startsWith(prefixo + '/')) return area
  }
  return null
}

/** A gerente pode abrir este endereço? (dono: sempre — passe bloqueadas = []) */
export function podeAbrir(href: string, bloqueadas: readonly string[]): boolean {
  if (!bloqueadas.length) return true
  const area = areaDaRota(href)
  return !area || !bloqueadas.includes(area)
}

/* API · só rotas que servem UMA área. Rotas compartilhadas (clientes,
   comandas, produtos usados no atendimento) ficam livres: travar quebraria
   a agenda, que é a base. Conferido 10/10 (quem chama cada rota):
   mensagens/* é usada em AvisosDoAtendimento, coupons em Sumidos e
   Aniversariantes, niche-fichas nas fichas do atendimento → livres. */
const API: Array<[string, AreaGerente]> = [
  ['/api/admin/expenses', 'financeiro'],
  ['/api/admin/sales/export', 'vendas'],
  ['/api/admin/convenios', 'financeiro'],
  ['/api/admin/commission-payments', 'equipe'],
  ['/api/admin/professionals', 'equipe'],
  ['/api/admin/invite-professional', 'equipe'],
  ['/api/admin/regenerate-password', 'equipe'],
  ['/api/admin/messages', 'mensagens'],
  ['/api/admin/sumidos/disparar', 'clientes'],
  ['/api/admin/stock-entries', 'estoque'],
  ['/api/admin/product-brands', 'estoque'],
  ['/api/admin/product-categories', 'estoque'],
  ['/api/admin/product-suppliers', 'estoque'],
  ['/api/admin/branding', 'configuracoes'],
  ['/api/admin/form-templates', 'configuracoes'],
  ['/api/import', 'clientes'],
]

export function areaDaApi(caminho: string): AreaGerente | null {
  for (const [prefixo, area] of API) {
    if (caminho === prefixo || caminho.startsWith(prefixo + '/')) return area
  }
  return null
}
