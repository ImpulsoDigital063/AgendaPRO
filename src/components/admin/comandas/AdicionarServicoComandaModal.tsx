'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IconClose, IconPlus, IconSearch } from '@/components/ui/Icon'

type Service = {
  id: string
  name: string
  price: number | null
  duration_minutes: number | null
}

type Professional = {
  id: string
  name: string
  is_receptionist: boolean
}

type Props = {
  invoiceId: string
  businessId: string
  customerId: string | null
  onClose: () => void
  onAdded: () => void
}

type PackageOption = {
  balance_id: string
  customer_package_id: string
  package_name: string
  sessions_remaining: number
  expires_at: string | null
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const selectStyle: React.CSSProperties = {
  background: `var(--admin-input-bg) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 0.625rem center`,
  border: '1px solid var(--admin-border)',
  color: 'var(--admin-text)',
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
}

export default function AdicionarServicoComandaModal({ invoiceId, businessId, customerId, onClose, onAdded }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [portalReady, setPortalReady] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [serviceId, setServiceId] = useState('')
  const [qty, setQty] = useState('1')
  const [priceStr, setPriceStr] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Pacotes ativos do cliente que cobrem o serviço selecionado
  const [packageOptions, setPackageOptions] = useState<PackageOption[]>([])
  const [selectedPackageBalanceId, setSelectedPackageBalanceId] = useState<string | null>(null)

  useEffect(() => { setPortalReady(true) }, [])
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('services').select('id, name, price, duration_minutes').eq('business_id', businessId).eq('active', true).order('name'),
      supabase.from('professionals').select('id, name, is_receptionist').eq('business_id', businessId).eq('active', true).eq('does_appointments', true).order('name'),
    ]).then(([sRes, pRes]) => {
      setServices((sRes.data ?? []) as Service[])
      setProfessionals((pRes.data ?? []) as Professional[])
      setLoading(false)
    })
  }, [supabase, businessId])

  const selectedService = services.find((s) => s.id === serviceId)

  // Quando seleciona serviço · busca pacotes ativos do cliente que cobrem
  useEffect(() => {
    if (!serviceId || !customerId) {
      setPackageOptions([])
      setSelectedPackageBalanceId(null)
      return
    }
    const url = `/api/admin/packages/consume?customer_id=${customerId}&service_id=${serviceId}`
    fetch(url)
      .then((r) => r.ok ? r.json() : { options: [] })
      .then((d) => {
        const opts = (d.options ?? []) as PackageOption[]
        setPackageOptions(opts)
        // Se tem só 1 opção · pré-seleciona automaticamente
        if (opts.length === 1) {
          setSelectedPackageBalanceId(opts[0].balance_id)
          setPriceStr('0')
        } else {
          setSelectedPackageBalanceId(null)
        }
      })
      .catch(() => setPackageOptions([]))
  }, [serviceId, customerId])

  function togglePackageConsumption(balanceId: string) {
    if (selectedPackageBalanceId === balanceId) {
      setSelectedPackageBalanceId(null)
      // restaura preço padrão
      setPriceStr(selectedService?.price != null ? String(selectedService.price) : '')
    } else {
      setSelectedPackageBalanceId(balanceId)
      setPriceStr('0')
    }
  }

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return services
    return services.filter((s) => s.name.toLowerCase().includes(q))
  }, [services, search])

  function pickService(s: Service) {
    setServiceId(s.id)
    setPriceStr(s.price != null ? String(s.price) : '')
  }

  function validate(): string | null {
    if (!serviceId) return 'Selecione um serviço'
    const qNum = Number(qty)
    const pNum = Number(priceStr)
    if (!(qNum > 0)) return 'Quantidade deve ser maior que 0'
    if (!(pNum >= 0)) return 'Preço inválido'
    return null
  }

  async function submit() {
    const v = validate()
    if (v) { setError(v); return }
    setError(null)
    setSubmitting(true)
    const r = await fetch(`/api/admin/invoices/${invoiceId}/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        quantity: Number(qty),
        unit_price: Number(priceStr),
        professional_id: professionalId || null,
      }),
    })
    if (!r.ok) {
      setSubmitting(false)
      const d = await r.json().catch(() => ({}))
      setError(d.error ?? 'Erro ao adicionar serviço')
      return
    }
    // Ids do atendimento/item que a rota acabou de criar · liga a sessão a eles.
    const added = await r.json().catch(() => ({} as { appointment_id?: string; invoice_item_id?: string }))
    // Se selecionou pacote, registra consumo (1 sessão por unidade adicionada)
    if (selectedPackageBalanceId) {
      const qtyN = Math.max(1, Number(qty))
      for (let i = 0; i < qtyN; i++) {
        const cr = await fetch('/api/admin/packages/consume', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            balance_id: selectedPackageBalanceId,
            professional_id: professionalId || null,
            appointment_id: added.appointment_id ?? null,
            invoice_item_id: added.invoice_item_id ?? null,
          }),
        })
        if (!cr.ok) {
          const cd = await cr.json().catch(() => ({}))
          setSubmitting(false)
          setError(`Item adicionado mas falha ao consumir sessão: ${cd.error ?? 'erro'}`)
          return
        }
      }
    }
    setSubmitting(false)
    onAdded()
    router.refresh()
  }

  if (!portalReady) return null

  const total = Number(qty) * Number(priceStr) || 0

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          maxHeight: '92vh',
        }}
      >
        <header className="flex items-start justify-between p-5 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
              Adicionar serviço extra
            </p>
            <h3 className="text-lg font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
              {selectedService?.name ?? 'Escolha um serviço'}
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
              Cliente pediu serviço extra durante o atendimento · entra na mesma conta
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--admin-input-bg)]"
            style={{ color: 'var(--admin-text-mute)' }}
            aria-label="Fechar"
          >
            <IconClose size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* Search serviço */}
          {!serviceId && (
            <>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--admin-text-faded)' }}>
                  <IconSearch size={14} />
                </span>
                <input
                  autoFocus
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar serviço por nome..."
                  className="admin-input w-full pl-9 pr-3 py-2 rounded-xl text-sm"
                />
              </div>
              {loading ? (
                <p className="text-center text-sm py-6" style={{ color: 'var(--admin-text-mute)' }}>Carregando serviços...</p>
              ) : filteredServices.length === 0 ? (
                <p className="text-center text-sm py-6" style={{ color: 'var(--admin-text-mute)' }}>
                  {search ? 'Nenhum serviço bate com a busca' : 'Sem serviços cadastrados'}
                </p>
              ) : (
                <ul className="space-y-1 max-h-72 overflow-y-auto">
                  {filteredServices.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => pickService(s)}
                        className="w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between gap-3 hover:bg-[color-mix(in_srgb,var(--admin-accent)_10%,transparent)]"
                        style={{ background: 'var(--admin-surface-hi)' }}
                      >
                        <span className="min-w-0">
                          <span className="text-sm font-semibold block truncate" style={{ color: 'var(--admin-text)' }}>{s.name}</span>
                          {s.duration_minutes != null && (
                            <span className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>{s.duration_minutes} min</span>
                          )}
                        </span>
                        <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text)' }}>
                          {s.price != null ? brl(s.price) : '—'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* Form com serviço escolhido */}
          {serviceId && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => { setServiceId(''); setPriceStr('') }}
                className="text-xs underline"
                style={{ color: 'var(--admin-accent)' }}
              >
                ← Trocar serviço
              </button>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>Qtd</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="admin-input w-full px-3 py-2 rounded-xl text-sm mt-0.5 tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>Preço un.</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={priceStr}
                    onChange={(e) => setPriceStr(e.target.value)}
                    className="admin-input w-full px-3 py-2 rounded-xl text-sm mt-0.5 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                  Profissional (comissão)
                </label>
                <select
                  value={professionalId}
                  onChange={(e) => setProfessionalId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm mt-0.5 pr-9"
                  style={selectStyle}
                >
                  <option value="">Sem profissional</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.is_receptionist ? ' (recepção)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pacote ativo · oferece consumir sessão */}
              {packageOptions.length > 0 && (
                <div
                  className="rounded-xl p-3 space-y-2"
                  style={{
                    background: 'color-mix(in srgb, var(--admin-accent) 8%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--admin-accent) 30%, transparent)',
                  }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-accent)' }}>
                    {packageOptions.length === 1 ? '★ Cliente tem pacote ativo' : `★ Cliente tem ${packageOptions.length} pacotes ativos`}
                  </p>
                  <div className="space-y-1.5">
                    {packageOptions.map((opt) => {
                      const isSelected = selectedPackageBalanceId === opt.balance_id
                      return (
                        <button
                          key={opt.balance_id}
                          type="button"
                          onClick={() => togglePackageConsumption(opt.balance_id)}
                          className="w-full text-left rounded-lg px-3 py-2 flex items-center justify-between gap-2 transition-colors"
                          style={{
                            background: isSelected ? 'var(--admin-accent)' : 'var(--admin-surface)',
                            color: isSelected ? '#fff' : 'var(--admin-text)',
                            border: `1px solid ${isSelected ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                          }}
                        >
                          <span className="min-w-0">
                            <span className="text-sm font-semibold block truncate">{opt.package_name}</span>
                            <span className="text-[11px] opacity-80">
                              Restam {opt.sessions_remaining} {opt.sessions_remaining === 1 ? 'sessão' : 'sessões'}
                              {opt.expires_at && ` · expira ${new Date(opt.expires_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
                            </span>
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                            {isSelected ? '✓ Consumindo' : 'Usar pacote'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {selectedPackageBalanceId && (
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
                      O serviço entra com R$ 0,00 (incluso no pacote) · 1 sessão será consumida ao salvar.
                    </p>
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer · só aparece com serviço escolhido */}
        {serviceId && (
          <footer className="flex-shrink-0 border-t px-5 py-4 flex items-center justify-between gap-3" style={{ borderColor: 'var(--admin-divider)', background: 'var(--admin-surface)' }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>Total</p>
              <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>{brl(total)}</p>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              style={{
                background: 'var(--admin-accent)',
                color: '#fff',
                boxShadow: '0 6px 14px -4px color-mix(in srgb, var(--admin-accent) 50%, transparent)',
              }}
            >
              <IconPlus size={14} /> {submitting ? 'Adicionando...' : 'Adicionar à comanda'}
            </button>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
