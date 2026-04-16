/* Cards visuais dos 4 motores de retenção
   Cada um mostra um fragmento real da UI do produto. */

import type { ReactNode } from 'react'

type Kind = 'fidelidade' | 'fila' | 'indicacao' | 'reviews'

const COPY: Record<Kind, { title: string; result: string; desc: string; accent: string }> = {
  fidelidade: {
    title:  'Programa de fidelidade',
    result: 'Cliente volta — não busca o concorrente',
    desc:   'Cada serviço soma pontos. Você define a recompensa. Ele sabe que tem vantagem em voltar — e volta.',
    accent: '#F59E0B',
  },
  fila: {
    title:  'Lista de espera automática',
    result: 'Zero horário desperdiçado em cancelamento',
    desc:   'Cancelou? O sistema chama o próximo da fila por email e preenche a vaga. Sem você mexer no celular.',
    accent: '#8B5CF6',
  },
  indicacao: {
    title:  'Indicação com link próprio',
    result: 'Seus clientes te trazem novos clientes',
    desc:   'Cada cliente tem um link único. Indica um amigo — os dois ganham pontos. Crescimento orgânico, sem anúncio.',
    accent: '#EC4899',
  },
  reviews: {
    title:  'Google Reviews automático',
    result: 'Mais avaliações sem precisar pedir',
    desc:   'Sua nota aparece na página de agendamento. Cliente ganha pontos por avaliar — incentivo concreto, todo dia.',
    accent: '#10B981',
  },
}

export function MechanismCard({ kind }: { kind: Kind }) {
  const c = COPY[kind]

  return (
    <div className="glass glow-border rounded-3xl overflow-hidden flex flex-col group hover:-translate-y-1 transition-all">

      {/* Visual área (mini UI do produto) */}
      <div
        className="relative px-6 pt-6 pb-5"
        style={{
          background: `linear-gradient(180deg, ${c.accent}10 0%, transparent 100%)`,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {kind === 'fidelidade' && <FidelidadeUI accent={c.accent} />}
        {kind === 'fila'       && <FilaUI accent={c.accent} />}
        {kind === 'indicacao'  && <IndicacaoUI accent={c.accent} />}
        {kind === 'reviews'    && <ReviewsUI accent={c.accent} />}
      </div>

      {/* Texto */}
      <div className="px-6 md:px-8 py-6 flex-1">
        <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{c.title}</h3>
        <p className="text-sm font-semibold mb-3" style={{ color: c.accent }}>→ {c.result}</p>
        <p className="text-slate-400 leading-relaxed text-sm md:text-base">{c.desc}</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   FIDELIDADE — progress bar + recompensa
─────────────────────────────────────────────────────────── */
function FidelidadeUI({ accent }: { accent: string }) {
  const filled = 9
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Cliente</div>
          <div className="text-white font-bold text-sm mt-0.5">João Marcelo</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-black" style={{ color: accent }}>{filled}<span className="text-slate-600 text-base">/10</span></div>
          <div className="text-[10px] text-slate-500 mt-0.5">serviços</div>
        </div>
      </div>

      {/* Stamps */}
      <div className="flex gap-1.5 mb-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-7 rounded-md flex items-center justify-center"
            style={{
              background: i < filled ? `linear-gradient(135deg, ${accent}, ${accent}99)` : 'rgba(255,255,255,0.04)',
              border: i < filled ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.06)',
              boxShadow: i < filled ? `0 0 12px ${accent}55` : 'none',
            }}
          >
            {i < filled && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
        ))}
      </div>

      {/* Recompensa próxima */}
      <div
        className="rounded-xl px-3 py-2.5 flex items-center gap-3"
        style={{
          background: `${accent}15`,
          border: `1px dashed ${accent}55`,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 flex-shrink-0"><rect x="3" y="8" width="18" height="14" rx="2"/><path d="M12 8V2"/><path d="M3 14h18"/><path d="M12 14v8"/><path d="M7.5 2L12 8l4.5-6"/></svg>
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Próxima recompensa</div>
          <div className="text-white text-xs font-semibold">Corte grátis · falta 1 serviço</div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   FILA DE ESPERA — lista vertical + notificação
─────────────────────────────────────────────────────────── */
function FilaUI({ accent }: { accent: string }) {
  const queue = [
    { name: 'Marcos S.',   pos: 1, status: 'confirmou' },
    { name: 'Larissa P.',  pos: 2, status: '' },
    { name: 'Gabriel R.',  pos: 3, status: '' },
  ]

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Vaga 14:00</div>
          <div className="text-white font-bold text-sm mt-0.5">Cancelada por imprevisto</div>
        </div>
        <div
          className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
          style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}
        >
          Auto-fill
        </div>
      </div>

      <div className="space-y-1.5">
        {queue.map((q) => {
          const isFirst = q.pos === 1
          return (
            <div
              key={q.name}
              className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{
                background: isFirst ? `${accent}12` : 'rgba(255,255,255,0.03)',
                border: isFirst ? `1px solid ${accent}55` : '1px solid rgba(255,255,255,0.05)',
                boxShadow: isFirst ? `0 0 18px ${accent}30` : 'none',
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono"
                style={{
                  background: isFirst ? accent : 'rgba(255,255,255,0.08)',
                  color: isFirst ? '#0B0F1F' : '#94A3B8',
                }}
              >
                {q.pos}
              </div>
              <div className="flex-1 text-white text-xs font-semibold">{q.name}</div>
              {q.status && (
                <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: accent }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
                  {q.status}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 text-[10px] text-slate-500 flex items-center gap-1.5">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Vaga preenchida em <strong className="text-slate-300">3 min 14s</strong>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   INDICAÇÃO — link copiável + counter
─────────────────────────────────────────────────────────── */
function IndicacaoUI({ accent }: { accent: string }) {
  return (
    <div>
      <div className="mb-3">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Seu link de indicação</div>
        <div
          className="mt-1.5 flex items-center gap-2 px-3 py-2.5 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <span className="font-mono text-xs text-slate-300 truncate flex-1">
            agendapro.com/<span style={{ color: accent }}>p/joao-m</span>
          </span>
          <button
            type="button"
            className="text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0"
            style={{ background: accent, color: '#0B0F1F' }}
          >
            COPIAR
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { n: '+3',   l: 'Indicaram' },
          { n: '+60',  l: 'Pontos' },
          { n: '2',    l: 'Já agendaram' },
        ].map((s) => (
          <div
            key={s.l}
            className="rounded-lg px-2 py-2 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="font-mono text-base font-black" style={{ color: accent }}>{s.n}</div>
            <div className="text-[9px] text-slate-500 mt-0.5 font-semibold uppercase tracking-wide">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-slate-500 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
        Última: <strong className="text-slate-300">Camila S.</strong> agendou via indicação · há 12 min
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   REVIEWS — widget com estrelas + review recente
─────────────────────────────────────────────────────────── */
function ReviewsUI({ accent }: { accent: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
              color: '#0B0F1F',
              boxShadow: `0 0 18px ${accent}55`,
            }}
          >
            G
          </div>
          <div>
            <div className="text-white font-black text-lg leading-none">4.9</div>
            <div className="flex items-center gap-0.5 mt-1">
              {[0,1,2,3,4].map((i) => (
                <span key={i} style={{ color: accent, fontSize: '11px' }}>★</span>
              ))}
              <span className="text-[10px] text-slate-500 ml-1">128 reviews</span>
            </div>
          </div>
        </div>

        <div
          className="px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1"
          style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}40` }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
          NOVA
        </div>
      </div>

      <div
        className="rounded-xl p-3"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-white">A</div>
            <span className="text-xs font-semibold text-white">Ana Lúcia</span>
            <div className="flex items-center gap-0.5">
              {[0,1,2,3,4].map((i) => <span key={i} style={{ color: accent, fontSize: '9px' }}>★</span>)}
            </div>
          </div>
          <span className="text-[9px] text-slate-500">há 2h</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-snug">
          &ldquo;Atendimento impecável, agendamento foi rapidíssimo. Já agendei o próximo!&rdquo;
        </p>
        <div
          className="mt-2 text-[10px] font-semibold flex items-center gap-1.5"
          style={{ color: accent }}
        >
          <span>+50 pts</span>
          <span className="text-slate-500">creditados automaticamente</span>
        </div>
      </div>
    </div>
  )
}

export function MechanismCardWrap({ children }: { children: ReactNode }) {
  return <>{children}</>
}
