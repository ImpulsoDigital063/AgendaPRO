import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function LoginRouter() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Ja logado: redireciona pro painel certo
  if (user) {
    const { data: prof } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (prof) redirect('/profissional')
    redirect('/admin')
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(30,64,175,0.35) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 85% 80%, rgba(6,182,212,0.22) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(139,92,246,0.18) 0%, transparent 60%), #050713',
      }}
    >
      <div className="relative w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image src="/logo-agendapro-dark.svg" alt="AgendaPRO" width={150} height={30} priority />
        </div>

        <div
          className="rounded-3xl p-7 space-y-5"
          style={{
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-white">Acessar painel</h1>
            <p className="text-sm text-slate-400">Como você usa o AgendaPRO?</p>
          </div>

          <Link
            href="/admin/login"
            className="block rounded-2xl p-4 transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
              boxShadow: '0 12px 28px -8px rgba(59,130,246,0.55)',
            }}
          >
            <p className="text-white font-bold text-sm">Sou dono do negócio</p>
            <p className="text-white/80 text-xs mt-0.5">Painel completo: agenda, financeiro, profissionais</p>
          </Link>

          <Link
            href="/profissional/login"
            className="block rounded-2xl p-4 transition-all hover:opacity-90"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <p className="text-white font-bold text-sm">Sou profissional</p>
            <p className="text-slate-400 text-xs mt-0.5">Vejo minha agenda do dia e meus horários</p>
          </Link>

          <p className="text-center text-xs pt-2" style={{ color: 'rgba(148,163,184,0.7)' }}>
            Não tem conta?{' '}
            <Link href="/cadastro" className="text-blue-400 font-semibold">
              Criar negócio grátis
            </Link>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(100,116,139,0.7)' }}>
          AgendaPRO · Impulso Digital
        </p>
      </div>
    </main>
  )
}
