/* v177 · RETORNOS PRA MARCAR (camada 1, 25/10/2026)

   Quem concluiu um procedimento com retorno (services.retorno_tipo) nos
   últimos dias e ainda não tem a volta marcada. A recepção marca na saída, e
   dali em diante a cliente só recebe confirmação e lembrete (utilidade, já
   aprovados) em vez do aviso de "hora de voltar", que a Meta cobra como
   marketing. Quem sair sem marcar fica pra camada 2.

   Lê o atendimento pelo service_id E por appointment_services: na Ivna a micro
   costuma vir junto com outro serviço, e só o principal ficaria de fora. */
import type { SupabaseClient } from '@supabase/supabase-js'
import { addDaysBR, todayBR } from '@/lib/date-br'

/** Quantos dias depois do atendimento a cliente ainda aparece na lista. */
export const DIAS_NA_LISTA = 7

export type RetornoPraMarcar = {
  appointmentId: string
  clienteId: string
  cliente: string
  procedimento: string
  tipo: 'retoque' | 'manutencao' | 'sessao'
  feitoEm: string
  /** primeiro dia da janela (ou hoje, se já passou) */
  sugestao: string
  ate: string | null
  servicoVolta: string
  profissionalId: string | null
}

type Servico = { id: string; name: string; retorno_tipo: RetornoPraMarcar['tipo']; retorno_dias: number | null; retorno_janela_dias: number | null; retorno_servico_id: string | null }

export async function retornosPraMarcar(db: SupabaseClient, businessId: string, limite = 8): Promise<RetornoPraMarcar[]> {
  const { data: svs } = await db
    .from('services')
    .select('id, name, retorno_tipo, retorno_dias, retorno_janela_dias, retorno_servico_id')
    .eq('business_id', businessId)
    .not('retorno_tipo', 'is', null)
  const comRetorno = new Map(((svs ?? []) as Servico[]).map((s) => [s.id, s]))
  if (!comRetorno.size) return []

  const hoje = todayBR()
  const desde = addDaysBR(hoje, -DIAS_NA_LISTA)
  const { data: feitos } = await db
    .from('appointments')
    .select('id, customer_id, client_name, service_id, professional_id, appointment_date, appointment_services(service_id)')
    .eq('business_id', businessId)
    .eq('status', 'completed')
    .gte('appointment_date', desde)
    .lte('appointment_date', hoje)
    .not('customer_id', 'is', null)
    .order('appointment_date', { ascending: false })

  type Feito = { id: string; customer_id: string; client_name: string | null; service_id: string | null; professional_id: string | null; appointment_date: string; appointment_services: { service_id: string | null }[] | null }
  const candidatos: { a: Feito; s: Servico; volta: string }[] = []
  for (const a of (feitos ?? []) as Feito[]) {
    const ids = new Set([a.service_id, ...(a.appointment_services ?? []).map((x) => x.service_id)].filter(Boolean) as string[])
    for (const id of ids) {
      const s = comRetorno.get(id)
      if (s) candidatos.push({ a, s, volta: s.retorno_servico_id ?? s.id })
    }
  }
  if (!candidatos.length) return []

  /* já marcou a volta? qualquer atendimento DEPOIS deste, do serviço da volta,
     que não foi cancelado (uma consulta só, não uma por cliente) */
  const { data: marcados } = await db
    .from('appointments')
    .select('customer_id, service_id, appointment_date, appointment_services(service_id)')
    .eq('business_id', businessId)
    .in('customer_id', [...new Set(candidatos.map((c) => c.a.customer_id))])
    .in('status', ['pending', 'confirmed', 'completed'])
    .gt('appointment_date', desde)
  const ultimaVolta = new Map<string, string>()
  for (const m of (marcados ?? []) as { customer_id: string; service_id: string | null; appointment_date: string; appointment_services: { service_id: string | null }[] | null }[]) {
    for (const sid of [m.service_id, ...(m.appointment_services ?? []).map((x) => x.service_id)]) {
      if (!sid) continue
      const k = `${m.customer_id}:${sid}`
      if (!ultimaVolta.has(k) || m.appointment_date > ultimaVolta.get(k)!) ultimaVolta.set(k, m.appointment_date)
    }
  }

  const vistos = new Set<string>()
  const lista: RetornoPraMarcar[] = []
  for (const { a, s, volta } of candidatos) {
    const chave = `${a.customer_id}:${volta}`
    if (vistos.has(chave)) continue
    vistos.add(chave)
    const depois = ultimaVolta.get(chave)
    if (depois && depois > a.appointment_date) continue
    const piso = addDaysBR(a.appointment_date, s.retorno_dias ?? 0)
    lista.push({
      appointmentId: a.id,
      clienteId: a.customer_id,
      cliente: a.client_name ?? 'Cliente',
      procedimento: s.name,
      tipo: s.retorno_tipo,
      feitoEm: a.appointment_date,
      sugestao: piso < hoje ? hoje : piso,
      ate: s.retorno_janela_dias ? addDaysBR(a.appointment_date, s.retorno_janela_dias) : null,
      servicoVolta: volta,
      profissionalId: a.professional_id,
    })
    if (lista.length >= limite) break
  }
  return lista
}
