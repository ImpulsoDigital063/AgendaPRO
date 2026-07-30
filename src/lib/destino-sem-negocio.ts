import { createClient } from '@/lib/supabase/server'

/**
 * Pra onde mandar quem abriu uma tela de /admin e NÃO é dono do negócio.
 *
 * ── O problema que isso resolve ────────────────────────────────────────────
 * Todas as 32 páginas de /admin fazem a mesma pergunta:
 *     "esse usuário é dono de algum negócio?"
 * e, quando a resposta é não, concluíam: "então ele ainda não tem negócio" →
 * `redirect('/cadastro')`.
 *
 * A conclusão era verdadeira quando só o dono logava. Pra PROFISSIONAL ela é
 * falsa: ela tem um negócio, ela só não é a dona dele. O resultado é que
 * qualquer link que levasse ela pra uma rota de /admin (um push cravado, um
 * modal compartilhado) terminava na tela "cadastre seu negócio em 2 minutos" —
 * no meio de um atendimento, com a cliente na cadeira. Aconteceu 3x em
 * 30/07/2026: faturar comanda, visualizar cliente e bloqueio de horário.
 *
 * Aqui a decisão passa a olhar QUEM é a pessoa antes de escolher o destino:
 *   · recepcionista ativa → /recepcao
 *   · profissional ativa  → /profissional
 *   · ninguém disso       → /cadastro (comportamento original, intacto)
 *
 * Não conserta um bug específico: desarma a categoria. Um erro de rota vira um
 * retorno pro painel certo em vez de um susto.
 *
 * Uso (mantém o `redirect()` inline pro TypeScript continuar entendendo que a
 * função encerra o fluxo):
 *     if (!business) redirect(await destinoSemNegocio())
 */
export async function destinoSemNegocio(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return '/admin/login'

    const { data: prof } = await supabase
      .from('professionals')
      .select('is_receptionist')
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .maybeSingle()

    if (prof?.is_receptionist === true) return '/recepcao'
    if (prof) return '/profissional'
    return '/cadastro'
  } catch {
    // Qualquer falha na consulta cai no destino histórico — nunca deixa a
    // pessoa presa numa tela sem saída.
    return '/cadastro'
  }
}
