'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { IconEye, IconEyeOff, IconArrowLeft } from '@/components/ui/Icon'

export default function ProfissionalLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForgot, setShowForgot] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Normaliza email — evita fail quando usuário digita com caps/espaço
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

    // Verifica se é um profissional (tem registro em professionals com auth_user_id)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Erro ao verificar acesso.')
      setLoading(false)
      return
    }

    const { data: prof } = await supabase
      .from('professionals')
      .select('id, role, password_changed, is_receptionist')
      .eq('auth_user_id', user.id)
      .single()

    if (!prof) {
      // Nao e profissional — pode ser dono, redireciona pro admin
      router.push('/admin')
      router.refresh()
      return
    }

    // Primeiro login — forca troca de senha
    if (!prof.password_changed) {
      router.push('/profissional/trocar-senha')
      router.refresh()
      return
    }

    // Recepcionista: tela própria, não atende
    if (prof.is_receptionist) {
      router.push('/recepcao')
      router.refresh()
      return
    }

    // Profissional com senha ja trocada — painel normal
    router.push('/profissional')
    router.refresh()
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(16,185,129,0.30) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 85% 80%, rgba(59,130,246,0.20) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(6,182,212,0.15) 0%, transparent 60%), #050713',
      }}
    >
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

      {/* Link de volta pra home — canto superior esquerdo */}
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
          <p className="text-emerald-400 text-sm font-medium">Painel do Profissional</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-3xl p-6 space-y-4"
          style={{
            background: 'rgba(15, 23, 42, 0.72)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            boxShadow:
              '0 30px 80px -30px rgba(16, 185, 129, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
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
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
              boxShadow: '0 8px 20px -6px rgba(16,185,129,0.5)',
            }}
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
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400/80 hover:text-emerald-300 underline underline-offset-4 decoration-emerald-400/40 hover:decoration-emerald-300 transition-colors"
            >
              Esqueci a senha
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-400 mt-5">
          É o dono do negócio?{' '}
          <Link href="/admin/login" className="text-blue-400 font-medium hover:text-blue-300 transition-colors">
            Entrar pelo admin
          </Link>
        </p>

        {showForgot && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.65)' }}
            onClick={() => setShowForgot(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl p-5"
              style={{
                background: 'rgba(15, 23, 42, 0.96)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                boxShadow: '0 24px 50px -20px rgba(0,0,0,0.7)',
              }}
            >
              <p className="font-bold text-base text-white mb-2">Esqueceu a senha?</p>
              <p className="text-sm text-slate-300 leading-relaxed">
                Peça pro dono do estabelecimento abrir o painel admin em{' '}
                <span className="font-semibold text-emerald-400">Profissionais</span> e clicar em{' '}
                <span className="font-semibold text-emerald-400">&quot;Resetar senha&quot;</span> no seu card. Ele vai te mandar uma senha nova na hora.
              </p>
              <button
                onClick={() => setShowForgot(false)}
                className="mt-5 w-full py-2.5 rounded-xl text-sm font-semibold transition-transform active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
                  color: '#fff',
                }}
              >
                Entendi
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-slate-600 text-xs mt-6">
          AgendaPRO · Impulso Digital
        </p>
      </div>
    </main>
  )
}
