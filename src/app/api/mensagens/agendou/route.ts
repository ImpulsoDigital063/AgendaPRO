/* ═══════════════════════════════════════════════════════════════
   "ACABEI DE MARCAR UM HORÁRIO" — dispara a confirmação NA HORA

   POR QUE ESTA ROTA EXISTE
   A confirmação era varrida por `created_at`, de hora em hora. Isso cobre
   todo caminho de criação (link público, balcão, recepção, profissional)
   sem tocar em nenhum deles — mas a cliente marca 18:13 e recebe 19:00.
   Confirmação que chega uma hora depois não confirma nada: nesse intervalo
   ela já ligou pro salão perguntando se deu certo.

   A varredura CONTINUA rodando, como rede: se esta chamada falhar, se a
   tela fechar antes, se a criação vier de um caminho que ainda não chama
   aqui, a mensagem sai na próxima passagem. A chave de idempotência
   (UNIQUE no banco) garante que a cliente não recebe duas vezes — é a
   mesma trava que já protege o cron de rodar duas vezes.

   Por que uma rota e não a inserção chamar `enviar()` direto: metade dos
   caminhos de criação insere pelo NAVEGADOR, com a chave anon. Mandar
   mensagem exige service role, que não pode sair do servidor.
   ═══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { confirmarAgendamento } from '@/lib/mensagens/confirmar'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const appointmentId = typeof body?.appointmentId === 'string' ? body.appointmentId : null
  if (!appointmentId) return NextResponse.json({ error: 'sem_agendamento' }, { status: 400 })

  /* Quem chama precisa estar logado. Sem isso, qualquer um dispararia
     mensagem em nome de qualquer negócio sabendo só o id do agendamento. */
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  /* A logica vive em `confirmarAgendamento` pra que QUALQUER ponto que crie
     agendamento consiga disparar com uma linha — sem depender de alguem
     lembrar de chamar esta rota. */
  const r = await confirmarAgendamento(db, appointmentId)
  if (!r.ok) {
    return r.motivo === 'nao_encontrado'
      ? NextResponse.json({ error: 'nao_encontrado' }, { status: 404 })
      : NextResponse.json({ ok: true, ignorado: r.motivo })
  }

  return NextResponse.json({ ok: true, resultado: r.resultado })
}
