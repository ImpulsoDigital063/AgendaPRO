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
    { from: 'Tiago Silva',    init: 'T', color: '#1A73E8', text: 'oi tem horário?',     time: '08:14' },
    { from: 'Lucas Mendes',   init: 'L', color: '#EA4335', text: 'tá marcado mesmo?',   time: '08:16' },
    { from: 'Pedro Oliveira', init: 'P', color: '#FBBC04', text: 'preciso desmarcar',   time: '08:19' },
    { from: 'Rafael Costa',   init: 'R', color: '#34A853', text: 'oi vc tá aí??',       time: '08:22' },
    { from: 'Marcos Souza',   init: 'M', color: '#8B5CF6', text: 'consigo encaixe?',    time: '08:25' },
  ]
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#fff',
        boxShadow: '0 8px 30px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
      }}
    >
      {/* Header estilo WhatsApp real */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ background: '#075E54' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span className="text-[11px] font-bold text-white">WhatsApp</span>
        <span className="ml-auto px-1.5 py-0.5 rounded-full text-white text-[9px] font-bold" style={{ background: '#25D366' }}>12</span>
      </div>
      {/* Messages */}
      <div className="p-2 space-y-0.5" style={{ background: '#ECE5DD' }}>
        {msgs.map((m, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: '#fff' }}>
            {/* Avatar com inicial */}
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: m.color }}
            >
              <span className="text-[10px] font-bold text-white leading-none">{m.init}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#202124]">{m.from}</span>
                <span className="text-[9px] text-[#9AA0A6] ml-auto">{m.time}</span>
              </div>
              <div className="text-[10px] text-[#5F6368] truncate">{m.text}</div>
            </div>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#25D366' }} />
          </div>
        ))}
      </div>
      <div className="px-3 py-2 text-[9px] text-[#9AA0A6] text-center font-medium" style={{ background: '#fff', borderTop: '1px solid #F1F3F4' }}>
        + 7 mensagens não lidas
      </div>
    </div>
  )
}

function CadernoBorrado() {
  const slots = [
    { hora: '08:00', nome: 'João Silva', servico: 'Corte', status: 'ok' as const },
    { hora: '09:00', nome: 'Pedro Reis', servico: 'Barba', status: 'cancelou' as const },
    { hora: '10:00', nome: 'Lucas M.', servico: 'Corte', status: 'pendente' as const },
    { hora: '11:00', nome: '', servico: '', status: 'vazio' as const },
    { hora: '14:00', nome: 'Rafael O.', servico: 'Pacote', status: 'cancelou' as const },
  ]
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#fff',
        boxShadow: '0 8px 30px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
      }}
    >
      {/* Header tipo app de agenda */}
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: '#F8F9FA', borderBottom: '1px solid #F1F3F4' }}>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5F6368" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-[11px] font-medium text-[#202124]">Quarta, 15 abr</span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: '#FEE2E2', color: '#DC2626' }}>3 problemas</span>
      </div>
      {/* Slots */}
      <div className="px-2 py-1.5 space-y-0.5">
        {slots.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px]"
            style={{
              background: s.status === 'cancelou' ? '#FEF2F2'
                : s.status === 'pendente' ? '#FFFBEB'
                : s.status === 'vazio' ? '#F9FAFB'
                : '#F0FDF4',
            }}
          >
            <span className="text-[10px] font-mono text-[#9AA0A6] w-8 flex-shrink-0">{s.hora}</span>
            {s.status === 'vazio' ? (
              <span className="text-[#D1D5DB] italic flex-1">— vazio —</span>
            ) : (
              <span className={`flex-1 truncate ${s.status === 'cancelou' ? 'text-[#9AA0A6] line-through' : 'text-[#202124]'}`}>
                {s.nome} <span className="text-[#9AA0A6] font-normal">· {s.servico}</span>
              </span>
            )}
            {s.status === 'ok' && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {s.status === 'cancelou' && (
              <span className="text-[9px] font-bold text-[#DC2626] flex-shrink-0">cancelou</span>
            )}
            {s.status === 'pendente' && (
              <span className="text-[9px] font-bold text-[#D97706] flex-shrink-0">sem confirmar</span>
            )}
          </div>
        ))}
      </div>
      {/* Alerta footer */}
      <div className="px-3 py-2 flex items-center gap-2" style={{ background: '#FEF2F2', borderTop: '1px solid #FECACA' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="text-[10px] text-[#7F1D1D]">Esqueci de confirmar com o Marcos</span>
      </div>
    </div>
  )
}

function FaturamentoQueda() {
  const profissionais = [
    { nome: 'Diego',  init: 'D', color: '#1A73E8', feito: 'R$ 820',  pct: '40%', devido: 'R$ 328',  ok: false },
    { nome: 'Tiago',  init: 'T', color: '#EA4335', feito: 'R$ 640',  pct: '35%', devido: 'R$ 224',  ok: false },
    { nome: 'Rafael', init: 'R', color: '#34A853', feito: 'R$ 380',  pct: '40%', devido: 'R$ ???',  ok: false },
  ]
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#fff',
        boxShadow: '0 8px 30px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
      }}
    >
      {/* Header tipo dashboard */}
      <div className="px-3 py-2.5 flex items-center justify-between" style={{ background: '#F8F9FA', borderBottom: '1px solid #F1F3F4' }}>
        <div>
          <div className="text-[10px] text-[#9AA0A6] font-medium">Abril 2026</div>
          <div className="text-[14px] font-black text-[#202124]">R$ 1.840</div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: '#FEE2E2' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
          <span className="text-[10px] font-bold text-[#DC2626]">-32%</span>
        </div>
      </div>

      {/* Tabela de comissões */}
      <div className="px-2 py-1">
        {/* Header da tabela */}
        <div className="flex items-center gap-2 px-2 py-1 text-[9px] font-medium text-[#9AA0A6] uppercase tracking-wider">
          <span className="flex-1">Profissional</span>
          <span className="w-14 text-right">Feito</span>
          <span className="w-8 text-center">%</span>
          <span className="w-14 text-right">Devido</span>
        </div>
        {profissionais.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg mb-0.5"
            style={{ background: i % 2 === 0 ? '#F9FAFB' : '#fff' }}
          >
            {/* Avatar */}
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: p.color }}
            >
              <span className="text-[8px] font-bold text-white">{p.init}</span>
            </div>
            <span className="flex-1 text-[11px] font-medium text-[#202124] truncate">{p.nome}</span>
            <span className="w-14 text-right text-[10px] text-[#202124] font-medium">{p.feito}</span>
            <span className="w-8 text-center text-[10px] text-[#9AA0A6]">{p.pct}</span>
            <span className={`w-14 text-right text-[10px] font-bold ${p.devido === 'R$ ???' ? 'text-[#DC2626]' : 'text-[#5F6368]'}`}>{p.devido}</span>
          </div>
        ))}
      </div>

      {/* Footer — problema */}
      <div className="px-3 py-2 flex items-center gap-2" style={{ background: '#FEF2F2', borderTop: '1px solid #FECACA' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="text-[10px] text-[#7F1D1D]">Comissão do Rafael sem conferir. Caixa não fecha.</span>
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
