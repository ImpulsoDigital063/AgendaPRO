/* GET /api/admin/appointments/[id]/sinal-preview
   ───────────────────────────────────────────────────────────────────
   De onde veio o dinheiro do sinal, pro modal de cancelamento não
   deixar a dona escolher às cegas.

   Sinal pago com crédito da própria cliente NÃO é dinheiro no caixa.
   Oferecer "já devolvi em dinheiro" nesse caso é convidar ela a tirar
   do bolso um valor que nunca entrou — foi o que aconteceu no teste do
   Eduardo em 06/08. Sabendo a composição, o modal só oferece devolução
   quando houve PIX de verdade. */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { composicaoDoSinal } from '@/lib/sinal-cancelamento'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  /* Só leitura, e o RLS já limita o que este usuário enxerga: se o
     atendimento não é do negócio dele, a consulta volta vazia e a resposta
     sai zerada. Não há o que vazar aqui. */
  const composicao = await composicaoDoSinal(supabase, id)
  return NextResponse.json(composicao)
}
