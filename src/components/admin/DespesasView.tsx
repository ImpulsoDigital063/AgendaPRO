'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import FinancePeriodTabs from './FinancePeriodTabs'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
import { IconClose } from '@/components/ui/Icon'
import type { Expense, ExpenseCategory } from '@/lib/types'

type Props = {
  expenses: Expense[]
  periodo: string
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

export default function DespesasView({ expenses, periodo }: Props) {
  const router = useRouter()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  // Paginação: dono pode acumular dezenas de despesas no mês.
  const [showAllExpenses, setShowAllExpenses] = useState(false)

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [expenses]
  )

  // Agrupamento por categoria
  const byCategory = useMemo(() => {
    const map: Record<ExpenseCategory, number> = {
      rent: 0, products: 0, salary: 0, utilities: 0,
      marketing: 0, taxes: 0, other: 0,
    }
    for (const e of expenses) {
      map[e.category] = (map[e.category] || 0) + Number(e.amount || 0)
    }
    return map
  }, [expenses])

  const editingExpense = expenses.find((e) => e.id === editingId)

  return (
    <div className="space-y-5">
      <FinancePeriodTabs periodo={periodo} />

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
            Total · {PERIODO_LABEL[periodo]}
          </p>
          <p className="text-3xl font-extrabold mt-1 leading-none tabular-nums"
            style={{ color: 'var(--admin-text)' }}>
            {formatPrice(total)}
          </p>
          <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-mute)' }}>
            {expenses.length} despesa{expenses.length === 1 ? '' : 's'} cadastrada{expenses.length === 1 ? '' : 's'}
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
          Lista · {PERIODO_LABEL[periodo]}
        </h2>
        {expenses.length === 0 ? (
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
            {(showAllExpenses ? expenses : expenses.slice(0, 10)).map((e) => (
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
            {!showAllExpenses && expenses.length > 10 && (
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
                Ver mais {expenses.length - 10}
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
    expense?.occurred_at || new Date().toISOString().split('T')[0]
  )
  const [recurring, setRecurring] = useState(expense?.recurring || false)
  const [notes, setNotes] = useState(expense?.notes || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)

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
    setSubmitting(true)
    const body = {
      name: name.trim(),
      amount: amountNum,
      category,
      occurred_at: occurredAt,
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="admin-card w-full sm:max-w-md p-5 rounded-t-3xl sm:rounded-3xl overflow-y-auto"
        style={{
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

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--admin-text-faded)' }}>
                Valor *
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="admin-input w-full px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--admin-text-faded)' }}>
                Data
              </label>
              <input
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="admin-input w-full px-3 py-2.5 text-sm"
              />
              {/* Aviso quando data e' futura — CIC reportou que cadastrar
                  despesa com data futura sumia da lista do mes corrente
                  sem feedback. Cliente leigo achava que o sistema nao
                  salvou. */}
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0]
                if (occurredAt > todayStr) {
                  const future = new Date(occurredAt + 'T00:00:00')
                  return (
                    <p className="text-[11px] mt-1.5" style={{ color: '#F59E0B' }}>
                      📅 Despesa agendada para {future.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}.
                      Vai aparecer na lista do mês correspondente.
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
    </div>
  )
}
