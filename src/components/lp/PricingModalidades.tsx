'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PRICING, calcularPreco, type ModalidadeKey, type PlanoTipo } from '@/config/pricing'

/* ═══════════════════════════════════════════════════════════
   PRICING MODALIDADES — 4 jeitos de pagar
   Componente reutilizado nas 4 LPs (barbearia, salão, estética, nail).

   Toggle Solo/Equipe no topo. 4 cards lado a lado:
     - Mensal Cartão (R$67/97 — automático recorrente)
     - Mensal PIX    (R$67/97 — PIX a cada mês, lembrete D-3)
     - Semestral PIX (R$350/500 — economia R$52/82)
     - Anual PIX     (R$670/970 — economia R$134/194, ~2 meses grátis) — DESTAQUE

   Default destaque: anual_pix. Maior commitment, maior economia visível,
   menor churn — bom pro negócio + bom pro cliente.

   Cor accent customizável por nicho:
     barbearia: cyan       salão: pink
     estetica:  emerald    nail:  pink-nail
═══════════════════════════════════════════════════════════ */

type AccentKey = 'cyan' | 'pink' | 'emerald' | 'pink-nail'

const ACCENTS: Record<AccentKey, { primary: string; glow: string; bg: string; border: string }> = {
  cyan:        { primary: '#06B6D4', glow: 'rgba(6,182,212,0.35)',    bg: 'rgba(6,182,212,0.10)',   border: 'rgba(6,182,212,0.35)' },
  pink:        { primary: '#EC4899', glow: 'rgba(236,72,153,0.35)',   bg: 'rgba(236,72,153,0.10)',  border: 'rgba(236,72,153,0.35)' },
  emerald:     { primary: '#10B981', glow: 'rgba(16,185,129,0.35)',   bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.35)' },
  'pink-nail': { primary: '#F472B6', glow: 'rgba(244,114,182,0.35)',  bg: 'rgba(244,114,182,0.10)', border: 'rgba(244,114,182,0.35)' },
}

interface ModalidadeMeta {
  key: ModalidadeKey
  selo: string                      // texto do header curto
  tagline: string                   // pitch de 1 linha
  bulletPoints: string[]            // 2-3 features-chave (sem repetir o que já tá em outras)
  unidade: string                   // "/mês" ou "à vista"
  cobertura: string                 // "1 mês" / "6 meses" / "12 meses"
  destaque?: boolean                // border glow + badge "MELHOR ECONOMIA"
  badgeEconomia?: boolean           // mostra badge "Economiza R$X" no canto
}

const META: Record<ModalidadeKey, ModalidadeMeta> = {
  mensal_cartao: {
    key: 'mensal_cartao',
    selo: 'Mensal — Cartão',
    tagline: 'Automático todo mês, você não precisa lembrar',
    bulletPoints: [
      'Cobrança recorrente no cartão',
      'Cancela quando quiser, sem multa',
      'Sem boleto, sem PIX, sem fila',
    ],
    unidade: '/mês',
    cobertura: '1 mês',
  },
  mensal_pix: {
    key: 'mensal_pix',
    selo: 'Mensal — PIX',
    tagline: 'PIX a cada mês — a gente avisa 3 dias antes',
    bulletPoints: [
      'PIX único todo mês',
      'Lembrete por e-mail D-3',
      'Sem cartão, sem cadastro recorrente',
    ],
    unidade: '/mês',
    cobertura: '1 mês',
  },
  semestral_pix: {
    key: 'semestral_pix',
    selo: 'Semestral — PIX',
    tagline: '6 meses pagos de uma vez — você ganha 1 mês',
    bulletPoints: [
      '6 meses sem se preocupar com cobrança',
      'Pagamento único via PIX',
      'Trava o preço por 6 meses',
    ],
    unidade: 'à vista',
    cobertura: '6 meses',
    badgeEconomia: true,
  },
  anual_pix: {
    key: 'anual_pix',
    selo: 'Anual — PIX',
    tagline: '12 meses pagos de uma vez — 2 meses grátis no bolso',
    bulletPoints: [
      'Ano inteiro sem cobrança nenhuma',
      'Maior economia possível (~17%)',
      'Trava o preço por 12 meses',
    ],
    unidade: 'à vista',
    cobertura: '12 meses',
    destaque: true,
    badgeEconomia: true,
  },
}

interface PricingModalidadesProps {
  /** Cor accent — depende do nicho da LP */
  accent?: AccentKey
  /** Plano default — Solo (1 prof) ou Equipe (até 5 prof). */
  defaultPlano?: PlanoTipo
}

export default function PricingModalidades({
  accent = 'cyan',
  defaultPlano = 'solo',
}: PricingModalidadesProps) {
  const [plano, setPlano] = useState<PlanoTipo>(defaultPlano)
  const a = ACCENTS[accent]

  const ordem: ModalidadeKey[] = ['mensal_cartao', 'mensal_pix', 'semestral_pix', 'anual_pix']

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Toggle Solo / Equipe ── */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-slate-500">
          Você é
        </p>
        <div
          className="inline-flex rounded-2xl p-1"
          style={{
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <button
            onClick={() => setPlano('solo')}
            className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all"
            style={
              plano === 'solo'
                ? {
                    background: a.primary,
                    color: '#fff',
                    boxShadow: `0 4px 16px -4px ${a.glow}`,
                  }
                : { color: '#94A3B8' }
            }
          >
            Solo
            <span className="ml-1.5 text-[10px] opacity-70">1 + 1</span>
          </button>
          <button
            onClick={() => setPlano('equipe')}
            className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all"
            style={
              plano === 'equipe'
                ? {
                    background: a.primary,
                    color: '#fff',
                    boxShadow: `0 4px 16px -4px ${a.glow}`,
                  }
                : { color: '#94A3B8' }
            }
          >
            Equipe
            <span className="ml-1.5 text-[10px] opacity-70">até 5</span>
          </button>
        </div>
        <p className="text-[11px] sm:text-xs text-slate-400 text-center max-w-md">
          {plano === 'solo'
            ? 'Admin + 1 colaborador. Pra quem trabalha sozinho ou com 1 ajudante.'
            : 'Admin + até 5 profissionais. Cada um com agenda e comissão própria.'}
        </p>
      </div>

      {/* ── 4 cards modalidade ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {ordem.map((mKey) => {
          const meta = META[mKey]
          const preco = calcularPreco(plano, mKey)
          const valorMensalEquivalente =
            meta.cobertura === '1 mês'
              ? null
              : Math.round(preco.valorReais / preco.coberturaMeses)

          return (
            <div
              key={mKey}
              className="relative rounded-2xl p-5 sm:p-6 flex flex-col"
              style={{
                background: meta.destaque
                  ? `linear-gradient(180deg, ${a.bg} 0%, rgba(8,11,24,0.85) 50%, rgba(8,11,24,0.95) 100%)`
                  : 'rgba(255,255,255,0.04)',
                border: meta.destaque
                  ? `1px solid ${a.border}`
                  : '1px solid rgba(255,255,255,0.08)',
                boxShadow: meta.destaque
                  ? `0 25px 60px -10px ${a.glow}, 0 0 0 1px ${a.border}, inset 0 1px 0 rgba(255,255,255,0.08)`
                  : 'none',
              }}
            >
              {/* Badge destaque */}
              {meta.destaque && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap"
                  style={{
                    background: a.primary,
                    color: '#fff',
                    boxShadow: `0 6px 20px -4px ${a.glow}`,
                  }}
                >
                  <span aria-hidden>★</span>
                  Melhor economia
                </div>
              )}

              {/* Selo modalidade */}
              <p
                className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-1"
                style={{ color: meta.destaque ? a.primary : '#94A3B8' }}
              >
                {meta.selo}
              </p>

              {/* Tagline */}
              <p className="text-xs sm:text-[13px] text-slate-300 mb-4 leading-snug min-h-[36px]">
                {meta.tagline}
              </p>

              {/* Preço grande */}
              <div className="mb-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-white tabular-nums">
                    R${preco.valorReais}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-500">{meta.unidade}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">cobre {meta.cobertura}</p>
              </div>

              {/* Equivalente mensal pra modalidades à vista */}
              {valorMensalEquivalente !== null && (
                <p className="text-[11px] text-slate-400 mb-3">
                  equivale a{' '}
                  <span className="font-bold text-slate-200">
                    R${valorMensalEquivalente}/mês
                  </span>
                </p>
              )}

              {/* Badge economia */}
              {meta.badgeEconomia && preco.descontoReais > 0 && (
                <div
                  className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md mb-4 self-start"
                  style={{
                    background: 'rgba(16,185,129,0.15)',
                    border: '1px solid rgba(16,185,129,0.4)',
                    color: '#34D399',
                  }}
                >
                  Economiza R${preco.descontoReais}
                </div>
              )}

              {/* Bullet points */}
              <ul className="space-y-1.5 mb-5 text-[12px] sm:text-[13px] text-slate-300 flex-1">
                {meta.bulletPoints.map((bp) => (
                  <li key={bp} className="flex items-start gap-2">
                    <span
                      className="flex-shrink-0 mt-0.5"
                      style={{ color: meta.destaque ? a.primary : '#64748B' }}
                      aria-hidden
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className="leading-snug">{bp}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={`/cadastro?plano=${plano}&modalidade=${mKey}`}
                className="w-full inline-flex items-center justify-center gap-1.5 font-bold text-xs sm:text-sm px-4 py-3 rounded-xl transition-all min-h-[44px]"
                style={
                  meta.destaque
                    ? {
                        background: a.primary,
                        color: '#fff',
                        boxShadow: `0 8px 24px -8px ${a.glow}`,
                      }
                    : {
                        background: 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.12)',
                      }
                }
              >
                Entrar no Clube
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          )
        })}
      </div>

      {/* ── Bloco bônus Clube Fundador (uma vez, embaixo dos 4 cards) ── */}
      <div
        className="rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 max-w-3xl mx-auto"
        style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(251,191,36,0.06) 100%)',
          border: '1px dashed rgba(245,158,11,0.45)',
        }}
      >
        <div
          className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(245,158,11,0.22)', color: '#FBBF24' }}
          aria-hidden
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 12 20 22 4 22 4 12" />
            <rect x="2" y="7" width="20" height="5" />
            <line x1="12" y1="22" x2="12" y2="7" />
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
          </svg>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="text-sm sm:text-base font-black text-amber-100 leading-tight">
            Clube Fundador — os 10 primeiros entram sem o setup de R${PRICING.setup.valorReais} pra sempre
          </p>
          <p className="text-[12px] sm:text-[13px] text-amber-100/70 mt-0.5">
            Depois dos 10, o setup volta a ser cobrado. Quem entrou antes mantém isenção pra sempre.
          </p>
        </div>
      </div>

      {/* ── Ancoragem mercado ── */}
      <p className="text-center text-[11px] sm:text-xs text-slate-500 max-w-2xl mx-auto leading-relaxed">
        Trinks, ZenPlace e Booksy cobram <strong className="text-slate-300">R$ 200-500/mês</strong> com fidelidade anual.
        Aqui é <strong className="text-slate-300">sem fidelidade</strong> — cancela quando quiser.
        E <strong className="text-slate-300">7 dias de garantia</strong>: testa de verdade, se não fizer sentido, devolvo.
      </p>
    </div>
  )
}
