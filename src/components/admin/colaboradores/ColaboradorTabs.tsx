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
  // v79 · cargos e atribuições
  is_owner?: boolean
  is_manager?: boolean
  is_professional?: boolean
  is_attendant?: boolean
  does_appointments?: boolean
  sells_products?: boolean
  sells_packages?: boolean
  nickname?: string | null
  birth_date?: string | null
  cpf?: string | null
  instagram?: string | null
}

// v79 Estágio 3 · histórico de atendimentos do prof
type Appointment = {
  id: string
  appointment_date: string
  start_time: string
  client_name: string | null
  service_name: string | null
  total_price: number | null
  status: string
  paid_at: string | null
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
  initialAppointments?: Appointment[]
}

type TabKey = 'perfil' | 'configuracoes' | 'atividades' | 'salarios' | 'vales'

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function ColaboradorTabs({ prof, initialVouchers, initialSalaries, initialAppointments = [] }: Props) {
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
      {tab === 'perfil' && <PerfilTab prof={prof} />}

      {tab === 'configuracoes' && <ConfiguracoesTab prof={prof} />}

      {tab === 'atividades' && <AtividadesTab appointments={initialAppointments} />}

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

// =============================================================================
// v79 Estágio 3 · Tabs PERFIL / CONFIGURAÇÕES / ATIVIDADES Salão99-style
// =============================================================================

function cargosList(prof: Prof): string[] {
  const out: string[] = []
  if (prof.is_owner) out.push('Proprietário')
  if (prof.is_manager) out.push('Gerente')
  if (prof.is_professional) out.push('Profissional')
  if (prof.is_attendant) out.push('Atendente (recepção)')
  return out
}

function PerfilTab({ prof }: { prof: Prof }) {
  const cargos = cargosList(prof)
  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
    >
      <p className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
        {prof.nickname || prof.name}
      </p>

      {/* Atribuições · check/X · esmaece quando false (igual Luana no Salão99) */}
      <div className="space-y-1.5">
        <Attribution label="Executa Atendimentos" enabled={prof.does_appointments !== false} />
        <Attribution label="Vende Produtos" enabled={prof.sells_products !== false} />
        <Attribution label="Vende Pacotes" enabled={prof.sells_packages !== false} />
      </div>

      {/* Contato */}
      <ProfileSection label="Contato">
        {prof.email && <ProfileLine value={prof.email} />}
        {prof.phone && <ProfileLine value={`WhatsApp: ${prof.phone}`} />}
        {prof.instagram && <ProfileLine value={`Instagram: ${prof.instagram}`} />}
        {!prof.email && !prof.phone && !prof.instagram && (
          <ProfileLine value="Sem contato cadastrado" muted />
        )}
      </ProfileSection>

      {/* Cargos */}
      {cargos.length > 0 && (
        <ProfileSection label="Cargos">
          {cargos.map((c) => (
            <ProfileLine key={c} value={c} />
          ))}
        </ProfileSection>
      )}

      {/* Pessoais (Nascimento + CPF) inline · só se preenchidos */}
      {(prof.birth_date || prof.cpf) && (
        <ProfileSection label="Informações Pessoais">
          {prof.birth_date && (
            <ProfileLine
              value={`Nascimento: ${new Date(prof.birth_date + 'T12:00:00').toLocaleDateString('pt-BR')}`}
            />
          )}
          {prof.cpf && <ProfileLine value={`CPF: ${prof.cpf}`} />}
        </ProfileSection>
      )}
    </div>
  )
}

function Attribution({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2" style={{ opacity: enabled ? 1 : 0.4 }}>
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: enabled
            ? 'color-mix(in srgb, var(--admin-success,#10B981) 14%, transparent)'
            : 'transparent',
          color: enabled ? 'var(--admin-success,#10B981)' : 'var(--admin-text-faded)',
          border: enabled
            ? '1px solid color-mix(in srgb, var(--admin-success,#10B981) 35%, transparent)'
            : '1px solid var(--admin-border)',
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {enabled ? '✓' : '×'}
      </span>
      <span className="text-sm" style={{ color: 'var(--admin-text)' }}>
        {label}
      </span>
    </div>
  )
}

function ProfileSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        className="text-[10px] font-bold uppercase tracking-widest mb-1"
        style={{ color: 'var(--admin-text-mute)' }}
      >
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function ProfileLine({ value, muted = false }: { value: string; muted?: boolean }) {
  return (
    <p className="text-sm" style={{ color: muted ? 'var(--admin-text-faded)' : 'var(--admin-text-2)' }}>
      {value}
    </p>
  )
}

function ConfiguracoesTab({ prof }: { prof: Prof }) {
  // Serviços esmaece quando não executa atendimentos (igual Luana no Salão99)
  const servicosDisabled = prof.does_appointments === false
  const items: { label: string; desc: string; disabled?: boolean }[] = [
    { label: 'Horários de Trabalho', desc: 'Configure os horários do colaborador' },
    {
      label: 'Serviços',
      desc: servicosDisabled
        ? 'Indisponível · colaborador não executa atendimentos'
        : 'Configure os serviços que o colaborador pode executar',
      disabled: servicosDisabled,
    },
    { label: 'Comissões e Gorjetas', desc: 'Configure cálculos de comissão e gorjeta' },
    { label: 'Permissões', desc: 'Permissões granulares (em breve · v80+)' },
    { label: 'Notificações', desc: 'Notificações de agendamento e online (em breve)' },
  ]
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
    >
      {items.map((it, idx) => (
        <div
          key={it.label}
          className="px-5 py-4 flex items-start gap-3"
          style={{
            borderBottom: idx < items.length - 1 ? '1px solid var(--admin-divider)' : 'none',
            opacity: it.disabled ? 0.4 : 1,
            cursor: it.disabled ? 'not-allowed' : 'default',
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              {it.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
              {it.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function AtividadesTab({ appointments }: { appointments: Appointment[] }) {
  if (appointments.length === 0) {
    return (
      <div
        className="rounded-2xl p-10 text-center"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
          Nenhum atendimento registrado.
        </p>
      </div>
    )
  }
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
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
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Data</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Cliente</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Serviço</th>
              <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Valor</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a, idx) => {
              const paid = !!a.paid_at
              const cancelled = a.status === 'cancelled' || a.status === 'no_show'
              const situacaoLabel = cancelled
                ? a.status === 'cancelled' ? 'Cancelado' : 'Não compareceu'
                : paid ? 'Pago' : (a.status === 'completed' ? 'Concluído' : 'Pendente')
              const tone = cancelled
                ? 'var(--admin-text-faded)'
                : paid
                  ? 'var(--admin-success,#16A34A)'
                  : 'var(--admin-warn,#D97706)'
              return (
                <tr
                  key={a.id}
                  style={{
                    borderBottom: idx < appointments.length - 1 ? '1px solid var(--admin-divider)' : 'none',
                    opacity: cancelled ? 0.5 : 1,
                  }}
                >
                  <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--admin-text-2)' }}>
                    {formatDate(a.appointment_date)} · {a.start_time?.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--admin-text)' }}>{a.client_name ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--admin-text-2)' }}>{a.service_name ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: 'var(--admin-text)' }}>
                    {a.total_price != null ? formatBRL(Number(a.total_price)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold" style={{ color: tone }}>
                    {situacaoLabel}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
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
