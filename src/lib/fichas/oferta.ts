import type { SupabaseClient } from '@supabase/supabase-js'
import { NICHE_FICHAS } from './registry'
import { fichaVisivelPara } from './disponiveis'
import { gerarToken, hashToken, VALIDADE_DIAS } from './convite'
import type { NicheFicha } from './types'

/**
 * OFERECER A FICHA PRA CLIENTE (v159, 14/10/2026). Só servidor.
 *
 * Uma regra só pra três portas: tela de confirmação do link público, cadastro
 * da cliente e agendamento pelo painel. O negócio escolhe em Fichas Modelo
 * quais fichas oferecer (`businesses.fichas_oferecer`); a cliente que JÁ
 * respondeu aquela ficha não recebe de novo.
 *
 * "Já respondeu" também é o que protege o link público: quem agenda com o
 * telefone de outra pessoa cai no cadastro dela, mas só consegue criar ficha
 * nova — nunca mexer numa que existe (assinada não muda: gatilho da v120).
 */
export async function fichasParaOferecer(
  admin: SupabaseClient,
  businessId: string,
  customerId: string,
): Promise<NicheFicha[]> {
  const { data: biz } = await admin
    .from('businesses')
    .select('slug, category, description, enabled_niche_fichas, fichas_oferecer')
    .eq('id', businessId)
    .maybeSingle()
  const oferecer = (biz?.fichas_oferecer as string[] | null) ?? []
  if (!biz || oferecer.length === 0) return []
  const ligadas = biz.enabled_niche_fichas as string[] | null
  const candidatas = oferecer
    .map((s) => NICHE_FICHAS[s])
    .filter((f): f is NicheFicha =>
      Boolean(f?.clientePreenche) &&
      (ligadas === null || ligadas.includes(f.slug)) &&
      fichaVisivelPara(f, { categoria: biz.category ?? biz.description ?? null, slug: biz.slug ?? null }),
    )
  if (!candidatas.length) return []
  const { data: ja } = await admin
    .from('client_form_responses')
    .select('niche_slug')
    .eq('customer_id', customerId)
    .in('niche_slug', candidatas.map((f) => f.slug))
  /* Feminina e Masculina são a MESMA anamnese em duas versões: respondeu uma,
     não oferece a outra. Vale pra qualquer grupo oferecido junto. */
  if ((ja ?? []).length > 0) return []
  return candidatas
}

/** Cria o convite e devolve o link. O token só existe aqui; o banco guarda o hash. */
export async function criarConvite(
  admin: SupabaseClient,
  p: { businessId: string; customerId: string; nicheSlug: string; criadoPor: string | null; origem: 'painel' | 'agendamento'; grupo?: string | null; baseUrl: string },
): Promise<{ url: string; expiresAt: string } | { erro: string }> {
  const token = gerarToken()
  const expiresAt = new Date(Date.now() + VALIDADE_DIAS * 86_400_000).toISOString()
  const { error } = await admin.from('ficha_convites').insert({
    business_id: p.businessId,
    customer_id: p.customerId,
    niche_slug: p.nicheSlug,
    token_hash: hashToken(token),
    criado_por: p.criadoPor,
    expires_at: expiresAt,
    origem: p.origem,
    grupo: p.grupo ?? null,
  })
  if (error) return { erro: error.message }
  return { url: `${p.baseUrl}/ficha/${token}`, expiresAt }
}
