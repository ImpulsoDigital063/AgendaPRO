'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const CATEGORIES = [
  'Barbearia',
  'Salão de beleza',
  'Estúdio de tatuagem',
  'Clínica estética',
  'Nail designer',
  'Manicure',
  'Psicólogo / Terapeuta',
  'Personal trainer',
  'Outro',
]

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function formatPhoneBR(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

type Step = 'business' | 'owner' | 'done'

type SlugStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'taken' }
  | { state: 'invalid'; message: string }

const SLUG_REASON_MSG: Record<string, string> = {
  short: 'Mínimo 3 caracteres.',
  long: 'Máximo 50 caracteres.',
  invalid: 'Use apenas letras minúsculas, números e hífen.',
  reserved: 'Esse endereço é reservado. Escolha outro.',
}

export default function CadastroPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('business')

  const [businessName, setBusinessName] = useState('')
  const [category, setCategory] = useState('')
  const [phone, setPhone] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ state: 'idle' })

  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleBusinessNameChange(val: string) {
    setBusinessName(val)
    if (!slugEdited) {
      const auto = slugify(val)
      setSlug(auto)
      checkSlug(auto)
    }
  }

  function handleSlugChange(val: string) {
    const cleaned = slugify(val)
    setSlug(cleaned)
    setSlugEdited(true)
    checkSlug(cleaned)
  }

  function checkSlug(s: string) {
    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current)
    if (!s) {
      setSlugStatus({ state: 'idle' })
      return
    }
    setSlugStatus({ state: 'checking' })
    slugDebounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/cadastro/check-slug?slug=${encodeURIComponent(s)}`)
        const data = await r.json()
        if (data.ok) {
          setSlugStatus({ state: 'available' })
        } else if (data.reason === 'taken') {
          setSlugStatus({ state: 'taken' })
        } else {
          setSlugStatus({
            state: 'invalid',
            message: SLUG_REASON_MSG[data.reason] ?? 'Endereço inválido.',
          })
        }
      } catch {
        setSlugStatus({ state: 'idle' })
      }
    }, 380)
  }

  useEffect(() => {
    return () => {
      if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current)
    }
  }, [])

  function validateBusiness() {
    if (!businessName.trim()) return 'Nome do negócio é obrigatório.'
    if (slugStatus.state === 'taken') return 'Esse endereço já está em uso. Escolha outro.'
    if (slugStatus.state === 'invalid') return slugStatus.message
    if (slugStatus.state === 'checking') return 'Aguarde a checagem do endereço…'
    if (slugStatus.state !== 'available') return 'Defina um endereço válido para sua página.'
    return null
  }

  function validateOwner() {
    if (!ownerName.trim()) return 'Seu nome é obrigatório.'
    if (ownerName.trim().length < 2) return 'Seu nome precisa ter pelo menos 2 letras.'
    if (!email.trim()) return 'Email é obrigatório.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Email inválido.'
    if (password.length < 8) return 'Senha deve ter pelo menos 8 caracteres.'
    if (!/[A-Z]/.test(password)) return 'Senha deve conter pelo menos uma letra maiúscula.'
    if (!/[0-9]/.test(password)) return 'Senha deve conter pelo menos um número.'
    if (password !== confirmPassword) return 'As senhas não coincidem.'
    return null
  }

  async function handleSubmit() {
    setError(null)
    setLoading(true)

    const res = await fetch('/api/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: businessName.trim(),
        category: category || null,
        phone: phone.trim() || null,
        address: null,
        slug,
        email: email.trim().toLowerCase(),
        password,
        // Nome do dono — aparece como profissional default na agenda.
        // Cliente final escolhe esse nome ao agendar (ex: "Olímpio" em vez
        // do nome da barbearia toda).
        professionalName: ownerName.trim(),
      }),
    })

    const data = await res.json()

    if (!res.ok || !data.ok) {
      setError(data.error || 'Erro ao cadastrar. Tente novamente.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (loginError) {
      router.push('/admin/login')
      return
    }

    setStep('done')
    setLoading(false)
  }

  const publicUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${slug}`
      : `https://agendapro.net.br/${slug}`

  const auroraBg = {
    background:
      'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(16,185,129,0.30) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 85% 80%, rgba(59,130,246,0.20) 0%, transparent 55%), #050713',
  }

  const cardStyle = {
    background: 'rgba(15, 23, 42, 0.72)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    boxShadow:
      '0 30px 80px -30px rgba(16, 185, 129, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
  }

  const ctaStyle = {
    background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
    boxShadow: '0 8px 20px -6px rgba(16,185,129,0.5)',
  }

  // ============== TELA DONE ==============
  if (step === 'done') {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={auroraBg}
      >
        <div className="w-full max-w-sm relative">
          <div className="text-center mb-6">
            <Image src="/logo-agendapro-dark-signed.svg" alt="AgendaPRO by Impulso Digital" width={200} height={58} priority />
          </div>

          <div className="rounded-3xl p-7 text-center" style={cardStyle}>
            <div
              className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-white mb-1">Conta criada!</h2>
            <p className="text-sm text-slate-400 mb-4">
              Sua conta em <span className="text-white font-semibold">{businessName}</span> está pronta. Última etapa: liberar o painel.
            </p>

            <div
              className="rounded-2xl p-3 mb-5 text-left"
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            >
              <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1 font-semibold">
                Seu link público (libera após pagamento)
              </p>
              <p className="text-sm text-emerald-300 font-medium truncate">{publicUrl}</p>
            </div>

            <button
              onClick={() => router.push('/admin')}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all"
              style={ctaStyle}
            >
              Escolher plano e liberar painel →
            </button>
          </div>

          <p className="text-center text-slate-600 text-xs mt-6">
            AgendaPRO · Impulso Digital
          </p>
        </div>
      </main>
    )
  }

  // ============== STEPS ==============
  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={auroraBg}
    >
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-5">
          <Image src="/logo-agendapro-dark-signed.svg" alt="AgendaPRO by Impulso Digital" width={200} height={58} priority />
          <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(6,182,212,0.2) 100%)',
              color: '#5EEAD4',
              border: '1px solid rgba(16,185,129,0.3)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
            </svg>
            Sem setup · Sem fidelidade
          </div>
          <p className="text-sm text-slate-400 mt-3">
            {step === 'business'
              ? 'Vamos colocar sua agenda no ar em 2 minutos.'
              : 'Quase lá. Crie seu acesso ao painel.'}
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-5 px-1">
          <div className="flex items-center gap-2 flex-1">
            <div
              className="h-1.5 flex-1 rounded-full transition-all"
              style={{
                background:
                  step === 'business' || step === 'owner'
                    ? 'linear-gradient(90deg, #10B981 0%, #06B6D4 100%)'
                    : 'rgba(255,255,255,0.08)',
              }}
            />
            <div
              className="h-1.5 flex-1 rounded-full transition-all"
              style={{
                background:
                  step === 'owner'
                    ? 'linear-gradient(90deg, #10B981 0%, #06B6D4 100%)'
                    : 'rgba(255,255,255,0.08)',
              }}
            />
          </div>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            {step === 'business' ? '1 de 2' : '2 de 2'}
          </span>
        </div>

        {/* ============== STEP 1 ============== */}
        {step === 'business' && (
          <div className="rounded-3xl p-6 space-y-4" style={cardStyle}>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Nome do negócio <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => handleBusinessNameChange(e.target.value)}
                placeholder="Ex: Barbearia do João"
                className="w-full rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
                style={inputStyle}
              >
                <option value="" style={{ color: '#000' }}>Selecione (opcional)</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} style={{ color: '#000' }}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Endereço da sua página <span className="text-emerald-400">*</span>
              </label>
              <div
                className="flex items-center rounded-xl overflow-hidden"
                style={inputStyle}
              >
                <span className="text-slate-500 text-xs px-3 py-3 whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.25)' }}>
                  agendapro.net.br/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="seu-negocio"
                  className="flex-1 px-3 py-3 text-white placeholder-slate-500 focus:outline-none text-sm bg-transparent"
                />
                <div className="px-3">
                  {slugStatus.state === 'checking' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                      <path d="M21 12a9 9 0 11-6.22-8.56" />
                    </svg>
                  )}
                  {slugStatus.state === 'available' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                  {(slugStatus.state === 'taken' || slugStatus.state === 'invalid') && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                </div>
              </div>
              <p className="text-xs mt-1.5"
                style={{
                  color:
                    slugStatus.state === 'available' ? '#22C55E'
                    : slugStatus.state === 'taken' ? '#F87171'
                    : slugStatus.state === 'invalid' ? '#F87171'
                    : '#64748B',
                }}
              >
                {slugStatus.state === 'available' && `Disponível! agendapro.net.br/${slug}`}
                {slugStatus.state === 'taken' && 'Esse endereço já está em uso.'}
                {slugStatus.state === 'invalid' && slugStatus.message}
                {(slugStatus.state === 'idle' || slugStatus.state === 'checking') &&
                  'Esse vai ser o link que seus clientes acessam pra agendar.'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">Telefone / WhatsApp</label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                placeholder="(63) 99999-9999"
                className="w-full rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm"
                style={inputStyle}
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={() => {
                const err = validateBusiness()
                if (err) { setError(err); return }
                setError(null)
                setStep('owner')
              }}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all"
              style={ctaStyle}
            >
              Continuar →
            </button>
          </div>
        )}

        {/* ============== STEP 2 ============== */}
        {step === 'owner' && (
          <div className="rounded-3xl p-6 space-y-4" style={cardStyle}>
            <div
              className="rounded-xl px-3 py-2.5 text-xs flex items-center gap-2"
              style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className="text-slate-300">
                <span className="font-semibold text-white">{businessName}</span> · agendapro.net.br/<span className="text-emerald-300">{slug}</span>
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Seu nome <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Como aparece pro cliente — ex: Olímpio"
                autoComplete="name"
                className="w-full rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm"
                style={inputStyle}
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Vira o profissional da sua agenda. Você adiciona outros profissionais depois nas Configurações.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Email <span className="text-emerald-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className="w-full rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Senha <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8, maiúscula e número"
                  autoComplete="new-password"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-white placeholder-slate-500 focus:outline-none text-sm"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1.5">
                Confirmar senha <span className="text-emerald-400">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                autoComplete="new-password"
                className="w-full rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm"
                style={inputStyle}
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={() => {
                const err = validateOwner()
                if (err) { setError(err); return }
                setError(null)
                handleSubmit()
              }}
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40"
              style={ctaStyle}
            >
              {loading ? 'Cadastrando...' : 'Criar conta e entrar'}
            </button>

            <button
              onClick={() => { setError(null); setStep('business') }}
              className="w-full text-slate-400 text-sm py-2 hover:text-white transition-colors"
            >
              ← Voltar
            </button>
          </div>
        )}

        <p className="text-center text-slate-600 text-xs mt-6">
          AgendaPRO · Impulso Digital
        </p>
      </div>
    </main>
  )
}
