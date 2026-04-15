/* Mini-UIs do produto usadas em várias seções da landing.
   Cada componente é um fragmento visual real, sem ícone genérico. */

/* ═══════════════════════════════════════════════════════════
   TIMELINE — 1 mini-UI por horário (07h, 10h, 14h, 20h)
═══════════════════════════════════════════════════════════ */

export function TimelineMicroUI({ kind }: { kind: '07' | '10' | '14' | '20' }) {
  switch (kind) {
    case '07': return <Lembrete07 />
    case '10': return <Fila10 />
    case '14': return <Pontos14 />
    case '20': return <Dashboard20 />
  }
}

function Lembrete07() {
  /* Notificação de WhatsApp já enviada ontem */
  return (
    <div
      className="rounded-2xl p-4 max-w-[260px]"
      style={{
        background: 'rgba(8,11,24,0.7)',
        border: '1px solid rgba(16,185,129,0.25)',
        boxShadow: '0 12px 30px rgba(16,185,129,0.18)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm">
          💬
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-white">WhatsApp</div>
          <div className="text-[9px] text-slate-500">enviado · 18:00 (ontem)</div>
        </div>
        <span className="text-emerald-400 text-[10px] font-bold">✓✓</span>
      </div>
      <div className="rounded-lg p-2.5" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <p className="text-[11px] text-slate-200 leading-snug">
          Oi João! Confirmando seu corte amanhã <strong className="text-white">08:00</strong>. Responde <strong className="text-emerald-400">SIM</strong> pra confirmar 👍
        </p>
      </div>
      <div className="mt-2 text-[9px] text-slate-500 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        João respondeu SIM · 18:03
      </div>
    </div>
  )
}

function Fila10() {
  /* Notificação de fila preenchida automaticamente */
  return (
    <div
      className="rounded-2xl p-4 max-w-[260px]"
      style={{
        background: 'rgba(8,11,24,0.7)',
        border: '1px solid rgba(139,92,246,0.3)',
        boxShadow: '0 12px 30px rgba(139,92,246,0.22)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)', color: '#0B0F1F' }}
        >
          ⚡
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-bold text-white">Fila acionada</div>
          <div className="text-[9px] text-slate-500">10:04 · automático</div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <span className="line-through text-slate-500 text-[10px]">10:00 — Cancelado</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)' }}>
          <span className="text-violet-300 text-[10px] font-bold">10:00 — Marcos S.</span>
          <span className="ml-auto text-[9px] text-violet-300 font-bold">+1</span>
        </div>
      </div>

      <div className="mt-2.5 text-[9px] text-slate-500">
        Vaga preenchida em <strong className="text-slate-200">3min</strong> · <span className="text-violet-300">+R$ 35</span>
      </div>
    </div>
  )
}

function Pontos14() {
  /* Toast de pontos liberados + indicação */
  return (
    <div
      className="rounded-2xl p-4 max-w-[260px]"
      style={{
        background: 'rgba(8,11,24,0.7)',
        border: '1px solid rgba(245,158,11,0.3)',
        boxShadow: '0 12px 30px rgba(245,158,11,0.22)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)', boxShadow: '0 0 18px rgba(251,191,36,0.5)' }}
        >
          🏆
        </div>
        <div>
          <div className="text-[11px] font-bold text-white">Recompensa liberada</div>
          <div className="text-[9px] text-slate-500">João Marcelo · 10º serviço</div>
        </div>
      </div>

      <div
        className="rounded-lg p-2.5 mb-2"
        style={{ background: 'rgba(245,158,11,0.1)', border: '1px dashed rgba(245,158,11,0.4)' }}
      >
        <div className="text-[10px] text-slate-400 mb-0.5">Próximo corte</div>
        <div className="text-sm font-black text-amber-300">100% grátis 🎁</div>
      </div>

      <div className="text-[9px] text-slate-500 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        João compartilhou no grupo · indicou 2 amigos
      </div>
    </div>
  )
}

function Dashboard20() {
  /* Resumo do dia + métricas */
  return (
    <div
      className="rounded-2xl p-4 max-w-[260px]"
      style={{
        background: 'rgba(8,11,24,0.7)',
        border: '1px solid rgba(59,130,246,0.3)',
        boxShadow: '0 12px 30px rgba(59,130,246,0.2)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Resumo de hoje</div>
          <div className="text-sm font-black text-white">Tudo certo ✓</div>
        </div>
        <span
          className="px-2 py-0.5 rounded-md text-[9px] font-bold"
          style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)' }}
        >
          FECHADO
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="font-mono text-base font-black text-white">R$275</div>
          <div className="text-[9px] text-slate-500">faturado</div>
        </div>
        <div className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="font-mono text-base font-black text-blue-400">+3</div>
          <div className="text-[9px] text-slate-500">novos clientes</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] mt-2">
        <span className="text-slate-500">⭐ 4.9 · 2 reviews novas</span>
        <span className="text-blue-400 font-semibold">7 amanhã</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   DOR — anti-screenshots (3 dores reais)
═══════════════════════════════════════════════════════════ */

export function DorMicroUI({ kind }: { kind: 'whatsapp' | 'caderno' | 'queda' }) {
  switch (kind) {
    case 'whatsapp': return <WhatsLotado />
    case 'caderno':  return <CadernoBorrado />
    case 'queda':    return <FaturamentoQueda />
  }
}

function WhatsLotado() {
  const msgs = [
    { from: 'Cliente 1', text: 'oi tem horário?', time: '08:14' },
    { from: 'Cliente 2', text: 'tá marcado mesmo?', time: '08:16' },
    { from: 'Cliente 3', text: 'preciso desmarcar', time: '08:19' },
    { from: 'Cliente 4', text: 'oi vc tá aí??', time: '08:22' },
    { from: 'Cliente 5', text: 'consigo encaixe?', time: '08:25' },
  ]
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="text-emerald-400 text-sm">💬</span>
        <span className="text-[11px] font-bold text-white">WhatsApp · 12 não lidas</span>
        <span className="ml-auto px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold">12</span>
      </div>
      <div className="p-2 space-y-1">
        {msgs.map((m, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="w-5 h-5 rounded-full bg-slate-700 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-white">{m.from}</span>
                <span className="text-[9px] text-slate-500 ml-auto">{m.time}</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">{m.text}</div>
            </div>
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
          </div>
        ))}
      </div>
      <div className="px-3 py-2 text-[9px] text-slate-500 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        + 7 mensagens não lidas
      </div>
    </div>
  )
}

function CadernoBorrado() {
  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1F2937 0%, #0F172A 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Quarta · 15 abr</div>
      <div className="space-y-1.5 font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">08:00</span>
          <span className="text-slate-300">João — corte</span>
          <span className="ml-auto text-emerald-400 text-[9px]">✓</span>
        </div>
        <div className="flex items-center gap-2 relative">
          <span className="text-slate-500">09:00</span>
          <span className="text-slate-500 line-through">Pedro — barba</span>
          <span className="ml-auto text-red-400 text-[9px] font-bold">cancelou</span>
        </div>
        <div className="flex items-center gap-2 relative">
          <span className="text-slate-500">10:00</span>
          <span className="text-slate-300">Lucas?</span>
          <span className="text-amber-300 text-[9px] ml-auto">não confirmou</span>
        </div>
        <div className="flex items-center gap-2 opacity-50">
          <span className="text-slate-600">11:00</span>
          <span className="text-slate-600 italic">— vazio —</span>
        </div>
        <div className="flex items-center gap-2 relative">
          <span className="text-slate-500">14:00</span>
          <span className="text-slate-500 line-through decoration-2">Rafael — pacote</span>
          <span className="ml-auto text-red-400 text-[9px] font-bold">remarcar??</span>
        </div>
      </div>

      {/* Sobrescrito */}
      <div className="mt-3 px-2 py-1.5 rounded-md" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-red-400">✗</span>
          <span className="text-slate-300">Esqueci de ligar pro Marcos confirmar</span>
        </div>
      </div>
    </div>
  )
}

function FaturamentoQueda() {
  const bars = [70, 65, 78, 60, 52, 48, 38, 30] // queda visível
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(15,23,42,1) 100%)',
        border: '1px solid rgba(236,72,153,0.25)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Faturamento</div>
          <div className="text-white text-base font-black">R$ 1.840</div>
          <div className="text-[10px] text-rose-400 font-semibold flex items-center gap-1 mt-0.5">
            <span>↓</span> -32% vs mês passado
          </div>
        </div>
        <span
          className="px-2 py-0.5 rounded-md text-[9px] font-bold"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          QUEDA
        </span>
      </div>

      {/* Mini gráfico de barras */}
      <div className="flex items-end gap-1.5 h-16 mb-2">
        {bars.map((h, i) => {
          const isLast = i >= bars.length - 3
          return (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{
                height: `${h}%`,
                background: isLast
                  ? 'linear-gradient(180deg, #EC4899, #BE185D)'
                  : 'rgba(148,163,184,0.3)',
                boxShadow: isLast ? '0 0 12px rgba(236,72,153,0.4)' : 'none',
              }}
            />
          )
        })}
      </div>

      <div className="text-[10px] text-slate-500">
        <strong className="text-rose-300">3 no-shows</strong> · <strong className="text-rose-300">5 vagas vazias</strong> esta semana
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   PASSOS — mini screenshots de cada passo (01, 02, 03)
═══════════════════════════════════════════════════════════ */

export function PassoMicroUI({ kind }: { kind: '01' | '02' | '03' }) {
  switch (kind) {
    case '01': return <FormCadastro />
    case '02': return <LinkBio />
    case '03': return <PainelChegando />
  }
}

function FormCadastro() {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'rgba(8,11,24,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-3">Cadastro · 5 min</div>

      {[
        { label: 'Nome do negócio',  value: 'Barbearia Studio',  filled: true },
        { label: 'WhatsApp',         value: '(63) 9 8801-2233',  filled: true },
        { label: 'Categoria',        value: 'Barbearia',         filled: true },
      ].map((f) => (
        <div key={f.label} className="mb-2">
          <div className="text-[9px] text-slate-500 mb-1">{f.label}</div>
          <div
            className="px-2.5 py-2 rounded-md flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(59,130,246,0.25)' }}
          >
            <span className="text-[11px] text-white font-semibold">{f.value}</span>
            <span className="text-emerald-400 text-[10px]">✓</span>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="w-full mt-2 py-2 rounded-lg text-[11px] font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)', boxShadow: '0 0 18px rgba(59,130,246,0.4)' }}
      >
        Criar minha agenda →
      </button>
    </div>
  )
}

function LinkBio() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #1F2937 0%, #0F172A 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="p-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="w-8 h-8 rounded-full" style={{ background: 'linear-gradient(135deg, #F59E0B, #EC4899, #8B5CF6)' }} />
        <div>
          <div className="text-[11px] font-bold text-white">@barbeariastudio</div>
          <div className="text-[9px] text-slate-500">Editar perfil</div>
        </div>
      </div>

      <div className="p-3">
        <div className="text-[10px] text-slate-400 mb-1.5">Site</div>
        <div
          className="px-2.5 py-2 rounded-md flex items-center gap-2"
          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)' }}
        >
          <span className="text-blue-400 text-[10px]">🔗</span>
          <span className="text-[10px] text-blue-300 font-mono truncate">agendapro.com/barbearia-studio</span>
        </div>

        <div className="mt-2 text-[9px] text-slate-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          12 cliques no link · hoje
        </div>
      </div>
    </div>
  )
}

function PainelChegando() {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'rgba(8,11,24,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Hoje · em ritmo</div>
          <div className="text-sm font-black text-white">Agendamentos chegando</div>
        </div>
        <span
          className="px-2 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-1"
          style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </span>
      </div>

      <div className="space-y-1.5">
        {[
          { time: '14:00', name: 'Camila S.',  via: 'via Instagram', tag: 'NOVO' },
          { time: '15:30', name: 'Bruno C.',   via: 'cliente recorrente', tag: '' },
          { time: '17:00', name: 'Letícia R.', via: 'via indicação', tag: 'INDIC' },
        ].map((a, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <span className="font-mono text-[10px] font-bold text-cyan-300 w-10">{a.time}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-white">{a.name}</div>
              <div className="text-[9px] text-slate-500">{a.via}</div>
            </div>
            {a.tag && (
              <span
                className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(59,130,246,0.18)', color: '#60A5FA' }}
              >
                {a.tag}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
