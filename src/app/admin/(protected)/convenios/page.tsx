import { destinoSemNegocio } from '@/lib/destino-sem-negocio'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { todayBR } from '@/lib/date-br'
import { vencimentoDaCompetencia, diasDeAtraso } from '@/lib/convenio-vencimento'
import SubPageHeader from '@/components/admin/SubPageHeader'
import ConveniosView from '@/components/admin/convenios/ConveniosView'

export const dynamic = 'force-dynamic'

export type FaturaRow = {
  id: string
  numero: number
  competencia: string
  qtd: number
  total: number
  enviada_em: string | null
  paga_em: string | null
  company_id: string
}

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
    .select('id, name, cnpj, contato_nome, contato_telefone, ativo, created_at, dia_vencimento')
    .eq('business_id', business.id)
    .order('name')

  // Contagens por empresa numa query só — evita N+1 com muitas empresas.
  const ids = (empresas ?? []).map((e) => e.id)
  const [{ data: funcionarios }, { data: vinculos }, { data: emAberto }, { data: faturas }] = await Promise.all([
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
          .select('company_id, total_price, appointment_date, company_invoice_id')
          .eq('business_id', business.id)
          .in('company_id', ids)
          .is('paid_at', null)
          .neq('status', 'cancelled')
      : Promise.resolve({ data: [] as { company_id: string; total_price: number | null; appointment_date: string; company_invoice_id: string | null }[] }),
    /* Faturas já emitidas · o que diferencia "preciso cobrar" de "já cobrei,
       estou esperando". Sem isso a tela mandava fechar a fatura pra sempre,
       inclusive depois de fechada (Eduardo, 25/08). */
    ids.length
      ? supabase
          .from('company_invoices')
          .select('id, numero, competencia, qtd, total, enviada_em, paga_em, company_id')
          .eq('business_id', business.id)
          .in('company_id', ids)
          .order('numero', { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] as FaturaRow[] }),
  ])

  const contagem = new Map<string, { funcionarios: number; profissionais: number }>()
  for (const id of ids) contagem.set(id, { funcionarios: 0, profissionais: 0 })
  const aberto = new Map<string, { valor: number; qtd: number; maisAntigo: string | null }>()
  for (const id of ids) aberto.set(id, { valor: 0, qtd: 0, maisAntigo: null })

  /* Quebra por COMPETÊNCIA (Eduardo, 25/08). O total agregado escondia a ação:
     o card dizia "R$1.300 em aberto" na Prefeitura, que é julho (910) mais
     agosto (390) somados — e ele nunca vai cobrar R$1.300, ele fecha JULHO.
     Aqui cada mês vira uma linha com o seu próprio botão.

     E cada mês nasce com dois valores separados, porque as ações são outras:
       aFaturar  → atendimento sem fatura · ação: fechar e mandar pro RH
       faturado  → fatura já emitida, dinheiro não entrou · ação: esperar */
  const porMes = new Map<string, Map<string, { aFaturar: number; qtdAFaturar: number; faturado: number; qtdFaturado: number; maisAntigo: string | null }>>()
  for (const id of ids) porMes.set(id, new Map())
  for (const a of emAberto ?? []) {
    const x = aberto.get(a.company_id)
    if (!x) continue
    const valor = Number(a.total_price ?? 0)
    x.valor += valor
    x.qtd++
    if (!x.maisAntigo || a.appointment_date < x.maisAntigo) x.maisAntigo = a.appointment_date

    const comp = String(a.appointment_date).slice(0, 7)
    const meses = porMes.get(a.company_id)!
    if (!meses.has(comp)) meses.set(comp, { aFaturar: 0, qtdAFaturar: 0, faturado: 0, qtdFaturado: 0, maisAntigo: null })
    const m = meses.get(comp)!
    if (a.company_invoice_id) {
      m.faturado += valor
      m.qtdFaturado++
    } else {
      m.aFaturar += valor
      m.qtdAFaturar++
    }
    if (!m.maisAntigo || a.appointment_date < m.maisAntigo) m.maisAntigo = a.appointment_date
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

  const mesAtual = hoje.slice(0, 7)
  const listaSemOrdem = (empresas ?? []).map((e) => ({
    ...e,
    total_funcionarios: contagem.get(e.id)?.funcionarios ?? 0,
    total_profissionais: contagem.get(e.id)?.profissionais ?? 0,
    aberto_valor: aberto.get(e.id)?.valor ?? 0,
    aberto_qtd: aberto.get(e.id)?.qtd ?? 0,
    aberto_dias: diasDesde(aberto.get(e.id)?.maisAntigo ?? null),
    /* Mais antigo primeiro: é o que está atrasado e o que ele tem que fechar. */
    competencias: [...(porMes.get(e.id) ?? new Map())]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([comp, m]) => {
        const venc = vencimentoDaCompetencia(comp, e.dia_vencimento ?? null)
        return {
          competencia: comp,
          aFaturar: m.aFaturar,
          qtdAFaturar: m.qtdAFaturar,
          faturado: m.faturado,
          qtdFaturado: m.qtdFaturado,
          dias: diasDesde(m.maisAntigo),
          emCurso: comp === mesAtual,
          vencimento: venc,
          atraso: diasDeAtraso(venc, hoje),
        }
      }),
  }))

  /* Ordem: quem está mais atrasado primeiro. Alfabético só serve pra lista de
     cadastro — aqui a lista é de cobrança, e com 5 ou 10 empresas o que o dono
     precisa ver no topo é quem está devendo há mais tempo (Eduardo, 25/08). */
  const lista = listaSemOrdem.sort((a, b) => {
    const atrasoA = Math.max(0, ...a.competencias.map((c) => c.atraso), a.competencias.some((c) => c.aFaturar > 0 && !c.emCurso) ? 1 : 0)
    const atrasoB = Math.max(0, ...b.competencias.map((c) => c.atraso), b.competencias.some((c) => c.aFaturar > 0 && !c.emCurso) ? 1 : 0)
    if (atrasoA !== atrasoB) return atrasoB - atrasoA
    if (a.aberto_valor !== b.aberto_valor) return b.aberto_valor - a.aberto_valor
    return a.name.localeCompare(b.name)
  })

  const faturasPorEmpresa = new Map<string, FaturaRow[]>()
  for (const f of (faturas ?? []) as FaturaRow[]) {
    if (!faturasPorEmpresa.has(f.company_id)) faturasPorEmpresa.set(f.company_id, [])
    faturasPorEmpresa.get(f.company_id)!.push(f)
  }

  return (
    <>
      <SubPageHeader
        title="Convênios"
        subtitle={`${lista.length} empresa${lista.length !== 1 ? 's' : ''} cadastrada${lista.length !== 1 ? 's' : ''}`}
      />
      <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-5xl lg:px-8">
        <ConveniosView businessId={business.id} empresas={lista} faturas={(faturas ?? []) as FaturaRow[]} />
      </div>
    </>
  )
}
