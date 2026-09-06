'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IconSearch, IconCalendar, IconDollar } from '@/components/ui/Icon'
import { getApptChargedMap } from '@/lib/queries/appointment-charged-total'
import SumidosPanel from '@/components/admin/SumidosPanel'

type Professional = { id: string; name: string }

type AppointmentRow = {
  id: string
  appointment_date: string
  start_time: string
  client_name: string
  client_phone: string | null
  service_name: string | null
  total_price: number | null
  /** Valor da comanda quando tem produto (combo / vendido junto). */
  charged_total?: number | null
  status: string
  paid_at: string | null
  payment_method: string | null
  professional_id: string
}

type Props = {
  businessId: string
  professionals: Professional[]
  /** Link "criar campanha" · só o dono tem /admin/clientes/reativar.
   *  A recepção vê a lista e chama no WhatsApp, mas não monta campanha. */
  mostrarLinkCampanha?: boolean
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'no_show', label: 'Não compareceu' },
]

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthAgoISO() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ConsultasView({ businessId, professionals, mostrarLinkCampanha = false }: Props) {
  const supabase = createClient()
  const [aba, setAba] = useState<'atendimentos' | 'sumidos'>('atendimentos')
  const [dateFrom, setDateFrom] = useState(monthAgoISO())
  const [dateTo, setDateTo] = useState(todayISO())
  const [profId, setProfId] = useState('')
  const [status, setStatus] = useState('')
  const [clientQuery, setClientQuery] = useState('')

  const [results, setResults] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    setLoading(true)
    setSearched(true)
    let q = supabase
      .from('appointments')
      .select('id, appointment_date, start_time, client_name, client_phone, service_name, total_price, status, paid_at, payment_method, professional_id')
      .eq('business_id', businessId)
      .gte('appointment_date', dateFrom)
      .lte('appointment_date', dateTo)
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(100)

    if (profId) q = q.eq('professional_id', profId)
    if (status) q = q.eq('status', status)
    if (clientQuery.trim()) {
      const term = clientQuery.trim()
      q = q.ilike('client_name', `%${term}%`)
    }

    const { data } = await q
    const rows = (data ?? []) as AppointmentRow[]
    // Valor cobrado (comanda com produto: combo / vendido junto) em LOTE —
    // total_price sozinho é só o serviço e as consultas mostravam menos do que
    // a cliente pagou (Eduardo 22/07).
    const charged = await getApptChargedMap(supabase, rows.map((r) => r.id))
    setResults(rows.map((r) => {
      const c = charged[r.id]
      return { ...r, charged_total: c && c.produtos.length > 0 ? c.charged : null }
    }))
    setLoading(false)
  }

  const profMap = new Map(professionals.map((p) => [p.id, p.name]))
  const valorDe = (a: AppointmentRow) => a.charged_total ?? a.total_price ?? 0
  const totalValor = results.reduce((sum, a) => sum + valorDe(a), 0)
  const totalPago = results.filter((a) => a.paid_at).reduce((sum, a) => sum + valorDe(a), 0)

  return (
    <div className="relative max-w-lg md:max-w-7xl mx-auto px-4 md:px-6 pb-32 space-y-4">
      {/* Abas · a Rosy foi procurar "quem sumiu" aqui dentro antes de achar a
          tela de reativar (06/09). Em vez de enfiar pergunta de CLIENTE numa
          consulta de ATENDIMENTO — o filtro De/Ate esconderia justamente quem
          sumiu ha mais tempo — o Sumidos entra como aba propria. */}
      <div className="flex gap-2">
        {([['atendimentos', 'Atendimentos'], ['sumidos', 'Sumidos']] as const).map(([id, label]) => {
          const ativo = aba === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setAba(id)}
              aria-pressed={ativo}
              className="flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{
                background: ativo ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                color: ativo ? '#fff' : 'var(--admin-text-mute)',
                border: `1px solid ${ativo ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {aba === "sumidos" && <SumidosPanel mostrarLinkCampanha={mostrarLinkCampanha} podeEditarTexto={mostrarLinkCampanha} />}

      {aba === 'atendimentos' && (
      <>
      <div className="admin-card p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-mute)' }}>
              De
            </p>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="admin-input w-full px-2 py-2 text-sm"
            />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-mute)' }}>
              Até
            </p>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="admin-input w-full px-2 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-mute)' }}>
            Profissional
          </p>
          <select
            value={profId}
            onChange={(e) => setProfId(e.target.value)}
            className="admin-input w-full px-2 py-2 text-sm"
          >
            <option value="">Todos</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-mute)' }}>
            Status
          </p>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="admin-input w-full px-2 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-mute)' }}>
            Cliente
          </p>
          <input
            type="text"
            value={clientQuery}
            onChange={(e) => setClientQuery(e.target.value)}
            placeholder="Nome do cliente"
            className="admin-input w-full px-2 py-2 text-sm"
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2"
          style={{ background: 'var(--admin-accent)', color: '#fff' }}
        >
          <IconSearch size={14} /> {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </div>

      {/* Resumo dos resultados */}
      {searched && results.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="admin-card p-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
              Encontrados
            </p>
            <p className="text-2xl font-bold mt-0.5 tabular-nums" style={{ color: 'var(--admin-text)' }}>
              {results.length}
            </p>
          </div>
          <div className="admin-card p-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
              Total faturado
            </p>
            <p className="text-2xl font-bold mt-0.5 tabular-nums" style={{ color: 'var(--admin-success)' }}>
              {totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
              de {totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })} esperado
            </p>
          </div>
        </div>
      )}

      {/* Resultados */}
      {searched && results.length === 0 && !loading && (
        <div className="admin-card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
            Nada encontrado com esses filtros.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((a) => {
            const dateBR = new Date(a.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
            })
            const profName = profMap.get(a.professional_id) || '—'
            return (
              <div key={a.id} className="admin-card p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                    {a.client_name}
                  </p>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                  <IconCalendar size={11} /> {dateBR} · {a.start_time.slice(0, 5)} · {profName}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                    {a.service_name ?? '—'}
                  </p>
                  {valorDe(a) > 0 && (
                    <span
                      className="text-sm font-bold tabular-nums inline-flex items-center gap-1"
                      style={{ color: a.paid_at ? 'var(--admin-success)' : 'var(--admin-text)' }}
                    >
                      <IconDollar size={12} />
                      {valorDe(a).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      {a.paid_at && (
                        <span className="text-[10px] ml-1" style={{ color: 'var(--admin-text-faded)' }}>
                          via {a.payment_method ?? '—'}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      </>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { label: string; bg: string; color: string }> = {
    pending: { label: 'Pendente', bg: 'rgba(245,158,11,0.15)', color: 'var(--admin-warn)' },
    confirmed: { label: 'Confirmado', bg: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' },
    completed: { label: 'Concluído', bg: 'rgba(16,185,129,0.15)', color: 'var(--admin-success)' },
    cancelled: { label: 'Cancelado', bg: 'rgba(148,163,184,0.15)', color: 'var(--admin-text-mute)' },
    no_show: { label: 'No-show', bg: 'rgba(239,68,68,0.15)', color: 'var(--admin-danger,#EF4444)' },
  }
  const s = styles[status] ?? { label: status, bg: 'transparent', color: 'var(--admin-text-mute)' }
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}
