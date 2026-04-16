'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

type Step = 'business' | 'owner' | 'done'

export default function CadastroPage() {
  const router = useRouter()

  // Step
  const [step, setStep] = useState<Step>('business')

  // Business fields
  const [businessName, setBusinessName] = useState('')
  const [category, setCategory] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [slug, setSlug] = useState('')
  const [professionalName, setProfessionalName] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)

  // Owner fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleBusinessNameChange(val: string) {
    setBusinessName(val)
    if (!slugEdited) {
      setSlug(slugify(val))
    }
  }

  function handleSlugChange(val: string) {
    setSlug(slugify(val))
    setSlugEdited(true)
  }

  function validateBusiness() {
    if (!businessName.trim()) return 'Nome do negócio é obrigatório.'
    if (!slug.trim()) return 'Endereço da página é obrigatório.'
    if (slug.length < 3) return 'Endereço muito curto (mínimo 3 caracteres).'
    return null
  }

  function validateOwner() {
    if (!email.trim()) return 'Email é obrigatório.'
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
        address: address.trim() || null,
        slug,
        email: email.trim().toLowerCase(),
        password,
        professionalName: professionalName.trim() || businessName.trim(),
      }),
    })

    const data = await res.json()

    if (!res.ok || !data.ok) {
      setError(data.error || 'Erro ao cadastrar. Tente novamente.')
      setLoading(false)
      return
    }

    // Faz login automático após cadastro
    const supabase = createClient()
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (loginError) {
      // Cadastro ok mas login falhou — redireciona pro login manual
      router.push('/admin/login')
      return
    }

    setStep('done')
    setLoading(false)
  }

  if (step === 'done') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-4">
            <div className="flex justify-center"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg></div>
            <h2 className="text-xl font-bold text-gray-900">Tudo certo!</h2>
            <p className="text-gray-500 text-sm">
              Seu negócio foi cadastrado. Agora configure seus horários e serviços no painel.
            </p>
            <div className="space-y-2 pt-2">
              <button
                onClick={() => router.push('/admin')}
                className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
              >
                Ir para o painel
              </button>
              <a
                href={`/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm"
              >
                Ver minha página pública →
              </a>
            </div>
          </div>
          <p className="text-center text-gray-400 text-xs mt-6">AgendaPRO · Impulso Digital</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">AgendaPRO</h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 'business' ? 'Informações do negócio' : 'Acesso ao painel'}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`h-1 flex-1 rounded-full ${step === 'business' || step === 'owner' ? 'bg-gray-900' : 'bg-gray-200'}`} />
          <div className={`h-1 flex-1 rounded-full ${step === 'owner' ? 'bg-gray-900' : 'bg-gray-200'}`} />
        </div>

        {/* Step 1 — Negócio */}
        {step === 'business' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do negócio <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => handleBusinessNameChange(e.target.value)}
                placeholder="Ex: Barbearia do João"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-gray-400 text-sm bg-white"
              >
                <option value="">Selecione (opcional)</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endereço da sua página <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-gray-400">
                <span className="bg-gray-50 text-gray-400 text-xs px-3 py-3 border-r border-gray-200 whitespace-nowrap">
                  agenda-pro-seven.vercel.app/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="barbearia-do-joao"
                  className="flex-1 px-3 py-3 text-gray-900 placeholder-gray-300 focus:outline-none text-sm"
                />
              </div>
              <p className="text-gray-400 text-xs mt-1">
                Seus clientes vão acessar este link para agendar.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do profissional principal
              </label>
              <input
                type="text"
                value={professionalName}
                onChange={(e) => setProfessionalName(e.target.value)}
                placeholder={businessName || 'Ex: João Silva'}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 text-sm"
              />
              <p className="text-gray-400 text-xs mt-1">Pode adicionar mais depois no painel.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(63) 99999-9999"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço / Bairro</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Rua das Flores, 123 — Centro"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 text-sm"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              onClick={() => {
                const err = validateBusiness()
                if (err) { setError(err); return }
                setError(null)
                setStep('owner')
              }}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
            >
              Continuar →
            </button>
          </div>
        )}

        {/* Step 2 — Acesso */}
        {step === 'owner' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <p className="text-sm text-gray-500">
              Crie seu acesso ao painel de <strong className="text-gray-900">{businessName}</strong>.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar senha <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 text-sm"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              onClick={() => {
                const err = validateOwner()
                if (err) { setError(err); return }
                setError(null)
                handleSubmit()
              }}
              disabled={loading}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              {loading ? 'Cadastrando...' : 'Criar conta e entrar'}
            </button>

            <button
              onClick={() => { setError(null); setStep('business') }}
              className="w-full text-gray-400 text-sm py-2 hover:text-gray-600"
            >
              ← Voltar
            </button>
          </div>
        )}

        <p className="text-center text-gray-400 text-xs mt-6">AgendaPRO · Impulso Digital</p>
      </div>
    </main>
  )
}
