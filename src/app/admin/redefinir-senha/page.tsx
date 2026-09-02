'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { IconEye, IconEyeOff, IconCheck } from '@/components/ui/Icon'

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [tokenInvalid, setTokenInvalid] = useState(false)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  /* v146 · mostrar de quem é a conta na tela. Se por algum caminho ainda sobrar
     sessão errada, a pessoa vê o e-mail e para antes de salvar. */
  const [emailDono, setEmailDono] = useState<string | null>(null)

  /* v146 · esta tela trocava a senha de QUEM JÁ ESTAVA LOGADO no navegador.
     Aconteceu de verdade (Wanessa, 26/08): o link de recuperação dela foi aberto
     numa janela onde outra conta estava ativa, e quem teve a senha trocada foi a
     outra conta. A dona do link continuou sem conseguir entrar.

     A causa não era o link e nem o e-mail: era esta página. Ela perguntava
     `getSession()` — "existe ALGUMA sessão?" — e, achando a antiga, mostrava o
     formulário e mandava `updateUser` nela.

     Agora falha fechado. `detectSessionInUrl: false` impede o cliente de
     consumir o código sozinho; a gente desloga o que estiver aberto, troca o
     código pela sessão do DONO do link e só então libera o formulário. Se a
     troca falhar — link velho, já usado, ou aberto num navegador diferente
     daquele que pediu (o verificador do PKCE fica no que pediu) — a tela diz
     que o link não vale e ninguém tem senha trocada. Antes, esse mesmo caso
     caía na sessão errada em silêncio. */
  useEffect(() => {
    let cancelled = false
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { detectSessionInUrl: false } },
    )

    async function check() {
      const url = new URL(window.location.href)
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
      const code = url.searchParams.get('code')
      const tokenHash = url.searchParams.get('token_hash')
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')

      // Sem nenhuma prova de link, não existe formulário — mesmo que haja
      // sessão aberta. Entrar aqui pela URL não pode virar troca de senha.
      if (!code && !tokenHash && !accessToken) {
        setTokenInvalid(true)
        setReady(true)
        return
      }

      // A sessão de quem estava usando o navegador não pode sobreviver até o
      // formulário: é ela que era gravada por engano.
      await supabase.auth.signOut()

      let falhou = false
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        falhou = !!error
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        falhou = !!error
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        falhou = !!error
      } else {
        falhou = true
      }

      if (cancelled) return
      if (falhou) {
        setTokenInvalid(true)
        setReady(true)
        return
      }

      // Última conferência: a sessão que sobrou é a do dono do link.
      const { data } = await supabase.auth.getUser()
      if (cancelled) return
      if (!data.user) setTokenInvalid(true)
      else setEmailDono(data.user.email ?? null)
      setReady(true)
    }

    check()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Mesmo padrão do cadastro — sem isso, criar conta exige forte mas resetar
    // permitia voltar pra senha fraca depois.
    if (password.length < 8) {
      setError('Senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (!/[A-Z]/.test(password)) {
      setError('Senha deve conter pelo menos uma letra maiúscula.')
      return
    }
    if (!/[0-9]/.test(password)) {
      setError('Senha deve conter pelo menos um número.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não conferem.')
      return
    }

    setLoading(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { detectSessionInUrl: false } },
    )
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError('Não conseguimos atualizar a senha. Tente de novo.')
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
    // Após 2s, redireciona pro /admin (já está autenticado)
    setTimeout(() => {
      router.push('/admin')
      router.refresh()
    }, 2000)
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(30,64,175,0.35) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 85% 80%, rgba(6,182,212,0.22) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(139,92,246,0.18) 0%, transparent 60%), #050713',
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
          <p className="text-blue-400 text-sm font-medium">Criar nova senha</p>
        </div>

        {!ready ? (
          <div className="rounded-3xl p-6 flex items-center justify-center" style={{ background: 'rgba(15,23,42,0.72)', border: '1px solid rgba(59,130,246,0.25)' }}>
            <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden />
          </div>
        ) : tokenInvalid ? (
          <div
            className="rounded-3xl p-6 space-y-4 text-center"
            style={{
              background: 'rgba(15,23,42,0.72)',
              border: '1px solid rgba(239,68,68,0.3)',
            }}
          >
            <p className="font-bold text-base text-white">Link inválido ou expirado</p>
            <p className="text-sm text-slate-400">
              O link de recuperação só funciona uma vez e expira em pouco tempo. Volta pro login e pede um novo.
            </p>
            <Link
              href="/admin/login"
              className="block w-full rounded-xl py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)' }}
            >
              Voltar pro login
            </Link>
          </div>
        ) : done ? (
          <div
            className="rounded-3xl p-6 space-y-4 text-center"
            style={{
              background: 'rgba(15,23,42,0.72)',
              border: '1px solid rgba(34,197,94,0.3)',
            }}
          >
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
              <p className="font-bold text-base text-white">Senha atualizada!</p>
              <p className="text-xs text-slate-400 mt-1">Redirecionando pro painel...</p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl p-6 space-y-4"
            style={{
              background: 'rgba(15, 23, 42, 0.72)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              boxShadow:
                '0 30px 80px -30px rgba(59, 130, 246, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
            }}
          >
            {/* v146 · de quem é a conta, em letra grande. A troca de senha é
                irreversível pra quem estava usando a outra conta, e o e-mail é
                a única coisa que a pessoa reconhece antes de salvar. */}
            {emailDono && (
              <div
                className="rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.25)' }}
              >
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Nova senha da conta</p>
                <p className="text-sm font-semibold text-white break-all">{emailDono}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Não é essa conta? Feche esta página sem salvar e peça um novo link.
                </p>
              </div>
            )}

            <p className="text-xs text-slate-400">
              Crie uma nova senha pro seu painel. Ao salvar, você já entra direto.
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">Nova senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8, maiúscula e número"
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

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">Confirmar senha</label>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a senha"
                required
                className="w-full rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
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
              disabled={loading || !password || !confirm}
              className="btn btn-primary-v2 w-full disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && (
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden />
              )}
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}

        <p className="text-center text-slate-600 text-xs mt-6">
          AgendaPRO · Impulso Digital
        </p>
      </div>
    </main>
  )
}
