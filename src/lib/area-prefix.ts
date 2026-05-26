/**
 * Detecta a área (admin · recepcao) a partir do pathname e devolve o prefixo
 * que componentes compartilhados devem usar pra montar links internos.
 *
 * Motivação: o mesmo modal/drawer pode ser renderizado em /admin ou /recepcao.
 * Hardcoding "/admin/clientes" quebra pra recep (não tem owner, cai em /cadastro).
 */
export function getAreaPrefix(pathname: string | null | undefined): '/admin' | '/recepcao' {
  if (!pathname) return '/admin'
  return pathname.startsWith('/recepcao') ? '/recepcao' : '/admin'
}
