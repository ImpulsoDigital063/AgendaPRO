/**
 * /admin/fechar-dia — "Quem veio hoje?"
 *
 * Eduardo, 29/09/2026. O estudo dos avisos esbarrou num buraco: dos
 * atendimentos que já passaram, 35 de 64 continuavam "confirmados". A dona
 * não fecha quem veio, e sem isso não dá pra dizer se os avisos reduziram
 * falta — o único número que prova o valor do pacote.
 *
 * O cron `auto-complete` (presume presença) existe mas nunca foi agendado,
 * e ligá-lo marcaria todo mundo como "veio" — apagando justamente a falta
 * que queremos medir. Aqui a dona responde em dois toques por cliente.
 *
 * Chega por push às 20h (cron fechar-dia) ou pelo link direto.
 * ?data=AAAA-MM-DD abre outro dia (o "ontem" da própria tela).
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { todayBR, addDaysBR } from '@/lib/date-br'
import FecharDiaView, { type AtendimentoAberto } from '@/components/admin/FecharDiaView'
import { negocioDoPainel } from '@/lib/admin-data'

export const dynamic = 'force-dynamic'

/** HH:MM:SS de Brasília agora (servidor roda em UTC). */
function horaBRAgora() {
  return new Date(Date.now() - 3 * 3600e3).toISOString().slice(11, 19)
}

export default async function FecharDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', await negocioDoPainel(user.id))
    .single()
  if (!business) redirect(await destinoSemNegocio())

  const hoje = todayBR()
  const { data: dataParam } = await searchParams
  const dia = dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam) && dataParam <= hoje ? dataParam : hoje

  const agora = horaBRAgora()

  let q = supabase
    .from('appointments')
    .select('id, client_name, service_name, start_time, end_time, status, confirmado_em, professionals(name)')
    .eq('business_id', business.id)
    .eq('appointment_date', dia)
    .in('status', ['pending', 'confirmed'])
    .order('start_time')
  // Hoje: só o que já terminou. Dia passado: tudo que ficou aberto.
  if (dia === hoje) q = q.lte('end_time', agora)
  const { data } = await q

  const lista: AtendimentoAberto[] = ((data ?? []) as unknown as {
    id: string; client_name: string | null; service_name: string | null; start_time: string
    confirmado_em: string | null; professionals: { name: string } | { name: string }[] | null
  }[]).map((a) => ({
    id: a.id,
    cliente: a.client_name ?? 'Cliente',
    servico: a.service_name ?? '',
    hora: String(a.start_time).slice(0, 5),
    profissional: Array.isArray(a.professionals) ? a.professionals[0]?.name ?? null : a.professionals?.name ?? null,
    confirmouPeloWhatsApp: !!a.confirmado_em,
  }))

  return <FecharDiaView dia={dia} hoje={hoje} ontem={addDaysBR(hoje, -1)} atendimentos={lista} />
}
