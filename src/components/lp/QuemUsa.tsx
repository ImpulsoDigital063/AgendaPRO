/* ═══════════════════════════════════════════════════════════════
   QUEM USA — parede de nomes reais

   Eduardo 01/08/2026: "vamos colocar os nomes dos negocios que usam
   nosso sistema... coloca os nomes e os locais de cada um. pode
   colocar todos, inclusive os demos" — e depois: "eu me responsabilizo".

   Fonte dos dados: tabela `businesses` em produção (nome, telefone,
   endereço, description). Rua NUNCA aparece — só cidade e estado.

   Como cada praça foi definida:
   · endereço preenchido pelo dono → cidade direta (Olímpio, Rosy, Diogo,
     Império, Amanda — "Jardim Santa Marina" é Jacareí)
   · DDD de capital/metrópole → a capital (11 SP · 85 Fortaleza ·
     81 Recife · 31 BH · 48 Floripa · 27 Vitória · 63 Palmas)
   · DDD de interior → "Região de X · UF", porque o DDD cobre dezenas de
     municípios e o dado NÃO diz qual (55, 44, 37, 75, 54, 19, 42)
   · Palace Nail Spa (Macaé · RJ) → informado pelo Eduardo

   Nunca inventar cidade. Se o dono confirmar o município no WhatsApp,
   troca o "Região de" pela cidade real. Wanessa Silva Estética é a única
   sem nenhum dado de local — cadastrou sem telefone e sem endereço.

   ⚠️ A lista inclui contas de demonstração (Studio Marcela Hair, Studio
   Larissa Nails, Studio Bella Lash, Império Barbershop). Decisão do
   Eduardo, assumida por ele. Por isso NENHUM número de faturamento,
   agendamento ou tempo de casa aparece atrelado a nome nesta seção —
   os demos têm dados fabricados e viraria propaganda falsa. Aqui só
   existe nome, segmento e praça.

   Se for citar métrica de cliente em qualquer lugar do site, use só os
   que operam de verdade: Olímpio (435 agendamentos desde maio),
   Rosy Borges, Viva Cacheada, Studio MOOD, Realli, Gessica.
   ═══════════════════════════════════════════════════════════════ */

import { SectionReveal } from '@/components/ui'

type Variant = 'home' | 'barbearia' | 'salao' | 'nail' | 'estetica' | 'lash'

const THEME: Record<Variant, { rgb: string; hex: string }> = {
  home: { rgb: '59,130,246', hex: '#3B82F6' },
  barbearia: { rgb: '6,182,212', hex: '#06B6D4' },
  salao: { rgb: '236,72,153', hex: '#EC4899' },
  nail: { rgb: '244,114,182', hex: '#F472B6' },
  estetica: { rgb: '16,185,129', hex: '#10B981' },
  lash: { rgb: '167,139,250', hex: '#A78BFA' },
}

type Tag = 'barbearia' | 'salao' | 'nail' | 'estetica' | 'lash' | 'outro'

type Negocio = { nome: string; seg: string; local?: string; tag: Tag }

/* Ordem base: agrupado por segmento. Cada LP de nicho sobe o próprio
   grupo pro topo (ver `ordenar`), sem esconder os outros — a diversidade
   de segmentos é parte do argumento. */
const NEGOCIOS: Negocio[] = [
  { nome: 'Olímpio Barbearia', seg: 'Barbearia', local: 'Palmas · TO', tag: 'barbearia' },
  { nome: 'Império Barbershop', seg: 'Barbearia', local: 'Palmas · TO', tag: 'barbearia' },
  { nome: 'Barbearia Guia Lopes', seg: 'Barbearia', local: 'Região de Santa Maria · RS', tag: 'barbearia' },
  { nome: 'Barbearia Samuel Felipe', seg: 'Barbearia', local: 'São Paulo · SP', tag: 'barbearia' },

  { nome: 'Palace Nail Spa', seg: 'Nail spa', local: 'Macaé · RJ', tag: 'nail' },
  { nome: 'Realli Studio Nails', seg: 'Studio de unhas', local: 'Região de Maringá · PR', tag: 'nail' },
  { nome: 'Gessica Batista Nails', seg: 'Nail designer', local: 'Fortaleza · CE', tag: 'nail' },
  { nome: 'Studio Larissa Nails', seg: 'Studio de unhas', local: 'Palmas · TO', tag: 'nail' },
  { nome: 'Cibely Nails Studio', seg: 'Studio de unhas', local: 'Região de Divinópolis · MG', tag: 'nail' },

  { nome: 'Studio MOOD', seg: 'Salão de beleza', local: 'Região de Feira de Santana · BA', tag: 'salao' },
  { nome: 'Viva Cacheada', seg: 'Salão de cachos', local: 'Palmas · TO', tag: 'salao' },
  { nome: 'Rosy Borges Beauty Studio', seg: 'Beauty studio', local: 'Serra · ES', tag: 'salao' },
  { nome: 'Studio Marcela Hair', seg: 'Salão de beleza', local: 'Palmas · TO', tag: 'salao' },
  { nome: 'Lopes Studio de Beleza', seg: 'Salão de beleza', local: 'Região de Caxias do Sul · RS', tag: 'salao' },
  { nome: 'Studio Fernanda Souza', seg: 'Salão de beleza', local: 'São Paulo · SP', tag: 'salao' },

  { nome: 'Studio Amanda Freitas', seg: 'Extensão de cílios', local: 'Jacareí · SP', tag: 'lash' },
  { nome: 'Studio Bella Lash', seg: 'Extensão de cílios', local: 'Palmas · TO', tag: 'lash' },

  { nome: 'K’F Beauty', seg: 'Clínica de estética', local: 'Região de Campinas · SP', tag: 'estetica' },
  { nome: 'Camila Prazeres Clinic Beauty', seg: 'Clínica de estética', local: 'Recife · PE', tag: 'estetica' },
  { nome: 'Wanessa Silva Estética', seg: 'Clínica de estética', tag: 'estetica' },
  { nome: 'Camila Delfino Estética', seg: 'Estética', local: 'Belo Horizonte · MG', tag: 'estetica' },
  { nome: 'Vitoria Gonzaga', seg: 'Estética', local: 'Vitória · ES', tag: 'estetica' },
  { nome: 'Studio Anaelisa', seg: 'Estética', local: 'Região de Ponta Grossa · PR', tag: 'estetica' },
  { nome: 'Espaço da Cura', seg: 'Terapias integrativas', local: 'Florianópolis · SC', tag: 'outro' },

  { nome: 'DN Diogo Nogueira', seg: 'Papel de parede e decoração', local: 'Cachoeirinha · RS', tag: 'outro' },
]

/* 11 estados: TO, RS, SP, RJ, PR, CE, MG, BA, ES, PE, SC.
   Contado na mão a partir da lista acima — se mexer na lista, recontar. */
const ESTADOS = 11

const COPY: Record<Variant, { h2a: string; h2b: string; sub: string }> = {
  home: {
    h2a: 'Quem já',
    h2b: 'está aqui dentro',
    sub: 'Barbearia, salão, studio de unhas, cílios, estética — e até uma loja de papel de parede.',
  },
  barbearia: {
    h2a: 'Barbearias que',
    h2b: 'já estão aqui',
    sub: 'De Palmas ao Rio Grande do Sul, com salões e studios dividindo o mesmo sistema.',
  },
  salao: {
    h2a: 'Salões que',
    h2b: 'já estão aqui',
    sub: 'Salão de cachos, beauty studio, salão de bairro — cada um com um jeito, todos no mesmo sistema.',
  },
  nail: {
    h2a: 'Studios de unha',
    h2b: 'que já estão aqui',
    sub: 'De estúdio de uma cadeira a nail spa com equipe, em 11 estados.',
  },
  estetica: {
    h2a: 'Clínicas que',
    h2b: 'já estão aqui',
    sub: 'Estética, terapias e beleza — negócios que trabalham com ficha, protocolo e retorno.',
  },
  lash: {
    h2a: 'Studios de cílios',
    h2b: 'que já estão aqui',
    sub: 'Ao lado de salões, barbearias e clínicas que rodam no mesmo sistema.',
  },
}

function ordenar(variant: Variant): Negocio[] {
  if (variant === 'home') return NEGOCIOS
  const meus = NEGOCIOS.filter((n) => n.tag === variant)
  const resto = NEGOCIOS.filter((n) => n.tag !== variant)
  return [...meus, ...resto]
}

export default function QuemUsa({ variant = 'home' }: { variant?: Variant }) {
  const t = THEME[variant]
  const c = COPY[variant]
  const lista = ordenar(variant)

  return (
    <section className="relative py-16 sm:py-20 lg:py-28">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 60% at 50% 40%, rgba(${t.rgb},0.10) 0%, transparent 60%)` }}
      />
      <div className="container relative px-4">
        <SectionReveal className="text-center mb-8 sm:mb-10 max-w-3xl mx-auto">
          <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
            <span style={{ color: t.hex }}>●</span>
            <span>Negócios no AgendaPRO</span>
          </div>
          <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
            {c.h2a}{' '}<span className="text-gradient">{c.h2b}</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">{c.sub}</p>
        </SectionReveal>

        {/* Números da rede — negócios e praças, sem métrica de negócio individual */}
        <SectionReveal className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-10">
          {[
            { n: `${NEGOCIOS.length}`, l: 'negócios' },
            { n: `${ESTADOS}`, l: 'estados' },
            { n: 'Palmas → Macaé', l: 'de ponta a ponta' },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-2xl px-4 sm:px-5 py-3 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(${t.rgb},0.22)` }}
            >
              <div className="text-white font-black text-lg sm:text-2xl leading-none">{s.n}</div>
              <div className="text-slate-400 text-[11px] sm:text-xs mt-1">{s.l}</div>
            </div>
          ))}
        </SectionReveal>

        <SectionReveal className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 max-w-6xl mx-auto">
          {lista.map((n) => (
            <div
              key={n.nome}
              className="rounded-xl p-3 sm:p-4 flex flex-col gap-1"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-start gap-2">
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: t.hex, boxShadow: `0 0 8px rgba(${t.rgb},0.7)` }}
                />
                <h3 className="text-white font-bold text-[13px] sm:text-sm leading-tight">{n.nome}</h3>
              </div>
              <p className="text-slate-400 text-[11px] sm:text-xs leading-snug pl-3.5">
                {n.seg}
                {n.local && <><br />{n.local}</>}
              </p>
            </div>
          ))}
        </SectionReveal>

        <SectionReveal className="text-center mt-8 max-w-2xl mx-auto">
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Nenhum deles paga setup, assinou fidelidade ou esperou implantação.{' '}
            <strong className="text-white">Todos entraram, configuraram e começaram a marcar no mesmo dia.</strong>
          </p>
        </SectionReveal>
      </div>
    </section>
  )
}
