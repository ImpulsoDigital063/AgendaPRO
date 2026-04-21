'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Professional } from '@/lib/types'
import { IconCamera, IconClose } from '@/components/ui/Icon'

type Props = {
  businessId: string
  professionals: Professional[]
  onChange: (professionals: Professional[]) => void
}

export default function ProfissionaisTab({ businessId, professionals, onChange }: Props) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [editingCommission, setEditingCommission] = useState<string | null>(null)
  const [commissionValue, setCommissionValue] = useState('')
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteResult, setInviteResult] = useState<{
    profId: string
    ok: boolean
    message?: string
    email?: string
    tempPassword?: string
    professionalName?: string
    loginUrl?: string
    emailSent?: boolean
  } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})
  const supabase = createClient()

  async function handleAdd() {
    if (!newName.trim()) return
    setAdding(true)

    const { data, error } = await supabase
      .from('professionals')
      .insert({ business_id: businessId, name: newName.trim(), active: true, commission_percentage: 0, role: 'professional' })
      .select()
      .single()

    if (!error && data) {
      onChange([...professionals, data])
      setNewName('')
    }
    setAdding(false)
  }

  async function toggleActive(prof: Professional) {
    setLoadingId(prof.id)
    const { error } = await supabase
      .from('professionals')
      .update({ active: !prof.active })
      .eq('id', prof.id)

    if (!error) {
      onChange(professionals.map((p) => p.id === prof.id ? { ...p, active: !p.active } : p))
    }
    setLoadingId(null)
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
      onChange(professionals.map((p) => p.id === prof.id ? { ...p, commission_percentage: value } : p))
    }
    setEditingCommission(null)
    setLoadingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este profissional? Os agendamentos existentes não serão afetados.')) return
    setLoadingId(id)

    const { error } = await supabase.from('professionals').delete().eq('id', id)
    if (!error) {
      onChange(professionals.filter((p) => p.id !== id))
    }
    setLoadingId(null)
  }

  async function handleUploadPhoto(prof: Professional, file: File) {
    if (!file.type.startsWith('image/')) {
      alert('Envie uma imagem (PNG, JPG ou WEBP).')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo 4MB.')
      return
    }

    setUploadingId(prof.id)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${businessId}/${prof.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('professional-photos')
      .upload(path, file, { upsert: true, cacheControl: '3600' })

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
        email: data.email,
        tempPassword: data.tempPassword,
        professionalName: data.professionalName,
        loginUrl: data.loginUrl,
        emailSent: data.emailSent,
      })
      onChange(professionals.map((p) =>
        p.id === prof.id ? { ...p, email: data.email, auth_user_id: 'linked' } : p
      ))
      setInvitingId(null)
      setInviteEmail('')
    } else {
      setInviteResult({ profId: prof.id, ok: false, message: data.error || 'Erro ao convidar.' })
    }
    setLoadingId(null)
  }

  async function handleRemovePhoto(prof: Professional) {
    if (!prof.photo_url) return
    if (!confirm('Remover a foto deste profissional?')) return
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
      onChange(professionals.map((p) => (p.id === prof.id ? { ...p, photo_url: null } : p)))
    }
    setUploadingId(null)
  }

  return (
    <div className="space-y-3">
      {professionals.length === 0 && (
        <div className="admin-card-deep p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-mute)' }}>
            Nenhum profissional cadastrado.
          </p>
        </div>
      )}

      {professionals.map((prof) => (
        <div key={prof.id} className="admin-card-deep overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar com upload */}
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => fileInputs.current[prof.id]?.click()}
                disabled={uploadingId === prof.id}
                className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold transition-all disabled:opacity-50 group"
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
                  <img
                    src={prof.photo_url}
                    alt={prof.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  prof.name.charAt(0).toUpperCase()
                )}
                <span
                  className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
                >
                  <IconCamera size={16} />
                </span>
                {uploadingId === prof.id && (
                  <span
                    className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10 }}
                  >
                    ...
                  </span>
                )}
              </button>
              {prof.photo_url && uploadingId !== prof.id && (
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(prof)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                  style={{
                    background: 'var(--admin-danger)',
                    color: '#FFFFFF',
                  }}
                  title="Remover foto"
                  aria-label="Remover foto"
                >
                  <IconClose size={10} strokeWidth={2.5} />
                </button>
              )}
              <input
                ref={(el) => {
                  fileInputs.current[prof.id] = el
                }}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUploadPhoto(prof, file)
                  e.target.value = ''
                }}
              />
            </div>

            <div>
              <p
                className="font-semibold text-sm"
                style={{ color: prof.active ? 'var(--admin-text)' : 'var(--admin-text-mute)' }}
              >
                {prof.name}
              </p>
              {editingCommission === prof.id ? (
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={commissionValue}
                    onChange={(e) => setCommissionValue(e.target.value)}
                    className="admin-input w-14 px-2 py-0.5 text-xs"
                    placeholder="0"
                  />
                  <span className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>%</span>
                  <button
                    onClick={() => handleSaveCommission(prof)}
                    disabled={loadingId === prof.id}
                    className="text-xs font-semibold disabled:opacity-40"
                    style={{ color: 'var(--admin-success)' }}
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditingCommission(null)}
                    className="text-xs"
                    style={{ color: 'var(--admin-text-mute)' }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingCommission(prof.id)
                    setCommissionValue(String(prof.commission_percentage ?? 0))
                  }}
                  className="text-xs transition-colors hover:opacity-80"
                  style={{ color: 'var(--admin-text-mute)' }}
                >
                  {prof.commission_percentage > 0 ? `${prof.commission_percentage}% comissão` : 'Definir comissão'}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!prof.auth_user_id && (
              <button
                onClick={() => {
                  setInvitingId(invitingId === prof.id ? null : prof.id)
                  setInviteEmail(prof.email || '')
                  setInviteResult(null)
                }}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                style={{
                  background: 'color-mix(in srgb, var(--admin-accent) 15%, transparent)',
                  color: 'var(--admin-accent)',
                  border: '1px solid color-mix(in srgb, var(--admin-accent) 30%, transparent)',
                }}
              >
                Dar acesso
              </button>
            )}
            {prof.auth_user_id && (
              <span
                className="text-xs px-2.5 py-1 rounded-lg font-medium"
                style={{
                  background: 'color-mix(in srgb, var(--admin-success) 12%, transparent)',
                  color: 'var(--admin-success)',
                }}
              >
                Com acesso
              </span>
            )}
            <button
              onClick={() => toggleActive(prof)}
              disabled={loadingId === prof.id}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40"
              style={
                prof.active
                  ? {
                      background: 'var(--admin-surface-hover)',
                      color: 'var(--admin-text-2)',
                      border: '1px solid var(--admin-border)',
                    }
                  : {
                      background: 'color-mix(in srgb, var(--admin-success) 15%, transparent)',
                      color: 'var(--admin-success)',
                      border: '1px solid color-mix(in srgb, var(--admin-success) 30%, transparent)',
                    }
              }
            >
              {prof.active ? 'Desativar' : 'Ativar'}
            </button>
            <button
              onClick={() => handleDelete(prof.id)}
              disabled={loadingId === prof.id}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40"
              style={{
                background: 'color-mix(in srgb, var(--admin-danger) 12%, transparent)',
                color: 'var(--admin-danger)',
                border: '1px solid color-mix(in srgb, var(--admin-danger) 25%, transparent)',
              }}
            >
              Remover
            </button>
          </div>
        </div>

        {/* Painel de convite expandido */}
        {invitingId === prof.id && (
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
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite(prof)}
                placeholder="email@profissional.com"
                className="admin-input flex-1 px-3 py-2 text-sm"
              />
              <button
                onClick={() => handleInvite(prof)}
                disabled={loadingId === prof.id || !inviteEmail.trim()}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                style={{
                  background: 'var(--admin-accent)',
                  color: '#fff',
                }}
              >
                {loadingId === prof.id ? '...' : 'Convidar'}
              </button>
            </div>
          </div>
        )}

        {/* Resultado do convite */}
        {inviteResult && inviteResult.profId === prof.id && (
          <div
            className="px-4 pb-4 pt-2 space-y-2"
            style={{ borderTop: '1px solid var(--admin-divider)' }}
          >
            {inviteResult.ok ? (
              <div
                className="rounded-xl p-3 space-y-3"
                style={{
                  background: 'color-mix(in srgb, var(--admin-success) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--admin-success) 25%, transparent)',
                }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--admin-success)' }}>
                    Acesso criado!
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
                    {inviteResult.emailSent
                      ? 'Email com as credenciais foi enviado pro profissional.'
                      : 'Copie as credenciais abaixo e mande pro profissional via WhatsApp.'}
                  </p>
                </div>

                {/* Credenciais copiáveis */}
                <div className="space-y-2">
                  {[
                    { label: 'Email', value: inviteResult.email || '', field: `email-${prof.id}` },
                    { label: 'Senha temporária', value: inviteResult.tempPassword || '', field: `pwd-${prof.id}` },
                    {
                      label: 'Link de acesso',
                      value: typeof window !== 'undefined' ? `${window.location.origin}${inviteResult.loginUrl || '/profissional/login'}` : '',
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
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
                          {item.label}
                        </p>
                        <p className="text-xs font-mono truncate" style={{ color: 'var(--admin-text)' }}>
                          {item.value}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(item.value, item.field)}
                        className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
                        style={{
                          background: copiedField === item.field ? 'var(--admin-success)' : 'var(--admin-accent)',
                          color: '#fff',
                        }}
                      >
                        {copiedField === item.field ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Botão WhatsApp pré-formatado */}
                <button
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : ''
                    const msg = `Olá ${inviteResult.professionalName}! Seu acesso ao painel:\n\n` +
                      `Link: ${origin}${inviteResult.loginUrl}\n` +
                      `Email: ${inviteResult.email}\n` +
                      `Senha: ${inviteResult.tempPassword}\n\n` +
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
                {inviteResult.message}
              </p>
            )}
          </div>
        )}
      </div>
      ))}

      {/* Adicionar profissional */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--admin-surface)',
          border: '1px dashed var(--admin-border-hi)',
        }}
      >
        <p className="admin-label">Adicionar profissional</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Nome do profissional"
            className="admin-input flex-1 px-3 py-2.5 text-sm"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
            style={{
              background:
                'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
              color: '#FFFFFF',
              boxShadow:
                '0 8px 20px -6px color-mix(in srgb, var(--admin-accent) 45%, transparent)',
            }}
          >
            {adding ? '...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}
