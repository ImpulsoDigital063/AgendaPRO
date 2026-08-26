import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import SubPageHeader from '@/components/admin/SubPageHeader'
import EmpresaDetalheView from '@/components/admin/convenios/EmpresaDetalheView'
import ExtratoEmpresa, { type LinhaExtrato } from '@/components/admin/convenios/ExtratoEmpresa'
import { monthBoundsBR, todayBR } from '@/lib/date-br'

export const dynamic = 'force-dynamic'

export default async function EmpresaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mes?: string }>
}) {
  const { id } = await params
  const { mes: mesParam } = await searchParams
  // Competência = mês corrente em horário de Brasília, salvo escolha dele.
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? '') ? mesParam! : todayBR().slice(0, 7)
  const { start, end } = monthBoundsBR(mes)
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, phone, cnpj, convenios_enabled')
    .eq('owner_id', user.id)
    .single()
  if (!business) redirect(await destinoSemNegocio())
  if (!business.convenios_enabled) notFound()

  const { data: empresa } = await supabase
    .from('companies')
    .select('id, business_id, name, cnpj, contato_nome, contato_telefone, contato_email, ativo, dia_vencimento, instrucoes_pagamento')
    .eq('id', id)
    .eq('business_id', business.id)
    .maybeSingle()
  if (!empresa) notFound()

  const [{ data: profissionais }, { data: vinculados }, { data: funcionarios }] = await Promise.all([
    supabase
      .from('professionals')
      .select('id, name, active')
      .eq('business_id', business.id)
      .order('name'),
    supabase.from('company_professionals').select('professional_id').eq('company_id', empresa.id),
    supabase
      .from('customers')
      .select('id, name, phone')
      .eq('company_id', empresa.id)
      .order('name'),
  ])

  /* Extrato do mês: atendimentos feitos PELA empresa, com quem atendeu e se já
     foi recebido. O invoice_item liga o atendimento à comanda, que é quem
     recebe a baixa quando a empresa paga. */
  const { data: atendimentos } = await supabase
    .from('appointments')
    .select('id, appointment_date, start_time, client_name, service_name, total_price, paid_at, invoice_item_id, professional:professionals(name)')
    .eq('business_id', business.id) // defesa em profundidade: o RLS já barra, mas o extrato é dinheiro
    .eq('company_id', empresa.id)
    .gte('appointment_date', start)
    .lte('appointment_date', end)
    .neq('status', 'cancelled')
    .order('appointment_date')
    .order('start_time')

  const itemIds = (atendimentos ?? []).map((a) => a.invoice_item_id).filter(Boolean) as string[]
  const { data: itens } = itemIds.length
    ? await supabase.from('invoice_items').select('id, invoice_id').in('id', itemIds)
    : { data: [] as { id: string; invoice_id: string }[] }
  const comandaPorItem = new Map((itens ?? []).map((i) => [i.id, i.invoice_id]))

  // Faturas já fechadas dessa empresa — o histórico do que foi enviado.
  const { data: faturas } = await supabase
    .from('company_invoices')
    .select('id, numero, competencia, qtd, total, enviada_em, enviada_para, paga_em')
    .eq('company_id', empresa.id)
    .order('numero', { ascending: false })
    .limit(24)

  const linhas: LinhaExtrato[] = (atendimentos ?? []).map((a) => {
    const prof = Array.isArray(a.professional) ? a.professional[0] : a.professional
    return {
      id: a.id,
      data: a.appointment_date as string,
      hora: (a.start_time as string).slice(0, 5),
      funcionario: a.client_name ?? '—',
      profissional: prof?.name ?? '—',
      servico: a.service_name ?? '—',
      valor: Number(a.total_price ?? 0),
      pago: !!a.paid_at,
      invoiceId: a.invoice_item_id ? comandaPorItem.get(a.invoice_item_id) ?? null : null,
    }
  })

  return (
    <>
      <SubPageHeader title={empresa.name} subtitle="Convênio" back="/admin/convenios" />
      <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-5xl lg:px-8">
        <ExtratoEmpresa
          empresaId={empresa.id}
          empresaNome={empresa.name}
          empresaCnpj={empresa.cnpj}
          instrucoesPagamento={empresa.instrucoes_pagamento}
          clinicaNome={business.name}
          clinicaTelefone={business.phone}
          clinicaCnpj={business.cnpj}
          temEmail={!!empresa.contato_email}
          mes={mes}
          linhas={linhas}
          faturas={faturas ?? []}
        />
        <div className="h-5" />
        <EmpresaDetalheView
          businessId={business.id}
          empresa={empresa}
          profissionais={(profissionais ?? []).filter((p) => p.active !== false)}
          vinculadosIniciais={(vinculados ?? []).map((v) => v.professional_id)}
          funcionariosIniciais={funcionarios ?? []}
        />
      </div>
    </>
  )
}
