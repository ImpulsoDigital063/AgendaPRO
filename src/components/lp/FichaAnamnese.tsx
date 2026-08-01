/* ═══════════════════════════════════════════════════════════════
   FICHA DE ANAMNESE — seção de LP (nail · estética · salão)

   Vende o módulo de fichas por nicho (src/lib/fichas/).
   O que é VERDADE e pode ser prometido aqui:
     · perguntas de saúde por nicho (cilios.ts · estetica-facial.ts · capilar.ts)
     · mapping desenhável com o dedo (DrawCanvas.tsx, background='eyes')
     · curvatura / espessura / efeito, marca+lote+validade da cola
     · termo de responsabilidade + assinatura à mão (DrawCanvas)
     · PDF A4 com mapping e assinatura embutidos → WhatsApp (useFichaPdf.ts)
   O que NÃO existe e NÃO pode ser dito:
     · cliente preencher sozinha (não há link público/QR)
     · alerta/contraindicação automática
     · ficha anexada à comanda
   ═══════════════════════════════════════════════════════════════ */

import { SectionReveal } from '@/components/ui'
import { IconCheck, IconWhatsapp, IconSparkles } from '@/components/BarberIcons'

type Variant = 'nail' | 'estetica' | 'salao' | 'lash'

const THEME: Record<Variant, { rgb: string; hex: string; soft: string }> = {
  nail: { rgb: '244,114,182', hex: '#F472B6', soft: '#F9A8D4' },
  estetica: { rgb: '16,185,129', hex: '#10B981', soft: '#6EE7B7' },
  salao: { rgb: '236,72,153', hex: '#EC4899', soft: '#F9A8D4' },
  // Lash designer · roxo, pra separar visualmente de nail (rosa)
  lash: { rgb: '167,139,250', hex: '#A78BFA', soft: '#C4B5FD' },
}

const COPY: Record<Variant, { pill: string; h2a: string; h2b: string; sub: string; fichaTitulo: string; itens: string[]; bullets: { t: string; d: string }[]; fecho: string }> = {
  // 01/08/2026 · a variante `nail` estava com conteúdo de CÍLIOS (mapping,
  // curvatura B a M, marca da cola). Era lash ocupando a página de unhas. O
  // conteúdo de cílios foi preservado na variante `lash` abaixo — ele é bom
  // demais pra jogar fora e vira a base da LP de lash designer.
  nail: {
    pill: 'Ficha digital · sem papel',
    h2a: 'Sua pasta de fichas',
    h2b: 'cabe no celular.',
    sub: 'Anamnese, foto do trabalho e o produto que você usou — do jeito que você já faz no caderno. Só que não molha, não some, e você acha em 3 segundos.',
    fichaTitulo: 'Unhas · Anamnese',
    itens: ['Alergia a acrílico / gel / esmalte', 'Micose ou onicomicose', 'Diabetes', 'Gestante ou lactante', 'Rói unha / cutícula sensível'],
    bullets: [
      { t: 'As perguntas de saúde já vêm prontas', d: 'Alergia a acrílico e gel, micose, diabetes, gestante, cutícula sensível. Ela marca o que se aplica e detalha embaixo — antes de sentar na cadeira.' },
      { t: 'Foto do antes e depois, junto do atendimento', d: 'A foto fica presa àquele horário, não perdida na galeria. Na manutenção, você abre e vê exatamente o que fez da última vez: formato, cor, alongamento.' },
      { t: 'Marca e lote do produto que você usou', d: 'Se a cliente reclamar de descolamento ou reação, você abre a ficha e mostra o que foi aplicado, em que dia. É a sua proteção.' },
      { t: 'Termo assinado na tela', d: 'A cliente assina com o dedo. Autoriza o procedimento e, se quiser, o uso da foto no seu portfólio.' },
    ],
    fecho: 'Trinks, Booksy e Avec não têm ficha de anamnese. Aqui vem junto — na mensalidade que você já ia pagar.',
  },
  lash: {
    pill: 'Ficha digital · sem papel',
    h2a: 'Sua pasta de fichas',
    h2b: 'cabe no celular.',
    sub: 'Anamnese, mapping e termo assinado — do jeito que você já faz no caderno. Só que não molha, não some, e você acha em 3 segundos.',
    fichaTitulo: 'Cílios · Anamnese',
    itens: ['Alergia a cosmético / cola / látex', 'Usa lentes de contato', 'Glaucoma / blefarite', 'Gestante ou lactante', 'Dorme de lado'],
    bullets: [
      { t: '20 perguntas de saúde, prontas', d: 'Alergia a cola, lente de contato, glaucoma, gestante, tratamento nos olhos. Ela marca o que se aplica e detalha embaixo.' },
      { t: 'O mapping você risca com o dedo', d: 'Dois olhos na tela, você desenha o mapeamento por cima — igual no caderno. Efeito, curvatura (B a M) e espessura (0.03 a 0.20) ficam salvos junto.' },
      { t: 'Marca, lote e validade da cola', d: 'Se a cliente reagir daqui a seis meses, você abre a ficha e mostra exatamente o que usou. É a sua proteção.' },
      { t: 'Termo assinado na tela', d: 'A cliente assina com o dedo. Autoriza o procedimento e, se quiser, o uso da foto no seu portfólio.' },
    ],
    fecho: 'Trinks, Booksy e Avec não têm ficha de anamnese. Aqui vem junto — na mensalidade que você já ia pagar.',
  },
  estetica: {
    pill: 'Ficha digital · sem papel',
    h2a: 'A ficha da cliente',
    h2b: 'sai da gaveta.',
    sub: 'Anamnese, análise de pele e histórico — organizados por cliente. Sem pasta, sem papel amassado, sem procurar na hora do atendimento.',
    fichaTitulo: 'Estética Facial · Anamnese',
    itens: ['Usa ácido ou peeling químico', 'Grávida ou amamentando', 'Já teve câncer de pele', 'Alérgica a algum medicamento', 'Faz uso de filtro solar'],
    bullets: [
      { t: 'Anamnese completa, pronta', d: 'Ácidos e peelings, gestação, histórico de câncer de pele (pessoal e familiar), alergia a medicamento, uso de filtro solar.' },
      { t: 'Análise de pele registrada', d: 'Biotipo, hidratação, grau de acne (I a III), textura, escala Glogau e profundidade das rugas. Fica gravado por cliente.' },
      { t: 'Histórico entre sessões', d: 'Cada avaliação vira um registro datado. Você abre e vê o que foi feito da última vez, sem depender da memória.' },
      { t: 'Foto de antes e depois', d: 'A galeria da cliente guarda as fotos com data. Prova do seu trabalho e defesa do seu protocolo.' },
    ],
    fecho: 'Concorrente de agenda não guarda ficha clínica. Aqui vem junto — na mensalidade que você já ia pagar.',
  },
  salao: {
    pill: 'Ficha digital · sem papel',
    h2a: 'A ficha da cliente',
    h2b: 'sai da gaveta.',
    sub: 'Anamnese capilar e termo assinado — do jeito que você já faz no papel. Só que não some e você acha em 3 segundos.',
    fichaTitulo: 'Capilar · Anamnese',
    itens: ['Possui química no cabelo', 'Já teve reação alérgica a química', 'Queda excessiva', 'Feridas no couro cabeludo', 'Já usou tranças ou mega hair'],
    bullets: [
      { t: 'Anamnese capilar, pronta', d: 'Química no cabelo, reação alérgica anterior, couro cabeludo, queda, e o que ela já usou antes (tranças, fibras, mega hair).' },
      { t: 'Tipo de cabelo e de couro', d: 'Liso, ondulado, cacheado ou crespo. Couro oleoso, normal, seco ou sensível. Fica registrado por cliente.' },
      { t: 'Termo assinado na tela', d: 'A cliente assina com o dedo, ciente do tempo de uso recomendado e da manutenção. É a sua proteção se ela usar além do prazo.' },
      { t: 'Experiência anterior', d: 'Se já teve dor, coceira ou quebra em outro salão, fica anotado. Você adapta o serviço antes de começar.' },
    ],
    fecho: 'Concorrente de agenda não guarda ficha. Aqui vem junto — na mensalidade que você já ia pagar.',
  },
}

/* ── Mini-UI: a ficha na tela do celular ───────────────────── */
function FichaMock({ v }: { v: Variant }) {
  const t = THEME[v]
  const c = COPY[v]
  const isCilios = v === 'nail'

  return (
    <div
      className="relative rounded-2xl overflow-hidden mx-auto w-full max-w-[380px]"
      style={{ background: 'linear-gradient(180deg, #0B0E1C 0%, #070914 100%)', border: `1px solid rgba(${t.rgb},0.28)`, boxShadow: `0 24px 60px -20px rgba(${t.rgb},0.28)` }}
    >
      {/* cabeçalho da ficha */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: `rgba(${t.rgb},0.10)`, borderBottom: `1px solid rgba(${t.rgb},0.20)` }}>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md inline-flex items-center justify-center" style={{ background: `rgba(${t.rgb},0.18)`, color: t.soft }}>
            <IconSparkles size={12} />
          </span>
          <span className="text-[12px] font-bold text-white">{c.fichaTitulo}</span>
        </div>
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `rgba(${t.rgb},0.16)`, color: t.soft }}>Cliente</span>
      </div>

      <div className="p-4 space-y-3.5">
        {/* saúde */}
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-2">Fale sobre a sua saúde</div>
          <div className="space-y-1.5">
            {c.itens.map((it, i) => {
              const marcado = i === 0 || i === 2
              return (
                <div key={it} className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-[4px] inline-flex items-center justify-center flex-shrink-0"
                    style={marcado ? { background: t.hex, color: '#05070f' } : { border: '1px solid rgba(148,163,184,0.35)' }}
                  >
                    {marcado && <IconCheck size={9} strokeWidth={3} />}
                  </span>
                  <span className={`text-[10.5px] leading-tight ${marcado ? 'text-white font-semibold' : 'text-slate-500'}`}>{it}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* mapping (só cílios) ou análise (estética/salão) */}
        {isCilios ? (
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.12)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Mapping &amp; Estilo</span>
              <span className="text-[8.5px] text-slate-600">desenhe com o dedo</span>
            </div>
            {/* dois olhos com o mapeamento riscado à mão */}
            <svg viewBox="0 0 260 66" className="w-full" aria-hidden>
              {[0, 132].map((dx) => (
                <g key={dx} transform={`translate(${dx},0)`}>
                  <path d="M4 34 Q 32 12 62 22 Q 92 32 124 34 Q 92 52 62 50 Q 32 48 4 34 Z" fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth="1.2" />
                  <ellipse cx="64" cy="34" rx="11" ry="9" fill="none" stroke="rgba(148,163,184,0.28)" strokeWidth="1" />
                  {[
                    'M18 28 L 12 14', 'M32 23 L 28 8', 'M46 20 L 44 4', 'M62 20 L 63 3',
                    'M78 21 L 82 5', 'M94 24 L 100 9', 'M108 28 L 116 15',
                  ].map((d, i) => (
                    <path key={i} d={d} stroke={t.hex} strokeWidth="1.6" strokeLinecap="round" opacity={0.9} />
                  ))}
                </g>
              ))}
            </svg>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {[['Efeito', 'Volume Russo'], ['Curvatura', 'D'], ['Espessura', '0.07']].map(([k, val]) => (
                <div key={k} className="rounded-lg px-2 py-1.5" style={{ background: `rgba(${t.rgb},0.08)`, border: `1px solid rgba(${t.rgb},0.18)` }}>
                  <div className="text-[7.5px] uppercase tracking-wide text-slate-500 font-bold">{k}</div>
                  <div className="text-[10px] font-bold text-white leading-tight">{val}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.14)' }}>
              <div className="text-[7.5px] uppercase tracking-wide text-slate-500 font-bold">Cola — marca, lote e validade</div>
              <div className="text-[10px] font-semibold text-slate-300 leading-tight">Glue Pro · lote 2418 · val. 09/2026</div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.12)' }}>
            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-2">
              {v === 'estetica' ? 'Análise visual' : 'Cabelo & couro'}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(v === 'estetica'
                ? [['Biotipo', 'Mista'], ['Hidratação', 'Semi'], ['Acne', 'Grau I'], ['Glogau', 'Leve']]
                : [['Cabelo', 'Cacheado'], ['Couro', 'Sensível'], ['Química', 'Sim'], ['Queda', 'Não']]
              ).map(([k, val]) => (
                <div key={k} className="rounded-lg px-2 py-1.5" style={{ background: `rgba(${t.rgb},0.08)`, border: `1px solid rgba(${t.rgb},0.18)` }}>
                  <div className="text-[7.5px] uppercase tracking-wide text-slate-500 font-bold">{k}</div>
                  <div className="text-[10px] font-bold text-white leading-tight">{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* termo + assinatura */}
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.12)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-3.5 h-3.5 rounded-[4px] inline-flex items-center justify-center flex-shrink-0" style={{ background: t.hex, color: '#05070f' }}>
              <IconCheck size={9} strokeWidth={3} />
            </span>
            <span className="text-[9.5px] text-slate-300 leading-tight">Li e concordo — declaro as informações verdadeiras</span>
          </div>
          <div className="text-[8px] uppercase tracking-wider text-slate-600 font-bold mb-1">Assinatura da cliente</div>
          <svg viewBox="0 0 220 30" className="w-full h-7" aria-hidden>
            <path d="M8 22 Q 20 6 30 20 Q 38 30 48 12 Q 56 0 64 20 Q 72 30 84 14 Q 96 2 104 22 L 130 22 Q 142 8 152 20" fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="6" y1="27" x2="214" y2="27" stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
          </svg>
        </div>

        {/* enviar */}
        <button
          type="button"
          className="w-full rounded-xl py-2.5 text-[11.5px] font-bold text-white inline-flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)' }}
        >
          <IconWhatsapp size={13} />
          Enviar ficha em PDF
        </button>
      </div>
    </div>
  )
}

/* ── Seção ─────────────────────────────────────────────────── */
export default function FichaAnamnese({ variant }: { variant: Variant }) {
  const t = THEME[variant]
  const c = COPY[variant]

  return (
    <section className="relative py-16 sm:py-20 lg:py-28">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(${t.rgb},0.12) 0%, transparent 60%)` }}
      />
      <div className="container relative px-4">
        <SectionReveal className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
          <div className="pill mb-5 sm:mb-6 inline-flex items-center gap-2 text-xs sm:text-sm">
            <span style={{ color: t.soft }} className="inline-flex"><IconSparkles size={14} /></span>
            <span>{c.pill}</span>
          </div>
          <h2 className="text-white font-black mb-3 sm:mb-4 leading-tight" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>
            {c.h2a}{' '}<span className="text-gradient">{c.h2b}</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">{c.sub}</p>
        </SectionReveal>

        <SectionReveal>
          <div className="grid lg:grid-cols-[1fr_1.05fr] gap-8 lg:gap-10 items-center max-w-5xl mx-auto">
            <FichaMock v={variant} />

            <div className="space-y-4 sm:space-y-5">
              <ul className="space-y-4 text-sm sm:text-base">
                {c.bullets.map((b) => (
                  <li key={b.t} className="flex items-start gap-3">
                    <span
                      className="w-7 h-7 rounded-lg inline-flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `rgba(${t.rgb},0.12)`, border: `1px solid rgba(${t.rgb},0.3)`, color: t.soft }}
                    >
                      <IconCheck size={14} strokeWidth={2.5} />
                    </span>
                    <span>
                      <strong className="text-white block leading-snug">{b.t}</strong>
                      <span className="text-slate-400 leading-relaxed">{b.d}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.22)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <IconWhatsapp size={14} className="text-emerald-400" />
                  <strong className="text-white text-sm">Vira PDF e vai pro WhatsApp dela</strong>
                </div>
                <p className="text-[13px] text-slate-400 leading-relaxed">
                  A ficha assinada, com o mapping e tudo que ela marcou, sai em PDF e você manda num toque. Fica com você e fica com ela.
                </p>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed">{c.fecho}</p>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  )
}
