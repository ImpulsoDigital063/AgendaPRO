/* ═══════════════════════════════════════════════════════════════
   "JÁ PAGUEI" — a versão da CLIENTE, fora do WhatsApp

   POR QUE ESTA ROTA EXISTE
   Havia dois botões chamados "Já paguei" fazendo coisas diferentes:

     · no WhatsApp  → webhook → confirma o horário + grava a declaração
     · na página    → só abria o wa.me com um texto pronto, sem gravar nada

   Quem pagava pela página ficava com o horário em "a confirmar", sem push
   pra dona e sem a trava que impede o horário de cair — enquanto quem
   tocava no botão do WhatsApp tinha tudo isso. Mesmo nome, mesma intenção
   da cliente, resultados diferentes.

   Eduardo pegou isso em 05/09 testando o fluxo pelo link público.

   SEGURANÇA
   Rota pública por necessidade (a cliente não tem login), autenticada pelo
   MESMO token HMAC do link do sinal — quem não tem o link não chega aqui. O
   token é derivado do appointment e não expira; é o mesmo que já protege a
   página de pagamento.

   O que ela NÃO faz, de propósito: marcar `sinal_pago_at`. Isso é dinheiro,
   abate na comanda, e quem confirma é a dona olhando o extrato. Ver o
   webhook para o raciocínio completo.
   ═══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { verifySinalToken } from '@/lib/token'
import { checkRateLimit } from '@/lib/rate-limit-api'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  /* Mesmo limite da rota de agendar: é pública e o corpo é adivinhável se
     alguém tiver um id, ainda que o token barre a escrita. */
  const rl = checkRateLimit(req, { key: 'sinal-declarar', limit: 20, windowSeconds: 60 })
  if (rl) return rl

  const body = await req.json().catch(() => ({}))
  const id = typeof body.id === 'string' ? body.id : ''
  const token = typeof body.token === 'string' ? body.token : ''

  if (!id || !token || !verifySinalToken(id, token)) {
    return NextResponse.json({ error: 'nao_autorizado' }, { status: 403 })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  /* Guardas iguais às do webhook: só sobe de `pending`, só a PRIMEIRA
     declaração, e nunca em cima de sinal já registrado. Tocar duas vezes
     não reabre nada nem move a data. */
  const { data, error } = await db
    .from('appointments')
    .update({ sinal_declarado_em: new Date().toISOString(), status: 'confirmed' })
    .eq('id', id)
    .eq('status', 'pending')
    .is('sinal_pago_at', null)
    .is('sinal_declarado_em', null)
    .select('id, status, sinal_declarado_em')

  if (error) {
    console.error('sinal/declarar · update falhou', id, error.message)
    return NextResponse.json({ error: 'nao_salvou' }, { status: 500 })
  }

  /* Zero linhas não é erro: significa que já estava declarado, já pago ou
     cancelado. A tela trata os três como "está resolvido, não paga de
     novo" — dizer erro pra quem tocou duas vezes seria pior. */
  const gravouAgora = (data ?? []).length > 0

  return NextResponse.json({ ok: true, gravouAgora })
}
