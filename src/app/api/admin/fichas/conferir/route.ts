/* ═══════════════════════════════════════════════════════════════
   CONFERIR A INTEGRIDADE DE UMA FICHA ASSINADA

   Recalcula o hash do conteúdo guardado e compara com o que foi gravado no
   momento da assinatura. É a resposta operacional pra "como o senhor prova
   que este documento não foi alterado depois?".

   Serve pra dois momentos bem diferentes:
   · a dona conferindo antes de apresentar um documento;
   · nós, se um dia houver questionamento sobre a base inteira.

   Aceita um id (uma ficha) ou nenhum (varre as assinadas do negócio).
   ═══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { conferir, hashCurto } from '@/lib/ficha-assinatura'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const id = req.nextUrl.searchParams.get('id')

  let q = admin
    .from('client_form_responses')
    .select('id, business_id, customer_id, data, assinado_em, assinatura_hash, assinatura_ip, assinante_nome, assinante_cpf, versao, substitui_id, created_at')
    .eq('business_id', businessId)
    .not('assinado_em', 'is', null)
    .order('assinado_em', { ascending: false })

  if (id) q = q.eq('id', id)
  else q = q.limit(200)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const linhas = (data ?? []).map((r) => {
    const v = conferir(r as Parameters<typeof conferir>[0])
    return {
      id: r.id,
      assinado_em: r.assinado_em,
      assinante: r.assinante_nome,
      cpf: r.assinante_cpf,
      versao: r.versao,
      substitui_id: r.substitui_id,
      ip: r.assinatura_ip,
      hash: r.assinatura_hash,
      hash_curto: r.assinatura_hash ? hashCurto(r.assinatura_hash) : null,
      integra: v.integra,
      motivo: v.motivo ?? null,
    }
  })

  return NextResponse.json({
    total: linhas.length,
    integras: linhas.filter((l) => l.integra).length,
    /* Qualquer linha aqui é assunto sério: quer dizer que o conteúdo no banco
       não corresponde ao que foi assinado. Com o gatilho da v120 no ar isso
       não deveria acontecer nunca — se acontecer, houve escrita por fora. */
    adulteradas: linhas.filter((l) => !l.integra),
    fichas: id ? linhas : undefined,
  })
}
