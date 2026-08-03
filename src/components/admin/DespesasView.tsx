'use client'

import { todayBR } from '@/lib/date-br'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import FinancePeriodTabs from './FinancePeriodTabs'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
import { IconClose, IconChevronLeft, IconChevronRight } from '@/components/ui/Icon'
import type { Expense, ExpenseCategory } from '@/lib/types'

type Props = {
  expenses: Expense[]
  /** v104 · contas vencidas e não pagas de períodos anteriores (sempre visíveis) */
  vencidas?: Expense[]
  periodo: string
  currentMonth?: string // YYYY-MM
  mesEspecifico?: boolean // true se URL tem ?mes=YYYY-MM
}

const MES_LABEL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function MonthNavigator({ currentMonth, isCustom }: { currentMonth: string; isCustom: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const [y, m] = currentMonth.split('-').map(Number)
  const label = `${MES_LABEL[m - 1]}/${y}`

  function navigate(delta: number) {
    const d = new Date(y, m - 1 + delta, 1)
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    router.push(`${pathname}?mes=${mes}`)
  }

  function goCurrentMonth() {
    router.push(pathname)
  }

  // Hoje em YYYY-MM pra desabilitar o "próximo" no mês atual
  const todayYM = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()
  const isFuture = currentMonth >= todayYM

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
        aria-label="Mês anterior"
      >
        <IconChevronLeft size={16} />
      </button>
      <div
        className="flex-1 text-center py-2 rounded-xl"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <p className="text-sm font-bold capitalize" style={{ color: 'var(--admin-text)' }}>
          {label}
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate(1)}
        disabled={isFuture}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
        aria-label="Próximo mês"
      >
        <IconChevronRight size={16} />
      </button>
      {isCustom && (
        <button
          type="button"
          onClick={goCurrentMonth}
          className="px-3 h-9 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          Hoje
        </button>
      )}
    </div>
  )
}

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  rent: 'Aluguel',
  products: 'Produtos',
  salary: 'Salários',
  utilities: 'Energia / Água / Internet',
  marketing: 'Marketing / Anúncios',
  taxes: 'Impostos',
  other: 'Outros',
}

const CATEGORY_COLOR: Record<ExpenseCategory, string> = {
  rent: '#EF4444',
  products: '#F59E0B',
  salary: '#3B82F6',
  utilities: '#06B6D4',
  marketing: '#A855F7',
  taxes: '#64748B',
  other: '#94A3B8',
}

const CATEGORY_LETTER: Record<ExpenseCategory, string> = {
  rent: 'A',
  products: 'P',
  salary: 'S',
  utilities: 'U',
  marketing: 'M',
  taxes: 'I',
  other: '•',
}

const PERIODO_LABEL: Record<string, string> = {
  hoje: 'Hoje',
  semana: 'Últimos 7 dias',
  mes: 'Este mês',
}

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

export default function DespesasView({ expenses, vencidas = [], periodo, currentMonth, mesEspecifico }: Props) {
  const router = useRouter()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  // Paginação: dono pode acumular dezenas de despesas no mês.
  const [showAllExpenses, setShowAllExpenses] = useState(false)
  const [pagandoId, setPagandoId] = useState<string | null>(null)

  // v104 · pago × programado. Despesa antiga não tem status no banco antigo em
  // cache — `?? 'paid'` mantém ela no lado realizado, como sempre foi.
  const pagas = useMemo(
    () => expenses.filter((e) => (e.status ?? 'paid') === 'paid'),
    [expenses]
  )

  // Vencidas de meses anteriores entram junto com as do período, ordenadas pelo
  // vencimento: o que está atrasado aparece primeiro.
  const programadas = useMemo(() => {
    const doPeriodo = expenses.filter((e) => e.status === 'scheduled')
    return [...vencidas, ...doPeriodo].sort((a, b) =>
      (a.due_date ?? '').localeCompare(b.due_date ?? '')
    )
  }, [expenses, vencidas])

  // O total do período continua sendo o REALIZADO. Conta que ainda vai ser paga
  // não pode inflar o gasto do mês — senão o número que ela usa pra decidir mente.
  const total = useMemo(
    () => pagas.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [pagas]
  )
  const totalProgramado = useMemo(
    () => programadas.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [programadas]
  )

  const hoje = todayBR()
  const atrasadas = programadas.filter((e) => (e.due_date ?? '') < hoje)

  async function marcarComoPaga(expense: Expense) {
    setPagandoId(expense.id)
    try {
      // Pagou hoje: occurred_at vira a data real, que é o que o fluxo de caixa
      // soma. O due_date fica guardado pra dar pra ver que saiu atrasada.
      const res = await fetch(`/api/admin/expenses/${expense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', occurred_at: todayBR() }),
      })
      if (res.ok) router.refresh()
    } finally {
      setPagandoId(null)
    }
  }

  // Agrupamento por categoria — só do que já saiu do caixa
  const byCategory = useMemo(() => {
    const map: Record<ExpenseCategory, number> = {
      rent: 0, products: 0, salary: 0, utilities: 0,
      marketing: 0, taxes: 0, other: 0,
    }
    for (const e of pagas) {
      map[e.category] = (map[e.category] || 0) + Number(e.amount || 0)
    }
    return map
  }, [pagas])

  const editingExpense =
    expenses.find((e) => e.id === editingId) ?? vencidas.find((e) => e.id === editingId)

  // Mês selecionado pra exibir no hero (label)
  const headerLabel = mesEspecifico && currentMonth
    ? (() => {
        const [y, m] = currentMonth.split('-').map(Number)
        return `${MES_LABEL[m - 1]}/${y}`
      })()
    : PERIODO_LABEL[periodo]

  return (
    <div className="space-y-5">
      <FinancePeriodTabs periodo={periodo} />

      {/* Navegação mês-a-mês · só quando filtro é "Mês" */}
      {periodo === 'mes' && currentMonth && (
        <MonthNavigator currentMonth={currentMonth} isCustom={!!mesEspecifico} />
      )}

      {/* Hero KPI: Total de despesas */}
      <div
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, color-mix(in srgb, var(--brand-primary) 12%, var(--admin-surface)) 100%)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <div
          className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-2xl opacity-70 pointer-events-none"
          style={{ background: 'rgba(239,68,68,0.35)' }}
        />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--admin-text-faded)' }}>
            Total · {headerLabel}
          </p>
          <p className="text-3xl font-extrabold mt-1 leading-none tabular-nums"
            style={{ color: 'var(--admin-text)' }}>
            {formatPrice(total)}
          </p>
          <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
            {pagas.length} despesa{pagas.length === 1 ? '' : 's'} paga{pagas.length === 1 ? '' : 's'}
            {programadas.length > 0 && ` · ${programadas.length} a pagar`}
          </p>
        </div>
      </div>

      {/* Botão adicionar */}
      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
          color: '#fff',
          boxShadow: '0 4px 14px rgba(59,130,246,0.25)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Adicionar despesa
      </button>

      {/* v104 · A pagar. Fica ACIMA do realizado de propósito: é o que exige
          ação dela. As atrasadas vêm primeiro, com o vencimento em vermelho. */}
      {programadas.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
              A pagar
              {atrasadas.length > 0 && (
                <span className="ml-2 normal-case tracking-normal font-bold" style={{ color: '#DC2626' }}>
                  · {atrasadas.length} vencida{atrasadas.length > 1 ? 's' : ''}
                </span>
              )}
            </h2>
            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text-2)' }}>
              {formatPrice(totalProgramado)}
            </span>
          </div>
          <div className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-2">
            {programadas.map((e) => {
              const venceu = (e.due_date ?? '') < hoje
              return (
                <div
                  key={e.id}
                  className="admin-card p-3 flex items-center gap-3 w-full"
                  style={venceu ? { borderColor: 'rgba(220,38,38,0.35)' } : undefined}
                >
                  <button
                    type="button"
                    onClick={() => setEditingId(e.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: `${CATEGORY_COLOR[e.category]}1F`, color: CATEGORY_COLOR[e.category] }}
                    >
                      {CATEGORY_LETTER[e.category]}
                    </span>
                    {/* Nome sozinho na primeira linha: e por ele que ela sabe
                        que conta e aquela, e era o que estava sendo cortado
                        ("Boleto dos produ..."). Valor e vencimento descem pra
                        segunda linha, que ja existia. Altura do card não muda. */}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                        {e.name}
                      </span>
                      <span className="block text-xs truncate" style={{ color: venceu ? '#DC2626' : 'var(--admin-text-mute)' }}>
                        <span className="font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                          {formatPrice(Number(e.amount))}
                        </span>
                        {' · '}
                        {venceu ? 'Venceu ' : 'Vence '}
                        {e.due_date ? formatDate(e.due_date) : '—'}
                        {' · '}
                        {CATEGORY_LABEL[e.category]}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => marcarComoPaga(e)}
                    disabled={pagandoId === e.id}
                    className="px-3 h-9 rounded-xl text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-50 flex-shrink-0"
                    style={{ background: 'var(--admin-accent)', color: '#fff' }}
                  >
                    {pagandoId === e.id ? '...' : 'Paguei'}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Breakdown por categoria (só aparece se tem despesa) */}
      {total > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
            Por categoria
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(byCategory) as ExpenseCategory[])
              .filter((c) => byCategory[c] > 0)
              .sort((a, b) => byCategory[b] - byCategory[a])
              .map((cat) => {
                const value = byCategory[cat]
                const percent = total > 0 ? (value / total) * 100 : 0
                return (
                  <div
                    key={cat}
                    className="admin-card p-3 flex items-center gap-2.5"
                  >
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: `${CATEGORY_COLOR[cat]}1F`, color: CATEGORY_COLOR[cat] }}
                    >
                      {CATEGORY_LETTER[cat]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider truncate" style={{ color: 'var(--admin-text-faded)' }}>
                        {CATEGORY_LABEL[cat]}
                      </p>
                      <p className="text-sm font-bold tabular-nums leading-tight truncate" style={{ color: 'var(--admin-text)' }}>
                        {formatPrice(value)}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
                        {percent.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                )
              })}
          </div>
        </section>
      )}

      {/* Lista de despesas */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Lista · {headerLabel}
        </h2>
        {pagas.length === 0 ? (
          <div className="admin-card p-8 text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--admin-text-2)' }}>
              Nenhuma despesa cadastrada neste período
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
              Cadastre aluguel, produtos, salários e outras despesas pra ver o lucro real
            </p>
          </div>
        ) : (
          <div className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-2">
            {(showAllExpenses ? pagas : pagas.slice(0, 10)).map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEditingId(e.id)}
                className="admin-card p-3 flex items-center gap-3 text-left w-full transition-colors hover:opacity-90"
              >
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: `${CATEGORY_COLOR[e.category]}1F`, color: CATEGORY_COLOR[e.category] }}
                >
                  {CATEGORY_LETTER[e.category]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--admin-text)' }}>
                    {e.name}
                    {e.recurring && (
                      <span className="text-[10px] font-normal ml-1.5 px-1.5 py-0.5 rounded" style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}>
                        recorrente
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--admin-text-faded)' }}>
                    {formatDate(e.occurred_at)} · {CATEGORY_LABEL[e.category]}
                  </p>
                </div>
                <p className="font-bold text-sm tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text)' }}>
                  − {formatPrice(Number(e.amount))}
                </p>
              </button>
            ))}
            {!showAllExpenses && pagas.length > 10 && (
              <button
                type="button"
                onClick={() => setShowAllExpenses(true)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 transition-opacity hover:opacity-90 text-sm font-semibold mt-1"
                style={{
                  background: 'var(--admin-surface)',
                  color: 'var(--admin-accent)',
                  border: '1px solid var(--admin-divider)',
                }}
              >
                Ver mais {pagas.length - 10}
              </button>
            )}
          </div>
        )}
      </section>

      {showAddModal && (
        <ExpenseFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            router.refresh()
          }}
        />
      )}

      {editingExpense && (
        <ExpenseFormModal
          expense={editingExpense}
          onClose={() => setEditingId(null)}
          onSuccess={() => {
            setEditingId(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function ExpenseFormModal({
  expense,
  onClose,
  onSuccess,
}: {
  expense?: Expense
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!expense
  const [name, setName] = useState(expense?.name || '')
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category || 'rent')
  const [occurredAt, setOccurredAt] = useState(
    expense?.occurred_at || todayBR()
  )
  const [recurring, setRecurring] = useState(expense?.recurring || false)
  const [notes, setNotes] = useState(expense?.notes || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  // v104 · "já paguei" continua sendo o padrão: quem só lança gasto que já saiu
  // não sente diferença nenhuma no formulário.
  const [ehProgramada, setEhProgramada] = useState(expense?.status === 'scheduled')
  const [dueDate, setDueDate] = useState(expense?.due_date || todayBR())

  async function submit() {
    setError(null)
    if (!name.trim()) {
      setError('Nome obrigatório')
      return
    }
    const amountNum = Number(amount.replace(',', '.'))
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError('Valor inválido')
      return
    }
    if (ehProgramada && !dueDate) {
      setError('Escolha a data de vencimento')
      return
    }
    setSubmitting(true)
    const body = {
      name: name.trim(),
      amount: amountNum,
      category,
      // Programada: quem manda é o vencimento — a API grava occurred_at = due_date
      // e só troca pela data real quando ela marcar como paga.
      occurred_at: ehProgramada ? dueDate : occurredAt,
      due_date: ehProgramada ? dueDate : null,
      status: ehProgramada ? 'scheduled' : 'paid',
      recurring,
      notes: notes.trim(),
    }
    const url = isEdit ? `/api/admin/expenses/${expense.id}` : '/api/admin/expenses'
    const method = isEdit ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSubmitting(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erro ao salvar')
      return
    }
    onSuccess()
  }

  async function remove() {
    if (!isEdit) return
    setSubmitting(true)
    const res = await fetch(`/api/admin/expenses/${expense.id}`, { method: 'DELETE' })
    setSubmitting(false)
    if (res.ok) {
      setConfirmRemove(false)
      onSuccess()
    } else {
      setError('Erro ao remover despesa')
      setConfirmRemove(false)
    }
  }

  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])
  if (!portalReady) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md p-5 rounded-t-3xl sm:rounded-3xl overflow-y-auto"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          maxHeight: 'calc(100svh - 16px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 5rem, 5rem)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
            {isEdit ? 'Editar despesa' : 'Nova despesa'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--admin-text-mute)' }}
            aria-label="Fechar"
          >
            <IconClose size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--admin-text-faded)' }}>
              Nome *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aluguel maio, produtos barbearia, etc."
              className="admin-input w-full px-3 py-2.5 text-sm"
              autoFocus={!isEdit}
            />
          </div>

          {/* v104 · a escolha que define o resto do formulário. "Já paguei" é o
              padrão, então quem só registra gasto que já saiu segue no mesmo
              fluxo de sempre e não precisa aprender nada. */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--admin-text-faded)' }}>
              Situação
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                { valor: false, titulo: 'Já paguei', ajuda: 'Saiu do caixa' },
                { valor: true, titulo: 'Vou pagar', ajuda: 'Conta a pagar' },
              ] as const).map((op) => {
                const ativo = ehProgramada === op.valor
                return (
                  <button
                    key={op.titulo}
                    type="button"
                    onClick={() => setEhProgramada(op.valor)}
                    className="px-3 py-2 rounded-xl text-left transition-colors"
                    style={
                      ativo
                        ? {
                            background: 'var(--admin-accent)',
                            color: '#fff',
                            border: '1px solid var(--admin-accent)',
                          }
                        : {
                            background: 'var(--admin-surface)',
                            color: 'var(--admin-text-2)',
                            border: '1px solid var(--admin-border)',
                          }
                    }
                  >
                    <span className="block text-sm font-bold">{op.titulo}</span>
                    <span className="block text-[11px] opacity-80">{op.ajuda}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* min-w-0 nos filhos: item de grid tem min-width:auto e NÃO encolhe
              abaixo do conteúdo. No iOS o input[type=date] renderiza a data por
              extenso ("3 de ago. de 2026") e vazava pra fora do modal. */}
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--admin-text-faded)' }}>
                Valor *
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="admin-input w-full min-w-0 px-3 py-2.5 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--admin-text-faded)' }}>
                {ehProgramada ? 'Vencimento' : 'Data'}
              </label>
              <input
                type="date"
                value={ehProgramada ? dueDate : occurredAt}
                onChange={(e) =>
                  ehProgramada ? setDueDate(e.target.value) : setOccurredAt(e.target.value)
                }
                className="admin-input w-full min-w-0 px-3 py-2.5 text-sm"
              />
              {/* Data futura em despesa JÁ PAGA continua sendo caso estranho —
                  o aviso fica. Na programada isso é o normal, então não avisa. */}
              {!ehProgramada && (() => {
                const todayStr = todayBR()
                if (occurredAt > todayStr) {
                  const future = new Date(occurredAt + 'T00:00:00')
                  return (
                    <p className="text-[11px] mt-1.5" style={{ color: '#F59E0B' }}>
                      📅 Despesa agendada para {future.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}.
                      Vai aparecer na lista do mês correspondente.
                      {' '}Se ainda não pagou, use <strong>Vou pagar</strong> acima.
                    </p>
                  )
                }
                return null
              })()}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--admin-text-faded)' }}>
              Categoria
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(CATEGORY_LABEL) as ExpenseCategory[]).map((c) => {
                const active = category === c
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className="px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors text-left"
                    style={
                      active
                        ? {
                            background: `${CATEGORY_COLOR[c]}1F`,
                            color: CATEGORY_COLOR[c],
                            border: `1px solid ${CATEGORY_COLOR[c]}55`,
                          }
                        : {
                            background: 'var(--admin-input-bg)',
                            color: 'var(--admin-text-mute)',
                            border: '1px solid var(--admin-border)',
                          }
                    }
                  >
                    {CATEGORY_LABEL[c]}
                  </button>
                )
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-xs" style={{ color: 'var(--admin-text-2)' }}>
              Despesa recorrente (acontece todo mês)
            </span>
          </label>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--admin-text-faded)' }}>
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: pago via PIX dia 5, fornecedor X, etc."
              rows={2}
              className="admin-input w-full px-3 py-2 text-sm resize-none"
              style={{ minHeight: 60 }}
            />
          </div>
        </div>

        {error && (
          <p className="text-xs mt-3" style={{ color: 'var(--admin-danger, #EF4444)' }}>
            {error}
          </p>
        )}

        <div className="flex gap-2 mt-4">
          {isEdit && (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              disabled={submitting}
              className="px-4 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.28)' }}
            >
              Excluir
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            }}
          >
            {submitting ? 'Salvando...' : isEdit ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </div>

      <ConfirmActionModal
        open={confirmRemove}
        title="Remover esta despesa?"
        message="A despesa some do financeiro e não pode ser desfeita. Recibo/comprovante físico você guarda em outro lugar."
        confirmLabel="Sim, remover"
        cancelLabel="Voltar"
        tone="danger"
        loading={submitting}
        onConfirm={remove}
        onClose={() => setConfirmRemove(false)}
      />
    </div>,
    document.body
  )
}
