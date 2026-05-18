'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activity-log'
import {
  IconArrowLeft,
  IconCheck,
  IconSearch,
  IconPlus,
  IconCalendar,
  IconClock,
} from '@/components/ui/Icon'

type Customer = {
  id: string
  name: string
  phone: string
  total_points?: number | null
}

type Professional = { id: string; name: string }
type Service = { id: string; name: string; price: number | null; duration_minutes: number | null }

type Props = {
  businessId: string
  businessSlug: string
  professionals: Professional[]
  services: Service[]
}

type Step = 'cliente' | 'profissional' | 'servico' | 'horario' | 'confirma'

export default function MarcarAgendamentoForm({
  businessId,
  businessSlug,
  professionals,
  services,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('cliente')
  const [cliente, setCliente] = useState<Customer | null>(null)
  const [prof, setProf] = useState<Professional | null>(null)
  const [service, setService] = useState<Service | null>(null)
  const [date, setDate] = useState<string>(() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  })
  const [time, setTime] = useState<string>('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step Cliente — busca + criar
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [searching, setSearching] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newCliente, setNewCliente] = useState({ name: '', phone: '' })

  useEffect(() => {
    if (step !== 'cliente') return
    const term = search.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    const id = setTimeout(async () => {
      const digits = term.replace(/\D/g, '')
      let query = supabase
        .from('customers')
        .select('id, name, phone, total_points')
        .eq('business_id', businessId)
        .limit(20)
      if (digits.length >= 3) {
        // busca por telefone
        query = query.ilike('phone', `%${digits}%`)
      } else {
        // busca por nome
        query = query.ilike('name', `%${term}%`)
      }
      const { data } = await query.order('name')
      if (!cancelled) {
        setResults((data ?? []) as Customer[])
        setSearching(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, step, businessId])

  async function handleCreateCliente() {
    const n = newCliente.name.trim()
    const p = newCliente.phone.trim()
    if (!n || !p) {
      setError('Nome e telefone obrigatórios')
      return
    }
    setError(null)
    setSaving(true)
    const { data, error: e } = await supabase
      .from('customers')
      .insert({ business_id: businessId, name: n, phone: p })
      .select('id, name, phone, total_points')
      .single()
    setSaving(false)
    if (e) {
      setError(`Erro: ${e.message}`)
      return
    }
    setCliente(data as Customer)
    setShowCreate(false)
    setStep('profissional')
  }

  function selectCliente(c: Customer) {
    setCliente(c)
    setStep('profissional')
  }

  // Slots de horário · 08:00 às 20:00 a cada 30min (simples · não consulta working_hours)
  const slots = useMemo(() => {
    const out: string[] = []
    for (let h = 8; h <= 20; h++) {
      out.push(`${String(h).padStart(2, '0')}:00`)
      if (h < 20) out.push(`${String(h).padStart(2, '0')}:30`)
    }
    return out
  }, [])

  // Horários já ocupados pra esse profissional/dia
  const [busy, setBusy] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (step !== 'horario' || !prof || !date) return
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('appointments')
        .select('start_time, end_time, status')
        .eq('business_id', businessId)
        .eq('professional_id', prof!.id)
        .eq('appointment_date', date)
        .neq('status', 'cancelled')
      if (cancelled) return
      const occ = new Set<string>()
      for (const a of data ?? []) {
        // marca de start até end (em slots de 30min)
        const start = (a.start_time as string).slice(0, 5)
        const end = (a.end_time as string).slice(0, 5)
        for (const s of slots) {
          if (s >= start && s < end) occ.add(s)
        }
      }
      setBusy(occ)
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, prof, date, businessId])

  async function handleConfirm() {
    if (!cliente || !prof || !service || !date || !time) {
      setError('Preencha tudo antes de confirmar')
      return
    }
    setError(null)
    setSaving(true)
    const duration = service.duration_minutes ?? 60
    const [hh, mm] = time.split(':').map(Number)
    const startDate = new Date(`${date}T${time}:00`)
    const endDate = new Date(startDate.getTime() + duration * 60_000)
    const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`

    const { data: inserted, error: e } = await supabase.from('appointments').insert({
      business_id: businessId,
      professional_id: prof.id,
      customer_id: cliente.id,
      client_name: cliente.name,
      client_phone: cliente.phone,
      appointment_date: date,
      start_time: `${time}:00`,
      end_time: `${endTime}:00`,
      service_id: service.id,
      service_name: service.name,
      total_price: service.price,
      status: 'confirmed',
      notes: 'Marcado pela recepção',
    }).select('id').single()

    setSaving(false)
    if (e) {
      setError(`Erro ao marcar: ${e.message}`)
      return
    }

    // Log de atividade
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: prof2 } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      logActivity({
        business_id: businessId,
        professional_id: prof2?.id,
        action: 'create_appointment',
        target_type: 'appointment',
        target_id: inserted?.id,
        description: `${cliente.name} · ${service.name} · ${date} ${time} · com ${prof.name}`,
      })
    }

    router.push('/recepcao')
    router.refresh()
  }

  return (
    <main className="relative overflow-x-hidden" style={{ minHeight: '100svh' }}>
      <header className="relative max-w-lg mx-auto px-4 pt-7 pb-4">
        <div className="flex items-center gap-2">
          {step !== 'cliente' && (
            <button
              onClick={() => {
                const order: Step[] = ['cliente', 'profissional', 'servico', 'horario', 'confirma']
                const i = order.indexOf(step)
                setStep(order[Math.max(0, i - 1)])
              }}
              aria-label="Voltar"
              className="p-1.5 -ml-1 rounded-full"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              <IconArrowLeft size={20} />
            </button>
          )}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
              Recepção · Marcar
            </p>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>
              {step === 'cliente' && 'Quem é o cliente?'}
              {step === 'profissional' && 'Com qual profissional?'}
              {step === 'servico' && 'Qual serviço?'}
              {step === 'horario' && 'Quando?'}
              {step === 'confirma' && 'Confirmar agendamento'}
            </h1>
          </div>
        </div>

        {/* breadcrumb */}
        <div className="flex gap-1 mt-3">
          {(['cliente', 'profissional', 'servico', 'horario', 'confirma'] as Step[]).map((s) => (
            <div
              key={s}
              className="flex-1 h-1 rounded-full"
              style={{
                background:
                  s === step
                    ? 'var(--admin-accent)'
                    : ['cliente', 'profissional', 'servico', 'horario', 'confirma'].indexOf(s) <
                      ['cliente', 'profissional', 'servico', 'horario', 'confirma'].indexOf(step)
                      ? 'color-mix(in srgb, var(--admin-accent) 60%, transparent)'
                      : 'var(--admin-border)',
              }}
            />
          ))}
        </div>
      </header>

      <div className="relative max-w-lg mx-auto px-4 pb-32 space-y-3">
        {error && (
          <div
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              background: 'color-mix(in srgb, var(--admin-danger,#EF4444) 12%, transparent)',
              color: 'var(--admin-danger,#EF4444)',
            }}
          >
            {error}
          </div>
        )}

        {/* STEP CLIENTE */}
        {step === 'cliente' && (
          <>
            {showCreate ? (
              <div className="admin-card p-4 space-y-3">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                  Novo cliente
                </p>
                <input
                  type="text"
                  value={newCliente.name}
                  onChange={(e) => setNewCliente({ ...newCliente, name: e.target.value })}
                  placeholder="Nome"
                  autoFocus
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
                <input
                  type="text"
                  value={newCliente.phone}
                  onChange={(e) => setNewCliente({ ...newCliente, phone: e.target.value })}
                  placeholder="(22) 99999-9999"
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-2 rounded-xl font-semibold text-sm"
                    style={{ background: 'transparent', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateCliente}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl font-semibold text-sm disabled:opacity-40"
                    style={{ background: 'var(--admin-accent)', color: '#fff' }}
                  >
                    {saving ? 'Salvando…' : 'Criar e selecionar'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="flex items-center relative"
                  style={{
                    background: 'var(--admin-surface)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: 12,
                  }}
                >
                  <span className="absolute left-3" style={{ color: 'var(--admin-text-faded)' }}>
                    <IconSearch size={16} />
                  </span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nome ou telefone do cliente"
                    autoFocus
                    className="w-full bg-transparent outline-none text-sm py-2.5 pl-9 pr-3"
                    style={{ color: 'var(--admin-text)' }}
                  />
                </div>

                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5"
                  style={{
                    background: 'var(--admin-accent-bg)',
                    color: 'var(--admin-accent)',
                    border: '1px solid var(--admin-accent-border)',
                  }}
                >
                  <IconPlus size={14} /> Cadastrar cliente novo
                </button>

                {searching && (
                  <p className="text-xs text-center" style={{ color: 'var(--admin-text-mute)' }}>
                    Buscando…
                  </p>
                )}

                {results.length > 0 && (
                  <div className="space-y-1.5">
                    {results.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectCliente(c)}
                        className="w-full text-left admin-card p-3"
                      >
                        <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                          {c.name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                          {c.phone}
                          {typeof c.total_points === 'number' && c.total_points > 0 && (
                            <span style={{ color: 'var(--admin-accent)' }}> · {c.total_points} pts</span>
                          )}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* STEP PROFISSIONAL */}
        {step === 'profissional' && (
          <div className="space-y-2">
            {professionals.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setProf(p)
                  setStep('servico')
                }}
                className="w-full text-left admin-card p-4"
                style={{
                  border: prof?.id === p.id ? '1.5px solid var(--admin-accent)' : '1px solid var(--admin-border)',
                }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                  {p.name}
                </p>
              </button>
            ))}
            {professionals.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--admin-text-mute)' }}>
                Nenhum profissional cadastrado.
              </p>
            )}
          </div>
        )}

        {/* STEP SERVIÇO */}
        {step === 'servico' && (
          <div className="space-y-2">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setService(s)
                  setStep('horario')
                }}
                className="w-full text-left admin-card p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                    {s.name}
                  </p>
                  {s.price != null && (
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-accent)' }}>
                      {s.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  )}
                </div>
                {s.duration_minutes != null && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                    <IconClock size={11} /> {s.duration_minutes} min
                  </p>
                )}
              </button>
            ))}
            {services.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--admin-text-mute)' }}>
                Nenhum serviço cadastrado.
              </p>
            )}
          </div>
        )}

        {/* STEP HORÁRIO */}
        {step === 'horario' && (
          <>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>
                Data
              </p>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="admin-input w-full px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>
                Horário disponível
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {slots.map((s) => {
                  const occupied = busy.has(s)
                  const selected = time === s
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        if (!occupied) setTime(s)
                      }}
                      disabled={occupied}
                      className="py-2 rounded-lg text-sm font-semibold tabular-nums disabled:opacity-30"
                      style={{
                        background: selected
                          ? 'var(--admin-accent)'
                          : occupied
                            ? 'var(--admin-surface-hi)'
                            : 'var(--admin-surface)',
                        color: selected ? '#fff' : 'var(--admin-text)',
                        border: selected ? 'none' : '1px solid var(--admin-border)',
                        textDecoration: occupied ? 'line-through' : 'none',
                      }}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>
            <button
              onClick={() => setStep('confirma')}
              disabled={!time}
              className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 mt-4"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              Continuar
            </button>
          </>
        )}

        {/* STEP CONFIRMA */}
        {step === 'confirma' && cliente && prof && service && (
          <>
            <div className="admin-card p-4 space-y-3">
              <Row label="Cliente" value={`${cliente.name} · ${cliente.phone}`} />
              <Row label="Profissional" value={prof.name} />
              <Row label="Serviço" value={service.name} />
              {service.price != null && (
                <Row
                  label="Valor"
                  value={service.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                />
              )}
              <Row label="Data" value={new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} />
              <Row label="Horário" value={time} />
            </div>

            <button
              onClick={handleConfirm}
              disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              <IconCheck size={16} /> {saving ? 'Salvando…' : 'Confirmar agendamento'}
            </button>
          </>
        )}
      </div>
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
        {label}
      </span>
      <span className="text-sm font-semibold text-right" style={{ color: 'var(--admin-text)' }}>
        {value}
      </span>
    </div>
  )
}
