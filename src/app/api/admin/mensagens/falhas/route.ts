/* ═══════════════════════════════════════════════════════════════
   O QUE NÃO CHEGOU — lista pra dona agir

   Eduardo, 29/09/2026: "deixar a tela aviso mais fácil de ver as msg que
   foram disparadas e as que não foram". O placar já contava "não
   chegaram", mas não dizia QUEM nem O QUE FAZER.

   Entra aqui:
     · o que a Meta devolveu como falha (status 'falhou');
     · o que nem saiu por culpa do cadastro da cliente (sem telefone,
       telefone inválido) — pra dona isso também é "não chegou".
   Fica de fora o que é nosso e interno (sem pacote, sem credencial): a
   dona não tem o que fazer com isso.

   Mesma regra de acesso da rota de status: resolve o negócio pela sessão
   e lê `message_log` por service role (RLS sem policy).
   ═══════════════════════════════════════════════════════════════ */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { rotuloDoAviso } from '@/lib/mensagens/rotulos'
import { explicarFalha, ERROS_DE_ENVIO_VISIVEIS } from '@/lib/mensagens/motivo-falha'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Linha = {
  id: string
  tipo: string
  status: string | null
  erro: string | null
  falha_codigo: string | null
  destino: string | null
  created_at: string
  customer_id: string | null
  appointment_id: string | null
}

export async function GET() {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const desde = new Date(Date.now() - 30 * 86400e3).toISOString()
  const { data, error } = await db
    .from('message_log')
    .select('id, tipo, status, erro, falha_codigo, destino, created_at, customer_id, appointment_id')
    .eq('business_id', businessId)
    .gte('created_at', desde)
    .or(`status.eq.falhou,erro.in.(${ERROS_DE_ENVIO_VISIVEIS.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const linhas = (data ?? []) as Linha[]
  const custIds = [...new Set(linhas.map((l) => l.customer_id).filter(Boolean))] as string[]
  const apptIds = [...new Set(linhas.map((l) => l.appointment_id).filter(Boolean))] as string[]
  const [{ data: cs }, { data: as }] = await Promise.all([
    custIds.length ? db.from('customers').select('id, name').in('id', custIds) : Promise.resolve({ data: [] }),
    apptIds.length ? db.from('appointments').select('id, client_name, customer_id').in('id', apptIds) : Promise.resolve({ data: [] }),
  ])
  const nomeCliente = new Map(((cs ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]))
  const porAtend = new Map(((as ?? []) as { id: string; client_name: string | null; customer_id: string | null }[]).map((a) => [a.id, a]))

  const falhas = linhas
    // interno nosso (sem pacote/credencial) não é com a dona
    .filter((l) => l.status === 'falhou' || ERROS_DE_ENVIO_VISIVEIS.includes(l.erro ?? ''))
    .map((l) => {
      const at = l.appointment_id ? porAtend.get(l.appointment_id) : undefined
      const customerId = l.customer_id ?? at?.customer_id ?? null
      const ex = explicarFalha(l.falha_codigo ?? l.erro)
      return {
        id: l.id,
        rotulo: rotuloDoAviso(l.tipo),
        quando: l.created_at,
        cliente: (customerId ? nomeCliente.get(customerId) : null) ?? at?.client_name ?? null,
        telefone: l.destino,
        customerId,
        motivo: ex.texto,
        acao: ex.acao,
        culpaNossa: ex.culpaNossa,
      }
    })

  return NextResponse.json({ falhas })
}
