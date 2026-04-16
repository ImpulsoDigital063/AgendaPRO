'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function TrocarSenhaPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
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
      setError('As senhas nao coincidem.')
      return
    }

    setLoading(true)

    const res = await fetch('/api/profissional/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erro ao trocar senha.')
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
    setTimeout(() => {
      router.push('/profissional')
      router.refresh()
    }, 1500)
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(16,185,129,0.30) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 85% 80%, rgba(59,130,246,0.20) 0%, transparent 55%), #050713',
      }}
    >
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <Image src="/logo-agendapro-dark.svg" alt="AgendaPRO" width={170} height={34} priority />
        </div>

        {done ? (
          <div
            className="rounded-3xl p-8 text-center"
            style={{
              background: 'rgba(15, 23, 42, 0.72)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
            }}
          >
            <div className="flex justify-center mb-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Senha alterada!</h2>
            <p className="text-slate-400 text-sm">Redirecionando para o painel...</p>
          </div>
        ) : (
          <>
            <div
              className="rounded-3xl p-6 space-y-4"
              style={{
                background: 'rgba(15, 23, 42, 0.72)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                boxShadow: '0 30px 80px -30px rgba(16, 185, 129, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
              }}
            >
              <div className="text-center mb-2">
                <h2 className="text-lg font-bold text-white">Crie sua nova senha</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Sua senha atual e temporaria. Troque agora para manter sua conta segura.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1.5">Nova senha</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres, maiúscula e número"
                    required
                    className="w-full rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1.5">Confirmar nova senha</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    required
                    className="w-full rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
                    boxShadow: '0 8px 20px -6px rgba(16,185,129,0.5)',
                  }}
                >
                  {loading ? 'Salvando...' : 'Salvar nova senha'}
                </button>
              </form>
            </div>

            <p className="text-center text-slate-600 text-xs mt-6">
              AgendaPRO · Impulso Digital
            </p>
          </>
        )}
      </div>
    </main>
  )
}
