'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDateBR } from '@/lib/date-br'
import { IconClose, IconArrowLeft, IconPlus } from '@/components/ui/Icon'
import ClienteAtividadesTab from './ClienteAtividadesTab'
import SaldoTab from './SaldoTab'
import AddCreditoModal from './AddCreditoModal'
import AtendimentoHistoricoModal from './AtendimentoHistoricoModal'
import ConfigClienteTab from './ConfigClienteTab'
import GaleriaTab from './GaleriaTab'
import FichasTab from './FichasTab'
import PacotesClienteTab from './PacotesClienteTab'

type Customer = {
  id: string
  business_id: string
  name: string
  phone: string | null
  email: string | null
  total_points: number
  created_at: string
  preferred_contact?: string | null
  marketing_consent?: boolean | null
  blocked?: boolean | null
  blocked_reason?: string | null
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
  const [showAddCredito, setShowAddCredito] = useState(false)
  const [showHistorico, setShowHistorico] = useState(false)
  // Vindos da MESMA rota que alimenta a ficha do celular — até 20/08/2026
  // cupom ativo e isenção de sinal só existiam lá.
  const [activeCoupon, setActiveCoupon] = useState<{
    code: string
    discount_type: string
    discount_value: number
    // Dias já calculados na hora do fetch — contar no render usaria Date.now()
    // durante a renderização, que o lint barra por impureza.
    diasRestantes: number
  } | null>(null)
  const [sinalAtivoNoNegocio, setSinalAtivoNoNegocio] = useState(false)
  const [isento, setIsento] = useState(false)
  // Bump força o fetch do drawer de novo (contador + lista) · v121
  const [reloadKey, setReloadKey] = useState(0)

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
          .select('appointment_date, paid_at, total_price, status')
          .eq('customer_id', customerId)
          .order('appointment_date', { ascending: false }),
      ])
      if (cust) setCustomer(cust as Customer)
      // Não bloqueia a ficha: se a rota falhar, o resto da tela abre igual.
      fetch('/api/admin/customers/' + customerId, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d) return
          const cupom = d.activeCoupon ?? null
          setActiveCoupon(
            cupom
              ? {
                  code: cupom.code,
                  discount_type: cupom.discount_type,
                  discount_value: cupom.discount_value,
                  diasRestantes: Math.max(
                    0,
                    Math.ceil((new Date(cupom.expires_at).getTime() - Date.now()) / 86400000),
                  ),
                }
              : null,
          )
          setSinalAtivoNoNegocio(d.sinalAtivo === true)
          setIsento(d.customer?.sinal_isento === true)
        })
        .catch(() => {})
      const list = appts ?? []
      // Contador "ATENDIMENTOS" só conta os REAIS (passados que aconteceram).
      // Exclui futuros agendados (recorrências importadas Salão99 inflavam o
      // número · Ana Paula mostrava 202 quando real era 5) e cancelados.
      const today = new Date().toISOString().slice(0, 10)
      const realizados = list.filter(
        (a) => a.appointment_date <= today && a.status !== 'cancelled' && a.status !== 'no_show'
      )
      const lastRealizado = realizados[0]
      setCounts({
        atendimentos: realizados.length,
        produtos: 0, // não temos ainda
        pacotes: 0, // não temos ainda
        lastDate: lastRealizado?.appointment_date ?? null,
      })
      setLoading(false)
    }
    load()
  }, [customerId, reloadKey])

  const initial = (customer?.name ?? '?').slice(0, 1).toUpperCase()
  const hasHistory = counts.atendimentos > 0

  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])
  if (!portalReady) return null

  return createPortal(
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
            className="hidden sm:block px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50"
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
        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
          {/* Avatar + contadores + FAB */}
          <div className="flex items-start gap-4 mb-5 relative">
            <span
              className="flex-shrink-0 w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              {initial}
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold leading-tight break-words" style={{ color: 'var(--admin-text)' }}>
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
                    {/* Produtos e Pacotes ainda sao placeholder fixo em 0 (a
                        contagem nao existe). No computador passam batido; em
                        390px custavam duas linhas da primeira dobra pra dizer
                        zero. Somem no celular ate terem dado real. */}
                    <div className="hidden sm:block"><KPI label="Produtos Vendidos" value={0} /></div>
                    <div className="hidden sm:block"><KPI label="Pacotes Vendidos" value={0} /></div>
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
                  <button
                    type="button"
                    disabled
                    className="w-full text-left px-4 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: 'var(--admin-text)' }}
                    title="Em breve (precisa do módulo de agenda)"
                  >
                    Novo Atendimento
                  </button>
                  <button
                    type="button"
                    disabled
                    className="w-full text-left px-4 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: 'var(--admin-text)' }}
                    title="Em breve (módulo Produtos)"
                  >
                    Venda de Produto
                  </button>
                  <button
                    type="button"
                    disabled
                    className="w-full text-left px-4 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: 'var(--admin-text)' }}
                    title="Em breve (módulo Pacotes)"
                  >
                    Venda de Pacote
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFabOpen(false)
                      setShowAddCredito(true)
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--admin-surface-hi)]"
                    style={{ color: 'var(--admin-text)' }}
                  >
                    Adicionar Crédito
                  </button>
                  {/* v121 · o que o cliente ja fez ANTES do sistema. Registro
                      de historico: nao cria comanda nem entra no financeiro. */}
                  <button
                    type="button"
                    onClick={() => {
                      setFabOpen(false)
                      setShowHistorico(true)
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--admin-surface-hi)]"
                    style={{ color: 'var(--admin-text)' }}
                  >
                    Atendimento Antigo
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CUPOM ATIVO · a dona precisa ver antes de fechar a comanda, senão
              o desconto que ela mesma mandou não é aplicado. */}
          {activeCoupon && (
            <div
              className="px-4 py-3 rounded-2xl flex items-center gap-3 mb-5"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.06))',
                border: '1px solid rgba(16,185,129,0.35)',
              }}
            >
              <span className="text-2xl flex-shrink-0">🎁</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: '#10B981' }}>
                  Cupom {activeCoupon.code} ativo
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                  {activeCoupon.discount_type === 'percent'
                    ? activeCoupon.discount_value + '% off'
                    : 'R$ ' + activeCoupon.discount_value.toFixed(2).replace('.', ',') + ' de desconto'}
                  {' · vence em '}
                  {activeCoupon.diasRestantes}
                  {activeCoupon.diasRestantes === 1 ? ' dia' : ' dias'}
                </p>
              </div>
            </div>
          )}

          {/* NÃO COBRAR SINAL (v118) · só em negócio que cobra sinal. É a
              cliente antiga que nunca falta: sem esta opção a dona clicaria
              em "Recebi o sinal" sem receber, e a comanda cobraria a menos. */}
          {sinalAtivoNoNegocio && customer && (
            <div
              className="rounded-2xl p-4 flex items-start justify-between gap-3 mb-5"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                  Não cobrar sinal
                </p>
                <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                  Cliente de confiança: agenda sem precisar pagar antecipado.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const novo = !isento
                  setIsento(novo)
                  const res = await fetch('/api/admin/customers/' + customerId, {
                    method: 'PATCH',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ sinal_isento: novo }),
                  })
                  // λ.prova-na-fonte: banco recusou, a tela volta atrás.
                  if (!res.ok) setIsento(!novo)
                }}
                role="switch"
                aria-checked={isento}
                aria-label="Não cobrar sinal desta cliente"
                className="relative flex-shrink-0 rounded-full transition-colors"
                style={{ width: 46, height: 26, background: isento ? '#10B981' : 'var(--admin-border)' }}
              >
                <span
                  className="absolute top-[3px] rounded-full bg-white transition-all"
                  style={{ width: 20, height: 20, left: isento ? 23 : 3 }}
                />
              </button>
            </div>
          )}

          {/* Tabs */}
          <div
            className="flex sm:flex-wrap gap-1 rounded-xl p-1 mb-5 overflow-x-auto scrollbar-hide"
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
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider"
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
              {tab === 'perfil' && (
                <PerfilTab
                  customer={customer}
                  onSaved={async () => {
                    // Reload do cliente
                    const sb = createClient()
                    const { data: refreshed } = await sb.from('customers').select('*').eq('id', customerId).maybeSingle()
                    if (refreshed) setCustomer(refreshed as Customer)
                    router.refresh()
                  }}
                />
              )}
              {tab === 'configuracoes' && (
                <ConfigClienteTab
                  customerId={customer.id}
                  initialPreferredContact={customer.preferred_contact ?? null}
                  initialMarketingConsent={customer.marketing_consent ?? true}
                  initialBlocked={customer.blocked ?? false}
                  initialBlockedReason={customer.blocked_reason ?? null}
                  onSaved={async () => {
                    const sb = createClient()
                    const { data: refreshed } = await sb.from('customers').select('*').eq('id', customerId).maybeSingle()
                    if (refreshed) setCustomer(refreshed as Customer)
                  }}
                />
              )}
              {tab === 'atividades' && (
                <ClienteAtividadesTab
                  customerId={customer.id}
                  customerName={customer.name}
                  customerPhone={customer.phone}
                  onCloseDrawer={onClose}
                />
              )}
              {tab === 'galeria' && <GaleriaTab customerId={customer.id} />}
              {tab === 'fichas' && <FichasTab customerId={customer.id} />}
              {tab === 'pacotes' && (
                <PacotesClienteTab customerId={customer.id} customerName={customer.name} />
              )}
              {tab === 'saldo' && (
                <SaldoTab
                  customerId={customer.id}
                  customerName={customer.name}
                  businessId={customer.business_id}
                />
              )}
              {tab === 'fidelidade' && (
                <FidelidadeTab customer={customer} onRefresh={() => router.refresh()} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Atendimento Antigo (do FAB) · v121 */}
      {showHistorico && customer && (
        <AtendimentoHistoricoModal
          customerId={customer.id}
          customerName={customer.name}
          businessId={customer.business_id}
          onClose={() => setShowHistorico(false)}
          onSaved={() => {
            setShowHistorico(false)
            setTab('atividades')
            setReloadKey((k) => k + 1)
            router.refresh()
          }}
        />
      )}

      {/* Modal Adicionar Crédito (do FAB) */}
      {showAddCredito && customer && (
        <AddCreditoModal
          customerId={customer.id}
          customerName={customer.name}
          businessId={customer.business_id}
          onClose={() => setShowAddCredito(false)}
          onSaved={() => {
            setShowAddCredito(false)
            setTab('saldo')
            router.refresh()
          }}
        />
      )}
    </div>,
    document.body
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

function PerfilTab({ customer, onSaved }: { customer: Customer; onSaved: () => void }) {
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({
    name: customer.name ?? '',
    nickname: customer.nickname ?? '',
    important_note: customer.important_note ?? '',
    referral_source: customer.referral_source ?? '',
    customer_type: customer.customer_type ?? 'pf',
    email: customer.email ?? '',
    instagram: customer.instagram ?? '',
    phone: customer.phone ?? '',
    birthday: customer.birthday ?? '',
    sex: customer.sex ?? '',
    cpf: customer.cpf ?? '',
    rg: customer.rg ?? '',
    profession: customer.profession ?? '',
    address: customer.address ?? '',
    address_number: customer.address_number ?? '',
    address_complement: customer.address_complement ?? '',
    neighborhood: customer.neighborhood ?? '',
    city: customer.city ?? '',
    state: customer.state ?? '',
    zip_code: customer.zip_code ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function save() {
    setSubmitting(true)
    setError(null)
    const payload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(form)) {
      if (v === '' && k !== 'name' && k !== 'customer_type') payload[k] = null
      else payload[k] = v
    }
    const res = await fetch(`/api/admin/customers/${customer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'falha')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setEditMode(false)
    onSaved()
  }

  if (!editMode) {
    const linhas: { label: string; value: string | null | undefined }[] = [
      { label: 'Apelido', value: customer.nickname },
      { label: 'Tipo', value: customer.customer_type === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física' },
      { label: 'Telefone', value: customer.phone },
      { label: 'Email', value: customer.email },
      { label: 'Instagram', value: customer.instagram },
      { label: 'CPF', value: customer.cpf },
      { label: 'RG', value: customer.rg },
      { label: 'Profissão', value: customer.profession },
      { label: 'Aniversário', value: formatDateBR(customer.birthday) },
      {
        label: 'Endereço',
        value: customer.address
          ? `${customer.address}${customer.address_number ? ', ' + customer.address_number : ''}${customer.neighborhood ? ' · ' + customer.neighborhood : ''}${customer.city ? ' · ' + customer.city : ''}${customer.state ? '/' + customer.state : ''}`
          : null,
      },
      { label: 'CEP', value: customer.zip_code },
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
            onClick={() => setEditMode(true)}
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: 'var(--admin-accent)' }}
          >
            Editar
          </button>
        </div>

        {linhas.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--admin-text-faded)' }}>
            Só nome cadastrado · clica em <b>Editar</b> pra adicionar contato, endereço, anotação.
          </p>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
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

  // Form editMode
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
          Editar Cliente
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditMode(false)}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={submitting || !form.name.trim()}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}
          >
            {submitting ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{
          background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 14%, transparent)',
          color: 'var(--admin-danger,#EF4444)',
        }}>
          Erro: {error}
        </p>
      )}

      {/* Bloco principal · sem cabeçalho */}
      <div className="rounded-2xl p-5 space-y-3" style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}>
        <Field label="Nome do cliente" required>
          <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className="admin-input w-full px-3 py-2 text-sm" disabled={submitting} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Apelido">
            <input type="text" value={form.nickname} onChange={(e) => set('nickname', e.target.value)} className="admin-input w-full px-3 py-2 text-sm" disabled={submitting} />
          </Field>
          <Field label="Tipo">
            <select value={form.customer_type} onChange={(e) => set('customer_type', e.target.value)} className="admin-input w-full px-3 py-2 text-sm" disabled={submitting}>
              <option value="pf">Pessoa Física</option>
              <option value="pj">Pessoa Jurídica</option>
            </select>
          </Field>
        </div>
        <Field label="Como Conheceu">
          <input type="text" value={form.referral_source} onChange={(e) => set('referral_source', e.target.value)} placeholder="Indicação · Instagram · Vizinho · Outro" className="admin-input w-full px-3 py-2 text-sm" disabled={submitting} />
        </Field>
        <Field label="Anotação Importante">
          <input type="text" value={form.important_note} onChange={(e) => set('important_note', e.target.value)} placeholder="Alergia · Preferência · Observação interna" className="admin-input w-full px-3 py-2 text-sm" disabled={submitting} />
        </Field>
      </div>

      {/* Contato */}
      <div className="rounded-2xl p-5 space-y-3" style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}>
        <h4 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>📞 Contato</h4>
        <Field label="Telefone (WhatsApp)">
          <input type="text" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(00) 00000-0000" className="admin-input w-full px-3 py-2 text-sm tabular-nums" disabled={submitting} />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="cliente@email.com" className="admin-input w-full px-3 py-2 text-sm" disabled={submitting} />
        </Field>
        <Field label="Instagram">
          <input type="text" value={form.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@usuario" className="admin-input w-full px-3 py-2 text-sm" disabled={submitting} />
        </Field>
      </div>

      {/* Informações Pessoais */}
      <div className="rounded-2xl p-5 space-y-3" style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}>
        <h4 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>👤 Informações Pessoais</h4>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data de Nascimento">
            <input type="date" value={form.birthday} onChange={(e) => set('birthday', e.target.value)} className="admin-input w-full px-3 py-2 text-sm tabular-nums" disabled={submitting} />
          </Field>
          <Field label="Sexo">
            <select value={form.sex} onChange={(e) => set('sex', e.target.value)} className="admin-input w-full px-3 py-2 text-sm" disabled={submitting}>
              <option value="">—</option>
              <option value="f">Feminino</option>
              <option value="m">Masculino</option>
              <option value="other">Outro</option>
              <option value="na">Prefiro não informar</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CPF">
            <input type="text" value={form.cpf} onChange={(e) => set('cpf', e.target.value)} placeholder="000.000.000-00" className="admin-input w-full px-3 py-2 text-sm tabular-nums" disabled={submitting} />
          </Field>
          <Field label="RG">
            <input type="text" value={form.rg} onChange={(e) => set('rg', e.target.value)} className="admin-input w-full px-3 py-2 text-sm tabular-nums" disabled={submitting} />
          </Field>
        </div>
        <Field label="Profissão">
          <input type="text" value={form.profession} onChange={(e) => set('profession', e.target.value)} className="admin-input w-full px-3 py-2 text-sm" disabled={submitting} />
        </Field>
      </div>

      {/* Endereço */}
      <div className="rounded-2xl p-5 space-y-3" style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}>
        <h4 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>📍 Endereço</h4>
        <Field label="Endereço (rua)">
          <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)} className="admin-input w-full px-3 py-2 text-sm" disabled={submitting} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Número">
            <input type="text" value={form.address_number} onChange={(e) => set('address_number', e.target.value)} className="admin-input w-full px-3 py-2 text-sm tabular-nums" disabled={submitting} />
          </Field>
          <Field label="Complemento">
            <input type="text" value={form.address_complement} onChange={(e) => set('address_complement', e.target.value)} className="admin-input w-full px-3 py-2 text-sm" disabled={submitting} />
          </Field>
        </div>
        <Field label="Bairro">
          <input type="text" value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} className="admin-input w-full px-3 py-2 text-sm" disabled={submitting} />
        </Field>
        <Field label="Cidade">
          <input type="text" value={form.city} onChange={(e) => set('city', e.target.value)} className="admin-input w-full px-3 py-2 text-sm" disabled={submitting} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Estado">
            <input type="text" value={form.state} onChange={(e) => set('state', e.target.value.toUpperCase().slice(0, 2))} placeholder="RJ" className="admin-input w-full px-3 py-2 text-sm uppercase" disabled={submitting} />
          </Field>
          <Field label="CEP">
            <input type="text" value={form.zip_code} onChange={(e) => set('zip_code', e.target.value)} placeholder="00000-000" className="admin-input w-full px-3 py-2 text-sm tabular-nums" disabled={submitting} />
          </Field>
        </div>
      </div>

      {/* Disclaimer LGPD */}
      <p className="text-[11px] px-2" style={{ color: 'var(--admin-text-faded)' }}>
        Certifique-se de obter a autorização de pais ou responsáveis para cadastrar menores de 13 anos.
        Os dados serão tratados nos termos da Política de Privacidade.
      </p>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
        {label}
        {required && <span style={{ color: 'var(--admin-danger,#EF4444)' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

type Reward = { id: string; name: string; points_required: number }
type PointTx = { id: string; points: number; reason: string; created_at: string }

const REASON_LABEL: Record<string, string> = {
  service: 'Atendimento',
  referral: 'Indicação',
  review: 'Avaliação',
  manual: 'Manual',
  punctuality: 'Pontualidade',
  redemption: 'Resgate',
}

/**
 * Fidelidade da ficha. Até 20/08/2026 só ajustava saldo — resgate de
 * recompensa e extrato de pontos existiam SÓ na ficha do celular
 * (ClienteDetailModal), e quem opera no computador ficava sem. São 8
 * recompensas cadastradas (Olímpio, Rosy, Wanessa) e 379 transações na
 * base: auditar saldo pelo desktop era impossível.
 *
 * Os dados vêm da MESMA rota que alimenta o celular e a escrita usa os
 * MESMOS endpoints (/points e /redeem) — duas telas, uma verdade só.
 */
function FidelidadeTab({ customer, onRefresh }: { customer: Customer; onRefresh: () => void }) {
  const [delta, setDelta] = useState(10)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [history, setHistory] = useState<PointTx[]>([])
  const [saldo, setSaldo] = useState<number>(customer.total_points ?? 0)
  const [redeeming, setRedeeming] = useState(false)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  // Bump depois de ajustar saldo ou resgatar — releitura vem do servidor,
  // nunca de update otimista: o extrato logo abaixo tem que bater com o banco.
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelado = false
    async function load() {
      const data = await fetch('/api/admin/customers/' + customer.id, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
      if (cancelado) return
      if (data) {
        setRewards((data.rewards ?? []) as Reward[])
        setHistory((data.pointsHistory ?? []) as PointTx[])
        setSaldo(Number(data.customer?.total_points ?? 0))
      }
      setCarregando(false)
    }
    load()
    return () => { cancelado = true }
  }, [customer.id, reloadKey])

  async function resgatar(rewardId: string, nome: string) {
    setRedeeming(true)
    setError(null)
    setSucesso(null)
    const res = await fetch('/api/admin/customers/' + customer.id + '/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reward_id: rewardId }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Não deu pra resgatar')
      setRedeeming(false)
      return
    }
    setSucesso(nome + ' resgatado!')
    setRedeeming(false)
    setReloadKey((k) => k + 1)
    onRefresh()
  }

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
    setReloadKey((k) => k + 1)
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
        {saldo}
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

      {sucesso && (
        <p className="text-xs mt-3" style={{ color: '#10B981' }}>🎁 {sucesso}</p>
      )}

      {/* RESGATE · o dono não precisa mais abater pontos na mão. Cada resgate
          entra no extrato abaixo como "Resgate" (reason='redemption'). */}
      <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--admin-border)' }}>
        <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--admin-text-mute)' }}>
          Resgatar Recompensa
        </h3>
        {carregando ? (
          <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>Carregando…</p>
        ) : rewards.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
            Nenhuma recompensa cadastrada. Crie em Configurações → Fidelidade.
          </p>
        ) : (
          <div className="space-y-1.5">
            {rewards.map((r) => {
              const pode = saldo >= r.points_required
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => resgatar(r.id, r.name)}
                  disabled={!pode || redeeming}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between disabled:opacity-40"
                  style={{
                    background: pode ? 'color-mix(in srgb, var(--admin-accent) 14%, transparent)' : 'var(--admin-input-bg)',
                    color: pode ? 'var(--admin-accent)' : 'var(--admin-text-faded)',
                    border: '1px solid ' + (pode ? 'color-mix(in srgb, var(--admin-accent) 30%, transparent)' : 'var(--admin-border)'),
                  }}
                >
                  <span className="truncate">{r.name}</span>
                  <span className="flex-shrink-0 ml-2">
                    {r.points_required} pts{!pode && ' · faltam ' + (r.points_required - saldo)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* EXTRATO · CIC rodada 4, bug #3: cliente com saldo inexplicável e dono
          sem como auditar. Cada delta aparece com o motivo que o gerou. */}
      <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--admin-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
            Histórico de Pontos
          </h3>
          <span className="text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
            {history.length === 50 ? '50 últimos' : history.length + (history.length === 1 ? ' transação' : ' transações')}
          </span>
        </div>
        {carregando ? (
          <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>Carregando…</p>
        ) : history.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
            Cliente ainda não acumulou pontos.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {history.map((tx) => {
              const positivo = tx.points > 0
              return (
                <li
                  key={tx.id}
                  className="px-3 py-2 rounded-xl flex items-center gap-3"
                  style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}
                >
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0"
                    style={{
                      background: positivo ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)',
                      color: positivo ? '#10B981' : '#EF4444',
                    }}
                  >
                    {REASON_LABEL[tx.reason] ?? tx.reason}
                  </span>
                  <span className="text-[11px] flex-1" style={{ color: 'var(--admin-text-faded)' }}>
                    {new Date(tx.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span
                    className="text-sm font-bold tabular-nums flex-shrink-0"
                    style={{ color: positivo ? '#10B981' : '#EF4444' }}
                  >
                    {positivo ? '+' : ''}{tx.points} pts
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
