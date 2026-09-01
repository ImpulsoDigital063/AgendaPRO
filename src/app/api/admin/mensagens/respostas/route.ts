/* ═══════════════════════════════════════════════════════════════
   O QUE A CLIENTE RESPONDEU

   Eduardo, 01/09: "vi a notificação, mas cliquei nela e não abriu essa lista
   pra saber o que foi respondido".

   O desenho de 28/08 era deliberado: o push chega COM O TEXTO DENTRO, a dona
   lê na notificação e responde pelo WhatsApp dela. O registro no banco ficava
   invisível, só pra resolver discussão do tipo "eu avisei que não ia".

   O furo só apareceu no uso: o push aponta pra `/admin/whatsapp`, e lá não
   havia nada sobre resposta nenhuma. Notificação que promete destino e não
   entrega.

   Esta rota devolve o registro — SÓ LEITURA. Não existe marcar como lida,
   status, nem responder por aqui: isso viraria uma segunda caixa de entrada
   pra cuidar, que foi exatamente o que ele vetou em 28/08. A tela mostra o
   que chegou e joga pro WhatsApp dela, que é onde ela já responde.
   ═══════════════════════════════════════════════════════════════ */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  /* `message_inbox` tem RLS sem policy (só service role) — quem escreve é o
     webhook, que não tem sessão. A checagem de acesso é a de cima. */
  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data, error } = await db
    .from('message_inbox')
    .select('id, telefone, cliente_nome, texto, created_at, appointment_id')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    /* 30 é registro, não histórico. Quem precisa de tudo pergunta pro
       suporte; a dona só quer ver o que chegou nos últimos dias. */
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    respostas: (data ?? []).map((r) => ({
      id: r.id,
      nome: r.cliente_nome ?? null,
      telefone: r.telefone,
      texto: r.texto,
      quando: r.created_at,
      appointmentId: r.appointment_id ?? null,
    })),
  })
}
