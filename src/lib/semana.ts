/* ═══════════════════════════════════════════════════════════════
   "A SEMANA" (25/10/2026) · os próximos 7 dias numa lista compacta

   Substitui os cartões grandes ("Atendi e recebi", lembrete, pontualidade)
   nas telas de quem atende e da recepção. A grade mostra UM dia inteiro; a
   semana mostra o que vem: quem vem, quem ainda não confirmou presença, que
   dia está sem ninguém. Tocar na linha abre a mesma gaveta da grade.

   Começa em AMANHÃ: hoje já está na grade logo acima (o mesmo dia duas vezes
   era o defeito da recepção). Sem o .limit(10) de getUpcomingAppointments,
   que cortava a clínica inteira em 10 e só depois filtrava a profissional.

   Dia "aberto" vem de periodosDoDia (fonte única com o link e a grade):
   horário especial da data substitui o semanal. Bloqueio não entra aqui:
   o título diz quantos atendimentos tem, não promete horário livre.
   ═══════════════════════════════════════════════════════════════ */
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { addDaysBR } from '@/lib/date-br'
import { periodosDoDia } from '@/lib/horario-do-dia'
import { TIPOS_PROGRAMADOS, situacaoDoAviso } from '@/lib/mensagens/rotulos'

export type LinhaSemana = {
  id: string
  hora: string
  fim: string
  cliente: string
  servico: string
  profissional: string | null
  /** pending = a clínica ainda precisa aprovar */
  aprovar: boolean
  /** a cliente tocou em "Confirmar presença" no WhatsApp */
  confirmou: boolean
  /** comunicação do atendimento (25/10, Eduardo): sinal, resposta que pede ação e
   *  o último aviso do sistema com a situação real. No máximo 3, nessa ordem. */
  comunicacao: { texto: string; tom: 'ok' | 'atencao' | 'alerta' | 'neutro' }[]
}

export type DiaSemana = { data: string; aberto: boolean; linhas: LinhaSemana[] }

const db = () =>
  createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })

export async function carregarSemana({
  businessId,
  hoje,
  professionalId,
}: {
  businessId: string
  hoje: string
  /** só os atendimentos dela (dona que atende, profissional); vazio = clínica toda */
  professionalId?: string | null
}): Promise<DiaSemana[]> {
  const de = addDaysBR(hoje, 1)
  const ate = addDaysBR(hoje, 7)
  const sb = db()

  let consulta = sb
    .from('appointments')
    .select('id, appointment_date, start_time, end_time, status, client_name, service_name, confirmado_em, sinal_valor, sinal_cobrar, sinal_pago_at, sinal_declarado_em, sinal_expirado_at, professional_id, professional:professionals(name), appointment_services(service_name)')
    .eq('business_id', businessId)
    .gte('appointment_date', de)
    .lte('appointment_date', ate)
    .in('status', ['pending', 'confirmed'])
    .order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(400)
  if (professionalId) consulta = consulta.eq('professional_id', professionalId)

  let profs = sb.from('professionals').select('id').eq('business_id', businessId).eq('active', true)
  if (professionalId) profs = profs.eq('id', professionalId)

  const [{ data: atend }, { data: ps }] = await Promise.all([consulta, profs])
  const ids = (ps ?? []).map((p) => p.id as string)
  const [{ data: semanal }, { data: datas }] = ids.length
    ? await Promise.all([
        sb.from('working_hours').select('professional_id, day_of_week, start_time, end_time, slot_duration').in('professional_id', ids),
        sb.from('working_hours_dates').select('professional_id, date, start_time, end_time, slot_duration').in('professional_id', ids).gte('date', de).lte('date', ate),
      ])
    : [{ data: [] }, { data: [] }]

  type Atend = {
    id: string
    appointment_date: string
    start_time: string
    end_time: string | null
    status: string
    client_name: string | null
    service_name: string | null
    confirmado_em: string | null
    sinal_valor: number | null
    sinal_cobrar: boolean | null
    sinal_pago_at: string | null
    sinal_declarado_em: string | null
    sinal_expirado_at: string | null
    professional: { name: string } | { name: string }[] | null
    appointment_services: { service_name: string | null }[] | null
  }
  const nomeProf = (p: Atend['professional']) => (Array.isArray(p) ? p[0]?.name : p?.name) ?? null
  const servico = (a: Atend) => {
    const lista = (a.appointment_services ?? []).map((s) => s.service_name).filter(Boolean) as string[]
    return lista.length > 1 ? `${lista[0]} + ${lista.length - 1}` : lista[0] ?? a.service_name ?? 'Atendimento'
  }

  // mensagens desses atendimentos (message_log só por service role: RLS sem policy)
  const idsAtend = ((atend ?? []) as Atend[]).map((a) => a.id)
  type Msg = { appointment_id: string; tipo: string; status: string | null; entregue_em: string | null; lido_em: string | null; created_at: string }
  const msgs: Msg[] = idsAtend.length
    ? (((await sb.from('message_log').select('appointment_id, tipo, status, entregue_em, lido_em, created_at').in('appointment_id', idsAtend).order('created_at', { ascending: true })).data ?? []) as Msg[])
    : []
  const CURTO: Record<string, string> = { confirmacao: 'Confirmação', lembrete_vespera: 'Lembrete da véspera', lembrete_dia: 'Lembrete do dia', sinal_pendente: 'Cobrança do sinal' }
  const SIT: Record<string, [string, LinhaSemana['comunicacao'][number]['tom']]> = {
    lida: ['lida', 'ok'], entregue: ['entregue', 'ok'], enviada: ['enviada', 'neutro'], processando: ['saindo', 'neutro'], falhou: ['não chegou', 'alerta'], nao_enviada: ['não enviada', 'neutro'],
  }
  const comunicacao = (a: Atend): LinhaSemana['comunicacao'] => {
    const out: LinhaSemana['comunicacao'] = []
    const dela = msgs.filter((m) => m.appointment_id === a.id)
    if (Number(a.sinal_valor ?? 0) > 0 && a.sinal_cobrar !== false) {
      if (a.sinal_pago_at) out.push({ texto: 'Sinal pago', tom: 'ok' })
      else if (a.sinal_declarado_em) out.push({ texto: 'Disse que pagou o sinal', tom: 'atencao' })
      else if (a.sinal_expirado_at) out.push({ texto: 'Sinal expirou', tom: 'alerta' })
      else out.push({ texto: 'Sinal pendente', tom: 'atencao' })
    }
    if (dela.some((m) => m.tipo === 'resposta_remarcar')) out.push({ texto: 'Pediu pra remarcar', tom: 'alerta' })
    const ultimo = [...dela].reverse().find((m) => (TIPOS_PROGRAMADOS as string[]).includes(m.tipo))
    if (ultimo) {
      const [sit, tom] = SIT[situacaoDoAviso(ultimo)] ?? ['enviada', 'neutro']
      out.push({ texto: `${CURTO[ultimo.tipo] ?? 'Aviso'} ${sit}`, tom })
    }
    return out
  }

  const dias: DiaSemana[] = []
  for (let i = 0; i < 7; i++) {
    const data = addDaysBR(de, i)
    const linhas = ((atend ?? []) as Atend[])
      .filter((a) => a.appointment_date === data)
      .map((a) => ({
        id: a.id,
        hora: a.start_time.slice(0, 5),
        fim: (a.end_time ?? '').slice(0, 5),
        cliente: a.client_name?.trim() || 'Cliente',
        servico: servico(a),
        profissional: nomeProf(a.professional),
        aprovar: a.status === 'pending',
        confirmou: !!a.confirmado_em,
        comunicacao: comunicacao(a),
      }))
    const aberto = ids.some((id) => periodosDoDia(semanal ?? [], datas ?? [], id, data).length > 0)
    dias.push({ data, aberto: aberto || linhas.length > 0, linhas })
  }
  return dias
}
