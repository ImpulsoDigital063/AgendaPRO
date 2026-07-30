'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose, IconChevronDown, IconChevronRight } from '@/components/ui/Icon'

type Props = {
  onClose: () => void
  onSuccess: (createdId?: string) => void
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function maskCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

function maskCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

const REFERRAL_OPTIONS = [
  'Instagram',
  'Google',
  'Indicação',
  'Passei na frente',
  'Anúncio',
  'WhatsApp',
  'Outro',
]

const PROFESSION_OPTIONS = [
  'Estudante', 'Empresário(a)', 'Funcionário(a) público(a)',
  'Médico(a)', 'Advogado(a)', 'Professor(a)', 'Engenheiro(a)',
  'Designer', 'Vendedor(a)', 'Aposentado(a)', 'Do lar', 'Outro',
]

export default function NovoClienteModal({ onClose, onSuccess }: Props) {
  // Básico
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [birthday, setBirthday] = useState('')

  // Mais informações
  const [showMore, setShowMore] = useState(false)
  const [nickname, setNickname] = useState('')
  const [customerType, setCustomerType] = useState<'pf' | 'pj'>('pf')
  const [sex, setSex] = useState<'f' | 'm' | 'other' | 'na' | ''>('')
  const [cpf, setCpf] = useState('')
  const [rg, setRg] = useState('')
  const [profession, setProfession] = useState('')
  const [instagram, setInstagram] = useState('')
  const [referralSource, setReferralSource] = useState('')

  // Endereço
  const [showAddress, setShowAddress] = useState(false)
  const [zipCode, setZipCode] = useState('')
  const [address, setAddress] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [addressComplement, setAddressComplement] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [loadingCep, setLoadingCep] = useState(false)

  // Notas
  const [importantNote, setImportantNote] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-preencher endereço via ViaCEP quando CEP completa 8 dígitos
  async function lookupCEP(cepStr: string) {
    const digits = cepStr.replace(/\D/g, '')
    if (digits.length !== 8) return
    setLoadingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) return
      setAddress(data.logradouro || '')
      setNeighborhood(data.bairro || '')
      setCity(data.localidade || '')
      setState(data.uf || '')
    } catch { /* fail silently · usuário preenche manual */ } finally {
      setLoadingCep(false)
    }
  }

  async function submit() {
    setError(null)
    if (!name.trim()) {
      setError('Nome obrigatório')
      return
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Telefone inválido (mínimo 10 dígitos com DDD)')
      return
    }
    setSubmitting(true)
    const body = {
      name: name.trim(),
      phone,
      email: email.trim() || undefined,
      birthday: birthday || undefined,
      nickname: nickname.trim() || undefined,
      customer_type: customerType,
      sex: sex || undefined,
      cpf: cpf.trim() || undefined,
      rg: rg.trim() || undefined,
      profession: profession.trim() || undefined,
      instagram: instagram.trim() || undefined,
      referral_source: referralSource || undefined,
      zip_code: zipCode.trim() || undefined,
      address: address.trim() || undefined,
      address_number: addressNumber.trim() || undefined,
      address_complement: addressComplement.trim() || undefined,
      neighborhood: neighborhood.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      important_note: importantNote.trim() || undefined,
      notes: notes.trim() || undefined,
    }
    const res = await fetch('/api/admin/customers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erro ao criar cliente')
      setSubmitting(false)
      return
    }
    const data = await res.json().catch(() => ({}))
    setSubmitting(false)
    onSuccess(data.customer?.id)
  }

  // Portal guard pra SSR. Sem isso, createPortal explode no build.
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])

  // Trava o scroll do fundo enquanto o modal está aberto (Eduardo 30/07: "os
  // modais ficam soltos, quando scrollo ele mexe para as laterais").
  // Era o ÚNICO modal sem essa trava — AgendarModal, FaturarComandaModal e
  // PaymentMethodModal já tinham. Sem ela a página continua rolando atrás e,
  // como a grade rola na horizontal, o iOS desloca o viewport inteiro: o modal
  // é `fixed`, fica ancorado no documento e parece escorregar pro lado.
  // Esc fecha, mesmo padrão dos outros.
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!portalReady) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[320] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          // Sólido pra não vazar conteúdo de fundo no tema dark
          // (admin-surface é translúcido · usa popover-bg igual o
          // PaymentMethodModal e ConfirmActionModal). Reportado pelo
          // Olímpio em 20/05/2026 via áudio: "tela meio clara mistura
          // com info do fundo · só escurecer a primeira tela".
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          maxHeight: 'calc(100svh - 16px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--admin-divider)' }}
        >
          <h3 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>
            Novo cliente
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

        {/* Body · scrollable */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 1.25rem, 1.25rem)' }}
        >
          {/* SEÇÃO 1 · Básico (sempre visível) */}
          <section className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nome completo *">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="João da Silva"
                  autoFocus
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
              </Field>
              <Field label="Telefone *">
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  placeholder="(11) 98765-4321"
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Email (opcional)">
                <input
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joao@email.com"
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
              </Field>
              <Field label="Aniversário (opcional)">
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
              </Field>
            </div>
            <Field label="Anotação importante (opcional)">
              <input
                type="text"
                value={importantNote}
                onChange={(e) => setImportantNote(e.target.value)}
                placeholder="Alergia a esmalte, cliente VIP, etc."
                className="admin-input w-full px-3 py-2.5 text-sm"
                style={{ borderColor: importantNote ? '#F59E0B' : undefined }}
              />
            </Field>
          </section>

          {/* SEÇÃO 2 · Mais informações (colapsável) */}
          <CollapsibleSection
            title="Mais informações"
            subtitle="Apelido · documentos · profissão · origem"
            open={showMore}
            onToggle={() => setShowMore((v) => !v)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Apelido">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Como chamar"
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
              </Field>
              <Field label="Tipo">
                <div className="flex gap-1.5">
                  {(['pf', 'pj'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCustomerType(t)}
                      className="flex-1 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
                      style={
                        customerType === t
                          ? { background: 'var(--admin-accent)', color: '#fff' }
                          : { background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }
                      }
                    >
                      {t === 'pf' ? 'Pessoa física' : 'Pessoa jurídica'}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={customerType === 'pj' ? 'CNPJ' : 'CPF'}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cpf}
                  onChange={(e) => setCpf(customerType === 'pf' ? maskCPF(e.target.value) : e.target.value)}
                  placeholder={customerType === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
              </Field>
              <Field label="RG / IE">
                <input
                  type="text"
                  value={rg}
                  onChange={(e) => setRg(e.target.value)}
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Sexo">
                <div className="grid grid-cols-4 gap-1.5">
                  {([
                    { v: 'f', l: 'F' },
                    { v: 'm', l: 'M' },
                    { v: 'other', l: 'Outro' },
                    { v: 'na', l: 'N/A' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setSex(sex === opt.v ? '' : opt.v)}
                      className="py-2.5 rounded-lg text-xs font-semibold transition-colors"
                      style={
                        sex === opt.v
                          ? { background: 'var(--admin-accent)', color: '#fff' }
                          : { background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }
                      }
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Profissão">
                <select
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="admin-input w-full px-3 py-2.5 text-sm"
                >
                  <option value="">— Selecione —</option>
                  {PROFESSION_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Instagram">
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value.replace(/^@/, ''))}
                  placeholder="usuario (sem @)"
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
              </Field>
              <Field label="Como conheceu?">
                <select
                  value={referralSource}
                  onChange={(e) => setReferralSource(e.target.value)}
                  className="admin-input w-full px-3 py-2.5 text-sm"
                >
                  <option value="">— Selecione —</option>
                  {REFERRAL_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </Field>
            </div>
          </CollapsibleSection>

          {/* SEÇÃO 3 · Endereço (colapsável) */}
          <CollapsibleSection
            title="Endereço"
            subtitle="Auto-preenche pelo CEP"
            open={showAddress}
            onToggle={() => setShowAddress((v) => !v)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-3">
              <Field label="CEP">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={zipCode}
                    onChange={(e) => {
                      const masked = maskCEP(e.target.value)
                      setZipCode(masked)
                      if (masked.replace(/\D/g, '').length === 8) lookupCEP(masked)
                    }}
                    placeholder="00000-000"
                    className="admin-input w-full px-3 py-2.5 text-sm"
                  />
                  {loadingCep && (
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold"
                      style={{ color: 'var(--admin-accent)' }}
                    >
                      buscando...
                    </span>
                  )}
                </div>
              </Field>
              <Field label="Rua">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Número">
                <input
                  type="text"
                  value={addressNumber}
                  onChange={(e) => setAddressNumber(e.target.value)}
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
              </Field>
              <Field label="Complemento">
                <input
                  type="text"
                  value={addressComplement}
                  onChange={(e) => setAddressComplement(e.target.value)}
                  placeholder="Apto, casa..."
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
              </Field>
              <Field label="Bairro">
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
              <Field label="Cidade">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
              </Field>
              <Field label="UF">
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                  maxLength={2}
                  className="admin-input w-full px-3 py-2.5 text-sm"
                />
              </Field>
            </div>
          </CollapsibleSection>

          {/* SEÇÃO 4 · Notas */}
          <Field label="Observações (opcional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferências, histórico, qualquer info útil"
              rows={3}
              className="admin-input w-full px-3 py-2.5 text-sm resize-none"
              style={{ minHeight: 70 }}
            />
          </Field>

          {error && (
            <p className="text-xs" style={{ color: '#EF4444' }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer sticky · botões */}
        <div
          className="flex gap-2 px-5 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid var(--admin-divider)', background: 'var(--admin-surface)' }}
        >
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
            className="flex-[2] py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            }}
          >
            {submitting ? 'Salvando...' : 'Cadastrar cliente'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--admin-text-faded)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function CollapsibleSection({
  title, subtitle, open, onToggle, children,
}: {
  title: string
  subtitle?: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--admin-border)', background: 'color-mix(in srgb, var(--admin-surface) 80%, transparent)' }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{title}</p>
          {subtitle && (
            <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>{subtitle}</p>
          )}
        </div>
        {open ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3">
          {children}
        </div>
      )}
    </section>
  )
}
