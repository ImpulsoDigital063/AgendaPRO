'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ProfissionalLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

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
      .select('id, role, password_changed')
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha fornecida pelo gestor"
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
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-5">
          E o dono do negocio?{' '}
          <Link href="/admin/login" className="text-blue-400 font-medium hover:text-blue-300 transition-colors">
            Acessar painel admin
          </Link>
        </p>

        <p className="text-center text-slate-600 text-xs mt-6">
          AgendaPRO · Impulso Digital
        </p>
      </div>
    </main>
  )
}
