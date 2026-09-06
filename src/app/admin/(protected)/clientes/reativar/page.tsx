/**
 * /admin/clientes/reativar → /admin/sumidos
 *
 * A tela mudou de casa em 06/09/2026 (Eduardo). O assunto agora tem aba
 * própria no menu; esta rota só existe pra não quebrar link antigo, favorito
 * ou botão que eu não tenha achado na varredura. Preserva o ?dias=.
 */
import { redirect } from 'next/navigation'

export default async function ReativarRedirect({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>
}) {
  const { dias } = await searchParams
  redirect(dias ? `/admin/sumidos?dias=${encodeURIComponent(dias)}` : '/admin/sumidos')
}
