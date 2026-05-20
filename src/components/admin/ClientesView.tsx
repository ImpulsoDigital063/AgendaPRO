'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { initialsFor, avatarGradient, maskPhone, daysBetween } from '@/lib/client-display'
import Link from 'next/link'
import {
  IconWhatsapp,
  IconCalendar,
  IconChevronRight,
  IconClose,
  IconSparkles,
} from '@/components/ui/Icon'

// Lazy: o modal de detalhe so eh baixado quando user clica num cliente.
// Em uso massa (centenas de clientes na lista), nao queremos pesar o
// initial bundle com codigo que so eh usado em interacao especifica.
const ClienteDetailModal = dynamic(() => import('./ClienteDetailModal'), {
  ssr: false,
})

// Drawer estilo Salão99 · desktop · 8 tabs (Perfil/Configurações/Atividades/Galeria/Fichas/Pacotes/Saldo/Fidelidade)
const ClienteDrawer = dynamic(() => import('./clientes/ClienteDrawer'), {
  ssr: false,
})

const NovoClienteModal = dynamic(() => import('./clientes/NovoClienteModal'), {
  ssr: false,
})

type Cliente = {
  id: string
  name: string
  phone: string
  email: string | null
  created_at: string
  count: number
  /** Data do primeiro agendamento (YYYY-MM-DD). Vazio se cliente
   *  nunca agendou (cadastro órfão). Usado pra "Novos/mês" — é a
   *  métrica que admin entende: cliente que VEIO esse mês pela
   *  primeira vez (não cliente cadastrado esse mês). */
  firstDate: string
  lastDate: string
  totalSpent: number
  customer_id?: string | null
  total_points?: number
}

type Props = {
  clients: Cliente[]
  bookingSlug: string
  businessId: string
  /** customer_ids com cupom ativo (não usado, não expirado) — usados
   *  pra calcular "sumidos sem cupom ativo" e evitar spam ao admin
   *  ("já tem cupom rodando, não precisa gerar de novo") */
  activeCustomerIds?: string[]
}

type FilterKey = 'todos' | 'recentes' | 'top' | 'sumidos' | 'novos'

const VIP_THRESHOLD = 200
// 40 dias é o ponto onde a maioria dos nichos (barbearia/nail/salão/
// estética) tem ciclo natural quebrado. Antes era 60 — tarde demais
// pra barbearia (cliente típico volta 15-30 dias). Em iteração
// futura: tornar configurável por business ou ajustar por nicho.
const SUMIDO_DAYS = 40

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function tierFor(c: Cliente): { key: 'vip' | 'novo' | 'sumido' | null; label: string; bg: string; color: string } | null {
  const sinceLast = c.lastDate ? daysBetween(c.lastDate) : null
  // Tag "Novo" alinhada com KPI Novos/mes: cliente cuja PRIMEIRA visita
  // (ou cadastro, fallback) foi NESTE MES corrente. Antes usava
  // <=30 dias, divergia do KPI e CIC reportou (rodada 4) que filtro
  // "Novos" mostrava 20 cards mas KPI dizia 1.
  const ref = c.firstDate || c.created_at || ''
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const isNovoEsteMes = ref.startsWith(thisMonth)

  if (c.totalSpent >= VIP_THRESHOLD) {
    return {
      key: 'vip',
      label: 'VIP',
      bg: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.08))',
      color: '#D97706',
    }
  }
  if (sinceLast !== null && sinceLast >= SUMIDO_DAYS) {
    return {
      key: 'sumido',
      label: 'Sumido',
      bg: 'rgba(148,163,184,0.15)',
      color: 'var(--admin-text-faded)',
    }
  }
  if (isNovoEsteMes) {
    return {
      key: 'novo',
      label: 'Novo',
      bg: 'rgba(16,185,129,0.15)',
      color: '#10B981',
    }
  }
  return null
}

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'todos',    label: 'Todos'    },
  { key: 'recentes', label: 'Recentes' },
  { key: 'top',      label: 'Top'      },
  { key: 'novos',    label: 'Novos'    },
  { key: 'sumidos',  label: 'Sumidos'  },
]

export default function ClientesView({ clients, bookingSlug, businessId: _businessId, activeCustomerIds = [] }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  // Ref + polling sincroniza state com value DOM mesmo quando algo
  // altera input.value sem disparar evento (React 19 intercepta o
  // setter de value em controlled inputs e ferramentas de automation
  // que fazem `el.value='X'` direto sao ignoradas). Polling de 200ms
  // e barato e garante que filtro responde 100% das interacoes.
  const searchInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const interval = setInterval(() => {
      const el = searchInputRef.current
      if (el && el.value !== search) {
        setSearch(el.value)
      }
    }, 200)
    return () => clearInterval(interval)
  }, [search])
  const [filter, setFilter] = useState<FilterKey>('todos')
  const [showAddModal, setShowAddModal] = useState(false)
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null)
  // Paginação: barbearia com >50 clientes ativos renderiza muito card
  // de uma vez (DOM pesado em mobile). Mostra os 20 primeiros + "Ver
  // mais N". Reset quando muda search ou filter (lista filtrada já
  // ficou pequena, queremos mostrar tudo do filtro corrente).
  const [showAllClients, setShowAllClients] = useState(false)
  // Suprime warning ate que businessId seja efetivamente usado em
  // outras features (cupons, detalhes etc). Por enquanto a API
  // /api/admin/customers infere o business pelo owner_id da sessao.
  void _businessId

  // KPIs
  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    // Conta cliente que TEVE primeira visita esse mês. Fallback pra
    // created_at quando órfão (sem agendamento) — pelo menos cadastro
    // recente conta.
    const novosNoMes = clients.filter((c) => {
      const ref = c.firstDate || c.created_at
      return ref?.startsWith(thisMonth)
    }).length
    const sumidosList = clients.filter((c) => c.lastDate && daysBetween(c.lastDate) >= SUMIDO_DAYS)
    // Sumidos SEM cupom ativo — só esses precisam de reativação nova.
    // Sumidos com cupom já rodando aparecem no KPI mas o card pula
    // (admin não dispara cupom em cima de cupom).
    const activeSet = new Set(activeCustomerIds)
    const sumidosSemCupom = sumidosList.filter(
      (c) => !c.customer_id || !activeSet.has(c.customer_id)
    ).length
    return {
      total: clients.length,
      novosNoMes,
      sumidos: sumidosList.length,
      sumidosSemCupom,
    }
  }, [clients, activeCustomerIds])

  const filtered = useMemo(() => {
    let list = clients
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((c) => {
        const phoneDigits = (c.phone || '').replace(/\D/g, '')
        return (
          c.name.toLowerCase().includes(q) ||
          phoneDigits.includes(q.replace(/\D/g, '')) ||
          (c.email?.toLowerCase().includes(q) ?? false)
        )
      })
    }
    switch (filter) {
      case 'recentes':
        list = [...list].sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''))
        break
      case 'top':
        list = [...list].sort((a, b) => b.totalSpent - a.totalSpent)
        break
      case 'novos': {
        // Mesma definicao do KPI Novos/mes — alinhamento garante que
        // tag visual + filtro + KPI mostram o mesmo conjunto.
        const now = new Date()
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        list = [...list].filter((c) => (c.firstDate || c.created_at || '').startsWith(thisMonth))
        list.sort((a, b) => {
          const aRef = a.firstDate || a.created_at || ''
          const bRef = b.firstDate || b.created_at || ''
          return bRef.localeCompare(aRef)
        })
        break
      }
      case 'sumidos':
        list = [...list].filter((c) => c.lastDate && daysBetween(c.lastDate) >= SUMIDO_DAYS)
        list.sort((a, b) => (a.lastDate || '').localeCompare(b.lastDate || ''))
        break
      default:
        list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    }
    return list
  }, [clients, search, filter])

  const bookingUrl = (typeof window !== 'undefined' ? window.location.origin : '') + '/' + bookingSlug

  return (
    <div className="space-y-4">
      {/* KPIs · 3 cols mobile · 5 cols desktop (mesma altura · stretch) */}
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-3">
        <KpiCell label="Total"    value={stats.total}      tone="neutral" />
        <KpiCell label="Novos/mês" value={stats.novosNoMes} tone="success" />
        <KpiCell label="Sumidos"  value={stats.sumidos}    tone="warn"    />
      </div>

      {/* Botão + Novo cliente · em desktop alinha à esquerda com largura limitada */}
      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        className="w-full lg:w-auto lg:px-6 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
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
        Adicionar cliente manualmente
      </button>

      {/* Reativar sumidos — só aparece pra sumidos SEM cupom ativo.
          Sumidos com cupom rodando ainda aparecem no KPI "Sumidos" e
          no filtro, mas não disparam novo cupom (evita spam). */}
      {stats.sumidosSemCupom > 0 && (
        <Link
          href="/admin/clientes/reativar"
          className="flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.99]"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(245,158,11,0.04))',
            border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(245,158,11,0.18)', color: '#D97706' }}
          >
            <IconWhatsapp size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
              Reativar {stats.sumidosSemCupom} sumido{stats.sumidosSemCupom === 1 ? '' : 's'}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
              Cupom de desconto via WhatsApp · 1 toque por cliente
            </p>
          </div>
          <IconChevronRight size={16} />
        </Link>
      )}

      {/* Busca */}
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--admin-text-faded)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowAllClients(false) }}
          onInput={(e) => {
            // onInput nativo + onChange React garante que TODA mudanca
            // dispare setSearch — incluindo digitacao real, paste,
            // autofill, e ferramentas automation que setam .value
            // direto e dispatcham 'input' event.
            const v = (e.target as HTMLInputElement).value
            if (v !== search) { setSearch(v); setShowAllClients(false) }
          }}
          placeholder="Buscar por nome, telefone ou email..."
          className="admin-input w-full pl-9 pr-4 py-3 text-sm"
        />
      </div>

      {/* Chips de filtro */}
      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
        {FILTER_TABS.map((t) => {
          const active = filter === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => { setFilter(t.key); setShowAllClients(false) }}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={
                active
                  ? {
                      background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                      color: '#fff',
                      boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                    }
                  : {
                      background: 'var(--admin-surface)',
                      color: 'var(--admin-text-mute)',
                      border: '1px solid var(--admin-border)',
                    }
              }
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {clients.length === 0 ? (
        <EmptyClients onAdd={() => setShowAddModal(true)} />
      ) : filtered.length === 0 ? (
        <EmptyFiltered search={search} onClear={() => { setSearch(''); setFilter('todos') }} />
      ) : (
        <>
          {/* MOBILE/TABLET · grid de cards (mantém atual) */}
          <div className="lg:hidden space-y-2.5">
            {(showAllClients ? filtered : filtered.slice(0, 20)).map((c, i) => {
              const hasActiveCoupon = !!(c.customer_id && activeCustomerIds.includes(c.customer_id))
              return (
                <div
                  key={c.id}
                  className="admin-enter"
                  style={{ ['--enter-delay' as string]: `${Math.min(i, 8) * 50}ms` }}
                >
                  <ClienteCard
                    client={c}
                    bookingUrl={bookingUrl}
                    hasActiveCoupon={hasActiveCoupon}
                    onOpenDetail={() => {
                      if (c.customer_id) setDetailCustomerId(c.customer_id)
                    }}
                  />
                </div>
              )
            })}
            {!showAllClients && filtered.length > 20 && (
              <button
                type="button"
                onClick={() => setShowAllClients(true)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold mt-1"
                style={{
                  background: 'var(--admin-surface)',
                  color: 'var(--admin-accent)',
                  border: '1px solid var(--admin-divider)',
                }}
              >
                Ver mais {filtered.length - 20} {filtered.length - 20 === 1 ? 'cliente' : 'clientes'}
                <IconChevronRight size={14} />
              </button>
            )}
          </div>

          {/* DESKTOP (lg+) · tabela minimal estilo Salão99 */}
          <div
            className="hidden lg:block rounded-2xl overflow-hidden"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      background: 'var(--admin-surface-hi)',
                      borderBottom: '1px solid var(--admin-border)',
                    }}
                  >
                    <th className="w-10 px-3 py-3" />
                    <th className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                      Nome
                    </th>
                    <th className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                      Telefone
                    </th>
                    <th className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                      Último atendimento
                    </th>
                    <th className="text-right px-3 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                      Total gasto
                    </th>
                    <th className="text-right px-3 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                      Pontos
                    </th>
                    <th className="w-12 px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {(showAllClients ? filtered : filtered.slice(0, 50)).map((c, idx, arr) => {
                    const hasActiveCoupon = !!(c.customer_id && activeCustomerIds.includes(c.customer_id))
                    const lastDate = c.lastDate
                      ? new Date(c.lastDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
                      : '—'
                    return (
                      <tr
                        key={c.id}
                        onDoubleClick={() => {
                          if (c.customer_id) setDetailCustomerId(c.customer_id)
                        }}
                        className="cursor-pointer hover:bg-[var(--admin-surface-hi)]"
                        style={{
                          borderBottom: idx < arr.length - 1 ? '1px solid var(--admin-divider)' : 'none',
                        }}
                      >
                        <td className="px-3 py-2">
                          <span
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: 'var(--admin-surface-hi)', color: 'var(--admin-text-mute)' }}
                          >
                            {(c.name ?? '?').slice(0, 1).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>
                            {c.name ?? '—'}
                          </p>
                          {hasActiveCoupon && (
                            <p className="text-[10px]" style={{ color: 'var(--admin-warning,#F59E0B)' }}>
                              Cupom ativo
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs tabular-nums" style={{ color: 'var(--admin-text-2)' }}>
                          {c.phone ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                          {c.count > 0 ? (
                            <>
                              <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>{lastDate}</span>
                              <span className="block text-[10px]" style={{ color: 'var(--admin-text-faded)' }}>
                                {c.count} {c.count === 1 ? 'atendimento' : 'atendimentos'}
                              </span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--admin-text-faded)' }}>Nunca</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ color: c.totalSpent > 0 ? 'var(--admin-text)' : 'var(--admin-text-faded)' }}>
                          {c.totalSpent > 0
                            ? c.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : 'R$ 0,00'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ color: (c.total_points ?? 0) > 0 ? 'var(--admin-accent)' : 'var(--admin-text-faded)' }}>
                          {c.total_points ?? 0}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (c.customer_id) setDetailCustomerId(c.customer_id)
                            }}
                            aria-label="Ver detalhes"
                            className="p-1.5 rounded-lg"
                            style={{ color: 'var(--admin-text-mute)' }}
                          >
                            <IconChevronRight size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {!showAllClients && filtered.length > 50 && (
              <div className="p-3 border-t" style={{ borderColor: 'var(--admin-divider)' }}>
                <button
                  type="button"
                  onClick={() => setShowAllClients(true)}
                  className="w-full py-2 rounded-lg text-sm font-semibold"
                  style={{ background: 'var(--admin-surface-hi)', color: 'var(--admin-accent)' }}
                >
                  Ver mais {filtered.length - 50} {filtered.length - 50 === 1 ? 'cliente' : 'clientes'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {showAddModal && (
        <NovoClienteModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(createdId) => {
            setShowAddModal(false)
            router.refresh()
            // Se desktop, abre drawer no cliente recém-criado pra ele ver
            if (createdId && window.innerWidth >= 1024) {
              setTimeout(() => setDetailCustomerId(createdId), 300)
            }
          }}
        />
      )}

      {/* Mobile/tablet · modal antigo (mais compacto) */}
      {detailCustomerId && (
        <div className="lg:hidden">
          <ClienteDetailModal
            customerId={detailCustomerId}
            onClose={() => setDetailCustomerId(null)}
          />
        </div>
      )}

      {/* Desktop (lg+) · drawer estilo Salão99 */}
      {detailCustomerId && (
        <div className="hidden lg:block">
          <ClienteDrawer
            customerId={detailCustomerId}
            onClose={() => setDetailCustomerId(null)}
          />
        </div>
      )}
    </div>
  )
}

function AddClientModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function maskPhoneInput(v: string) {
    const digits = v.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  async function submit() {
    setError(null)
    if (!name.trim()) {
      setError('Nome obrigatório')
      return
    }
    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 10) {
      setError('Telefone inválido (mínimo 10 dígitos com DDD)')
      return
    }
    setSubmitting(true)
    const res = await fetch('/api/admin/customers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), phone, email: email.trim() }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erro ao criar cliente')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    onSuccess()
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
        className="admin-card w-full sm:max-w-md p-5 rounded-t-3xl sm:rounded-3xl overflow-y-auto"
        style={{
          // svh exclui barras dinâmicas do iOS (status bar + home indicator)
          maxHeight: 'calc(100svh - 16px)',
          // Em mobile o card ancora no fundo (items-end) — reserva
          // espaço pra home indicator + altura da BottomNav fixa
          // (~80px em PWA standalone) pra botões não ficarem por
          // baixo dela.
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 5rem, 5rem)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
            Novo cliente
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
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
              placeholder="João da Silva"
              autoFocus
              className="admin-input w-full px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--admin-text-faded)' }}>
              Telefone *
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
              placeholder="(11) 98765-4321"
              className="admin-input w-full px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--admin-text-faded)' }}>
              Email <span style={{ color: 'var(--admin-text-mute)' }}>(opcional)</span>
            </label>
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joao@email.com"
              className="admin-input w-full px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs mt-3" style={{ color: 'var(--admin-danger, #EF4444)' }}>
            {error}
          </p>
        )}

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            style={{
              background: 'var(--admin-accent-bg)',
              color: 'var(--admin-text)',
              border: '1px solid var(--admin-border)',
            }}
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
            {submitting ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>

        <p className="text-[11px] mt-3 text-center" style={{ color: 'var(--admin-text-faded)' }}>
          Cliente entra com 0 pontos. Pode acumular ao usar serviços ou via "+ pontos" no detalhe.
        </p>
      </div>
    </div>,
    document.body
  )
}

function KpiCell({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'success' | 'warn' }) {
  const colorMap = {
    neutral: 'var(--admin-text)',
    success: '#10B981',
    warn: 'var(--admin-warn)',
  }
  return (
    <div className="admin-card p-3">
      <p
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--admin-text-faded)' }}
      >
        {label}
      </p>
      <p
        className="text-xl font-extrabold mt-1 leading-none tabular-nums"
        style={{ color: colorMap[tone] }}
      >
        {value}
      </p>
    </div>
  )
}

function ClienteCard({
  client,
  bookingUrl,
  hasActiveCoupon = false,
  onOpenDetail,
}: {
  client: Cliente
  bookingUrl: string
  hasActiveCoupon?: boolean
  onOpenDetail?: () => void
}) {
  const tier = tierFor(client)
  const phoneDigits = (client.phone || '').replace(/\D/g, '')
  const waUrl = `https://wa.me/55${phoneDigits}`
  const canOpenDetail = !!onOpenDetail && !!client.customer_id

  return (
    <div className="admin-card p-3.5">
      {/* Topo: avatar + nome + tier + valor */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
          style={{
            background: avatarGradient(client.name),
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 6px 14px -6px rgba(0,0,0,0.25)',
          }}
        >
          {initialsFor(client.name)}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold leading-tight truncate" style={{ color: 'var(--admin-text)' }}>
              {client.name}
            </p>
            {tier && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: tier.bg, color: tier.color }}
              >
                {tier.label}
              </span>
            )}
            {(client.total_points ?? 0) > 0 && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                style={{
                  background: 'rgba(139,92,246,0.15)',
                  color: '#7C3AED',
                }}
                title="Pontos de fidelidade"
              >
                <IconSparkles size={10} />
                {client.total_points} pts
              </span>
            )}
            {hasActiveCoupon && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                style={{
                  background: 'rgba(245,158,11,0.15)',
                  color: '#D97706',
                  border: '1px solid rgba(245,158,11,0.3)',
                }}
                title="Cliente já recebeu cupom ativo de reativação"
              >
                <span aria-hidden>🎁</span>
                Cupom ativo
              </span>
            )}
          </div>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs mt-0.5 hover:opacity-80 transition-opacity"
            style={{ color: 'var(--admin-success)' }}
          >
            <IconWhatsapp size={12} />
            {maskPhone(client.phone)}
          </a>
          {client.email && (
            <p
              className="text-[11px] mt-0.5 truncate"
              style={{ color: 'var(--admin-text-faded)' }}
              title={client.email}
            >
              {client.email}
            </p>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          {client.totalSpent > 0 && (
            <p className="text-sm font-bold leading-none" style={{ color: 'var(--admin-text)' }}>
              {formatPrice(client.totalSpent)}
            </p>
          )}
          <p className="text-[10px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
            {client.count} ag{client.count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Linha de info + ações */}
      <div
        className="flex items-center justify-between gap-2 mt-3 pt-2.5"
        style={{ borderTop: '1px solid var(--admin-divider)' }}
      >
        <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
          Último: <span style={{ color: 'var(--admin-text-2)' }}>{formatDate(client.lastDate)}</span>
        </p>
        <div className="flex items-center gap-1.5">
          {canOpenDetail && (
            <button
              type="button"
              onClick={onOpenDetail}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                color: '#fff',
                boxShadow: '0 2px 6px rgba(59,130,246,0.25)',
              }}
              title="Ver detalhes do cliente"
            >
              <IconChevronRight size={12} /> Detalhes
            </button>
          )}
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-90"
            style={{
              background: 'var(--admin-accent-bg)',
              color: 'var(--admin-accent)',
              border: '1px solid var(--admin-accent-border)',
            }}
            title="Abrir página de agendamento"
          >
            <IconCalendar size={12} /> Agendar
          </a>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-90"
            style={{
              background: 'rgba(37,211,102,0.12)',
              color: '#16A34A',
              border: '1px solid rgba(37,211,102,0.25)',
            }}
          >
            <IconWhatsapp size={12} /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}

function EmptyClients({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="admin-card p-8 text-center">
      <p className="text-sm font-medium" style={{ color: 'var(--admin-text-2)' }}>
        Nenhum cliente cadastrado ainda
      </p>
      <p className="text-xs mt-1 mb-4" style={{ color: 'var(--admin-text-faded)' }}>
        Os clientes entram aqui automaticamente ao agendarem online, ou você pode cadastrar manualmente.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="text-xs font-semibold inline-flex items-center gap-1 px-4 py-2 rounded-lg"
        style={{
          background: 'var(--admin-accent)',
          color: '#fff',
        }}
      >
        + Adicionar primeiro cliente
      </button>
    </div>
  )
}

function EmptyFiltered({ search, onClear }: { search: string; onClear: () => void }) {
  return (
    <div className="admin-card p-6 text-center">
      <p className="text-sm font-medium" style={{ color: 'var(--admin-text-2)' }}>
        {search ? `Nada encontrado pra "${search}"` : 'Nenhum cliente nesse filtro'}
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-3 text-xs font-semibold inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
        style={{
          background: 'var(--admin-accent-bg)',
          color: 'var(--admin-accent)',
          border: '1px solid var(--admin-accent-border)',
        }}
      >
        Limpar busca <IconChevronRight size={12} />
      </button>
    </div>
  )
}
