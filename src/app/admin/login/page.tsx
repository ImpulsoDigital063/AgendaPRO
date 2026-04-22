'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { IconEye, IconEyeOff, IconArrowLeft, IconCheck } from '@/components/ui/Icon'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const emailNorm = email.trim().toLowerCase()

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: emailNorm,
      password,
    })

    if (authError) {
      setError('Email ou senha incorretos.')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    const target = forgotEmail.trim().toLowerCase()
    if (!target) return
    setForgotLoading(true)
    setForgotError(null)

    const supabase = createClient()
    const appUrl =
      typeof window !== 'undefined' ? window.location.origin : 'https://agendapro.net.br'

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${appUrl}/admin/redefinir-senha`,
    })

    if (resetError) {
      setForgotError('Não conseguimos enviar o email. Tente novamente em alguns minutos.')
      setForgotLoading(false)
      return
    }

    setForgotSent(true)
    setForgotLoading(false)
  }

  function closeForgot() {
    setShowForgot(false)
    setTimeout(() => {
      setForgotEmail('')
      setForgotSent(false)
      setForgotError(null)
    }, 250)
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(30,64,175,0.35) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 85% 80%, rgba(6,182,212,0.22) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(139,92,246,0.18) 0%, transparent 60%), #050713',
      }}
    >
      {/* Grid sutil estático */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.4]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, black 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, black 0%, transparent 75%)',
        }}
      />

      {/* Voltar pra home */}
      <Link
        href="/"
        className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
      >
        <IconArrowLeft size={14} />
        Voltar
      </Link>

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <Image src="/logo-agendapro-dark.svg" alt="AgendaPRO" width={170} height={34} priority />
          </Link>
          <p className="text-blue-400 text-sm font-medium">Painel do dono</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-3xl p-6 space-y-4"
          style={{
            background: 'rgba(15, 23, 42, 0.72)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            boxShadow:
              '0 30px 80px -30px rgba(59, 130, 246, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
          }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">Email</label>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                required
                className="w-full rounded-xl pl-4 pr-11 py-3 text-white placeholder-slate-500 focus:outline-none text-sm"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                tabIndex={-1}
              >
                {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="rounded-xl px-3 py-2.5 text-sm"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#FCA5A5',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary-v2 w-full disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && (
              <span
                className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
                aria-hidden
              />
            )}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-400/80 hover:text-blue-300 underline underline-offset-4 decoration-blue-400/40 hover:decoration-blue-300 transition-colors"
            >
              Esqueci a senha
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-400 mt-5">
          Não tem conta?{' '}
          <Link href="/cadastro" className="text-blue-400 font-medium hover:text-blue-300 transition-colors">
            Cadastre seu negócio
          </Link>
        </p>

        <p className="text-center text-sm text-slate-400 mt-2">
          É profissional?{' '}
          <Link href="/profissional/login" className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors">
            Entrar pelo painel do profissional
          </Link>
        </p>

        <p className="text-center text-slate-600 text-xs mt-6">
          AgendaPRO · Impulso Digital
        </p>
      </div>

      {showForgot && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={closeForgot}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl p-5"
            style={{
              background: 'rgba(15, 23, 42, 0.96)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              boxShadow: '0 24px 50px -20px rgba(0,0,0,0.7)',
            }}
          >
            {!forgotSent ? (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <p className="font-bold text-base text-white mb-1">Recuperar senha</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Informe o email do seu cadastro. Vamos mandar um link pra você criar uma nova senha.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1.5">Email</label>
                  <input
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoFocus
                    className="w-full rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none text-sm"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                </div>

                {forgotError && (
                  <div
                    className="rounded-xl px-3 py-2 text-xs"
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#FCA5A5',
                    }}
                  >
                    {forgotError}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeForgot}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-transform active:scale-[0.98]"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: '#CBD5E1',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotEmail.trim()}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
                    }}
                  >
                    {forgotLoading && (
                      <span
                        className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"
                        aria-hidden
                      />
                    )}
                    {forgotLoading ? 'Enviando...' : 'Enviar link'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                  style={{
                    background: 'rgba(34,197,94,0.15)',
                    color: '#22C55E',
                    boxShadow: '0 12px 32px -10px rgba(34,197,94,0.4)',
                  }}
                >
                  <IconCheck size={28} />
                </div>
                <div>
                  <p className="font-bold text-base text-white">Link enviado!</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Enviamos um email pra <span className="text-slate-200 font-medium">{forgotEmail}</span> com um link pra criar uma nova senha. Confira também a caixa de spam.
                  </p>
                </div>
                <button
                  onClick={closeForgot}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
                  }}
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
