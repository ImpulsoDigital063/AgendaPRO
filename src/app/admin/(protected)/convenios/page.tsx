import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { todayBR } from '@/lib/date-br'
import SubPageHeader from '@/components/admin/SubPageHeader'
import ConveniosView from '@/components/admin/convenios/ConveniosView'

export const dynamic = 'force-dynamic'

/**
 * Convênios (empresas conveniadas) — CAF · Gustavo, 20/08/2026.
 *
 * Atrás da chave `businesses.convenios_enabled`. Negócio sem a chave recebe
 * 404: a rota não existe pra ele, nem digitando o endereço.
 */
export default async function ConveniosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, convenios_enabled')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect(await destinoSemNegocio())
  if (!business.convenios_enabled) notFound()

  const { data: empresas } = await supabase
    .from('companies')
    .select('id, name, cnpj, contato_nome, contato_telefone, ativo, created_at')
    .eq('business_id', business.id)
    .order('name')

  // Contagens por empresa numa query só — evita N+1 com muitas empresas.
  const ids = (empresas ?? []).map((e) => e.id)
  const [{ data: funcionarios }, { data: vinculos }, { data: emAberto }] = await Promise.all([
    ids.length
      ? supabase.from('customers').select('id, company_id').in('company_id', ids)
      : Promise.resolve({ data: [] as { id: string; company_id: string }[] }),
    ids.length
      ? supabase.from('company_professionals').select('company_id, professional_id').in('company_id', ids)
      : Promise.resolve({ data: [] as { company_id: string; professional_id: string }[] }),
    /* Quanto cada empresa deve e desde quando. Sem isso o valor fica em aberto
       em silêncio: dá pra chegar em 60 dias com milhares a receber e nenhuma
       cobrança feita (melhoria pedida pelo Eduardo em 24/08). */
    ids.length
      ? supabase
          .from('appointments')
          .select('company_id, total_price, appointment_date')
          .eq('business_id', business.id)
          .in('company_id', ids)
          .is('paid_at', null)
          .neq('status', 'cancelled')
      : Promise.resolve({ data: [] as { company_id: string; total_price: number | null; appointment_date: string }[] }),
  ])

  const contagem = new Map<string, { funcionarios: number; profissionais: number }>()
  for (const id of ids) contagem.set(id, { funcionarios: 0, profissionais: 0 })
  const aberto = new Map<string, { valor: number; qtd: number; maisAntigo: string | null }>()
  for (const id of ids) aberto.set(id, { valor: 0, qtd: 0, maisAntigo: null })
  for (const a of emAberto ?? []) {
    const x = aberto.get(a.company_id)
    if (!x) continue
    x.valor += Number(a.total_price ?? 0)
    x.qtd++
    if (!x.maisAntigo || a.appointment_date < x.maisAntigo) x.maisAntigo = a.appointment_date
  }
  const hoje = todayBR()
  const diasDesde = (d: string | null) =>
    d ? Math.max(0, Math.round((new Date(hoje + 'T12:00:00').getTime() - new Date(d + 'T12:00:00').getTime()) / 86400000)) : 0
  for (const f of funcionarios ?? []) {
    const c = contagem.get(f.company_id)
    if (c) c.funcionarios++
  }
  for (const v of vinculos ?? []) {
    const c = contagem.get(v.company_id)
    if (c) c.profissionais++
  }

  const lista = (empresas ?? []).map((e) => ({
    ...e,
    total_funcionarios: contagem.get(e.id)?.funcionarios ?? 0,
    total_profissionais: contagem.get(e.id)?.profissionais ?? 0,
    aberto_valor: aberto.get(e.id)?.valor ?? 0,
    aberto_qtd: aberto.get(e.id)?.qtd ?? 0,
    aberto_dias: diasDesde(aberto.get(e.id)?.maisAntigo ?? null),
  }))

  return (
    <>
      <SubPageHeader
        title="Convênios"
        subtitle={`${lista.length} empresa${lista.length !== 1 ? 's' : ''} cadastrada${lista.length !== 1 ? 's' : ''}`}
      />
      <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-5xl lg:px-8">
        <ConveniosView businessId={business.id} empresas={lista} />
      </div>
    </>
  )
}
