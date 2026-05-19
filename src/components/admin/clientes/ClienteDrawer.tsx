'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IconClose, IconArrowLeft, IconPlus } from '@/components/ui/Icon'

type Customer = {
  id: string
  name: string
  phone: string | null
  email: string | null
  total_points: number
  created_at: string
  nickname?: string | null
  important_note?: string | null
  instagram?: string | null
  birthday?: string | null
  cpf?: string | null
  rg?: string | null
  profession?: string | null
  sex?: string | null
  address?: string | null
  address_number?: string | null
  address_complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  referral_source?: string | null
  customer_type?: string | null
}

type Counts = {
  atendimentos: number
  produtos: number
  pacotes: number
  lastDate: string | null
}

type TabKey = 'perfil' | 'configuracoes' | 'atividades' | 'galeria' | 'fichas' | 'pacotes' | 'saldo' | 'fidelidade'

type Props = {
  customerId: string
  onClose: () => void
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'perfil', label: 'Perfil' },
  { key: 'configuracoes', label: 'Configurações' },
  { key: 'atividades', label: 'Atividades' },
  { key: 'galeria', label: 'Galeria' },
  { key: 'fichas', label: 'Fichas' },
  { key: 'pacotes', label: 'Pacotes' },
  { key: 'saldo', label: 'Saldo' },
  { key: 'fidelidade', label: 'Fidelidade' },
]

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateLong(d: string): string {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function ClienteDrawer({ customerId, onClose }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>('perfil')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [counts, setCounts] = useState<Counts>({ atendimentos: 0, produtos: 0, pacotes: 0, lastDate: null })
  const [loading, setLoading] = useState(true)
  const [fabOpen, setFabOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (fabOpen) setFabOpen(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, fabOpen])

  useEffect(() => {
    const sb = createClient()
    async function load() {
      setLoading(true)
      const [{ data: cust }, { data: appts }] = await Promise.all([
        sb
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .maybeSingle(),
        sb
          .from('appointments')
          .select('appointment_date, paid_at, total_price')
          .eq('customer_id', customerId)
          .order('appointment_date', { ascending: false }),
      ])
      if (cust) setCustomer(cust as Customer)
      const list = appts ?? []
      const last = list[0]
      setCounts({
        atendimentos: list.length,
        produtos: 0, // não temos ainda
        pacotes: 0, // não temos ainda
        lastDate: last?.appointment_date ?? null,
      })
      setLoading(false)
    }
    load()
  }, [customerId])

  const initial = (customer?.name ?? '?').slice(0, 1).toUpperCase()
  const hasHistory = counts.atendimentos > 0

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {/* Overlay */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />

      {/* Drawer */}
      <div
        className="absolute inset-y-0 right-0 flex flex-col"
        style={{
          width: 'min(880px, 100vw)',
          background: 'var(--admin-bg)',
          boxShadow: '-12px 0 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header bar */}
        <div
          className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
          style={{
            background: 'var(--admin-surface)',
            borderBottom: '1px solid var(--admin-border)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Voltar"
            className="p-2 rounded-lg"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            <IconArrowLeft size={18} />
          </button>
          <h2 className="flex-1 text-base font-bold truncate" style={{ color: 'var(--admin-text)' }}>
            {customer?.name ?? 'Carregando…'}
          </h2>
          <button
            type="button"
            disabled
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            style={{
              background: 'var(--admin-surface-hi)',
              color: 'var(--admin-text-mute)',
              border: '1px solid var(--admin-border)',
            }}
            title="Fluxo de Faturar adaptado pra cliente vem em breve"
          >
            Fechar Comanda
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 rounded-lg"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Avatar + contadores + FAB */}
          <div className="flex items-start gap-4 mb-5 relative">
            <span
              className="flex-shrink-0 w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              {initial}
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
                {customer?.name ?? '—'}
              </h1>
              {customer?.created_at && (
                <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
                  Cliente desde {formatDateLong(customer.created_at)}
                </p>
              )}
              <div className="flex flex-wrap gap-4 mt-3">
                {hasHistory ? (
                  <>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                        Atendimentos
                      </p>
                      <p className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
                        {counts.atendimentos}
                      </p>
                      {counts.lastDate && (
                        <p className="text-[10px]" style={{ color: 'var(--admin-text-mute)' }}>
                          Último em {new Date(counts.lastDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <KPI label="Atendimentos" value={0} />
                    <KPI label="Produtos Vendidos" value={0} />
                    <KPI label="Pacotes Vendidos" value={0} />
                  </>
                )}
              </div>
            </div>

            {/* FAB */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFabOpen((o) => !o)}
                aria-label="Ações"
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: 'var(--admin-accent)', color: '#fff' }}
              >
                <IconPlus size={20} />
              </button>
              {fabOpen && (
                <div
                  className="absolute right-0 top-full mt-2 rounded-xl overflow-hidden z-10"
                  style={{
                    background: 'var(--admin-surface)',
                    border: '1px solid var(--admin-border)',
                    minWidth: 200,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  }}
                >
                  {['Novo Atendimento', 'Venda de Produto', 'Venda de Pacote', 'Adicionar Crédito'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled
                      className="w-full text-left px-4 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ color: 'var(--admin-text)' }}
                      title="Vem nas próximas etapas (4.7)"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div
            className="flex flex-wrap gap-1 rounded-xl p-1 mb-5"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
            }}
          >
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider"
                style={{
                  background: tab === t.key ? 'var(--admin-accent)' : 'transparent',
                  color: tab === t.key ? '#fff' : 'var(--admin-text-mute)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Conteúdo das tabs */}
          {loading ? (
            <p className="text-center text-sm py-10" style={{ color: 'var(--admin-text-mute)' }}>
              Carregando…
            </p>
          ) : !customer ? (
            <p className="text-center text-sm py-10" style={{ color: 'var(--admin-danger,#EF4444)' }}>
              Cliente não encontrado
            </p>
          ) : (
            <>
              {tab === 'perfil' && <PerfilTab customer={customer} />}
              {tab === 'configuracoes' && (
                <Placeholder text="Preferências e permissões do cliente · em breve" />
              )}
              {tab === 'atividades' && (
                <Placeholder text="Timeline cruzada de atendimentos · em breve (etapa 4.5)" />
              )}
              {tab === 'galeria' && (
                <Placeholder text="Galeria de fotos do trabalho · em breve" />
              )}
              {tab === 'fichas' && (
                <Placeholder text="Fichas personalizadas (anamnese · técnica) · em breve" />
              )}
              {tab === 'pacotes' && (
                <Placeholder text="Pacotes contratados · em breve" />
              )}
              {tab === 'saldo' && (
                <Placeholder text="Crédito pré-pago (créditos avulsos) · em breve (etapa 4.7)" />
              )}
              {tab === 'fidelidade' && (
                <FidelidadeTab customer={customer} onRefresh={() => router.refresh()} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
        {label}
      </p>
      <p className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
        {value}
      </p>
    </div>
  )
}

function Placeholder({ text }: { text: string }) {
  return (
    <div
      className="rounded-2xl p-10 text-center"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
        {text}
      </p>
    </div>
  )
}

function PerfilTab({ customer }: { customer: Customer }) {
  const linhas: { label: string; value: string | null | undefined }[] = [
    { label: 'Apelido', value: customer.nickname },
    { label: 'Telefone', value: customer.phone },
    { label: 'Email', value: customer.email },
    { label: 'Instagram', value: customer.instagram },
    { label: 'CPF', value: customer.cpf },
    { label: 'RG', value: customer.rg },
    { label: 'Profissão', value: customer.profession },
    { label: 'Aniversário', value: customer.birthday },
    {
      label: 'Endereço',
      value: customer.address
        ? `${customer.address}${customer.address_number ? ', ' + customer.address_number : ''}${customer.neighborhood ? ' · ' + customer.neighborhood : ''}${customer.city ? ' · ' + customer.city : ''}${customer.state ? '/' + customer.state : ''}`
        : null,
    },
    { label: 'Como Conheceu', value: customer.referral_source },
    { label: 'Anotação Importante', value: customer.important_note },
  ].filter((l) => l.value)

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
          Dados Cadastrais
        </h3>
        <button
          type="button"
          disabled
          className="text-xs font-bold uppercase tracking-wider disabled:opacity-40"
          style={{ color: 'var(--admin-accent)' }}
          title="Form completo vem na etapa 4.4"
        >
          Editar
        </button>
      </div>

      {linhas.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--admin-text-faded)' }}>
          Só nome cadastrado · edite pra adicionar contato, endereço, anotação.
        </p>
      ) : (
        <dl className="space-y-3">
          {linhas.map((l) => (
            <div key={l.label}>
              <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                {l.label}
              </dt>
              <dd className="text-sm" style={{ color: 'var(--admin-text)' }}>
                {l.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

function FidelidadeTab({ customer, onRefresh }: { customer: Customer; onRefresh: () => void }) {
  const [delta, setDelta] = useState(10)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function adjust(direction: 'add' | 'remove') {
    if (delta <= 0) return
    setSubmitting(true)
    setError(null)
    const res = await fetch(`/api/admin/customers/${customer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pointsAdjustment: direction === 'add' ? delta : -delta,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'falha')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    onRefresh()
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <h3 className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--admin-text-mute)' }}>
        Saldo de Pontos
      </h3>
      <p className="text-3xl font-bold mb-4" style={{ color: 'var(--admin-accent)' }}>
        {customer.total_points ?? 0}
      </p>

      <div className="flex gap-2 items-end">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
            Quantidade
          </label>
          <input
            type="number"
            value={delta}
            onChange={(e) => setDelta(Math.max(0, parseInt(e.target.value, 10) || 0))}
            disabled={submitting}
            className="admin-input w-20 px-3 py-2 text-sm tabular-nums"
          />
        </div>
        <button
          type="button"
          onClick={() => adjust('add')}
          disabled={submitting || delta <= 0}
          className="flex-1 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
          style={{ background: '#10B981', color: '#fff' }}
        >
          + Adicionar
        </button>
        <button
          type="button"
          onClick={() => adjust('remove')}
          disabled={submitting || delta <= 0}
          className="flex-1 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
          style={{ background: 'var(--admin-danger,#EF4444)', color: '#fff' }}
        >
          − Remover
        </button>
      </div>

      {error && (
        <p className="text-xs mt-3 px-3 py-2 rounded-lg" style={{
          background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 14%, transparent)',
          color: 'var(--admin-danger,#EF4444)',
        }}>
          {error}
        </p>
      )}

      <p className="text-[11px] mt-4" style={{ color: 'var(--admin-text-faded)' }}>
        Resgate de recompensas e histórico de pontos no modal antigo (em breve unificado aqui).
      </p>
    </div>
  )
}
