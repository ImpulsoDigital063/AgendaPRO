import type { SupabaseClient } from '@supabase/supabase-js'
import { enviar } from './enviar'
import { chaveIdempotencia } from './tipos'
import { dataCurta } from './textos'
import { todayBR } from '@/lib/date-br'

/* ═══════════════════════════════════════════════════════════════
   CONFIRMAÇÃO DE AGENDAMENTO — um lugar só

   Eduardo, 01/09: "desenvolva para todo caminho de agendamento pelo mobile e
   desktop também dispare".

   Antes disso a lógica morava dentro da rota `/api/mensagens/agendou`, e
   quem inseria agendamento tinha que lembrar de chamar a rota. Varri o
   código: são SETE pontos que inserem em `appointments`, e três chamavam.

     DISPARA  booking/submit            (link público)
     DISPARA  AgendarModal              (desktop e Clientes)
     DISPARA  MarcarAgendamentoForm     (recepção e /admin/marcar no celular)
     mudo     gift-cards/schedule       ← ERRADO, é agendamento futuro real
     mudo     atendimento-historico     ← certo, é atendimento que JÁ ocorreu
     mudo     invoices/items            ← certo, balcão, status completed
     mudo     invoices (comanda)        ← certo, balcão, status completed

   Nem todo mudo era bug: quem lança atendimento passado na ficha ou fecha
   comanda no balcão não pode mandar "seu horário ficou marcado". Só o cartão
   presente estava errado.

   Com a lógica aqui, ponto novo de criação vira uma linha — e não depende de
   alguém lembrar da regra.

   ─── As três guardas ──────────────────────────────────────────

   · status pending/confirmed — cancelado e concluído não avisam nada
   · data no futuro (ou hoje) — confirmar atendimento de semana passada é o
     jeito mais rápido de assustar a cliente e gastar do pacote à toa
   · idempotência pela chave — dois cliques não mandam duas mensagens
   ═══════════════════════════════════════════════════════════════ */

export type ResultadoConfirmacao =
  | { ok: true; resultado: Awaited<ReturnType<typeof enviar>> }
  | { ok: false; motivo: 'nao_encontrado' | 'status' | 'passado' }

export async function confirmarAgendamento(
  db: SupabaseClient,
  appointmentId: string,
): Promise<ResultadoConfirmacao> {
  const { data: a } = await db
    .from('appointments')
    .select(
      `id, business_id, appointment_date, start_time, client_name, client_phone,
       client_email, service_name, customer_id, status,
       business:businesses(name, phone), professional:professionals(name)`,
    )
    .eq('id', appointmentId)
    .maybeSingle()

  if (!a) return { ok: false, motivo: 'nao_encontrado' }
  if (!['pending', 'confirmed'].includes(String(a.status))) {
    return { ok: false, motivo: 'status' }
  }
  /* λ.fuso — dia BR, não UTC. Sem isso, um agendamento de hoje criado depois
     das 21h seria lido como "ontem" e a confirmação não sairia. */
  if (String(a.appointment_date) < todayBR()) {
    return { ok: false, motivo: 'passado' }
  }

  const negocio = a.business as unknown as { name: string; phone: string | null } | null
  const prof = a.professional as unknown as { name: string } | null

  const resultado = await enviar(db, {
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

  return { ok: true, resultado }
}
