'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  name: string
  email: string
  photoUrl: string | null
  employmentType: 'commissioned' | 'employed'
}

export default function ContaView({ name, email, photoUrl, employmentType }: Props) {
  const router = useRouter()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlag, setSavedFlag] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()

  async function handleSubmitPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('A senha deve conter pelo menos uma letra maiúscula e um número.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const res = await fetch('/api/profissional/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Erro ao trocar senha.')
      return
    }

    setNewPassword('')
    setConfirmPassword('')
    setSavedFlag(true)
    setTimeout(() => {
      setSavedFlag(false)
      setShowPasswordForm(false)
    }, 1800)
  }

  async function handleLogout() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/profissional/login')
    router.refresh()
  }

  return (
    <div className="px-4 pt-5 pb-4 max-w-2xl mx-auto space-y-4">
      <header className="px-1">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--admin-text)' }}>
          Conta
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--admin-text-faded)' }}>
          Seu perfil e segurança
        </p>
      </header>

      {/* Card identidade */}
      <div className="admin-card p-5 flex items-center gap-4">
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{
            width: 64,
            height: 64,
            background: photoUrl
              ? 'transparent'
              : 'linear-gradient(135deg, var(--admin-accent) 0%, #06B6D4 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 22,
          }}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            initials || '?'
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight truncate" style={{ color: 'var(--admin-text)' }}>
            {name}
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--admin-text-faded)' }}>
            {email}
          </p>
          <span
            className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
            style={{
              background: 'var(--admin-accent-bg)',
              color: 'var(--admin-text-2)',
              border: '1px solid var(--admin-border)',
            }}
          >
            {employmentType === 'commissioned' ? 'Comissionado' : 'Contratado'}
          </span>
        </div>
      </div>

      {/* Card segurança — trocar senha expansível */}
      <div className="admin-card overflow-hidden">
        <button
          type="button"
          onClick={() => {
            setShowPasswordForm((v) => !v)
            setError(null)
          }}
          className="w-full p-5 flex items-center gap-3 text-left"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--admin-accent) 12%, transparent)',
              color: 'var(--admin-accent)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-tight" style={{ color: 'var(--admin-text)' }}>
              Trocar senha
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
              Atualize sua senha de acesso
            </p>
          </div>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: 'var(--admin-text-faded)',
              transform: showPasswordForm ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 220ms ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showPasswordForm && (
          <form onSubmit={handleSubmitPassword} className="px-5 pb-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>
                Nova senha
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres, maiúscula e número"
                required
                className="w-full text-sm px-3 py-2.5 rounded-xl focus:outline-none"
                style={{
                  background: 'var(--admin-input-bg)',
                  color: 'var(--admin-text)',
                  border: '1px solid var(--admin-border)',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>
                Confirmar nova senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                required
                className="w-full text-sm px-3 py-2.5 rounded-xl focus:outline-none"
                style={{
                  background: 'var(--admin-input-bg)',
                  color: 'var(--admin-text)',
                  border: '1px solid var(--admin-border)',
                }}
              />
            </div>

            {error && (
              <p className="text-xs" style={{ color: 'var(--admin-danger, #EF4444)' }}>
                {error}
              </p>
            )}

            {savedFlag ? (
              <p className="text-xs font-semibold" style={{ color: 'var(--admin-success, #22C55E)' }}>
                Senha alterada
              </p>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{ background: 'var(--admin-accent)', color: '#fff' }}
              >
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            )}
          </form>
        )}
      </div>

      {/* Card sair */}
      <button
        type="button"
        onClick={handleLogout}
        disabled={signingOut}
        className="admin-card w-full p-5 flex items-center gap-3 text-left transition-colors disabled:opacity-50"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--admin-danger, #EF4444) 12%, transparent)',
            color: 'var(--admin-danger, #EF4444)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold leading-tight" style={{ color: 'var(--admin-danger, #EF4444)' }}>
            {signingOut ? 'Saindo...' : 'Sair'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
            Encerrar a sessão neste dispositivo
          </p>
        </div>
      </button>
    </div>
  )
}
