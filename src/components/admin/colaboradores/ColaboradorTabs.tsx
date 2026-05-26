'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IconPlus, IconTrash, IconCheck } from '@/components/ui/Icon'

type Prof = {
  id: string
  name: string
  email: string | null
  phone: string | null
  default_commission_percent: number
  is_receptionist: boolean
  active: boolean
}

type Voucher = {
  id: string
  description: string
  date: string
  amount: number
  used_in_payment_id: string | null
}

type Salary = {
  id: string
  description: string
  date: string
  amount: number
  paid: boolean
  paid_at: string | null
}

type Props = {
  prof: Prof
  initialVouchers: Voucher[]
  initialSalaries: Salary[]
}

type TabKey = 'perfil' | 'configuracoes' | 'atividades' | 'salarios' | 'vales'

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function ColaboradorTabs({ prof, initialVouchers, initialSalaries }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>('perfil')
  const [vouchers, setVouchers] = useState(initialVouchers)
  const [salaries, setSalaries] = useState(initialSalaries)
  const [showVoucherForm, setShowVoucherForm] = useState(false)
  const [showSalaryForm, setShowSalaryForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'perfil', label: 'Perfil' },
    { key: 'configuracoes', label: 'Configurações' },
    { key: 'atividades', label: 'Atividades' },
    { key: 'salarios', label: 'Salários' },
    { key: 'vales', label: 'Vales' },
  ]

  async function reloadLists() {
    const sb = createClient()
    const [{ data: v }, { data: s }] = await Promise.all([
      sb
        .from('professional_vouchers')
        .select('id, description, date, amount, used_in_payment_id')
        .eq('professional_id', prof.id)
        .order('date', { ascending: false }),
      sb
        .from('professional_salaries')
        .select('id, description, date, amount, paid, paid_at')
        .eq('professional_id', prof.id)
        .order('date', { ascending: false }),
    ])
    setVouchers((v ?? []) as Voucher[])
    setSalaries((s ?? []) as Salary[])
  }

  return (
    <div>
      {/* Header com avatar e nome */}
      <div
        className="rounded-2xl p-5 mb-4 flex items-center gap-4"
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
        }}
      >
        <span
          className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          {prof.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
              {prof.name}
            </h2>
            {prof.is_receptionist && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{
                  background: 'color-mix(in srgb, var(--admin-accent) 14%, transparent)',
                  color: 'var(--admin-accent)',
                  border: '1px solid color-mix(in srgb, var(--admin-accent) 30%, transparent)',
                }}
              >
                Contratada
              </span>
            )}
            {!prof.active && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{
                  background: 'color-mix(in srgb, var(--admin-text-faded) 14%, transparent)',
                  color: 'var(--admin-text-faded)',
                }}
              >
                Inativo
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
            {prof.email ?? 'Sem email'} {prof.phone ? `· ${prof.phone}` : ''}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--admin-accent)' }}>
            {prof.is_receptionist
              ? 'Sem comissão · controle por salário fixo (aba Salários)'
              : `Comissão ${prof.default_commission_percent}%`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex flex-wrap gap-1 rounded-xl p-1 mb-4"
        style={{
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider"
            style={{
              background: tab === t.key ? 'var(--admin-accent)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--admin-text-mute)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p
          className="text-xs mb-3 px-3 py-2 rounded-lg"
          style={{
            background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 14%, transparent)',
            color: 'var(--admin-danger,#EF4444)',
          }}
        >
          {error}
        </p>
      )}

      {/* Conteúdo por tab */}
      {tab === 'perfil' && (
        <div
          className="rounded-2xl p-5 space-y-2"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
            <b>Nome:</b> {prof.name}
          </p>
          {prof.email && (
            <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
              <b>Email:</b> {prof.email}
            </p>
          )}
          {prof.phone && (
            <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
              <b>Telefone:</b> {prof.phone}
            </p>
          )}
          <p className="text-xs mt-3" style={{ color: 'var(--admin-text-faded)' }}>
            Edição completa do perfil em <a href="/admin/configuracoes?tab=profissionais" className="underline">Configurações &gt; Profissionais</a> (em breve unificado aqui).
          </p>
        </div>
      )}

      {tab === 'configuracoes' && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}
        >
          {prof.is_receptionist ? (
            <>
              <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                Contratada · sem comissão
              </p>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                Recepção/contratado recebe por <b>salário fixo</b> cadastrado mensalmente (aba Salários).
                Vales/adiantamentos vão na aba Vales · descontam do próximo pagamento.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                Comissão padrão: <b style={{ color: 'var(--admin-accent)' }}>{prof.default_commission_percent}%</b>
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--admin-text-mute)' }}>
                Edição de regras de comissão (taxa de forma de pagamento · desconto · gorjetas) vem na próxima rodada.
              </p>
            </>
          )}
        </div>
      )}

      {tab === 'atividades' && (
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
            Linha do tempo de atividades em breve.
          </p>
        </div>
      )}

      {tab === 'salarios' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              {salaries.length} {salaries.length === 1 ? 'registro' : 'registros'}
            </p>
            <button
              type="button"
              onClick={() => {
                setShowSalaryForm(true)
                setError(null)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              <IconPlus size={14} /> Adicionar
            </button>
          </div>

          {showSalaryForm && (
            <SalaryForm
              professionalId={prof.id}
              onClose={() => setShowSalaryForm(false)}
              onSaved={async () => {
                setShowSalaryForm(false)
                await reloadLists()
                router.refresh()
              }}
              setError={setError}
            />
          )}

          {salaries.length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
                Nenhum salário foi cadastrado.
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
              }}
            >
              {salaries.map((s, idx) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    borderBottom: idx < salaries.length - 1 ? '1px solid var(--admin-divider)' : 'none',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                      {s.description}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                      {formatDate(s.date)}
                    </p>
                  </div>
                  <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {formatBRL(s.amount)}
                  </p>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                    style={{
                      background: s.paid
                        ? 'color-mix(in srgb, #10B981 14%, transparent)'
                        : 'color-mix(in srgb, var(--admin-warning,#F59E0B) 14%, transparent)',
                      color: s.paid ? '#10B981' : 'var(--admin-warning,#F59E0B)',
                    }}
                  >
                    {s.paid ? 'Pago' : 'Em Aberto'}
                  </span>
                  {!s.paid && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await fetch(`/api/admin/professionals/${prof.id}/salaries`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ salaryId: s.id, paid: true }),
                        })
                        if (res.ok) {
                          await reloadLists()
                          router.refresh()
                        }
                      }}
                      aria-label="Marcar como pago"
                      className="p-1.5 rounded-lg"
                      style={{ color: '#10B981' }}
                      title="Marcar como pago"
                    >
                      <IconCheck size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm('Remover esse registro de salário?')) return
                      const res = await fetch(`/api/admin/professionals/${prof.id}/salaries?salaryId=${s.id}`, { method: 'DELETE' })
                      if (res.ok) {
                        await reloadLists()
                        router.refresh()
                      }
                    }}
                    aria-label="Remover"
                    className="p-1.5 rounded-lg"
                    style={{ color: 'var(--admin-danger,#EF4444)' }}
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'vales' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              {vouchers.length} {vouchers.length === 1 ? 'vale' : 'vales'}
            </p>
            <button
              type="button"
              onClick={() => {
                setShowVoucherForm(true)
                setError(null)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              <IconPlus size={14} /> Adicionar
            </button>
          </div>

          {showVoucherForm && (
            <VoucherForm
              professionalId={prof.id}
              onClose={() => setShowVoucherForm(false)}
              onSaved={async () => {
                setShowVoucherForm(false)
                await reloadLists()
                router.refresh()
              }}
              setError={setError}
            />
          )}

          {vouchers.length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
                Nenhum vale foi cadastrado.
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
              }}
            >
              {vouchers.map((v, idx) => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    borderBottom: idx < vouchers.length - 1 ? '1px solid var(--admin-divider)' : 'none',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                      {v.description}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                      {formatDate(v.date)}
                    </p>
                  </div>
                  <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-warning,#F59E0B)' }}>
                    {formatBRL(v.amount)}
                  </p>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                    style={{
                      background: v.used_in_payment_id
                        ? 'color-mix(in srgb, #10B981 14%, transparent)'
                        : 'color-mix(in srgb, var(--admin-warning,#F59E0B) 14%, transparent)',
                      color: v.used_in_payment_id ? '#10B981' : 'var(--admin-warning,#F59E0B)',
                    }}
                  >
                    {v.used_in_payment_id ? 'Descontado' : 'Pendente'}
                  </span>
                  {!v.used_in_payment_id && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm('Remover esse vale?')) return
                        const res = await fetch(`/api/admin/professionals/${prof.id}/vouchers?voucherId=${v.id}`, { method: 'DELETE' })
                        if (res.ok) {
                          await reloadLists()
                          router.refresh()
                        }
                      }}
                      aria-label="Remover"
                      className="p-1.5 rounded-lg"
                      style={{ color: 'var(--admin-danger,#EF4444)' }}
                    >
                      <IconTrash size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function VoucherForm({
  professionalId,
  onClose,
  onSaved,
  setError,
}: {
  professionalId: string
  onClose: () => void
  onSaved: () => void
  setError: (e: string | null) => void
}) {
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    const amt = parseFloat(amount.replace(',', '.'))
    if (!description.trim() || !amt || amt <= 0) {
      setError('Preencha descrição e valor')
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/admin/professionals/${professionalId}/vouchers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: description.trim(), date, amount: amt }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'falha_ao_salvar')
      setSubmitting(false)
      return
    }
    onSaved()
  }

  return (
    <div
      className="rounded-2xl p-4 mb-3 space-y-3"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-accent)',
      }}
    >
      <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
        Novo Vale
      </p>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
          Descrição do Vale
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          placeholder="Ex: Adiantamento de salário"
          className="admin-input w-full px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
            Data
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={submitting}
            className="admin-input w-full px-3 py-2 text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
            Valor (R$)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
            placeholder="0,00"
            className="admin-input w-full px-3 py-2 text-sm tabular-nums"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          {submitting ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

function SalaryForm({
  professionalId,
  onClose,
  onSaved,
  setError,
}: {
  professionalId: string
  onClose: () => void
  onSaved: () => void
  setError: (e: string | null) => void
}) {
  const [description, setDescription] = useState('Salário')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [paid, setPaid] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    const amt = parseFloat(amount.replace(',', '.'))
    if (!amt || amt <= 0) {
      setError('Preencha o valor')
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/admin/professionals/${professionalId}/salaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: description.trim() || 'Salário', date, amount: amt, paid }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'falha_ao_salvar')
      setSubmitting(false)
      return
    }
    onSaved()
  }

  return (
    <div
      className="rounded-2xl p-4 mb-3 space-y-3"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-accent)',
      }}
    >
      <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
        Novo Salário
      </p>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
          Descrição
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          placeholder="Salário"
          className="admin-input w-full px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
            Data
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={submitting}
            className="admin-input w-full px-3 py-2 text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
            Valor (R$)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
            placeholder="0,00"
            className="admin-input w-full px-3 py-2 text-sm tabular-nums"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--admin-text)' }}>
        <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} disabled={submitting} />
        Marcar como já pago
      </label>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          {submitting ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}
