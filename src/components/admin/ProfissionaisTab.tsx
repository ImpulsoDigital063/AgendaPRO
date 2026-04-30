'use client'

import { useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compress-image'
import type { Professional } from '@/lib/types'
import {
  IconCamera,
  IconCheck,
  IconClose,
  IconKey,
  IconPencil,
  IconPlus,
  IconPower,
  IconSearch,
  IconTrash,
} from '@/components/ui/Icon'
import ConfirmActionModal from '@/components/admin/ConfirmActionModal'
import MoreActionsMenu, { type MoreAction } from '@/components/admin/MoreActionsMenu'

type Props = {
  businessId: string
  professionals: Professional[]
  onChange: (professionals: Professional[]) => void
  /**
   * Plano da subscription — define limite de profissionais.
   *   solo:    2 (admin/dono + 1 colaborador)
   *   equipe:  5 (incluindo dono)
   * Backend tem trigger v30 que valida no INSERT (defesa em profundidade).
   */
  subscriptionPlan: 'solo' | 'equipe'
}

const PLAN_LIMITS: Record<'solo' | 'equipe', number> = {
  solo: 2,
  equipe: 5,
}

type Filter = 'active' | 'inactive' | 'all'

export default function ProfissionaisTab({
  businessId,
  professionals,
  onChange,
  subscriptionPlan,
}: Props) {
  const [filter, setFilter] = useState<Filter>('active')
  const [search, setSearch] = useState('')

  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'commissioned' | 'employed'>('commissioned')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const maxProfs = PLAN_LIMITS[subscriptionPlan]
  const currentCount = professionals.length
  const remaining = Math.max(0, maxProfs - currentCount)
  const limitReached = currentCount >= maxProfs

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [nameValue, setNameValue] = useState('')

  const [editingCommission, setEditingCommission] = useState<string | null>(null)
  const [commissionValue, setCommissionValue] = useState('')

  const [invitingId, setInvitingId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteResult, setInviteResult] = useState<{
    profId: string
    ok: boolean
    mode: 'invite' | 'reset'
    message?: string
    email?: string
    tempPassword?: string
    professionalName?: string
    loginUrl?: string
    emailSent?: boolean
  } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<Professional | null>(null)
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState<Professional | null>(null)
  const [confirmReset, setConfirmReset] = useState<Professional | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<Professional | null>(null)

  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})
  const addFormRef = useRef<HTMLDivElement | null>(null)
  const supabase = createClient()

  const total = professionals.length
  const activeCount = professionals.filter((p) => p.active).length
  const inactiveCount = total - activeCount

  const filtered = useMemo(() => {
    let result = professionals
    if (filter === 'active') result = result.filter((p) => p.active)
    else if (filter === 'inactive') result = result.filter((p) => !p.active)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q))
    }
    return result
  }, [professionals, filter, search])

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  function scrollToAddForm() {
    addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function handleAdd() {
    if (!newName.trim()) return
    if (limitReached) {
      setAddError(
        `Plano ${subscriptionPlan === 'solo' ? 'Solo' : 'Equipe'} permite no máximo ${maxProfs} profissionais. Pra adicionar mais, faça upgrade entrando em contato com a Impulso.`
      )
      return
    }
    setAdding(true)
    setAddError(null)

    const { data, error } = await supabase
      .from('professionals')
      .insert({
        business_id: businessId,
        name: newName.trim(),
        active: true,
        commission_percentage: 0,
        role: 'professional',
        employment_type: newType,
      })
      .select()
      .single()

    if (error) {
      // Trigger v30 retorna RAISE EXCEPTION com mensagem em portugues —
      // mostrar direto pro user.
      setAddError(error.message || 'Erro ao adicionar profissional. Tente novamente.')
    } else if (data) {
      onChange([...professionals, data])
      setNewName('')
      setNewType('commissioned')
    }
    setAdding(false)
  }

  async function handleSaveName(prof: Professional) {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === prof.name) {
      setEditingNameId(null)
      return
    }
    setLoadingId(prof.id)
    const { error } = await supabase
      .from('professionals')
      .update({ name: trimmed })
      .eq('id', prof.id)
    if (!error) {
      onChange(professionals.map((p) => (p.id === prof.id ? { ...p, name: trimmed } : p)))
    }
    setEditingNameId(null)
    setLoadingId(null)
  }

  async function handleChangeType(prof: Professional, type: 'commissioned' | 'employed') {
    setLoadingId(prof.id)
    const { error } = await supabase
      .from('professionals')
      .update({ employment_type: type })
      .eq('id', prof.id)
    if (!error) {
      onChange(
        professionals.map((p) => (p.id === prof.id ? { ...p, employment_type: type } : p))
      )
    }
    setLoadingId(null)
  }

  async function toggleActive(prof: Professional) {
    setLoadingId(prof.id)
    const { error } = await supabase
      .from('professionals')
      .update({ active: !prof.active })
      .eq('id', prof.id)

    if (!error) {
      onChange(
        professionals.map((p) => (p.id === prof.id ? { ...p, active: !p.active } : p))
      )
    }
    setLoadingId(null)
    setConfirmToggle(null)
  }

  async function handleSaveCommission(prof: Professional) {
    const value = parseFloat(commissionValue.replace(',', '.'))
    if (isNaN(value) || value < 0 || value > 100) return
    setLoadingId(prof.id)
    const { error } = await supabase
      .from('professionals')
      .update({ commission_percentage: value })
      .eq('id', prof.id)
    if (!error) {
      onChange(
        professionals.map((p) =>
          p.id === prof.id ? { ...p, commission_percentage: value } : p
        )
      )
    }
    setEditingCommission(null)
    setLoadingId(null)
  }

  async function handleDelete(id: string) {
    setLoadingId(id)
    const { error } = await supabase.from('professionals').delete().eq('id', id)
    if (!error) {
      onChange(professionals.filter((p) => p.id !== id))
    }
    setLoadingId(null)
  }

  async function handleUploadPhoto(prof: Professional, file: File) {
    setUploadingId(prof.id)

    const result = await compressImage(file, 'photo')
    if (!result.ok) {
      alert(result.reason)
      setUploadingId(null)
      return
    }

    const optimized = result.file
    const ext = (optimized.name.split('.').pop() || 'webp').toLowerCase()
    const path = `${businessId}/${prof.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('professional-photos')
      .upload(path, optimized, { upsert: true, cacheControl: '3600', contentType: optimized.type })

    if (uploadError) {
      alert('Erro ao enviar foto: ' + uploadError.message)
      setUploadingId(null)
      return
    }

    const { data: pub } = supabase.storage.from('professional-photos').getPublicUrl(path)
    const publicUrl = `${pub.publicUrl}?v=${Date.now()}`

    const { error: updateError } = await supabase
      .from('professionals')
      .update({ photo_url: publicUrl })
      .eq('id', prof.id)

    if (!updateError) {
      onChange(professionals.map((p) => (p.id === prof.id ? { ...p, photo_url: publicUrl } : p)))
    }
    setUploadingId(null)
  }

  async function handleInvite(prof: Professional) {
    if (!inviteEmail.trim()) return
    setLoadingId(prof.id)
    setInviteResult(null)

    const res = await fetch('/api/admin/invite-professional', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ professionalId: prof.id, email: inviteEmail.trim() }),
    })

    const data = await res.json()

    if (res.ok && data.ok) {
      setInviteResult({
        profId: prof.id,
        ok: true,
        mode: 'invite',
        email: data.email,
        tempPassword: data.tempPassword,
        professionalName: data.professionalName,
        loginUrl: data.loginUrl,
        emailSent: data.emailSent,
      })
      onChange(
        professionals.map((p) =>
          p.id === prof.id ? { ...p, email: data.email, auth_user_id: 'linked' } : p
        )
      )
      setInvitingId(null)
      setInviteEmail('')
    } else {
      setInviteResult({
        profId: prof.id,
        ok: false,
        mode: 'invite',
        message: data.error || 'Erro ao convidar.',
      })
    }
    setLoadingId(null)
  }

  async function handleResetPassword(prof: Professional) {
    setLoadingId(prof.id)
    setInviteResult(null)
    setConfirmReset(null)

    const res = await fetch('/api/admin/regenerate-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ professionalId: prof.id }),
    })
    const data = await res.json()

    if (res.ok && data.ok) {
      setInviteResult({
        profId: prof.id,
        ok: true,
        mode: 'reset',
        email: data.email,
        tempPassword: data.tempPassword,
        professionalName: data.professionalName,
        loginUrl: data.loginUrl,
        emailSent: data.emailSent,
      })
    } else {
      setInviteResult({
        profId: prof.id,
        ok: false,
        mode: 'reset',
        message: data.error || 'Erro ao resetar senha.',
      })
    }
    setLoadingId(null)
  }

  async function handleRemovePhoto(prof: Professional) {
    if (!prof.photo_url) return
    setUploadingId(prof.id)

    const { data: files } = await supabase.storage
      .from('professional-photos')
      .list(businessId, { search: prof.id })
    if (files && files.length > 0) {
      await supabase.storage
        .from('professional-photos')
        .remove(files.map((f) => `${businessId}/${f.name}`))
    }

    const { error } = await supabase
      .from('professionals')
      .update({ photo_url: null })
      .eq('id', prof.id)

    if (!error) {
      onChange(
        professionals.map((p) => (p.id === prof.id ? { ...p, photo_url: null } : p))
      )
    }
    setUploadingId(null)
  }

  return (
    <div className="space-y-3 pb-24 relative">
      {/* Toolbar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
            <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>
              {total}
            </span>
            <span className="opacity-70"> de </span>
            <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>
              {maxProfs}
            </span>{' '}
            profissiona{maxProfs === 1 ? 'l' : 'is'} ·{' '}
            <span style={{ color: 'var(--admin-success)' }}>{activeCount} ativo{activeCount === 1 ? '' : 's'}</span>
            {inactiveCount > 0 && <> · {inactiveCount} desativado{inactiveCount === 1 ? '' : 's'}</>}
          </p>
          {/* Badge plano — destaca o tier que limita */}
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
            style={{
              background: 'color-mix(in srgb, var(--brand-primary, #3B82F6) 12%, transparent)',
              color: 'var(--admin-accent)',
              border: '1px solid color-mix(in srgb, var(--brand-primary, #3B82F6) 30%, transparent)',
            }}
          >
            Plano {subscriptionPlan === 'solo' ? 'Solo' : 'Equipe'}
          </span>
        </div>

        {total > 2 && (
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              <IconSearch size={14} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome..."
              className="admin-input w-full pl-9 pr-3 py-2 text-sm"
            />
          </div>
        )}

        <div className="flex gap-1.5">
          {(
            [
              { value: 'active', label: 'Ativos', count: activeCount },
              { value: 'inactive', label: 'Desativados', count: inactiveCount },
              { value: 'all', label: 'Todos', count: total },
            ] as const
          ).map((chip) => {
            const isActive = filter === chip.value
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setFilter(chip.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-full transition-all"
                style={
                  isActive
                    ? {
                        background:
                          'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
                        color: '#fff',
                        boxShadow:
                          '0 4px 12px -4px color-mix(in srgb, var(--admin-accent) 50%, transparent)',
                      }
                    : {
                        background: 'var(--admin-input-bg)',
                        color: 'var(--admin-text-mute)',
                        border: '1px solid var(--admin-border)',
                      }
                }
              >
                {chip.label}
                <span
                  className="ml-1.5 text-[10px] tabular-nums"
                  style={{ opacity: 0.85 }}
                >
                  {chip.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista ou empty state */}
      {filtered.length === 0 ? (
        <div className="admin-card-deep p-8 text-center space-y-2">
          {total === 0 ? (
            <>
              <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                Nenhum profissional cadastrado ainda
              </p>
              <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                Adicione sua equipe abaixo. Se você atende sozinho, o "Adm" já é o profissional padrão.
              </p>
              <button
                type="button"
                onClick={scrollToAddForm}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg mt-2 inline-flex items-center gap-1"
                style={{
                  background: 'var(--admin-accent-bg)',
                  color: 'var(--admin-accent)',
                  border: '1px solid var(--admin-accent-border)',
                }}
              >
                <IconPlus size={14} />
                Cadastrar primeiro profissional
              </button>
            </>
          ) : search.trim() ? (
            <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
              Nenhum profissional bate com "{search}".
            </p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
              {filter === 'active'
                ? 'Nenhum profissional ativo no momento.'
                : 'Nenhum profissional desativado.'}
            </p>
          )}
        </div>
      ) : (
        filtered.map((prof) => (
          <ProfCard
            key={prof.id}
            prof={prof}
            loadingId={loadingId}
            uploadingId={uploadingId}
            invitingId={invitingId}
            inviteEmail={inviteEmail}
            inviteResult={inviteResult}
            copiedField={copiedField}
            editingNameId={editingNameId}
            nameValue={nameValue}
            editingCommission={editingCommission}
            commissionValue={commissionValue}
            fileInputs={fileInputs}
            setEditingNameId={setEditingNameId}
            setNameValue={setNameValue}
            setEditingCommission={setEditingCommission}
            setCommissionValue={setCommissionValue}
            setInvitingId={setInvitingId}
            setInviteEmail={setInviteEmail}
            setInviteResult={setInviteResult}
            setConfirmDelete={setConfirmDelete}
            setConfirmRemovePhoto={setConfirmRemovePhoto}
            setConfirmReset={setConfirmReset}
            setConfirmToggle={setConfirmToggle}
            handleSaveName={handleSaveName}
            handleChangeType={handleChangeType}
            handleSaveCommission={handleSaveCommission}
            handleUploadPhoto={handleUploadPhoto}
            handleInvite={handleInvite}
            copyToClipboard={copyToClipboard}
          />
        ))
      )}

      {/*
        Adicionar profissional — quando limite atingido, troca o form por
        um card de upsell. Backend tem trigger v30 que blinda no INSERT
        mesmo se UI for bypassada (defesa em profundidade).
      */}
      {limitReached ? (
        <div
          ref={addFormRef}
          className="rounded-2xl p-5 space-y-3"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary, #3B82F6) 14%, var(--admin-surface)) 0%, var(--admin-surface) 100%)',
            border: '1px solid color-mix(in srgb, var(--brand-primary, #3B82F6) 35%, transparent)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'color-mix(in srgb, var(--brand-primary, #3B82F6) 22%, transparent)',
                color: 'var(--admin-accent)',
              }}
              aria-hidden
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                Você atingiu o limite do plano {subscriptionPlan === 'solo' ? 'Solo' : 'Equipe'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                {subscriptionPlan === 'solo'
                  ? `Plano Solo permite até ${maxProfs} profissionais (você + 1 colaborador). Pra adicionar mais, faça upgrade pro plano Equipe (até 5 profissionais).`
                  : `Plano Equipe permite até ${maxProfs} profissionais. Se precisa de mais, fale com a Impulso pra ver opções.`}
              </p>
            </div>
          </div>

          <a
            href={`https://wa.me/5563992920080?text=${encodeURIComponent(
              `Oi! Quero ${subscriptionPlan === 'solo' ? 'fazer upgrade pro plano Equipe' : 'discutir um plano com mais profissionais'} no AgendaPRO.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background:
                'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
              color: '#FFFFFF',
              boxShadow:
                '0 8px 20px -6px color-mix(in srgb, var(--admin-accent) 45%, transparent)',
            }}
          >
            {subscriptionPlan === 'solo' ? 'Fazer upgrade pro Equipe' : 'Falar com a Impulso'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>

          <p className="text-[11px] text-center" style={{ color: 'var(--admin-text-faded)' }}>
            Você também pode <strong>remover</strong> profissionais não usados pra liberar vaga.
          </p>
        </div>
      ) : (
        <div
          ref={addFormRef}
          className="rounded-2xl p-4 space-y-3"
          style={{
            background: 'var(--admin-surface)',
            border: '1px dashed var(--admin-border-hi)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="admin-label flex items-center gap-1.5">
              <IconPlus size={14} />
              Adicionar profissional
            </p>
            <span className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
              {remaining} {remaining === 1 ? 'vaga restante' : 'vagas restantes'}
            </span>
          </div>

          <input
            type="text"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value)
              if (addError) setAddError(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Nome do profissional"
            className="admin-input w-full px-3 py-2.5 text-sm"
          />

          <div>
            <p
              className="text-[11px] font-medium uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              Tipo
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'commissioned' as const, label: 'Comissionado', desc: 'Controla a própria agenda · ganha por %' },
                { value: 'employed' as const, label: 'Contratado', desc: 'Você define a agenda · salário fixo' },
              ].map((opt) => {
                const isActive = newType === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setNewType(opt.value)}
                    className="rounded-xl p-3 text-left transition-all"
                    style={
                      isActive
                        ? {
                            background: 'color-mix(in srgb, var(--admin-accent) 12%, transparent)',
                            border: '1px solid color-mix(in srgb, var(--admin-accent) 45%, transparent)',
                            boxShadow:
                              '0 4px 14px -6px color-mix(in srgb, var(--admin-accent) 35%, transparent)',
                          }
                        : {
                            background: 'var(--admin-surface)',
                            border: '1px solid var(--admin-border)',
                          }
                    }
                  >
                    <p
                      className="text-sm font-semibold"
                      style={{ color: isActive ? 'var(--admin-accent)' : 'var(--admin-text)' }}
                    >
                      {opt.label}
                    </p>
                    <p className="text-[11px] mt-0.5 leading-tight" style={{ color: 'var(--admin-text-mute)' }}>
                      {opt.desc}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {addError && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                background: 'color-mix(in srgb, var(--admin-danger, #EF4444) 10%, transparent)',
                color: 'var(--admin-danger, #EF4444)',
                border: '1px solid color-mix(in srgb, var(--admin-danger, #EF4444) 30%, transparent)',
              }}
            >
              {addError}
            </p>
          )}

          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
            style={{
              background:
                'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
              color: '#FFFFFF',
              boxShadow: '0 8px 20px -6px color-mix(in srgb, var(--admin-accent) 45%, transparent)',
            }}
          >
            {adding ? '...' : 'Adicionar'}
          </button>
        </div>
      )}

      {/* Floating + button (apenas se já tem >= 2 profissionais — ajuda a alcançar o form rapido) */}
      {total >= 2 && (
        <button
          type="button"
          onClick={scrollToAddForm}
          aria-label="Adicionar profissional"
          className="fixed right-4 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={{
            bottom: 'calc(80px + env(safe-area-inset-bottom))',
            background:
              'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
            color: '#fff',
            boxShadow: '0 12px 28px -8px color-mix(in srgb, var(--admin-accent) 60%, transparent)',
          }}
        >
          <IconPlus size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* Modais */}
      <ConfirmActionModal
        open={!!confirmDelete}
        title={`Remover ${confirmDelete?.name || 'profissional'}?`}
        message="Os agendamentos existentes desse profissional não são apagados, mas ele some das listas e dos relatórios. Essa ação não pode ser desfeita."
        confirmLabel="Sim, remover"
        cancelLabel="Voltar"
        tone="danger"
        loading={!!confirmDelete && loadingId === confirmDelete.id}
        onConfirm={async () => {
          if (!confirmDelete) return
          await handleDelete(confirmDelete.id)
          setConfirmDelete(null)
        }}
        onClose={() => setConfirmDelete(null)}
      />

      <ConfirmActionModal
        open={!!confirmRemovePhoto}
        title="Remover foto?"
        message={`A foto de ${confirmRemovePhoto?.name || ''} vai ser removida. Você pode subir outra depois.`}
        confirmLabel="Sim, remover"
        cancelLabel="Voltar"
        tone="warn"
        loading={!!confirmRemovePhoto && uploadingId === confirmRemovePhoto.id}
        onConfirm={async () => {
          if (!confirmRemovePhoto) return
          await handleRemovePhoto(confirmRemovePhoto)
          setConfirmRemovePhoto(null)
        }}
        onClose={() => setConfirmRemovePhoto(null)}
      />

      <ConfirmActionModal
        open={!!confirmReset}
        title={`Resetar senha de ${confirmReset?.name || ''}?`}
        message="Uma nova senha temporária vai ser gerada. A senha atual para de funcionar na hora, e o profissional vai precisar trocar a nova no próximo login."
        confirmLabel="Sim, resetar"
        cancelLabel="Voltar"
        tone="warn"
        loading={!!confirmReset && loadingId === confirmReset.id}
        onConfirm={async () => {
          if (!confirmReset) return
          await handleResetPassword(confirmReset)
        }}
        onClose={() => setConfirmReset(null)}
      />

      <ConfirmActionModal
        open={!!confirmToggle}
        title={confirmToggle?.active ? `Desativar ${confirmToggle?.name}?` : `Reativar ${confirmToggle?.name}?`}
        message={
          confirmToggle?.active
            ? 'Ele vai sumir da lista de agendamento até ser reativado. Os agendamentos já feitos continuam intactos.'
            : 'Ele volta a aparecer na lista de agendamento e nos relatórios.'
        }
        confirmLabel={confirmToggle?.active ? 'Sim, desativar' : 'Sim, reativar'}
        cancelLabel="Voltar"
        tone={confirmToggle?.active ? 'warn' : 'neutral'}
        loading={!!confirmToggle && loadingId === confirmToggle.id}
        onConfirm={async () => {
          if (!confirmToggle) return
          await toggleActive(confirmToggle)
        }}
        onClose={() => setConfirmToggle(null)}
      />
    </div>
  )
}

// =============================================================================
// Card individual
// =============================================================================

type ProfCardProps = {
  prof: Professional
  loadingId: string | null
  uploadingId: string | null
  invitingId: string | null
  inviteEmail: string
  inviteResult: {
    profId: string
    ok: boolean
    mode: 'invite' | 'reset'
    message?: string
    email?: string
    tempPassword?: string
    professionalName?: string
    loginUrl?: string
    emailSent?: boolean
  } | null
  copiedField: string | null
  editingNameId: string | null
  nameValue: string
  editingCommission: string | null
  commissionValue: string
  fileInputs: React.MutableRefObject<Record<string, HTMLInputElement | null>>
  setEditingNameId: (id: string | null) => void
  setNameValue: (v: string) => void
  setEditingCommission: (id: string | null) => void
  setCommissionValue: (v: string) => void
  setInvitingId: (id: string | null) => void
  setInviteEmail: (v: string) => void
  setInviteResult: (v: ProfCardProps['inviteResult']) => void
  setConfirmDelete: (p: Professional | null) => void
  setConfirmRemovePhoto: (p: Professional | null) => void
  setConfirmReset: (p: Professional | null) => void
  setConfirmToggle: (p: Professional | null) => void
  handleSaveName: (prof: Professional) => Promise<void>
  handleChangeType: (prof: Professional, type: 'commissioned' | 'employed') => Promise<void>
  handleSaveCommission: (prof: Professional) => Promise<void>
  handleUploadPhoto: (prof: Professional, file: File) => Promise<void>
  handleInvite: (prof: Professional) => Promise<void>
  copyToClipboard: (text: string, field: string) => void
}

function ProfCard(p: ProfCardProps) {
  const { prof } = p
  const isOwner = prof.role === 'owner'
  const isCommissioned = (prof.employment_type ?? 'commissioned') === 'commissioned'
  const isLoading = p.loadingId === prof.id
  const isUploading = p.uploadingId === prof.id

  const actions: MoreAction[] = []

  actions.push({
    label: 'Editar nome',
    icon: <IconPencil size={15} />,
    onClick: () => {
      p.setNameValue(prof.name)
      p.setEditingNameId(prof.id)
    },
  })

  actions.push({
    label: prof.photo_url ? 'Trocar foto' : 'Adicionar foto',
    icon: <IconCamera size={15} />,
    onClick: () => p.fileInputs.current[prof.id]?.click(),
  })

  if (prof.photo_url) {
    actions.push({
      label: 'Remover foto',
      icon: <IconClose size={15} />,
      onClick: () => p.setConfirmRemovePhoto(prof),
    })
  }

  if (isCommissioned && !isOwner) {
    actions.push({
      label: prof.commission_percentage > 0 ? 'Editar comissão' : 'Definir comissão',
      icon: <IconPencil size={15} />,
      onClick: () => {
        p.setCommissionValue(String(prof.commission_percentage ?? 0))
        p.setEditingCommission(prof.id)
      },
    })
  }

  if (prof.auth_user_id && !isOwner) {
    actions.push({
      label: 'Resetar senha',
      icon: <IconKey size={15} />,
      onClick: () => p.setConfirmReset(prof),
      separatorAbove: true,
    })
  }

  if (!isOwner) {
    actions.push({
      label: prof.active ? 'Desativar' : 'Reativar',
      icon: <IconPower size={15} />,
      onClick: () => p.setConfirmToggle(prof),
      separatorAbove: !prof.auth_user_id,
    })

    actions.push({
      label: 'Remover',
      icon: <IconTrash size={15} />,
      onClick: () => p.setConfirmDelete(prof),
      destructive: true,
    })
  }

  return (
    <div
      className="admin-card-deep overflow-hidden"
      style={!prof.active ? { opacity: 0.7 } : undefined}
    >
      <div className="px-4 py-3.5 space-y-3">
        {/* Linha 1: avatar + nome + menu */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => p.fileInputs.current[prof.id]?.click()}
              disabled={isUploading}
              className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-base font-bold transition-all disabled:opacity-50 group"
              style={
                prof.active
                  ? {
                      background: prof.photo_url
                        ? 'transparent'
                        : 'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
                      color: '#FFFFFF',
                      border: '2px solid color-mix(in srgb, var(--admin-accent) 35%, transparent)',
                      boxShadow:
                        '0 6px 16px -6px color-mix(in srgb, var(--admin-accent) 45%, transparent)',
                    }
                  : {
                      background: 'var(--admin-surface-hover)',
                      color: 'var(--admin-text-mute)',
                      border: '2px solid var(--admin-border)',
                    }
              }
              title="Trocar foto"
            >
              {prof.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={prof.photo_url} alt={prof.name} className="w-full h-full object-cover" />
              ) : (
                prof.name.charAt(0).toUpperCase()
              )}
              {isUploading && (
                <span
                  className="absolute inset-0 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10 }}
                >
                  ...
                </span>
              )}
            </button>
            <input
              ref={(el) => {
                p.fileInputs.current[prof.id] = el
              }}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) p.handleUploadPhoto(prof, file)
                e.target.value = ''
              }}
            />
          </div>

          {/* Nome + badges */}
          <div className="flex-1 min-w-0">
            {p.editingNameId === prof.id ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={p.nameValue}
                  onChange={(e) => p.setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') p.handleSaveName(prof)
                    if (e.key === 'Escape') p.setEditingNameId(null)
                  }}
                  autoFocus
                  className="admin-input flex-1 px-2.5 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => p.handleSaveName(prof)}
                  disabled={isLoading || !p.nameValue.trim()}
                  className="px-2.5 py-1.5 rounded-md text-xs font-bold disabled:opacity-40"
                  style={{ background: 'var(--admin-success)', color: '#fff' }}
                  aria-label="Salvar nome"
                >
                  <IconCheck size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => p.setEditingNameId(null)}
                  className="px-2 py-1.5 rounded-md text-xs"
                  style={{ color: 'var(--admin-text-mute)' }}
                  aria-label="Cancelar"
                >
                  <IconClose size={14} />
                </button>
              </div>
            ) : (
              <>
                <p
                  className="font-semibold text-sm truncate"
                  style={{ color: prof.active ? 'var(--admin-text)' : 'var(--admin-text-mute)' }}
                >
                  {prof.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {isOwner && (
                    <Pill
                      label="Você (dono)"
                      bg="color-mix(in srgb, var(--brand-primary, #3B82F6) 18%, transparent)"
                      color="var(--brand-primary, #3B82F6)"
                    />
                  )}
                  {!prof.active && (
                    <Pill
                      label="Desativado"
                      bg="color-mix(in srgb, var(--admin-warn) 16%, transparent)"
                      color="var(--admin-warn)"
                    />
                  )}
                  {isCommissioned && !isOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        p.setCommissionValue(String(prof.commission_percentage ?? 0))
                        p.setEditingCommission(prof.id)
                      }}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full transition-opacity hover:opacity-80"
                      style={{
                        background: 'color-mix(in srgb, var(--admin-accent) 14%, transparent)',
                        color: 'var(--admin-accent)',
                        border: '1px solid color-mix(in srgb, var(--admin-accent) 28%, transparent)',
                      }}
                    >
                      {prof.commission_percentage > 0
                        ? `${prof.commission_percentage}% comissão`
                        : 'Definir comissão'}
                    </button>
                  )}
                </div>
              </>
            )}

            {p.editingCommission === prof.id && (
              <div className="flex items-center gap-1.5 mt-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={p.commissionValue}
                  onChange={(e) => p.setCommissionValue(e.target.value)}
                  autoFocus
                  className="admin-input w-16 px-2 py-1 text-xs"
                  placeholder="0"
                />
                <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                  %
                </span>
                <button
                  type="button"
                  onClick={() => p.handleSaveCommission(prof)}
                  disabled={isLoading}
                  className="text-xs font-semibold px-2 py-1 rounded-md disabled:opacity-40"
                  style={{ background: 'var(--admin-success)', color: '#fff' }}
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => p.setEditingCommission(null)}
                  className="text-xs px-1.5"
                  style={{ color: 'var(--admin-text-mute)' }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Menu */}
          {actions.length > 0 && <MoreActionsMenu actions={actions} />}
        </div>

        {/* Linha 2: tipo (segmented control full width) — só pra não-owner */}
        {!isOwner && (
          <div
            className="grid grid-cols-2 rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--admin-border)' }}
          >
            {(
              [
                { value: 'commissioned' as const, label: 'Comissionado' },
                { value: 'employed' as const, label: 'Contratado' },
              ]
            ).map((opt) => {
              const current = prof.employment_type ?? 'commissioned'
              const isActive = current === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => !isActive && p.handleChangeType(prof, opt.value)}
                  disabled={isLoading}
                  className="px-2 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                  style={
                    isActive
                      ? { background: 'var(--admin-accent)', color: '#fff' }
                      : { background: 'transparent', color: 'var(--admin-text-mute)' }
                  }
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Linha 3: acesso */}
        {!isOwner && (
          <div className="flex items-center gap-2">
            {prof.auth_user_id ? (
              <span
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 flex-1 justify-center"
                style={{
                  background: 'color-mix(in srgb, var(--admin-success) 12%, transparent)',
                  color: 'var(--admin-success)',
                  border: '1px solid color-mix(in srgb, var(--admin-success) 25%, transparent)',
                }}
              >
                <IconCheck size={12} />
                Tem acesso ao painel
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  p.setInvitingId(p.invitingId === prof.id ? null : prof.id)
                  p.setInviteEmail(prof.email || '')
                  p.setInviteResult(null)
                }}
                className="text-xs px-3 py-2 rounded-lg font-semibold transition-colors flex-1"
                style={{
                  background: 'var(--admin-accent-bg)',
                  color: 'var(--admin-accent)',
                  border: '1px solid var(--admin-accent-border)',
                }}
              >
                Dar acesso ao painel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Painel de convite */}
      {p.invitingId === prof.id && (
        <div
          className="px-4 pb-4 pt-2 space-y-2"
          style={{ borderTop: '1px solid var(--admin-divider)' }}
        >
          <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
            Informe o email de {prof.name} para criar o acesso ao painel.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={p.inviteEmail}
              onChange={(e) => p.setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && p.handleInvite(prof)}
              placeholder="email@profissional.com"
              className="admin-input flex-1 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => p.handleInvite(prof)}
              disabled={isLoading || !p.inviteEmail.trim()}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              {isLoading ? '...' : 'Convidar'}
            </button>
          </div>
        </div>
      )}

      {/* Resultado convite/reset */}
      {p.inviteResult && p.inviteResult.profId === prof.id && (
        <div
          className="px-4 pb-4 pt-2 space-y-2"
          style={{ borderTop: '1px solid var(--admin-divider)' }}
        >
          {p.inviteResult.ok ? (
            <div
              className="rounded-xl p-3 space-y-3"
              style={{
                background: 'color-mix(in srgb, var(--admin-success) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--admin-success) 25%, transparent)',
              }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-success)' }}>
                  {p.inviteResult.mode === 'reset' ? 'Senha resetada!' : 'Acesso criado!'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
                  {p.inviteResult.emailSent
                    ? p.inviteResult.mode === 'reset'
                      ? 'Email com a nova senha foi enviado pro profissional.'
                      : 'Email com as credenciais foi enviado pro profissional.'
                    : p.inviteResult.mode === 'reset'
                      ? 'Copie a nova senha abaixo e mande pro profissional via WhatsApp.'
                      : 'Copie as credenciais abaixo e mande pro profissional via WhatsApp.'}
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { label: 'Email', value: p.inviteResult.email || '', field: `email-${prof.id}` },
                  {
                    label: 'Senha temporária',
                    value: p.inviteResult.tempPassword || '',
                    field: `pwd-${prof.id}`,
                  },
                  {
                    label: 'Link de acesso',
                    value: p.inviteResult.loginUrl?.startsWith('http')
                      ? p.inviteResult.loginUrl
                      : typeof window !== 'undefined'
                        ? `${window.location.origin}${p.inviteResult.loginUrl || '/profissional/login'}`
                        : '',
                    field: `url-${prof.id}`,
                  },
                ].map((item) => (
                  <div
                    key={item.field}
                    className="rounded-lg p-2.5 flex items-center justify-between gap-2"
                    style={{
                      background: 'var(--admin-surface)',
                      border: '1px solid var(--admin-border)',
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: 'var(--admin-text-mute)' }}
                      >
                        {item.label}
                      </p>
                      <p
                        className="text-xs font-mono truncate"
                        style={{ color: 'var(--admin-text)' }}
                      >
                        {item.value}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => p.copyToClipboard(item.value, item.field)}
                      className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
                      style={{
                        background:
                          p.copiedField === item.field
                            ? 'var(--admin-success)'
                            : 'var(--admin-accent)',
                        color: '#fff',
                      }}
                    >
                      {p.copiedField === item.field ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  const origin = typeof window !== 'undefined' ? window.location.origin : ''
                  const link = p.inviteResult?.loginUrl?.startsWith('http')
                    ? p.inviteResult.loginUrl
                    : `${origin}${p.inviteResult?.loginUrl || '/profissional/login'}`
                  const msg =
                    p.inviteResult?.mode === 'reset'
                      ? `Olá ${p.inviteResult.professionalName}! Sua nova senha do painel:\n\n` +
                        `Link: ${link}\n` +
                        `Email: ${p.inviteResult.email}\n` +
                        `Nova senha: ${p.inviteResult.tempPassword}\n\n` +
                        `Você vai trocar a senha no próximo login.`
                      : `Olá ${p.inviteResult?.professionalName}! Seu acesso ao painel:\n\n` +
                        `Link: ${link}\n` +
                        `Email: ${p.inviteResult?.email}\n` +
                        `Senha: ${p.inviteResult?.tempPassword}\n\n` +
                        `Troque a senha no primeiro login.`
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                }}
                className="w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                style={{ background: '#25D366', color: '#fff' }}
              >
                Abrir WhatsApp com mensagem pronta
              </button>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--admin-danger)' }}>
              {p.inviteResult.message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  )
}
