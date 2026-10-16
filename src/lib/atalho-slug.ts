/* LINK CURTO (v164) · agendapro.net.br/<atalho> → agendapro.net.br/<slug>.
   Chamado pelas páginas /[slug] SÓ quando o slug não existe, então não custa
   nada pro link normal. Atalho acrescenta endereço, nunca troca o slug: QR
   Code e link já divulgados seguem iguais (caso da Ivna Loyola, 16/10).
   Redirect temporário de propósito: se o atalho sair, o endereço volta a
   ser livre sem o navegador ter guardado o desvio pra sempre. */
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function seguirAtalho(
  supabase: SupabaseClient,
  atalho: string,
  resto = '',
  busca?: Record<string, string | string[] | undefined>,
): Promise<void> {
  const limpo = atalho.trim().toLowerCase()
  if (!/^[a-z0-9-]{3,50}$/.test(limpo)) return
  const { data } = await supabase
    .from('businesses')
    .select('slug')
    .contains('slug_atalhos', [limpo])
    .limit(1)
    .maybeSingle()
  if (!data?.slug || data.slug === limpo) return
  const qs = new URLSearchParams(
    Object.entries(busca ?? {}).filter((e): e is [string, string] => typeof e[1] === 'string'),
  ).toString()
  redirect(`/${data.slug}${resto}${qs ? `?${qs}` : ''}`)
}

/** true se o endereço já é atalho de algum negócio (cadastro não pode pegar). */
export async function ehAtalho(supabase: SupabaseClient, slug: string): Promise<boolean> {
  const { data } = await supabase.from('businesses').select('id').contains('slug_atalhos', [slug]).limit(1).maybeSingle()
  return !!data
}
