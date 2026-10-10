import type { createClient } from '@/lib/supabase/server'
import { todayBR, addDaysBR } from '@/lib/date-br'
import { getApptDiscountMap } from '@/lib/commission-discount'

type ServerClient = Awaited<ReturnType<typeof createClient>>

export type PeriodoExtrato = 'hoje' | 'semana' | 'mes' | 'custom'

/**
 * Extrato de comissão de UMA profissional · atendimentos do período com o
 * valor LÍQUIDO (cupom da comanda abatido).
 *
 * Saiu de /profissional/financeiro em 10/10/2026 (v155) pra a aba "Eu" da
 * GERENTE que atende usar o mesmo cálculo — a "Eu" do dono soma 100%, e pra
 * gerente comissionada isso mostrava o bruto como se fosse ganho dela.
 */
export async function carregarExtratoProfissional(
  supabase: ServerClient,
  professionalId: string,
  params: { periodo?: string; de?: string; ate?: string },
) {
  /* Período escolhido na mão · mesmas regras do /admin/financeiro (13/09/2026):
     formato certo, na ordem, sem futuro e no máximo 1 ano; qualquer desvio cai
     no padrão. Aqui o intervalo vale LITERAL (sem a folga de dias futuros que
     os atalhos usam): quem marcou 01 a 10 quer 01 a 10. */
  const YMD = /^\d{4}-\d{2}-\d{2}$/
  const hojeBR = todayBR()
  const deOk = params.de && YMD.test(params.de) ? params.de : null
  const ateBruto = params.ate && YMD.test(params.ate) ? params.ate : null
  const ateOk = ateBruto && ateBruto > hojeBR ? hojeBR : ateBruto
  const diasEscolhidos =
    deOk && ateOk
      ? Math.round((Date.parse(ateOk + 'T12:00:00Z') - Date.parse(deOk + 'T12:00:00Z')) / 86400000) + 1
      : 0
  const customOk = !!deOk && !!ateOk && deOk <= ateOk && diasEscolhidos <= 366

  /* Só valor conhecido volta do fallback: a URL vem com `periodo=custom`, e
     devolver esse valor quando as datas são inválidas fazia a tela dizer
     "Período escolhido" sem filtrar nada (achado no teste de 13/09). */
  const periodo: PeriodoExtrato = customOk
    ? 'custom'
    : params.periodo === 'hoje' || params.periodo === 'semana'
      ? params.periodo
      : 'mes'

  // λ.fuso · datas em BR, NUNCA new Date().toISOString() cru: o servidor da
  // Vercel roda em UTC e depois das 21h no Brasil ele já está no dia seguinte —
  // o "Hoje" dela mostrava o dia errado (mesmo bug do Olímpio, 03/07).
  const todayStr = todayBR()

  // Mesmo range do admin financeiro: cobre passado + futuro do
  // periodo. Sem isso agendamentos confirmados pra dias proximos
  // sumiam de "A receber" do profissional.
  let startDate: string
  let endDate: string
  if (customOk) {
    startDate = deOk as string
    endDate = ateOk as string
  } else if (periodo === 'hoje') {
    startDate = todayStr
    endDate = todayStr
  } else if (periodo === 'semana') {
    startDate = addDaysBR(todayStr, -3)
    endDate = addDaysBR(todayStr, 3)
  } else {
    // "Mes" agora = rolling 30 dias passados + 7 futuros (consistencia com /admin/financeiro).
    startDate = addDaysBR(todayStr, -30)
    endDate = addDaysBR(todayStr, 7)
  }

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, client_name, client_phone, appointment_date, start_time, status, service_name, total_price, paid_at, payment_method, invoice_item_id, commission_amount, commission_percent')
    .eq('professional_id', professionalId)
    .gte('appointment_date', startDate)
    .lte('appointment_date', endDate)
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false })

  // λ.valor-liquido · cupom vive em invoices.discount (por COMANDA) e a comissão
  // dela incide sobre o valor FINAL pago pela cliente. Sem isso a tela mostrava
  // o BRUTO e ela veria uma comissão maior do que a dona paga de fato — a
  // remuneração no /admin já paga sobre o líquido desde 04/07.
  const apptDisc = await getApptDiscountMap(
    supabase,
    (appointments ?? []).map((a) => a.invoice_item_id),
  )
  const appointmentsLiquidos = (appointments ?? []).map((a) => ({
    ...a,
    total_price: Math.max(0, (a.total_price ?? 0) - (apptDisc[a.id] ?? 0)),
  }))

  return { periodo, appointmentsLiquidos }
}
