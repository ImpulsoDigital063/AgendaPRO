/* v172 + v173 · serviço por profissional (service_professional_prices).

   Uma linha = como ESTA profissional faz ESTE serviço:
     sem linha            → faz, com preço e duração do cadastro
     realiza = false      → não faz (some da escolha da cliente)
     price / duração NULL → o do cadastro

   O link público, o painel e a rota de envio leem pelo mesmo lugar, pra
   a cliente ver na tela exatamente o que o servidor vai gravar. */

import type { SupabaseClient } from '@supabase/supabase-js'

export type LinhaServicoProf = {
  service_id: string
  professional_id: string
  price: number | string | null
  duration_minutes?: number | null
  realiza?: boolean | null
}

/** serviço → profissional → valor */
export type PorProf<T> = Record<string, Record<string, T>>

export type ServicoPorProf = {
  precos: PorProf<number>
  duracoes: PorProf<number>
  /** serviço → ids de quem NÃO faz */
  naoFaz: Record<string, string[]>
}

export const SELECT_SERVICO_PROF = 'service_id, professional_id, price, duration_minutes, realiza'

export function lerServicoPorProf(linhas: LinhaServicoProf[] | null | undefined): ServicoPorProf {
  const r: ServicoPorProf = { precos: {}, duracoes: {}, naoFaz: {} }
  for (const l of linhas ?? []) {
    if (l.realiza === false) {
      ;(r.naoFaz[l.service_id] ??= []).push(l.professional_id)
      continue
    }
    if (l.price !== null && l.price !== undefined) (r.precos[l.service_id] ??= {})[l.professional_id] = Number(l.price)
    if (l.duration_minutes) (r.duracoes[l.service_id] ??= {})[l.professional_id] = Number(l.duration_minutes)
  }
  return r
}

/** serviço → ids de quem faz. Só leva os serviços que têm alguém de fora
    (sem a chave = toda a equipe faz), que é o formato que o BookingFlow lê. */
export function quemFazDosServicos(naoFaz: Record<string, string[]>, equipe: { id: string }[]): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(naoFaz).map(([sid, fora]) => [sid, equipe.filter((p) => !fora.includes(p.id)).map((p) => p.id)])
  )
}

/** Lê do banco o que vale pro negócio. Só com `preco_por_profissional` ligado;
    sem a flag (ou a tabela falhando) volta vazio e tudo segue pelo cadastro. */
export async function carregarServicoPorProf(supabase: SupabaseClient, businessId: string): Promise<ServicoPorProf> {
  const { data: flag } = await supabase.from('businesses').select('preco_por_profissional').eq('id', businessId).maybeSingle()
  if (flag?.preco_por_profissional !== true) return lerServicoPorProf(null)
  const { data: linhas } = await supabase.from('service_professional_prices').select(SELECT_SERVICO_PROF).eq('business_id', businessId)
  return lerServicoPorProf(linhas as LinhaServicoProf[] | null)
}

export function fazServico(porProf: ServicoPorProf, serviceId: string, profId: string | null | undefined): boolean {
  return !profId || !porProf.naoFaz[serviceId]?.includes(profId)
}

/** Preço com esta profissional (sem linha = o do cadastro) */
export function precoComProf(porProf: ServicoPorProf, s: { id: string; price: number | null }, profId: string | null | undefined): number | null {
  const proprio = profId ? porProf.precos[s.id]?.[profId] : undefined
  return proprio !== undefined ? proprio : s.price
}

export function duracaoComProf(porProf: ServicoPorProf, s: { id: string; duration_minutes: number | null }, profId: string | null | undefined): number | null {
  return (profId ? porProf.duracoes[s.id]?.[profId] : undefined) ?? s.duration_minutes
}
