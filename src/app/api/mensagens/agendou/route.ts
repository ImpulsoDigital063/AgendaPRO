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
import { enviar } from '@/lib/mensagens/enviar'
import { chaveIdempotencia } from '@/lib/mensagens/tipos'
import { dataCurta } from '@/lib/mensagens/textos'

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

  const { data: a } = await db
    .from('appointments')
    .select(`id, business_id, appointment_date, start_time, client_name, client_phone,
             client_email, service_name, customer_id, status,
             business:businesses(name, phone), professional:professionals(name)`)
    .eq('id', appointmentId)
    .maybeSingle()

  if (!a) return NextResponse.json({ error: 'nao_encontrado' }, { status: 404 })
  if (!['pending', 'confirmed'].includes(String(a.status))) {
    return NextResponse.json({ ok: true, ignorado: 'status' })
  }

  const negocio = a.business as unknown as { name: string; phone: string | null } | null
  const prof = a.professional as unknown as { name: string } | null

  const r = await enviar(db, {
    businessId: a.business_id as string,
    tipo: 'confirmacao',
    chave: chaveIdempotencia('confirmacao', a.id as string),
    destino: { telefone: a.client_phone as string | null, email: a.client_email as string | null },
    appointmentId: a.id as string,
    customerId: (a.customer_id as string) ?? null,
    variaveis: {
      cliente: (a.client_name as string) || 'Cliente',
      salao: negocio?.name ?? 'seu negócio',
      data: dataCurta(a.appointment_date as string),
      hora: String(a.start_time).slice(0, 5),
      servico: (a.service_name as string) || 'seu atendimento',
      telefoneSalao: negocio?.phone ?? null,
      profissional: prof?.name,
    },
  })

  return NextResponse.json({ ok: true, resultado: r })
}
