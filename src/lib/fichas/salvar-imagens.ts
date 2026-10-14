import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'fichas'

/**
 * Sobe as imagens da ficha (assinatura, desenho — chegam como data:image) pro
 * Storage e troca pelo link público. No banco fica só o link, nunca base64.
 *
 * Fonte única: a rota do painel e a do link da cliente (v157) salvam igual.
 * Devolve `erro` em vez de lançar, pra rota responder 500 com a causa.
 */
export async function subirImagensDaFicha(
  admin: SupabaseClient,
  businessId: string,
  customerId: string,
  values: Record<string, unknown>,
): Promise<{ values: Record<string, unknown>; erro?: string }> {
  const out: Record<string, unknown> = { ...values }
  try {
    for (const [k, v] of Object.entries(out)) {
      if (typeof v !== 'string' || !v.startsWith('data:image')) continue
      const m = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(v)
      if (!m) continue
      const ext = m[1].split('/')[1].replace('+xml', '')
      const buf = Buffer.from(m[2], 'base64')
      const path = `${businessId}/${customerId}/${crypto.randomUUID()}.${ext}`
      const { error } = await admin.storage.from(BUCKET).upload(path, buf, { contentType: m[1], upsert: false })
      if (error) return { values: out, erro: 'upload_failed: ' + error.message }
      out[k] = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    }
  } catch (e) {
    return { values: out, erro: 'upload_error: ' + (e as Error).message }
  }
  return { values: out }
}
