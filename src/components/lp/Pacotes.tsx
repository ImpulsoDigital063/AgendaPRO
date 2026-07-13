/* ═══════════════════════════════════════════════════════════════
   PACOTES — seção de LP (4 nichos)

   VERDADE (v76/v84, app/api/admin/packages/consume):
     · pacote com saldo de sessões (sessions_total / sessions_used)
     · a sessão é consumida no atendimento (baixa sozinha)
     · pacote tem validade (expires_at)
     · pacote pode incluir produto (v84)
     · o cliente paga uma vez, o saldo fica registrado
   NÃO EXISTE (não prometer):
     · cobrança recorrente/assinatura do pacote
     · lembrete automático de sessão vencendo
   ═══════════════════════════════════════════════════════════════ */

import { SectionReveal } from '@/components/ui'
import { IconCheck, IconGift } from '@/components/BarberIcons'

type Variant = 'barbearia' | 'salao' | 'nail' | 'estetica'

const THEME: Record<Variant, { rgb: string; hex: string; soft: string }> = {
  barbearia: { rgb: '6,182,212', hex: '#06B6D4', soft: '#67E8F9' },
  salao: { rgb: '236,72,153', hex: '#EC4899', soft: '#F9A8D4' },
  nail: { rgb: '244,114,182', hex: '#F472B6', soft: '#F9A8D4' },
  estetica: { rgb: '16,185,129', hex: '#10B981', soft: '#6EE7B7' },
}

const COPY: Record<Variant, { h2a: string; h2b: string; sub: string; pacote: string; total: number; usadas: number; valor: string; avulso: string; fecho: string }> = {
  barbearia: {
    h2a: 'Vende pacote de corte?',
    h2b: 'O saldo se controla sozinho.',
    sub: 'Cliente comprou 4 cortes adiantado. Quem lembra quantos ele já usou — você ou o caderno atrás do espelho?',
    pacote: 'Clube do Corte · 4 cortes', total: 4, usadas: 2,
    valor: 'R$ 160,00', avulso: 'R$ 45,00 avulso',
    fecho: 'Dinheiro na frente, cliente voltando. E ninguém discutindo quantos cortes sobraram.',
  },
  salao: {
    h2a: 'Vende pacote de escova?',
    h2b: 'O saldo se controla sozinho.',
    sub: 'A cliente pagou 8 escovas adiantado. Quantas ela já usou? Se a resposta está na memória de alguém, uma hora vai dar discussão no balcão.',
    pacote: 'Escova · 8 sessões', total: 8, usadas: 3,
    valor: 'R$ 640,00', avulso: 'R$ 95,00 avulsa',
    fecho: 'Dinheiro na frente, cliente voltando. E ninguém discutindo quantas sessões sobraram.',
  },
  nail: {
    h2a: 'Vende pacote de manutenção?',
    h2b: 'O saldo se controla sozinho.',
    sub: 'A cliente pagou 5 manutenções adiantado. Quantas ela já fez? Se está anotado na agenda de papel, uma hora vai dar discussão.',
    pacote: 'Manutenção · 5 sessões', total: 5, usadas: 2,
    valor: 'R$ 400,00', avulso: 'R$ 95,00 avulsa',
    fecho: 'Dinheiro na frente, cliente voltando. E ninguém discutindo quantas sessões sobraram.',
  },
  estetica: {
    h2a: 'Seu pacote de 10 sessões',
    h2b: 'não pode virar bagunça.',
    sub: 'Ela pagou R$1.500 adiantado por 10 sessões. Fez quantas? Vence quando? Errar essa conta custa caro — e o cliente sempre lembra melhor que você.',
    pacote: 'Drenagem · 10 sessões', total: 10, usadas: 4,
    valor: 'R$ 1.500,00', avulso: 'R$ 200,00 avulsa',
    fecho: 'Ticket alto, pagamento adiantado, controle no sistema. É assim que pacote vira lucro em vez de dor de cabeça.',
  },
}

const BULLETS = [
  { t: 'O saldo fica registrado', d: 'Quantas sessões ele comprou, quantas já usou, quantas faltam. Na ficha do cliente, não na sua memória.' },
  { t: 'A sessão baixa no atendimento', d: 'Você atende, marca como usada e o saldo cai sozinho. Sem risco de dar uma sessão a mais de graça.' },
  { t: 'Pacote tem validade', d: 'Você define até quando vale. Fim do prazo, fim do saldo — e isso puxa o cliente de volta.' },
  { t: 'Dinheiro entra na frente', d: 'Ele paga o pacote inteiro hoje e volta pelas próximas semanas. Seu caixa não depende só de quem aparece.' },
]

function PacoteMock({ v }: { v: Variant }) {
  const t = THEME[v]
  const c = COPY[v]
  const restam = c.total - c.usadas
  const pct = Math.round((c.usadas / c.total) * 100)

  return (
    <div
      className="w-full max-w-[380px] mx-auto rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0B0E1C 0%, #070914 100%)', border: `1px solid rgba(${t.rgb},0.28)`, boxShadow: `0 24px 60px -20px rgba(${t.rgb},0.28)` }}
    >
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: `rgba(${t.rgb},0.10)`, borderBottom: `1px solid rgba(${t.rgb},0.20)` }}>
        <span className="text-[12px] font-bold text-white">{c.pacote}</span>
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.16)', color: '#6EE7B7' }}>Ativo</span>
      </div>

      <div className="p-4 space-y-3.5">
        <div>
          <div className="flex items-end justify-between mb-2">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Restam</div>
              <div className="text-[28px] font-black text-white leading-none">
                {restam}<span className="text-[15px] text-slate-500"> de {c.total}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Pago</div>
              <div className="text-[15px] font-black" style={{ color: t.soft }}>{c.valor}</div>
            </div>
          </div>

          {/* bolinhas de sessão */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.from({ length: c.total }).map((_, i) => (
              <span
                key={i}
                className="w-5 h-5 rounded-md inline-flex items-center justify-center flex-shrink-0"
                style={
                  i < c.usadas
                    ? { background: t.hex, color: '#05070f' }
                    : { border: '1px dashed rgba(148,163,184,0.35)' }
                }
              >
                {i < c.usadas && <IconCheck size={10} strokeWidth={3} />}
              </span>
            ))}
          </div>
          <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.15)' }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${t.hex}, rgba(${t.rgb},0.5))` }} />
          </div>
        </div>

        <div className="rounded-xl px-3 py-2.5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.14)' }}>
          <span className="text-[10px] text-slate-500">Válido até</span>
          <span className="text-[11px] font-bold text-white">31/12/2026</span>
        </div>

        <div className="rounded-xl px-3 py-2.5" style={{ background: `rgba(${t.rgb},0.08)`, border: `1px solid rgba(${t.rgb},0.22)` }}>
          <div className="text-[9.5px] text-slate-400 leading-snug">
            No atendimento de hoje, o sistema pergunta:{' '}
            <strong className="text-white">usar uma sessão do pacote</strong> ou cobrar {c.avulso}?
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Pacotes({ variant }: { variant: Variant }) {
  const t = THEME[variant]
  const c = COPY[variant]

  return (
    <section className="relative py-16 sm:py-20 lg:py-28">
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(${t.rgb},0.12) 0%, transparent 60%)` }} />
      <div className="container relative px-4">
        <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
          <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
            <span className="inline-flex" style={{ color: t.soft }}><IconGift size={14} /></span>
            <span>Pacote pago na frente</span>
          </div>
          <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
            {c.h2a}{' '}<span className="text-gradient">{c.h2b}</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">{c.sub}</p>
        </SectionReveal>

        <SectionReveal>
          <div className="grid lg:grid-cols-[1fr_1.05fr] gap-8 lg:gap-10 items-center max-w-5xl mx-auto">
            <PacoteMock v={variant} />
            <div className="space-y-4 sm:space-y-5">
              <ul className="space-y-3.5 text-sm sm:text-base">
                {BULLETS.map((b) => (
                  <li key={b.t} className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg inline-flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `rgba(${t.rgb},0.12)`, border: `1px solid rgba(${t.rgb},0.3)`, color: t.soft }}>
                      <IconCheck size={14} strokeWidth={2.5} />
                    </span>
                    <span>
                      <strong className="text-white block leading-snug">{b.t}</strong>
                      <span className="text-slate-400 leading-relaxed">{b.d}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-slate-500 leading-relaxed">{c.fecho}</p>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  )
}
