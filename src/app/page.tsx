import Link from 'next/link'
import FAQ from '@/components/FAQ'
import IPhoneMockup from '@/components/IPhoneMockup'

const RETENTION_FEATURES = [
  {
    icon: '🏆',
    title: 'Programa de fidelidade',
    result: 'Clientes voltam para você — não para o concorrente',
    desc: 'Cada serviço gera pontos. Você define as recompensas. O cliente sabe que tem vantagem em voltar.',
  },
  {
    icon: '🔔',
    title: 'Lista de espera automática',
    result: 'Zero vaga desperdiçada quando cancela',
    desc: 'Cancelou um horário? O próximo da fila recebe email na hora e preenche a vaga automaticamente.',
  },
  {
    icon: '🔗',
    title: 'Indicação com recompensa',
    result: 'Seus clientes te trazem novos clientes',
    desc: 'Cada cliente tem um link único de indicação. Indica um amigo — os dois ganham pontos.',
  },
  {
    icon: '⭐',
    title: 'Badge Google Reviews',
    result: 'Mais avaliações no Google sem precisar pedir',
    desc: 'Sua nota aparece na página de agendamento. Cliente ganha pontos por avaliar — incentivo concreto.',
  },
]

const VALUE_ITEMS = [
  { item: 'Agenda online (Trinks, iSalon)',       price: 'R$89/mês'  },
  { item: 'Programa de fidelidade com pontos',    price: 'R$49/mês'  },
  { item: 'Sistema de indicação entre clientes',  price: 'R$79/mês'  },
  { item: 'Gestão de avaliações Google Reviews',  price: 'R$39/mês'  },
]

const STEPS = [
  { n: '01', title: 'Cadastre seu negócio',        desc: 'Nome, serviços, horários e profissionais em menos de 5 minutos. Sem técnico, sem burocracia.' },
  { n: '02', title: 'Compartilhe o link',           desc: 'Cole na bio do Instagram, no Google Meu Negócio ou no WhatsApp. Clientes agendam direto.' },
  { n: '03', title: 'O sistema trabalha por você', desc: 'Lembretes automáticos, pontos de fidelidade, indicações e Google Reviews — tudo acontece sozinho.' },
]

export default function HomePage() {
  return (
    <main style={{ background: 'var(--bg-white)', color: 'var(--text-primary)' }}>

      {/* ── Announcement bar ── */}
      <div style={{ background: 'var(--accent)', color: '#fff', textAlign: 'center', padding: '10px 24px', fontSize: '13px', fontWeight: 600, letterSpacing: '0.01em' }}>
        🎁 Oferta de lançamento — <strong>14 dias grátis</strong> em qualquer plano. Sem cartão de crédito.
      </div>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <img src="/logo-agendapro.svg" alt="AgendaPRO" style={{ height: '28px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/admin/login" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-sec)', textDecoration: 'none' }}>
              Entrar
            </Link>
            <Link href="/cadastro" className="btn-primary" style={{ padding: '10px 24px', fontSize: '14px' }}>
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="section" style={{ background: 'var(--bg-white)', paddingBottom: '60px' }}>
        <div className="container">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '48px' }}>

            {/* Badge */}
            <div className="text-center">
              <span className="section-badge light">Você acabou de ganhar 14 dias de acesso gratuito</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '64px', alignItems: 'center', width: '100%' }}
              className="hero-grid">

              {/* Texto */}
              <div>
                <h1 style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '20px' }}>
                  De agenda no WhatsApp<br />
                  para negócio que{' '}
                  <span style={{ color: 'var(--accent)' }}>cresce sozinho.</span>
                </h1>
                <p style={{ fontSize: '1.125rem', color: 'var(--text-sec)', lineHeight: 1.7, maxWidth: '500px', marginBottom: '32px' }}>
                  Agenda online, fidelidade, indicação e Google Reviews num único lugar.
                  Configure em 5 minutos. Funciona hoje mesmo.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                  <Link href="/cadastro" className="btn-primary">
                    Garantir meu acesso gratuito →
                  </Link>
                  <Link href="#como-funciona" className="btn-secondary">
                    Ver como funciona
                  </Link>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Sem cartão · Cancele quando quiser · R$67/mês após o trial
                </p>

                {/* Mini stats */}
                <div style={{ display: 'flex', gap: '32px', marginTop: '40px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
                  {[
                    { n: '24h',   l: 'Agendamento online'   },
                    { n: '-50%',  l: 'Menos faltas'          },
                    { n: '5 min', l: 'Para configurar'       },
                  ].map((s) => (
                    <div key={s.n}>
                      <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{s.n}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* iPhone */}
              <div className="hero-phone">
                <IPhoneMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section style={{ padding: '0 24px 80px' }}>
        <div className="container">
          <div className="stats-bar">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', textAlign: 'center' }}>
              {[
                { n: '+800',     l: 'Agendamentos realizados'           },
                { n: 'R$256',    l: 'Valor separado. Seu preço: R$67'   },
                { n: '14 dias',  l: 'Grátis para testar, sem cartão'    },
              ].map((s) => (
                <div key={s.n}>
                  <p style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.n}</p>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '8px', lineHeight: 1.4 }}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Segmentos ── */}
      <section style={{ background: 'var(--bg-gray)', padding: '0 24px 80px' }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: '40px' }}>
            <span className="section-badge light">Para qualquer negócio de serviço</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              { href: '/barbearia', icon: '✂️', title: 'Barbearia',        desc: 'Agenda cheia sem depender do WhatsApp.'     },
              { href: '/salao',     icon: '💇', title: 'Salão de beleza',  desc: 'Equipe com agenda e comissão individual.'   },
              { href: '/nail',      icon: '💅', title: 'Nail designer',    desc: 'Agenda no piloto automático.'               },
              { href: '/estetica',  icon: '🧴', title: 'Clínica estética', desc: 'Procedimentos e controle financeiro.'       },
            ].map((c) => (
              <a key={c.href} href={c.href} className="card" style={{ textDecoration: 'none', display: 'block', padding: '28px 24px' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '12px' }}>{c.icon}</span>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>{c.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-sec)', lineHeight: 1.5, marginBottom: '12px' }}>{c.desc}</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>Ver como funciona →</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Retenção — O que o concorrente não tem ── */}
      <section className="section" style={{ background: 'linear-gradient(135deg, var(--dark-from) 0%, var(--dark-to) 100%)', padding: '80px 24px' }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: '56px' }}>
            <span className="section-badge dark" style={{ marginBottom: '16px' }}>O que o concorrente não tem</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.75rem)', fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: '16px' }}>
              Retenção e crescimento.<br />No mesmo sistema.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.0625rem', maxWidth: '480px', margin: '0 auto' }}>
              Todo mundo tem agenda online. Só a AgendaPRO entrega o que faz o cliente voltar.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            {RETENTION_FEATURES.map((f) => (
              <div key={f.title} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '24px',
                padding: '36px 32px',
              }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '16px' }}>{f.icon}</span>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{f.title}</h3>
                <p style={{ color: '#60A5FA', fontSize: '0.875rem', fontWeight: 500, marginBottom: '10px' }}>{f.result}</p>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9375rem', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section id="como-funciona" className="section" style={{ padding: '80px 24px' }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: '56px' }}>
            <span className="section-badge light">Como funciona</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.75rem)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginTop: '16px' }}>
              Três passos.<br />Pronto para usar hoje.
            </h2>
          </div>

          <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {STEPS.map((s, i) => (
              <div key={s.n} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                <div style={{
                  minWidth: '48px', height: '48px',
                  background: 'var(--accent)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: '15px',
                  flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>{s.title}</h3>
                  <p style={{ color: 'var(--text-sec)', lineHeight: 1.6, fontSize: '0.9375rem' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Valor empilhado ── */}
      <section style={{ background: 'var(--bg-gray)', padding: '80px 24px' }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: '48px' }}>
            <span className="section-badge light">Quanto valeria tudo isso separado?</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.75rem)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginTop: '16px', marginBottom: '12px' }}>
              Veja o que você está levando.
            </h2>
            <p style={{ color: 'var(--text-sec)', fontSize: '1.0625rem' }}>
              Tudo junto, por menos de R$2,20 por dia.
            </p>
          </div>

          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              {VALUE_ITEMS.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 28px',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{r.item}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', textDecoration: 'line-through', flexShrink: 0, marginLeft: '16px' }}>{r.price}</p>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg-gray)' }}>
                <p style={{ color: 'var(--text-sec)', fontWeight: 600 }}>Total separado</p>
                <p style={{ color: 'var(--text-muted)', fontWeight: 700, textDecoration: 'line-through' }}>R$256/mês</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)' }}>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '1.0625rem' }}>AgendaPRO — tudo junto</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '2px' }}>14 dias grátis · sem cartão</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#fff', fontSize: '1.875rem', fontWeight: 800, lineHeight: 1 }}>
                    R$67<span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'rgba(255,255,255,0.7)' }}>/mês</span>
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginTop: '3px' }}>menos de R$2,20/dia</p>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Link href="/cadastro" className="btn-primary">
                Quero garantir esse valor →
              </Link>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '12px' }}>
                Oferta de lançamento — pode subir a qualquer momento
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="section" style={{ padding: '80px 24px' }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: '48px' }}>
            <span className="section-badge light">Planos</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.75rem)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, marginTop: '16px', marginBottom: '12px' }}>
              Escolha o seu.
            </h2>
            <p style={{ color: 'var(--text-sec)', fontSize: '1.0625rem' }}>
              14 dias grátis em qualquer plano. Sem cartão, sem fidelidade.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>

            {/* Solo */}
            <div className="card" style={{ position: 'relative' }}>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>Solo</h3>
                <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem' }}>Profissional independente</p>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>R$67</span>
                  <span style={{ color: 'var(--text-sec)', fontSize: '0.875rem' }}>/mês</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', textDecoration: 'line-through' }}>antes R$97</p>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  'Página de agendamento personalizada',
                  'Agendamento 24h pelo link ou redes sociais',
                  'Lembrete automático D-1 para o cliente',
                  'Painel de gestão pelo celular',
                  'Serviços ilimitados',
                  'Programa de fidelidade com pontos',
                  'Lista de espera automática',
                  'Link de indicação por cliente',
                  'Badge Google Reviews + pontos por avaliar',
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', gap: '10px', fontSize: '14px', color: 'var(--text-primary)', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {item}
                  </li>
                ))}
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0 }}>🎁</span>
                  <span style={{ fontSize: '14px' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Bônus: 2º profissional incluído</strong>
                    <span style={{ display: 'block', color: 'var(--text-sec)', fontSize: '12px', marginTop: '2px' }}>
                      Normalmente 1 — na oferta você cadastra 2
                    </span>
                  </span>
                </li>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0 }}>🎁</span>
                  <span style={{ fontSize: '14px' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Bônus: Área de divulgação exclusiva</strong>
                    <span style={{ display: 'block', color: 'var(--text-sec)', fontSize: '12px', marginTop: '2px' }}>
                      Textos prontos para Instagram, Google e WhatsApp
                    </span>
                  </span>
                </li>
              </ul>

              <p style={{ color: 'var(--green-ok)', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
                14 dias grátis — sem cartão
              </p>
              <Link href="/cadastro" className="btn-primary" style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
                Começar grátis →
              </Link>
            </div>

            {/* Equipe */}
            <div className="card-featured" style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                background: 'var(--accent)', color: '#fff',
                fontSize: '11px', fontWeight: 700, letterSpacing: '1px',
                padding: '5px 16px', borderRadius: '50px',
                whiteSpace: 'nowrap',
              }}>
                MAIS POPULAR
              </div>

              <div style={{ marginBottom: '24px', marginTop: '8px' }}>
                <h3 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>Equipe</h3>
                <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem' }}>De 3 a 5 profissionais</p>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.02em' }}>R$107</span>
                  <span style={{ color: 'var(--text-sec)', fontSize: '0.875rem' }}>/mês</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', textDecoration: 'line-through' }}>antes R$147</p>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  'Tudo do plano Solo',
                  'De 3 a 5 profissionais com agenda individual',
                  'Relatório de comissão automático por profissional',
                  'Financeiro e faturamento por período',
                  'Suporte prioritário via WhatsApp',
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', gap: '10px', fontSize: '14px', color: 'var(--text-primary)', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <p style={{ color: 'var(--green-ok)', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
                14 dias grátis — sem cartão
              </p>
              <Link href="/cadastro" className="btn-primary" style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
                Começar grátis →
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <FAQ />

      {/* ── CTA final ── */}
      <section style={{ background: 'linear-gradient(135deg, var(--dark-from) 0%, var(--dark-to) 100%)', padding: '120px 24px', textAlign: 'center' }}>
        <div className="container">
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <span className="section-badge dark" style={{ marginBottom: '24px' }}>
              14 dias grátis · sem cartão · cancele quando quiser
            </span>
            <h2 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', fontWeight: 800, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.02em', margin: '24px 0' }}>
              Seu concorrente ainda<br />agenda pelo WhatsApp.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.125rem', lineHeight: 1.7, marginBottom: '40px' }}>
              Configure agora, compartilhe o link e veja a diferença hoje mesmo.
            </p>
            <Link href="/cadastro" className="btn-primary" style={{ fontSize: '1.0625rem', padding: '18px 40px' }}>
              Garantir meu acesso gratuito →
            </Link>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '16px' }}>
              R$67/mês após o trial · Oferta de lançamento
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: 'var(--bg-gray)', borderTop: '1px solid var(--border)', padding: '48px 24px' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <img src="/logo-agendapro.svg" alt="AgendaPRO" style={{ height: '26px' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center' }}>
            {[
              { href: '/barbearia',   label: 'Barbearia'       },
              { href: '/salao',       label: 'Salão de beleza'  },
              { href: '/nail',        label: 'Nail designer'    },
              { href: '/estetica',    label: 'Clínica estética' },
              { href: '/privacidade', label: 'Privacidade'      },
              { href: '/termos',      label: 'Termos'           },
              { href: '/admin/login', label: 'Entrar'           },
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{ fontSize: '13px', color: 'var(--text-sec)', textDecoration: 'none' }}>
                {l.label}
              </Link>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
            © 2025 AgendaPRO · Um produto da{' '}
            <a href="https://impulsodigital063.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-sec)' }}>
              Impulso Digital
            </a>
            {' '}· Palmas, TO
          </p>
        </div>
      </footer>

      {/* ── Responsive tweaks ── */}
      <style>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-phone { display: none; }
        }
        @media (max-width: 700px) {
          .container > div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          [style*="grid-template-columns: repeat(3, 1fr)"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          [style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
          [style*="grid-template-columns: repeat(2, 1fr)"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </main>
  )
}
