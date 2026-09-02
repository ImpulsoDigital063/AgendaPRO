'use client'

/* ═══════════════════════════════════════════════════════════════
   O QUE VOCÊ GANHA — seis cartões, e nenhum deles promete número

   A Trinks põe seis benefícios em cartão curto com ícone de linha. O
   formato é bom e foi copiado. O CONTEÚDO não dá pra copiar, porque três
   dos deles a gente não tem (avaliação de atendimento) ou não é verdade
   pra nós.

   ─── A regra que mandou reescrever cada frase ────────────────
   Nenhum cartão promete percentual. "Reduza faltas em 40%" é o tipo de
   número que a gente não mediu e não pode provar — e a dona que ligar o
   aviso e continuar com falta vai lembrar da frase. Cada cartão aqui diz
   uma coisa VERIFICÁVEL: o que o sistema faz, não o que vai acontecer com
   o faturamento dela.

   O único número que aparece é o custo, porque é tabela.
   ═══════════════════════════════════════════════════════════════ */

import type { CSSProperties, ReactNode } from 'react'
import type { TermoPessoa } from '@/lib/segmento'
import { WA } from './ui'

const entra = (ms: number) => ({ '--enter-delay': `${ms}ms` }) as CSSProperties

export default function OQueVoceGanha({
  T,
  precoExcedente,
}: {
  T: TermoPessoa
  precoExcedente: number
}) {
  const reais = (n: number) => 'R$ ' + n.toFixed(2).replace('.', ',')

  const CARTOES: { titulo: string; corpo: string; icone: ReactNode }[] = [
    {
      titulo: 'Você para de digitar',
      corpo: `A mensagem sai sozinha quando o horário é marcado. Não precisa salvar contato ${T.de}, abrir o celular nem copiar texto.`,
      icone: (
        <>
          <path d="M4 7.5h16M4 12h10M4 16.5h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M18.5 15l3 3-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
        </>
      ),
    },
    {
      titulo: 'Você sabe quem vem',
      corpo: `${T.pron.charAt(0).toUpperCase()}${T.pron.slice(1)} toca em "Confirmar presença" e o agendamento ganha o selo na agenda. Antes disso você mandava o lembrete e continuava sem saber.`,
      icone: (
        <>
          <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8.4 12.2l2.6 2.6 4.6-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ),
    },
    {
      titulo: 'Chega mesmo em quem nunca falou com você',
      corpo: 'É o canal oficial da Meta. Solução que pareia o WhatsApp por QR Code não entrega para quem não é contato salvo — e este é justamente o caso de cliente nova.',
      icone: (
        <>
          <path d="M12 3l7.5 3.2v5.1c0 4.4-3 8.2-7.5 9.7-4.5-1.5-7.5-5.3-7.5-9.7V6.2L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 12l2.2 2.2L15.4 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ),
    },
    {
      titulo: 'O nome do seu negócio na mensagem',
      corpo: `${T.pron.charAt(0).toUpperCase()}${T.pron.slice(1)} lê o nome do seu negócio na primeira linha, e o telefone de resposta é o seu. Quem responde é você, não a gente.`,
      icone: (
        <>
          <rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2.4" stroke="currentColor" strokeWidth="1.8" />
          <path d="M7 9.6h6M7 13.4h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ),
    },
    {
      titulo: 'Você paga só o que sai',
      corpo: `Sem mensalidade escondida e sem taxa de ativação. Passou do pacote, cada mensagem extra sai ${reais(precoExcedente)} e continua saindo — o aviso não para no meio do mês.`,
      icone: (
        <>
          <rect x="3.2" y="6" width="17.6" height="12" rx="2.4" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3.2 10.2h17.6" stroke="currentColor" strokeWidth="1.8" />
          <path d="M6.8 14.4h3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ),
    },
    {
      titulo: 'Você desliga quando quiser',
      corpo: 'Cada aviso é um interruptor separado. Dá para ligar só a véspera, trocar de pacote no meio do mês ou desligar tudo, sem multa e sem falar com ninguém.',
      icone: (
        <>
          <rect x="2.6" y="7.4" width="18.8" height="9.2" rx="4.6" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="16.6" cy="12" r="2.6" fill="currentColor" />
        </>
      ),
    },
  ]

  return (
    <section id="beneficios" className="secao-ancora pt-11">
      <h3
        className="admin-enter text-[24px] sm:text-[28px] leading-tight font-bold tracking-tight"
        style={{ ...entra(0), color: 'var(--admin-text)' }}
      >
        O que você ganha
      </h3>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARTOES.map((c, i) => (
          <div
            key={c.titulo}
            className="admin-enter rounded-2xl px-4 py-4"
            style={{
              ...entra(60 + i * 45),
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <span className="inline-flex" style={{ color: WA.forte }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {c.icone}
              </svg>
            </span>
            <p
              className="text-[14.5px] font-bold leading-snug mt-2.5"
              style={{ color: 'var(--admin-text)' }}
            >
              {c.titulo}
            </p>
            <p
              className="text-[13px] leading-relaxed mt-1.5"
              style={{ color: 'var(--admin-text-2)' }}
            >
              {c.corpo}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
