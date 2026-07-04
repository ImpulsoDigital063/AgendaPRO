import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCurrentUser, getCurrentBusiness } from '@/lib/admin-data'
import SubPageHeader from '@/components/admin/SubPageHeader'
import { IconChevronLeft, IconChevronRight } from '@/components/ui/Icon'
import RemuneracoesTable, { type ProfRow } from '@/components/admin/remuneracoes/RemuneracoesTable'
import { getApptDiscountMap } from '@/lib/commission-discount'
import { todayBR, startOfDayBR } from '@/lib/date-br'

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function monthLabel(year: number, month0: number): string {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return `${months[month0]}/${year}`
}

function shiftMonth(year: number, month0: number, delta: number): { year: number; month0: number; iso: string } {
  const d = new Date(Date.UTC(year, month0 + delta, 1))
  return {
    year: d.getUTCFullYear(),
    month0: d.getUTCMonth(),
    iso: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
  }
}

export default async function RemuneracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')

  const business = await getCurrentBusiness(user.id)
  if (!business) redirect('/cadastro')

  const sp = await searchParams
  // λ.fuso: mês default no dia BR; janela de paid_at com offset −03:00
  // (startOfDayBR) e colunas DATE (period_start, salário date) com a string do
  // 1º dia. 00:00 UTC = 21h BR do dia anterior desviava a virada de mês.
  const ymBR = todayBR()
  let year = parseInt(ymBR.slice(0, 4), 10)
  let month0 = parseInt(ymBR.slice(5, 7), 10) - 1
  if (sp.month) {
    const [y, m] = sp.month.split('-')
    if (y && m) {
      year = parseInt(y, 10)
      month0 = parseInt(m, 10) - 1
    }
  }

  const mmBR = String(month0 + 1).padStart(2, '0')
  const nextYear = month0 === 11 ? year + 1 : year
  const nextMM = String(month0 === 11 ? 1 : month0 + 2).padStart(2, '0')
  const fromDate = `${year}-${mmBR}-01`
  const toDate = `${nextYear}-${nextMM}-01`
  const from = startOfDayBR(fromDate)
  const to = startOfDayBR(toDate)

  const sb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const [
    { data: profs },
    { data: paidAppts },
    { data: payments },
    { data: vouchers },
    { data: paidSales },
    { data: salaries },
  ] = await Promise.all([
    sb
      .from('professionals')
      // Fonte única do % = commission_percentage (coluna que o cadastro grava).
      // Alias mantém o resto do código usando p.default_commission_percent, mas
      // com o valor REAL. Antes lia default_commission_percent (default fixo 40,
      // nunca atualizado) → pagava comissão errada (espelha fix Palace 3e069be).
      .select('id, name, default_commission_percent:commission_percentage, is_receptionist, active')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('name'),
    sb
      .from('appointments')
      .select('id, professional_id, paid_at, total_price, invoice_item_id')
      .eq('business_id', business.id)
      .not('payment_method', 'in', '(courtesy,credit)') // cortesia não gera comissão
      .gte('paid_at', from)
      .lt('paid_at', to)
      .not('paid_at', 'is', null),
    sb
      .from('commission_payments')
      .select('professional_id, paid_amount')
      .eq('business_id', business.id)
      .gte('period_start', fromDate)
      .lt('period_start', toDate),
    sb
      .from('professional_vouchers')
      .select('professional_id, amount, used_in_payment_id')
      .eq('business_id', business.id)
      .is('used_in_payment_id', null),
    // Vendas de produto pagas no mês · comissão respeitando snapshot (exclui cortesia)
    sb
      .from('sales')
      .select('professional_id, paid_at, sale_items(quantity, unit_price, commission_type, commission_value)')
      .eq('business_id', business.id)
      .eq('type', 'product_sale')
      .eq('status', 'paid')
      .not('payment_method', 'in', '(courtesy,credit)')
      .gte('paid_at', from)
      .lt('paid_at', to)
      .not('paid_at', 'is', null),
    // Salários cadastrados no mês · v76 BLOCO 3 · inclui recep contratada
    sb
      .from('professional_salaries')
      .select('professional_id, amount, paid')
      .eq('business_id', business.id)
      .gte('date', fromDate)
      .lt('date', toDate),
  ])

  // λ.valor-liquido: comissão de serviço incide sobre o LÍQUIDO (cupom da
  // comanda já abatido), nunca sobre o bruto (Eduardo 04/07/2026). Mesmo
  // rateio do detalhe do profissional · usa invoice_item_id → invoices.discount.
  const apptDiscMap = await getApptDiscountMap(sb, (paidAppts ?? []).map((a) => a.invoice_item_id))

  // BLOCO 3 · TODOS os profs aparecem · recep (contratada) sem comissão · só salário

  // Comissão por venda de produto · respeita snapshot do sale_item
  // commission_type:
  //  - 'percent' + value → % sobre o bruto
  //  - 'fixed'   + value → R$ fixo por unidade
  //  - 'none'           → SEM comissão (v75 · explícito)
  //  - null             → fallback no pct padrão do prof (retrocompat)
  type SaleItemAgg = { quantity: number; unit_price: number; commission_type: string | null; commission_value: number | null }
  function calcProductCommission(
    sales: { professional_id: string | null; sale_items: SaleItemAgg[] | null }[],
    professionalId: string,
  ): number {
    let total = 0
    for (const s of sales) {
      if (s.professional_id !== professionalId) continue
      const items = s.sale_items ?? []
      for (const it of items) {
        const qty = Number(it.quantity ?? 0)
        const unit = Number(it.unit_price ?? 0)
        const lineGross = qty * unit
        if (it.commission_type === 'none') {
          // sem comissão explícita · não soma nada
          continue
        }
        if (it.commission_type === 'percent' && it.commission_value != null) {
          total += (lineGross * Number(it.commission_value)) / 100
        } else if (it.commission_type === 'fixed' && it.commission_value != null) {
          total += qty * Number(it.commission_value)
        }
        // null / sem regra = SEM comissão. Produto é valor do ESTÚDIO, não do
        // profissional (Izanara 10/06). Comissão de produto é opt-in: só paga se
        // tiver regra explícita (percent/fixed). Antes caía na % de serviço do
        // prof — pagava comissão indevida sobre produto.
      }
    }
    return total
  }

  // Calcula por prof · inclui recep como contratada (sem comissão)
  const rows: ProfRow[] = (profs ?? []).map((p) => {
    const pct = Number(p.default_commission_percent ?? 40)
    const isRecep = p.is_receptionist === true

    // Recep não recebe comissão (contratada) · zera serviços/produtos
    const sumPaidAppts = isRecep
      ? 0
      : (paidAppts ?? [])
          .filter((a) => a.professional_id === p.id)
          .reduce((s, a) => s + Math.max(0, Number(a.total_price ?? 0) - (apptDiscMap[a.id] ?? 0)), 0)
    const commissionFromAppts = isRecep ? 0 : (sumPaidAppts * pct) / 100
    const commissionFromSales = isRecep
      ? 0
      : calcProductCommission(
          (paidSales ?? []) as { professional_id: string | null; sale_items: SaleItemAgg[] | null }[],
          p.id,
        )

    // Salários cadastrados no mês (recep OU prof contratado)
    const salariosCadastrados = (salaries ?? [])
      .filter((sa) => sa.professional_id === p.id)
      .reduce((s, sa) => s + Number(sa.amount ?? 0), 0)
    const salariosJaPagos = (salaries ?? [])
      .filter((sa) => sa.professional_id === p.id && sa.paid === true)
      .reduce((s, sa) => s + Number(sa.amount ?? 0), 0)

    // Valor Total = comissões + salário cadastrado (recep só tem salário)
    const valorTotal = commissionFromAppts + commissionFromSales + salariosCadastrados

    const pagoCommissoes = (payments ?? [])
      .filter((cp) => cp.professional_id === p.id)
      .reduce((s, cp) => s + Number(cp.paid_amount ?? 0), 0)
    const pago = pagoCommissoes + salariosJaPagos

    const valesPendentes = (vouchers ?? [])
      .filter((v) => v.professional_id === p.id)
      .reduce((s, v) => s + Number(v.amount ?? 0), 0)

    return {
      id: p.id,
      name: p.name,
      default_commission_percent: pct,
      is_receptionist: isRecep,
      valorTotal,
      commissionFromAppts,
      commissionFromSales,
      salarios: salariosCadastrados,
      pago,
      pendente: Math.max(0, valorTotal - pago),
      valesPendentes,
    }
  })

  const totalRemuneracoes = rows.reduce((s, r) => s + r.valorTotal, 0)
  const totalComissaoServicos = rows.reduce((s, r) => s + r.commissionFromAppts, 0)
  const totalComissaoProdutos = rows.reduce((s, r) => s + r.commissionFromSales, 0)
  const totalSalarios = rows.reduce((s, r) => s + r.salarios, 0)
  const totalPago = rows.reduce((s, r) => s + r.pago, 0)
  const totalValesPendentes = rows.reduce((s, r) => s + r.valesPendentes, 0)
  const pendentePagamento = totalRemuneracoes - totalPago

  const prev = shiftMonth(year, month0, -1)
  const next = shiftMonth(year, month0, 1)
  const isCurrent =
    year === parseInt(ymBR.slice(0, 4), 10) && month0 === parseInt(ymBR.slice(5, 7), 10) - 1

  return (
    <main className="relative" style={{ minHeight: '100svh' }}>
      <div className="relative">
        <SubPageHeader title="Remunerações" subtitle={business.name} back="/admin/financeiro" />
        <div className="max-w-lg mx-auto px-4 py-6 lg:max-w-7xl lg:px-8">
          {/* Navegação por mês */}
          <div className="flex items-center gap-2 mb-4">
            <Link
              href={`/admin/financeiro/remuneracoes?month=${prev.iso}`}
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: 'var(--admin-surface)',
                color: 'var(--admin-text-mute)',
                border: '1px solid var(--admin-border)',
              }}
              aria-label="Mês anterior"
            >
              <IconChevronLeft size={16} />
            </Link>
            <div
              className="flex-1 text-center font-bold text-base capitalize"
              style={{ color: 'var(--admin-text)' }}
            >
              {monthLabel(year, month0)}
            </div>
            <Link
              href={`/admin/financeiro/remuneracoes?month=${next.iso}`}
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: 'var(--admin-surface)',
                color: 'var(--admin-text-mute)',
                border: '1px solid var(--admin-border)',
              }}
              aria-label="Próximo mês"
            >
              <IconChevronRight size={16} />
            </Link>
            {!isCurrent && (
              <Link
                href="/admin/financeiro/remuneracoes"
                className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider"
                style={{
                  background: 'var(--admin-accent)',
                  color: '#fff',
                }}
              >
                Hoje
              </Link>
            )}
          </div>

          {/* Tabela */}
          {rows.length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                Nenhum profissional cadastrado
              </p>
            </div>
          ) : (
            <RemuneracoesTable
              rows={rows}
              monthIso={`${year}-${String(month0 + 1).padStart(2, '0')}`}
              periodStart={fromDate}
              periodEnd={new Date(Date.UTC(year, month0 + 1, 0)).toISOString().slice(0, 10)}
            />
          )}

          {/* Hint */}
          <p className="text-[11px] mt-1 text-center" style={{ color: 'var(--admin-text-faded)' }}>
            Comissão calculada no faturamento (% configurável por profissional) · Clique na linha pra abrir ações
          </p>
        </div>
      </div>

      {/* Painel resumo flutuante · canto inferior direito (desktop) */}
      {rows.length > 0 && (
        <div
          className="hidden lg:block fixed rounded-2xl p-4 z-30"
          style={{
            bottom: 24,
            right: 24,
            width: 280,
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-faded)' }}>
            Resumo do mês
          </p>
          <div className="space-y-2 text-sm">
            {/* Breakdown · Comissão (serv+prod) + Salários (contratados/recep) */}
            {totalComissaoServicos > 0 && (
              <div className="flex justify-between text-[12px]">
                <span style={{ color: 'var(--admin-text-mute)' }}>Comissão serviços</span>
                <span className="tabular-nums" style={{ color: 'var(--admin-text-2)' }}>
                  {formatBRL(totalComissaoServicos)}
                </span>
              </div>
            )}
            {totalComissaoProdutos > 0 && (
              <div className="flex justify-between text-[12px]">
                <span style={{ color: 'var(--admin-text-mute)' }}>Comissão produtos</span>
                <span className="tabular-nums" style={{ color: 'var(--admin-text-2)' }}>
                  {formatBRL(totalComissaoProdutos)}
                </span>
              </div>
            )}
            {totalSalarios > 0 && (
              <div className="flex justify-between text-[12px]">
                <span style={{ color: 'var(--admin-text-mute)' }}>Salários cadastrados</span>
                <span className="tabular-nums" style={{ color: 'var(--admin-text-2)' }}>
                  {formatBRL(totalSalarios)}
                </span>
              </div>
            )}
            <div
              className="flex justify-between pt-2"
              style={{ borderTop: '1px solid var(--admin-divider)' }}
            >
              <span style={{ color: 'var(--admin-text-mute)' }}>Total Remunerações</span>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                {formatBRL(totalRemuneracoes)}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--admin-text-mute)' }}>Total Pago</span>
              <span className="font-semibold tabular-nums" style={{ color: '#059669' }}>
                {formatBRL(totalPago)}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--admin-text-mute)' }}>Vales Pendentes</span>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--admin-warning,#F59E0B)' }}>
                {formatBRL(totalValesPendentes)}
              </span>
            </div>
            <div
              className="flex justify-between pt-2"
              style={{ borderTop: '1px solid var(--admin-divider)' }}
            >
              <span className="font-bold" style={{ color: 'var(--admin-text)' }}>
                Pendente Pagamento
              </span>
              <span className="font-bold tabular-nums" style={{ color: 'var(--admin-accent)' }}>
                {formatBRL(pendentePagamento)}
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
