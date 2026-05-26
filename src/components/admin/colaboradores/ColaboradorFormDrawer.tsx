'use client'

/**
 * ColaboradorFormDrawer — drawer lateral pra cadastrar/editar profissional
 * com todos os campos do padrão Salão99 (v79):
 *   1. Identificação (Nome*, Apelido, Email)
 *   2. Cargos e Funções (4 checkboxes múltiplos)
 *   3. Atribuições (3 checkboxes independentes)
 *   4. Contato (Instagram, Telefone)
 *   5. Informações Pessoais (Nascimento, CPF, RG, Órgão, Info Extra)
 *   6. Informações Bancárias (Pix, Banco, Agência, Conta, Dígito,
 *      Tipo Conta, Tipo Pessoa, Nome do titular)
 *   7. Endereço (rua, número, complemento, bairro, cidade, estado, CEP)
 *
 * Edita prof existente OU cria novo (quando `professional` é null).
 *
 * Eduardo cravou 26/05/2026: "deixar AgendaPRO igual ao Salão99 nesse
 * quesito" (Profissionais). Drawer abre só quando user clica "Detalhes
 * completos" ou "Editar" — fluxo inline rápido fica preservado.
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Professional } from '@/lib/types'
import { IconClose, IconCheck } from '@/components/ui/Icon'

type Props = {
  open: boolean
  onClose: () => void
  businessId: string
  professional: Professional | null
  onSaved: (prof: Professional) => void
}

/** Estado do form · espelha colunas v79 + identificação básica */
type FormState = {
  name: string
  nickname: string
  email: string
  is_owner: boolean
  is_manager: boolean
  is_professional: boolean
  is_attendant: boolean
  does_appointments: boolean
  sells_products: boolean
  sells_packages: boolean
  instagram: string
  // Pessoais
  birth_date: string
  cpf: string
  rg: string
  rg_orgao: string
  extra_info: string
  // Bancárias
  bank_pix_key: string
  bank_name: string
  bank_agency: string
  bank_account: string
  bank_digit: string
  bank_account_type: string
  bank_person_type: string
  bank_holder_name: string
  // Endereço
  address_street: string
  address_number: string
  address_complement: string
  address_neighborhood: string
  address_city: string
  address_state: string
  address_cep: string
}

const EMPTY: FormState = {
  name: '',
  nickname: '',
  email: '',
  is_owner: false,
  is_manager: false,
  is_professional: true,
  is_attendant: false,
  does_appointments: true,
  sells_products: true,
  sells_packages: true,
  instagram: '',
  birth_date: '',
  cpf: '',
  rg: '',
  rg_orgao: '',
  extra_info: '',
  bank_pix_key: '',
  bank_name: '',
  bank_agency: '',
  bank_account: '',
  bank_digit: '',
  bank_account_type: '',
  bank_person_type: '',
  bank_holder_name: '',
  address_street: '',
  address_number: '',
  address_complement: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  address_cep: '',
}

function fromProfessional(p: Professional): FormState {
  return {
    name: p.name ?? '',
    nickname: p.nickname ?? '',
    email: p.email ?? '',
    is_owner: !!p.is_owner,
    is_manager: !!p.is_manager,
    is_professional: p.is_professional !== false,
    is_attendant: !!p.is_attendant || !!p.is_receptionist,
    does_appointments: p.does_appointments !== false,
    sells_products: p.sells_products !== false,
    sells_packages: p.sells_packages !== false,
    instagram: p.instagram ?? '',
    birth_date: p.birth_date ?? '',
    cpf: p.cpf ?? '',
    rg: p.rg ?? '',
    rg_orgao: p.rg_orgao ?? '',
    extra_info: p.extra_info ?? '',
    bank_pix_key: p.bank_pix_key ?? '',
    bank_name: p.bank_name ?? '',
    bank_agency: p.bank_agency ?? '',
    bank_account: p.bank_account ?? '',
    bank_digit: p.bank_digit ?? '',
    bank_account_type: p.bank_account_type ?? '',
    bank_person_type: p.bank_person_type ?? '',
    bank_holder_name: p.bank_holder_name ?? '',
    address_street: p.address_street ?? '',
    address_number: p.address_number ?? '',
    address_complement: p.address_complement ?? '',
    address_neighborhood: p.address_neighborhood ?? '',
    address_city: p.address_city ?? '',
    address_state: p.address_state ?? '',
    address_cep: p.address_cep ?? '',
  }
}

/** Converte string vazia em null pra não gravar lixo no banco */
function nz(s: string): string | null {
  const t = s.trim()
  return t.length === 0 ? null : t
}

export default function ColaboradorFormDrawer({
  open,
  onClose,
  businessId,
  professional,
  onSaved,
}: Props) {
  const supabase = createClient()
  const isEdit = !!professional
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(professional ? fromProfessional(professional) : EMPTY)
      setError(null)
    }
  }, [open, professional])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Nome é obrigatório.')
      return
    }
    setSaving(true)
    setError(null)

    // Monta payload · null pra strings vazias
    const payload = {
      name: form.name.trim(),
      nickname: nz(form.nickname),
      email: nz(form.email),
      is_owner: form.is_owner,
      is_manager: form.is_manager,
      is_professional: form.is_professional,
      is_attendant: form.is_attendant,
      // Mantém is_receptionist como espelho pra compat v47 (RLS depende)
      is_receptionist: form.is_attendant,
      does_appointments: form.does_appointments,
      sells_products: form.sells_products,
      sells_packages: form.sells_packages,
      instagram: nz(form.instagram),
      birth_date: nz(form.birth_date),
      cpf: nz(form.cpf),
      rg: nz(form.rg),
      rg_orgao: nz(form.rg_orgao),
      extra_info: nz(form.extra_info),
      bank_pix_key: nz(form.bank_pix_key),
      bank_name: nz(form.bank_name),
      bank_agency: nz(form.bank_agency),
      bank_account: nz(form.bank_account),
      bank_digit: nz(form.bank_digit),
      bank_account_type: nz(form.bank_account_type),
      bank_person_type: nz(form.bank_person_type),
      bank_holder_name: nz(form.bank_holder_name),
      address_street: nz(form.address_street),
      address_number: nz(form.address_number),
      address_complement: nz(form.address_complement),
      address_neighborhood: nz(form.address_neighborhood),
      address_city: nz(form.address_city),
      address_state: nz(form.address_state),
      address_cep: nz(form.address_cep),
    }

    if (isEdit && professional) {
      const { data, error: e } = await supabase
        .from('professionals')
        .update(payload)
        .eq('id', professional.id)
        .select()
        .single()
      setSaving(false)
      if (e) {
        setError(e.message || 'Erro ao salvar.')
        return
      }
      if (data) onSaved(data as Professional)
    } else {
      const { data, error: e } = await supabase
        .from('professionals')
        .insert({
          business_id: businessId,
          active: true,
          commission_percentage: 0,
          role: form.is_owner ? 'owner' : 'professional',
          ...payload,
        })
        .select()
        .single()
      setSaving(false)
      if (e) {
        setError(e.message || 'Erro ao criar profissional.')
        return
      }
      if (data) onSaved(data as Professional)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="fixed inset-0 z-[150]"
        style={{ background: 'rgba(0,0,0,0.4)' }}
      />

      {/* Drawer */}
      <aside
        className="fixed top-0 right-0 z-[151] h-full w-full sm:w-[560px] flex flex-col"
        style={{ background: 'var(--admin-bg)', borderLeft: '1px solid var(--admin-border)' }}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--admin-border)' }}
        >
          <h2 className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>
            {isEdit ? 'Editar colaborador' : 'Novo colaborador'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: 'var(--admin-surface-hi)',
              color: 'var(--admin-text-mute)',
            }}
          >
            <IconClose size={16} />
          </button>
        </header>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* 1. Identificação */}
          <Section title="Identificação" defaultOpen>
            <Field label="Nome *" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="admin-input w-full px-3 py-2"
                placeholder="Nome completo"
              />
            </Field>
            <Field label="Apelido">
              <input
                type="text"
                value={form.nickname}
                onChange={(e) => update('nickname', e.target.value)}
                className="admin-input w-full px-3 py-2"
                placeholder="Como aparece no card"
              />
            </Field>
            <Field
              label="E-mail do colaborador"
              hint="Preencha se o colaborador precisa acessar o sistema. Sem isso, ele aparece só na agenda."
            >
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="admin-input w-full px-3 py-2"
                placeholder="email@exemplo.com"
              />
            </Field>
          </Section>

          {/* 2. Cargos */}
          <Section title="Cargos e Funções" defaultOpen>
            <p className="text-[11px] mb-2" style={{ color: 'var(--admin-text-mute)' }}>
              Cargos podem se acumular (ex: Proprietário que também é Gerente).
            </p>
            <div className="grid grid-cols-2 gap-2">
              <CheckOption checked={form.is_owner} onChange={(v) => update('is_owner', v)} label="Proprietário" />
              <CheckOption checked={form.is_manager} onChange={(v) => update('is_manager', v)} label="Gerente" />
              <CheckOption checked={form.is_professional} onChange={(v) => update('is_professional', v)} label="Profissional" />
              <CheckOption checked={form.is_attendant} onChange={(v) => update('is_attendant', v)} label="Atendente (recepção)" />
            </div>
          </Section>

          {/* 3. Atribuições */}
          <Section title="Atribuições" defaultOpen>
            <CheckOption
              checked={form.does_appointments}
              onChange={(v) => update('does_appointments', v)}
              label="Executa Atendimentos"
              description="Aparece como executor possível em agendamentos."
            />
            <CheckOption
              checked={form.sells_products}
              onChange={(v) => update('sells_products', v)}
              label="Vende Produtos"
              description="Pode aparecer como vendedor de produto · entra em relatórios."
            />
            <CheckOption
              checked={form.sells_packages}
              onChange={(v) => update('sells_packages', v)}
              label="Vende Pacotes"
              description="Pode aparecer como vendedor de pacote · entra em relatórios."
            />
          </Section>

          {/* 4. Contato */}
          <Section title="Contato">
            <Field label="Instagram">
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => update('instagram', e.target.value)}
                className="admin-input w-full px-3 py-2"
                placeholder="@usuario"
              />
            </Field>
          </Section>

          {/* 5. Pessoais */}
          <Section title="Informações Pessoais">
            <Field label="Data de Nascimento">
              <input
                type="date"
                value={form.birth_date}
                onChange={(e) => update('birth_date', e.target.value)}
                className="admin-input w-full px-3 py-2"
              />
            </Field>
            <Field label="CPF">
              <input
                type="text"
                value={form.cpf}
                onChange={(e) => update('cpf', e.target.value)}
                className="admin-input w-full px-3 py-2"
                placeholder="000.000.000-00"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Órgão Expedidor">
                <input
                  type="text"
                  value={form.rg_orgao}
                  onChange={(e) => update('rg_orgao', e.target.value)}
                  className="admin-input w-full px-3 py-2"
                  placeholder="SSP/UF"
                />
              </Field>
              <Field label="RG">
                <input
                  type="text"
                  value={form.rg}
                  onChange={(e) => update('rg', e.target.value)}
                  className="admin-input w-full px-3 py-2"
                />
              </Field>
            </div>
            <Field label="Informações Adicionais">
              <textarea
                value={form.extra_info}
                onChange={(e) => update('extra_info', e.target.value)}
                className="admin-input w-full px-3 py-2"
                rows={2}
              />
            </Field>
          </Section>

          {/* 6. Bancárias */}
          <Section title="Informações Bancárias">
            <Field label="Chave Pix">
              <input
                type="text"
                value={form.bank_pix_key}
                onChange={(e) => update('bank_pix_key', e.target.value)}
                className="admin-input w-full px-3 py-2"
                placeholder="CPF, e-mail, telefone ou chave aleatória"
              />
            </Field>
            <Field label="Banco">
              <input
                type="text"
                value={form.bank_name}
                onChange={(e) => update('bank_name', e.target.value)}
                className="admin-input w-full px-3 py-2"
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Agência">
                <input
                  type="text"
                  value={form.bank_agency}
                  onChange={(e) => update('bank_agency', e.target.value)}
                  className="admin-input w-full px-3 py-2"
                />
              </Field>
              <Field label="Conta">
                <input
                  type="text"
                  value={form.bank_account}
                  onChange={(e) => update('bank_account', e.target.value)}
                  className="admin-input w-full px-3 py-2"
                />
              </Field>
              <Field label="Dígito">
                <input
                  type="text"
                  value={form.bank_digit}
                  onChange={(e) => update('bank_digit', e.target.value)}
                  className="admin-input w-full px-3 py-2"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo Conta">
                <select
                  value={form.bank_account_type}
                  onChange={(e) => update('bank_account_type', e.target.value)}
                  className="admin-input w-full px-3 py-2"
                >
                  <option value="">Selecione</option>
                  <option value="corrente">Corrente</option>
                  <option value="poupanca">Poupança</option>
                </select>
              </Field>
              <Field label="Tipo Pessoa">
                <select
                  value={form.bank_person_type}
                  onChange={(e) => update('bank_person_type', e.target.value)}
                  className="admin-input w-full px-3 py-2"
                >
                  <option value="">Selecione</option>
                  <option value="fisica">Física</option>
                  <option value="juridica">Jurídica</option>
                </select>
              </Field>
            </div>
            <Field label="Nome do Titular">
              <input
                type="text"
                value={form.bank_holder_name}
                onChange={(e) => update('bank_holder_name', e.target.value)}
                className="admin-input w-full px-3 py-2"
              />
            </Field>
          </Section>

          {/* 7. Endereço */}
          <Section title="Endereço">
            <Field label="Endereço">
              <input
                type="text"
                value={form.address_street}
                onChange={(e) => update('address_street', e.target.value)}
                className="admin-input w-full px-3 py-2"
                placeholder="Rua / Avenida"
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Número">
                <input
                  type="text"
                  value={form.address_number}
                  onChange={(e) => update('address_number', e.target.value)}
                  className="admin-input w-full px-3 py-2"
                />
              </Field>
              <div className="col-span-2">
                <Field label="Complemento">
                  <input
                    type="text"
                    value={form.address_complement}
                    onChange={(e) => update('address_complement', e.target.value)}
                    className="admin-input w-full px-3 py-2"
                  />
                </Field>
              </div>
            </div>
            <Field label="Bairro">
              <input
                type="text"
                value={form.address_neighborhood}
                onChange={(e) => update('address_neighborhood', e.target.value)}
                className="admin-input w-full px-3 py-2"
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Field label="Cidade">
                  <input
                    type="text"
                    value={form.address_city}
                    onChange={(e) => update('address_city', e.target.value)}
                    className="admin-input w-full px-3 py-2"
                  />
                </Field>
              </div>
              <Field label="Estado">
                <input
                  type="text"
                  value={form.address_state}
                  onChange={(e) => update('address_state', e.target.value)}
                  className="admin-input w-full px-3 py-2"
                  placeholder="UF"
                  maxLength={2}
                />
              </Field>
            </div>
            <Field label="CEP">
              <input
                type="text"
                value={form.address_cep}
                onChange={(e) => update('address_cep', e.target.value)}
                className="admin-input w-full px-3 py-2"
                placeholder="00000-000"
              />
            </Field>
          </Section>
        </div>

        {/* Footer com erro + botões */}
        <footer
          className="px-5 py-3 space-y-2"
          style={{ borderTop: '1px solid var(--admin-border)', background: 'var(--admin-surface)' }}
        >
          {error && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                background: 'color-mix(in srgb, var(--admin-danger, #EF4444) 12%, transparent)',
                color: 'var(--admin-danger, #EF4444)',
                border: '1px solid color-mix(in srgb, var(--admin-danger, #EF4444) 30%, transparent)',
              }}
            >
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
              style={{
                background: 'var(--admin-surface-hi)',
                color: 'var(--admin-text-mute)',
                border: '1px solid var(--admin-border)',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
              style={{
                background:
                  'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
                color: '#fff',
              }}
            >
              <IconCheck size={14} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </footer>
      </aside>
    </>
  )
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-xl"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
    >
      <summary
        className="px-4 py-3 cursor-pointer text-sm font-semibold flex items-center justify-between"
        style={{ color: 'var(--admin-text)' }}
      >
        {title}
        <span className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>▼</span>
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-3">{children}</div>
    </details>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-mute)' }}>
        {label} {required && <span style={{ color: 'var(--admin-danger,#EF4444)' }}>*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-[10px] mt-1 leading-tight" style={{ color: 'var(--admin-text-faded)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function CheckOption({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <label
      className="flex items-start gap-2.5 rounded-lg px-3 py-2 cursor-pointer transition-colors"
      style={{
        background: checked ? 'color-mix(in srgb, var(--admin-accent) 8%, transparent)' : 'transparent',
        border: `1px solid ${checked ? 'color-mix(in srgb, var(--admin-accent) 35%, transparent)' : 'var(--admin-border)'}`,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 flex-shrink-0"
      />
      <div className="min-w-0">
        <p className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
          {label}
        </p>
        {description && (
          <p className="text-[10px] mt-0.5 leading-tight" style={{ color: 'var(--admin-text-mute)' }}>
            {description}
          </p>
        )}
      </div>
    </label>
  )
}
