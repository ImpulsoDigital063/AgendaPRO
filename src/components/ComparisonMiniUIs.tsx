/* Comparação SmartAgenda x Outros apps
   Duas mini-UIs lado a lado:
   - Esquerda: "Outros apps" (só agenda — agenda morta, nada acontece)
   - Direita: "SmartAgenda" (dashboard vivo com automações rolando)
   Cada card tem: header + mini-UI realista + lista de features com marks.
*/

import { IconCheck, IconBolt, IconTrophy, IconLink, IconStar, IconClock24 } from './BarberIcons'

/* ─────────────────────────────
   CARD ESQUERDA — Outros apps
───────────────────────────── */
function OutrosAppsCard() {
  const limitacoes = [
    'Cliente precisa ligar ou chamar no WhatsApp',
    'Cancelou? Buraco na agenda o dia inteiro',
    'Cliente volta por hábito — ou não volta',
    'Reviews do Google você pede na mão',
    'Indicação existe, mas ninguém rastreia',
    'Anti-falta? Só se você lembrar de mandar',
  ]

  return (
    <div
      className="glass rounded-3xl p-5 md:p-6 flex flex-col h-full"
      style={{
        background: 'linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(8,11,24,0.8) 100%)',
        border: '1px solid rgba(148,163,184,0.15)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-1">Outros apps</div>
          <div className="text-white font-bold text-lg leading-tight">Agenda online comum</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Trinks · iSalon · Simples · caderno</div>
        </div>
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
          style={{
            background: 'rgba(148,163,184,0.08)',
            border: '1px solid rgba(148,163,184,0.2)',
            color: '#94A3B8',
          }}
        >
          Passivo
        </span>
      </div>

      {/* Mini-UI — agenda genérica parada */}
      <div
        className="rounded-2xl overflow-hidden mb-4"
        style={{
          background: 'rgba(8,11,24,0.65)',
          border: '1px solid rgba(148,163,184,0.12)',
        }}
      >
        {/* Barra de topo */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b"
          style={{ borderColor: 'rgba(148,163,184,0.12)', background: 'rgba(255,255,255,0.02)' }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-600" />
            <span className="w-2 h-2 rounded-full bg-slate-600" />
            <span className="w-2 h-2 rounded-full bg-slate-600" />
          </div>
          <span className="text-[10px] text-slate-500">Agenda · Qua 15/04</span>
          <span className="text-[10px] text-slate-600">—</span>
        </div>

        {/* Lista de horários — estática */}
        <div className="p-3 space-y-1.5">
          {[
            { h: '09:00', c: 'João P.',  s: 'Corte',        status: 'ok' },
            { h: '10:00', c: '—',        s: '(vazio)',      status: 'empty' },
            { h: '11:00', c: 'Pedro C.', s: 'Barba',        status: 'ok' },
            { h: '12:00', c: '—',        s: '(vazio)',      status: 'empty' },
            { h: '13:00', c: 'Ana S.',   s: 'Corte + barba',status: 'cancel' },
          ].map((r) => (
            <div
              key={r.h}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px]"
              style={{
                background: r.status === 'ok' ? 'rgba(255,255,255,0.03)' : 'transparent',
                border: '1px solid rgba(148,163,184,0.08)',
              }}
            >
              <span className={`font-mono font-semibold w-10 ${r.status === 'empty' ? 'text-slate-600' : 'text-slate-400'}`}>
                {r.h}
              </span>
              <span className={`flex-1 ${r.status === 'empty' ? 'text-slate-600 italic' : r.status === 'cancel' ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                {r.c} · <span className="text-slate-500">{r.s}</span>
              </span>
              {r.status === 'cancel' && (
                <span className="text-[9px] text-red-400/80 font-semibold">cancelou</span>
              )}
            </div>
          ))}
        </div>

        {/* Rodapé morto */}
        <div
          className="px-3 py-2 text-[10px] text-slate-500 border-t flex items-center justify-between"
          style={{ borderColor: 'rgba(148,163,184,0.12)', background: 'rgba(255,255,255,0.02)' }}
        >
          <span>2 vazios · 1 cancelado</span>
          <span className="text-slate-600">sem ação</span>
        </div>
      </div>

      {/* Lista de limitações */}
      <ul className="space-y-2 mt-auto">
        {limitacoes.map((l) => (
          <li key={l} className="flex items-start gap-2.5 text-[12px] text-slate-400 leading-snug">
            <span
              className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] font-bold"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#F87171',
              }}
            >
              ✕
            </span>
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ─────────────────────────────
   CARD DIREITA — SmartAgenda
───────────────────────────── */
function SmartAgendaCard() {
  const automacoes = [
    { ico: <IconClock24 size={12} strokeWidth={2.2} />, t: 'Cliente agenda sozinho 24h' },
    { ico: <IconBolt size={12} strokeWidth={2.2} />,    t: 'Fila preenche cancelamento em minutos' },
    { ico: <IconTrophy size={12} strokeWidth={2.2} />,  t: 'Pontos por avaliação — cliente volta mais' },
    { ico: <IconLink size={12} strokeWidth={2.2} />,    t: 'Link de indicação rastreado por cliente' },
    { ico: <IconStar size={12} strokeWidth={2.2} />,    t: 'Google Reviews sobem no automático' },
    { ico: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>, t: 'Anti-falta dispara sozinho na véspera' },
  ]

  return (
    <div
      className="rounded-3xl p-5 md:p-6 flex flex-col h-full relative overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, rgba(15,23,42,0.7) 0%, rgba(8,11,24,0.9) 100%)',
        border: '1px solid rgba(59,130,246,0.35)',
        boxShadow:
          '0 20px 60px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Brilho lateral */}
      <div
        className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-40 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.5), transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div>
          <div
            className="text-[10px] uppercase tracking-[0.18em] font-bold mb-1"
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            SmartAgenda
          </div>
          <div className="text-white font-bold text-lg leading-tight">A agenda que trabalha sozinha</div>
          <div className="text-[11px] text-slate-400 mt-0.5">AgendaPRO · com IA de retenção</div>
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md text-white inline-flex items-center gap-1"
          style={{
            background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
            boxShadow: '0 0 14px rgba(59,130,246,0.5)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Ativo
        </span>
      </div>

      {/* Mini-UI — dashboard vivo */}
      <div
        className="rounded-2xl overflow-hidden mb-4 relative z-10"
        style={{
          background: 'rgba(8,11,24,0.75)',
          border: '1px solid rgba(59,130,246,0.25)',
        }}
      >
        {/* Barra de topo */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b"
          style={{ borderColor: 'rgba(59,130,246,0.18)', background: 'rgba(59,130,246,0.04)' }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[10px] font-bold text-white">AgendaPRO</span>
          </div>
          <span className="text-[10px] text-slate-400">Qua 15/04 · ao vivo</span>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.3)',
              color: '#34D399',
            }}
          >
            ●
          </span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2 p-3">
          {[
            { l: 'Hoje',     v: '10',     s: 'horários', color: '#3B82F6' },
            { l: 'Previsto', v: 'R$620',  s: 'no caixa', color: '#06B6D4' },
            { l: 'Ocupação', v: '92%',    s: 'do turno', color: '#10B981' },
          ].map((k) => (
            <div
              key={k.l}
              className="rounded-lg px-2 py-2"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${k.color}33`,
              }}
            >
              <div className="text-[9px] uppercase tracking-wider text-slate-500">{k.l}</div>
              <div className="text-white font-black text-[14px] leading-tight" style={{ color: k.color }}>{k.v}</div>
              <div className="text-[9px] text-slate-500">{k.s}</div>
            </div>
          ))}
        </div>

        {/* Notificações empilhadas */}
        <div className="px-3 pb-3 space-y-1.5">
          {[
            {
              ico: <IconBolt size={11} strokeWidth={2.5} />,
              color: '#8B5CF6',
              t: 'Fila acionada',
              s: '10:00 Marcos S. — +R$35',
              time: 'há 3min',
            },
            {
              ico: <IconTrophy size={11} strokeWidth={2.5} />,
              color: '#F59E0B',
              t: 'Ana ganhou +50pts',
              s: 'avaliação 5★ no Google',
              time: 'há 8min',
            },
            {
              ico: <IconLink size={11} strokeWidth={2.5} />,
              color: '#06B6D4',
              t: 'Indicação confirmada',
              s: 'Lucas trouxe Tiago',
              time: 'há 14min',
            },
          ].map((n) => (
            <div
              key={n.t}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
              style={{
                background: `${n.color}0F`,
                border: `1px solid ${n.color}38`,
              }}
            >
              <span
                className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white flex-shrink-0"
                style={{ background: n.color, boxShadow: `0 0 10px ${n.color}80` }}
              >
                {n.ico}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-white leading-tight truncate">{n.t}</div>
                <div className="text-[10px] text-slate-400 leading-tight truncate">{n.s}</div>
              </div>
              <span className="text-[9px] text-slate-500 flex-shrink-0">{n.time}</span>
            </div>
          ))}
        </div>

        {/* Rodapé ativo */}
        <div
          className="px-3 py-2 text-[10px] flex items-center justify-between border-t"
          style={{
            borderColor: 'rgba(59,130,246,0.2)',
            background: 'linear-gradient(90deg, rgba(59,130,246,0.08), rgba(6,182,212,0.08))',
          }}
        >
          <span className="text-slate-300">3 ações sem você tocar</span>
          <span className="font-bold" style={{ color: '#06B6D4' }}>+R$ 85 hoje</span>
        </div>
      </div>

      {/* Lista de automações */}
      <ul className="space-y-2 mt-auto relative z-10">
        {automacoes.map((a) => (
          <li key={a.t} className="flex items-start gap-2.5 text-[12px] text-slate-200 leading-snug">
            <span
              className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full inline-flex items-center justify-center text-white"
              style={{
                background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
                boxShadow: '0 0 10px rgba(59,130,246,0.5)',
              }}
            >
              <IconCheck size={10} strokeWidth={3} />
            </span>
            <span className="flex items-center gap-1.5">
              <span className="opacity-70" style={{ color: '#06B6D4' }}>{a.ico}</span>
              {a.t}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ─────────────────────────────
   COMPONENTE EXPORTADO
───────────────────────────── */
export default function ComparisonMiniUIs() {
  return (
    <div className="relative">
      {/* Grid 2 colunas desktop, empilha no mobile */}
      <div className="grid md:grid-cols-2 gap-6 md:gap-8 relative">
        <OutrosAppsCard />
        <SmartAgendaCard />

        {/* Divisor VS central — só desktop */}
        <div
          className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
          aria-hidden
        >
          <span
            className="w-14 h-14 rounded-full inline-flex items-center justify-center text-white font-black text-sm tracking-wider"
            style={{
              background: 'linear-gradient(135deg, #050713, #0F172A)',
              border: '1px solid rgba(59,130,246,0.4)',
              boxShadow: '0 0 30px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            VS
          </span>
        </div>
      </div>

      {/* Rodapé insight */}
      <div
        className="mt-6 rounded-2xl px-5 py-4 text-center text-xs md:text-sm text-slate-300"
        style={{
          background: 'linear-gradient(90deg, rgba(59,130,246,0.06), rgba(6,182,212,0.06))',
          border: '1px solid rgba(59,130,246,0.2)',
        }}
      >
        Não é sobre ter <strong className="text-white">outra agenda</strong>.
        É sobre ter uma agenda que <strong className="text-white">trabalha por você</strong> enquanto atende.
      </div>
    </div>
  )
}
