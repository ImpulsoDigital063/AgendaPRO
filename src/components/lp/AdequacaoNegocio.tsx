/* ═══════════════════════════════════════════════════════════════
   ADEQUAÇÃO AO NEGÓCIO — o diferencial que não é software

   Eduardo 01/08/2026: "um serviço que ofereço e venho fazendo é
   personalizar o sistema de acordo com as necessidades do negócio".
   Casos reais: Studio MOOD (fluxo de balcão), Realli (profissionais
   controlando as próprias agendas, antes era recepção/adm), Rosy
   (fichas integradas), Olímpio (melhorias saídas do uso diário).

   Trinks, Booksy e Avec entregam a mesma tela pra dezenas de milhares
   de negócios. Aqui o cliente fala com quem escreve o código — e o
   código muda.

   ⚠️ Os casos estão descritos pelo QUE foi feito, sem nome de cliente:
   não há autorização pra citar. A exceção é a Barbearia Olímpio, que já
   aparece nomeada nos mockups do site. Se os outros autorizarem, é só
   trocar o título do card.
   ═══════════════════════════════════════════════════════════════ */

import { SectionReveal } from '@/components/ui'

type Variant = 'barbearia' | 'salao' | 'nail' | 'estetica' | 'lash'

const THEME: Record<Variant, { rgb: string; hex: string }> = {
  barbearia: { rgb: '6,182,212', hex: '#06B6D4' },
  salao: { rgb: '236,72,153', hex: '#EC4899' },
  nail: { rgb: '244,114,182', hex: '#F472B6' },
  estetica: { rgb: '16,185,129', hex: '#10B981' },
  lash: { rgb: '167,139,250', hex: '#A78BFA' },
}

const COPY: Record<Variant, { h2a: string; h2b: string; sub: string; fecho: string }> = {
  barbearia: {
    h2a: 'Sua barbearia não cabe',
    h2b: 'num molde pronto?',
    sub: 'Quando uma barbearia entra, a gente estuda como ela funciona de verdade — do jeito que o dinheiro entra ao horário em que o movimento aperta — e ajusta o sistema pra aquilo.',
    fecho: 'A Barbearia Olímpio usa todo dia desde maio. Boa parte do que existe hoje no sistema saiu do uso real dela.',
  },
  salao: {
    h2a: 'Seu salão não cabe',
    h2b: 'num molde pronto?',
    sub: 'Cada salão tem um jeito: uns marcam tudo antes, outros atendem quem chega; uns têm recepção, outros deixam a equipe se virar. A gente estuda o seu e ajusta o sistema pra ele.',
    fecho: 'Num studio com 5 profissionais e sem recepção, as meninas passaram a marcar e receber sozinhas — no ar em menos de 24 horas depois do pedido.',
  },
  nail: {
    h2a: 'Seu estúdio não cabe',
    h2b: 'num molde pronto?',
    sub: 'Você tem um jeito de trabalhar que levou anos pra afinar. Em vez de te obrigar a mudar tudo pra caber no sistema, a gente ajusta o sistema pro seu jeito.',
    fecho: 'Num studio de unhas com 5 profissionais e sem recepção, cada uma passou a marcar e receber sozinha — no ar em menos de 24 horas.',
  },
  estetica: {
    h2a: 'Sua clínica não cabe',
    h2b: 'num molde pronto?',
    sub: 'Protocolo, ficha, pacote de sessões, retorno. Cada clínica tem o próprio fluxo — e a gente ajusta o sistema pra ele em vez de te entregar uma tela genérica.',
    fecho: 'Já integramos ficha de cliente pra quem trabalhava com papel e mudamos o fluxo pra quem atende sem agendamento prévio.',
  },
  lash: {
    h2a: 'Seu studio não cabe',
    h2b: 'num molde pronto?',
    sub: 'Mapping, curvatura, manutenção de 21 dias, termo assinado. Se falta alguma coisa do seu jeito de trabalhar, a gente ajusta o sistema — não o contrário.',
    fecho: 'Já criamos acesso próprio pras profissionais num studio sem recepção e integramos ficha de cliente pra quem trabalhava com papel.',
  },
}

const CASOS = [
  {
    t: 'Atendia sem agendamento prévio',
    d: 'A cliente chegava sem marcar e o sistema todo era pensado pra quem agenda antes. Criamos o fluxo de balcão: atende, registra depois e fecha a conta na hora.',
  },
  {
    t: 'A dona era a única que marcava',
    d: 'Toda cliente passava por ela, mesmo com a mão na massa. Cada profissional ganhou login próprio pra marcar, receber e bloquear a agenda dela.',
  },
  {
    t: 'A ficha era de papel',
    d: 'Anos de histórico numa pasta que não podia se perder na migração. A ficha virou digital e passou a abrir dentro do próprio atendimento.',
  },
]

export default function AdequacaoNegocio({ variant }: { variant: Variant }) {
  const t = THEME[variant]
  const c = COPY[variant]

  return (
    <section className="relative py-16 sm:py-20 lg:py-28">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(${t.rgb},0.10) 0%, transparent 60%)` }}
      />
      <div className="container relative px-4">
        <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
          <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
            <span style={{ color: t.hex }}>●</span>
            <span>Adequação ao seu negócio</span>
          </div>
          <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
            {c.h2a}{' '}<span className="text-gradient">{c.h2b}</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            {c.sub} Não é suporte que responde ticket em 48 horas — é ajuste no produto, feito por
            quem escreve o código.
          </p>
        </SectionReveal>

        <SectionReveal className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {CASOS.map((caso) => (
            <div
              key={caso.t}
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(${t.rgb},0.22)` }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `rgba(${t.rgb},0.14)`, color: t.hex, border: `1px solid rgba(${t.rgb},0.32)` }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <h3 className="text-white font-bold text-[15px] mb-1.5 leading-tight">{caso.t}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{caso.d}</p>
            </div>
          ))}
        </SectionReveal>

        <SectionReveal className="text-center mt-8 max-w-2xl mx-auto">
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            {c.fecho}{' '}
            <strong className="text-white">
              Os aplicativos grandes entregam a mesma tela pra dezenas de milhares de negócios. Aqui,
              se o seu jeito de trabalhar não cabe no sistema, o sistema muda.
            </strong>
          </p>
        </SectionReveal>
      </div>
    </section>
  )
}
