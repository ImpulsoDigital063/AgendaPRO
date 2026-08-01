/* ═══════════════════════════════════════════════════════════
   FINANCE DASHBOARD — mini-UI rica do controle financeiro

   Mostra a profundidade real do AgendaPRO (despesas categorizadas,
   lucro líquido, gráfico 7d, projeção 30d) — não só "faturamento +
   lucro" raso. Concorrente (Trinks/Booksy) só mostra faturamento.

   Variant prop adapta KPIs/cores ao nicho.
═══════════════════════════════════════════════════════════ */

type Variant = 'barbearia' | 'salao' | 'estetica' | 'nail' | 'lash'

type DashContent = {
  receita: number
  despesa: number
  // lucroLiquido = receita - despesa (calculado)
  // accent = cor primária do nicho (do tema da LP)
  accent: string
  /** Despesas top 3 do mês — categoria + valor */
  topExpenses: { cat: string; valor: number; color: string }[]
  /** Barras dos últimos 7 dias (% do dia mais alto) */
  chart7d: number[]
  /** Insight automático que aparece como "destaque inteligente" */
  insight: string
  /** Projeção 30d (faturamento esperado pra fechar o mês) */
  projecao: number
}

const DASH: Record<Variant, DashContent> = {
  barbearia: {
    receita: 12480,
    despesa: 4180,
    accent: '#06B6D4',
    topExpenses: [
      { cat: 'Aluguel',    valor: 2200, color: '#EF4444' },
      { cat: 'Produtos',   valor:  680, color: '#F59E0B' },
      { cat: 'Energia',    valor:  340, color: '#06B6D4' },
    ],
    chart7d: [55, 70, 60, 85, 95, 80, 100],
    insight: 'Lucro 12% acima do mês passado',
    projecao: 14200,
  },
  salao: {
    receita: 28600,
    despesa: 11400,
    accent: '#A855F7',
    topExpenses: [
      { cat: 'Aluguel',     valor: 4500, color: '#EF4444' },
      { cat: 'Produtos',    valor: 3200, color: '#F59E0B' },
      { cat: 'Salários',    valor: 2800, color: '#3B82F6' },
    ],
    chart7d: [60, 65, 72, 80, 90, 88, 100],
    insight: 'Tickets médios subiram 8% essa semana',
    projecao: 32400,
  },
  estetica: {
    receita: 18900,
    despesa: 6720,
    accent: '#06B6D4',
    topExpenses: [
      { cat: 'Aluguel',     valor: 3200, color: '#EF4444' },
      { cat: 'Produtos',    valor: 1800, color: '#F59E0B' },
      { cat: 'Equipamento', valor:  900, color: '#A855F7' },
    ],
    chart7d: [70, 60, 75, 85, 80, 90, 100],
    insight: 'Pacotes pré-pagos representam 64% da receita',
    projecao: 21500,
  },
  lash: {
    receita: 8620,
    despesa: 2180,
    accent: '#A78BFA',
    topExpenses: [
      { cat: 'Aluguel',      valor: 1100, color: '#EF4444' },
      { cat: 'Cola e fios',  valor:  620, color: '#F59E0B' },
      { cat: 'Descartáveis', valor:  460, color: '#A78BFA' },
    ],
    chart7d: [55, 70, 65, 85, 90, 100, 95],
    insight: 'Manutenção de 21 dias responde por 58% dos horários',
    projecao: 9800,
  },
  nail: {
    receita: 9840,
    despesa: 2960,
    accent: '#EC4899',
    topExpenses: [
      { cat: 'Aluguel',     valor: 1400, color: '#EF4444' },
      { cat: 'Produtos',    valor:  890, color: '#F59E0B' },
      { cat: 'Material',    valor:  340, color: '#EC4899' },
    ],
    chart7d: [50, 65, 70, 80, 95, 100, 90],
    insight: 'Próximas 3 semanas já 96% lotadas',
    projecao: 11200,
  },
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

const DAYS_LABEL = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

type Props = {
  variant?: Variant
}

export default function FinanceDashboard({ variant = 'barbearia' }: Props) {
  const d = DASH[variant]
  const lucroLiquido = d.receita - d.despesa
  const margem = Math.round((lucroLiquido / d.receita) * 100)

  return (
    <div
      className="rounded-2xl sm:rounded-3xl overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: `0 30px 80px -20px ${d.accent}25, inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      {/* Header */}
      <div
        className="px-5 sm:px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${d.accent}20`, color: d.accent, border: `1px solid ${d.accent}40` }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
              <line x1="3" y1="20" x2="21" y2="20" />
            </svg>
          </span>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Financeiro
            </div>
            <div className="text-sm font-semibold text-white">Outubro · 2026</div>
          </div>
        </div>
        <div
          className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
          style={{
            background: 'rgba(16,185,129,0.15)',
            color: '#10B981',
            border: '1px solid rgba(16,185,129,0.3)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Tempo real
        </div>
      </div>

      {/* 3 KPIs principais */}
      <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="px-3 sm:px-5 py-4 sm:py-5">
          <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Receita
          </div>
          <div className="font-mono font-black text-base sm:text-xl text-white tabular-nums">
            R$ {formatBRL(d.receita)}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 font-semibold">+12% vs mês passado</div>
        </div>
        <div className="px-3 sm:px-5 py-4 sm:py-5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Despesa
          </div>
          <div className="font-mono font-black text-base sm:text-xl text-white tabular-nums">
            R$ {formatBRL(d.despesa)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-semibold">categorizada</div>
        </div>
        <div className="px-3 sm:px-5 py-4 sm:py-5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Lucro líquido
          </div>
          <div
            className="font-mono font-black text-base sm:text-xl tabular-nums"
            style={{ color: d.accent }}
          >
            R$ {formatBRL(lucroLiquido)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-semibold">margem {margem}%</div>
        </div>
      </div>

      {/* Despesas categorizadas + gráfico 7d */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-4 px-5 sm:px-6 py-4 sm:py-5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="mb-4 sm:mb-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
            Despesas top 3
          </div>
          <div className="space-y-1.5">
            {d.topExpenses.map((e) => (
              <div key={e.cat} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: e.color }}
                />
                <span className="text-[12px] text-slate-300 flex-1">{e.cat}</span>
                <span className="text-[12px] font-mono font-bold text-white tabular-nums">
                  R$ {formatBRL(e.valor)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mini chart barras 7 dias */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
            Últimos 7 dias
          </div>
          <div className="flex items-end justify-between gap-1.5" style={{ height: 60 }}>
            {d.chart7d.map((h, i) => (
              <div key={i} className="flex flex-col items-center flex-1 gap-1">
                <div
                  className="w-full rounded-sm transition-all"
                  style={{
                    height: `${h}%`,
                    background: `linear-gradient(180deg, ${d.accent}, ${d.accent}80)`,
                    boxShadow: i === d.chart7d.length - 1 ? `0 0 12px ${d.accent}66` : 'none',
                  }}
                />
                <span className="text-[9px] text-slate-500 font-semibold">
                  {DAYS_LABEL[i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insight automático */}
      <div
        className="px-5 sm:px-6 py-3.5 flex items-center gap-3"
        style={{
          background: `${d.accent}10`,
          borderTop: `1px solid ${d.accent}30`,
        }}
      >
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${d.accent}20`, color: d.accent }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Insight automático
          </div>
          <div className="text-[12px] sm:text-sm font-semibold text-white truncate">
            {d.insight}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">
            Proj. 30d
          </div>
          <div
            className="font-mono text-sm font-black tabular-nums"
            style={{ color: d.accent }}
          >
            R$ {formatBRL(d.projecao)}
          </div>
        </div>
      </div>
    </div>
  )
}
