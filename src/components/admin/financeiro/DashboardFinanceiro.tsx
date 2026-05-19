import Link from 'next/link'

type KpiCard = {
  label: string
  value: number
  previous: number
  tone: 'positive' | 'negative' | 'primary' | 'neutral'
  format?: 'currency' | 'count'
}

type DonutSlice = {
  label: string
  value: number
  color: string
}

type ComparativoPoint = {
  label: string
  current: number
  previous: number
}

export type RankRow = {
  id: string
  name: string
  total: number
  count: number
}

export type TaxasBreakdown = {
  bruto: number
  taxas: number
  liquido: number
}

type Props = {
  periodo: 'hoje' | 'semana' | 'mes'
  kpis: KpiCard[]
  formasPagamento: DonutSlice[]
  principaisDespesas: DonutSlice[]
  comparativo: ComparativoPoint[]
  comparativoTotals: {
    valor_recebido: number
    despesas_pagas: number
    valor_programado: number
    despesas_pendentes: number
  }
  taxasBreakdown?: TaxasBreakdown
  topProfissionais: RankRow[]
  topServicos: RankRow[]
}

const PERIODO_LABEL: Record<Props['periodo'], string> = {
  hoje: 'Hoje',
  semana: 'Últimos 7 dias',
  mes: 'Últimos 30 dias',
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function pctVariation(current: number, previous: number): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0) {
    if (current === 0) return { pct: 0, direction: 'flat' }
    return { pct: 100, direction: 'up' }
  }
  const delta = ((current - previous) / Math.abs(previous)) * 100
  return {
    pct: Math.abs(Math.round(delta)),
    direction: delta > 1 ? 'up' : delta < -1 ? 'down' : 'flat',
  }
}

const TONE_COLORS: Record<KpiCard['tone'], { bg: string; text: string; border: string }> = {
  positive: { bg: 'color-mix(in srgb, #10B981 12%, transparent)', text: '#059669', border: 'color-mix(in srgb, #10B981 35%, transparent)' },
  negative: { bg: 'color-mix(in srgb, #EF4444 12%, transparent)', text: '#DC2626', border: 'color-mix(in srgb, #EF4444 35%, transparent)' },
  primary: { bg: 'color-mix(in srgb, var(--admin-accent) 12%, transparent)', text: 'var(--admin-accent)', border: 'color-mix(in srgb, var(--admin-accent) 35%, transparent)' },
  neutral: { bg: 'var(--admin-surface-hi)', text: 'var(--admin-text)', border: 'var(--admin-border)' },
}

export default function DashboardFinanceiro({
  periodo,
  kpis,
  formasPagamento,
  principaisDespesas,
  comparativo,
  comparativoTotals,
  taxasBreakdown,
  topProfissionais,
  topServicos,
}: Props) {
  return (
    <div className="space-y-5">
      {/* Toggle de período · 3 botões */}
      <div className="flex flex-wrap gap-1 rounded-xl p-1 mb-2" style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
        width: 'fit-content',
      }}>
        {(['hoje', 'semana', 'mes'] as const).map((p) => (
          <Link
            key={p}
            href={`?periodo=${p}`}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider"
            style={{
              background: periodo === p ? 'var(--admin-accent)' : 'transparent',
              color: periodo === p ? '#fff' : 'var(--admin-text-mute)',
            }}
            scroll={false}
          >
            {PERIODO_LABEL[p]}
          </Link>
        ))}
      </div>

      {/* HERO · Lucro Líquido destacado */}
      {(() => {
        const lucroKpi = kpis.find((k) => k.label === 'Lucro líquido')
        const recebidoKpi = kpis.find((k) => k.label === 'Valor recebido')
        if (!lucroKpi) return null
        const variation = pctVariation(lucroKpi.value, lucroKpi.previous)
        const positivo = lucroKpi.value >= 0
        return (
          <div
            className="rounded-2xl p-6 lg:p-7 relative overflow-hidden"
            style={{
              background: positivo
                ? 'linear-gradient(135deg, color-mix(in srgb, var(--admin-accent) 16%, var(--admin-surface)) 0%, color-mix(in srgb, #10B981 10%, var(--admin-surface)) 100%)'
                : 'linear-gradient(135deg, color-mix(in srgb, #EF4444 16%, var(--admin-surface)) 0%, var(--admin-surface) 100%)',
              border: '1px solid var(--admin-border)',
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--admin-text-mute)' }}>
                  Lucro Líquido · {PERIODO_LABEL[periodo]}
                </p>
                <p
                  className="font-extrabold tabular-nums leading-none"
                  style={{
                    fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                    color: positivo ? 'var(--admin-accent)' : '#DC2626',
                  }}
                >
                  {formatBRL(lucroKpi.value)}
                </p>
                {variation.direction !== 'flat' && (
                  <p className="mt-3 text-sm">
                    <span
                      className="inline-flex items-center gap-1 font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-xs"
                      style={{
                        background: variation.direction === 'up' ? 'color-mix(in srgb, #10B981 18%, transparent)' : 'color-mix(in srgb, #EF4444 14%, transparent)',
                        color: variation.direction === 'up' ? '#059669' : '#DC2626',
                      }}
                    >
                      {variation.direction === 'up' ? '↑' : '↓'} {variation.pct}%
                    </span>{' '}
                    <span style={{ color: 'var(--admin-text-mute)' }}>vs período anterior · {formatBRL(lucroKpi.previous)}</span>
                  </p>
                )}
              </div>
              {recebidoKpi && (
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
                    Receita Bruta
                  </p>
                  <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: 'var(--admin-text)' }}>
                    {formatBRL(recebidoKpi.value)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* KPIs secundários · 2 cols mobile · 4 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.filter((k) => k.label !== 'Lucro líquido' && k.label !== 'Valor recebido').map((k) => {
          const colors = TONE_COLORS[k.tone]
          const variation = pctVariation(k.value, k.previous)
          return (
            <div
              key={k.label}
              className="rounded-2xl p-4"
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                {k.label}
              </p>
              <p className="text-xl font-bold tabular-nums mt-1.5" style={{ color: colors.text }}>
                {k.format === 'count' ? k.value.toLocaleString('pt-BR') : formatBRL(k.value)}
              </p>
              {variation.direction !== 'flat' && (
                <p
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider mt-2 px-2 py-0.5 rounded-md"
                  style={{
                    background: variation.direction === 'up' ? colors.bg : 'color-mix(in srgb, var(--admin-text-faded) 14%, transparent)',
                    color: variation.direction === 'up' ? colors.text : 'var(--admin-text-mute)',
                  }}
                >
                  {variation.direction === 'up' ? '↑' : '↓'} {variation.pct}%
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Card Taxas (só quando há fees) */}
      {taxasBreakdown && taxasBreakdown.taxas > 0 && (
        <div
          className="rounded-2xl p-5 grid grid-cols-3 gap-4 text-center"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
              Receita Bruta
            </p>
            <p className="text-xl font-bold tabular-nums mt-1" style={{ color: 'var(--admin-text)' }}>
              {formatBRL(taxasBreakdown.bruto)}
            </p>
          </div>
          <div style={{ borderLeft: '1px solid var(--admin-divider)', borderRight: '1px solid var(--admin-divider)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
              − Taxas Cartão/Pix
            </p>
            <p className="text-xl font-bold tabular-nums mt-1" style={{ color: '#DC2626' }}>
              − {formatBRL(taxasBreakdown.taxas)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
              Líquido
            </p>
            <p className="text-xl font-bold tabular-nums mt-1" style={{ color: '#059669' }}>
              {formatBRL(taxasBreakdown.liquido)}
            </p>
          </div>
        </div>
      )}

      {/* Donuts · 2 cards lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <DonutCard title="Formas de Pagamento" slices={formasPagamento} />
        <DonutCard
          title="Principais Despesas"
          slices={principaisDespesas}
          emptyAction={{ label: '+ Cadastrar Despesa', href: '/admin/financeiro/despesas' }}
        />
      </div>

      {/* Tops · profissionais + serviços */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <RankCard title="Top Profissionais" rows={topProfissionais} />
        <RankCard title="Top Serviços" rows={topServicos} />
      </div>

      {/* Comparativo · barras + painel resumo */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--admin-text-mute)' }}>
            Gráfico Comparativo
          </h3>
          <ComparativoBars data={comparativo} />
          <div className="flex flex-wrap gap-4 mt-4 text-xs">
            <div className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ background: 'var(--admin-accent)' }} />
              <span style={{ color: 'var(--admin-text-2)' }}>Período atual</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ border: '1.5px dashed var(--admin-text-faded)' }} />
              <span style={{ color: 'var(--admin-text-mute)' }}>Período anterior (mesmo intervalo)</span>
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-5 space-y-3"
          style={{
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
          }}
        >
          <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-mute)' }}>
            Resumo
          </h3>
          <ResumoLine color="#059669" label="Valor recebido" value={comparativoTotals.valor_recebido} />
          <ResumoLine color="#DC2626" label="Despesas pagas" value={comparativoTotals.despesas_pagas} />
          <ResumoLine color="var(--admin-accent)" label="Valor programado" value={comparativoTotals.valor_programado} />
          <ResumoLine color="var(--admin-warning,#F59E0B)" label="Despesas pendentes" value={comparativoTotals.despesas_pendentes} />
        </div>
      </div>
    </div>
  )
}

function RankCard({ title, rows }: { title: string; rows: RankRow[] }) {
  const max = Math.max(...rows.map((r) => r.total), 1)
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--admin-text-mute)' }}>
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--admin-text-faded)' }}>
          Sem dados no período
        </p>
      ) : (
        <ol className="space-y-3">
          {rows.map((r, idx) => {
            const pct = (r.total / max) * 100
            return (
              <li key={r.id}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{
                        background: idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : idx === 2 ? '#B45309' : 'var(--admin-surface-hi)',
                        color: idx <= 2 ? '#fff' : 'var(--admin-text-mute)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                      {r.name}
                    </span>
                    <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--admin-text-faded)' }}>
                      {r.count}×
                    </span>
                  </span>
                  <span className="font-bold tabular-nums flex-shrink-0 ml-2" style={{ color: 'var(--admin-text)' }}>
                    {formatBRL(r.total)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--admin-surface-hi)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: 'var(--admin-accent)' }}
                  />
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function ResumoLine({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2 text-xs" style={{ color: 'var(--admin-text-mute)' }}>
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
        {formatBRL(value)}
      </span>
    </div>
  )
}

function DonutCard({ title, slices, emptyAction }: { title: string; slices: DonutSlice[]; emptyAction?: { label: string; href: string } }) {
  const total = slices.reduce((s, v) => s + v.value, 0)
  const filtered = slices.filter((s) => s.value > 0)

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--admin-text-mute)' }}>
        {title}
      </h3>
      {total === 0 || filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm mb-3" style={{ color: 'var(--admin-text-faded)' }}>
            Sem dados no período
          </p>
          {emptyAction && (
            <Link
              href={emptyAction.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              {emptyAction.label}
            </Link>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <DonutSvg slices={filtered} total={total} />
          <div className="flex-1 space-y-2 min-w-0">
            {filtered.map((s) => {
              const pct = Math.round((s.value / total) * 100)
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="inline-flex items-center gap-2 min-w-0" style={{ color: 'var(--admin-text-2)' }}>
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                      <span className="truncate">{s.label}</span>
                    </span>
                    <span className="font-bold tabular-nums flex-shrink-0 ml-2" style={{ color: 'var(--admin-text)' }}>
                      {formatBRL(s.value)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'var(--admin-surface-hi)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: s.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function DonutSvg({ slices, total }: { slices: DonutSlice[]; total: number }) {
  const size = 120
  const stroke = 20
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r

  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--admin-surface-hi)" strokeWidth={stroke} />
      {slices.map((s, i) => {
        const len = (s.value / total) * c
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${len} ${c}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dasharray 0.3s' }}
          />
        )
        offset += len
        return el
      })}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: 11, fontWeight: 700, fill: 'var(--admin-text)' }}
      >
        {slices.length}
      </text>
    </svg>
  )
}

function ComparativoBars({ data }: { data: ComparativoPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-center py-8" style={{ color: 'var(--admin-text-faded)' }}>
        Sem dados no período
      </p>
    )
  }

  const max = Math.max(...data.map((d) => Math.max(d.current, d.previous, 0))) || 1
  const height = 220
  const barGap = 4
  const groupGap = 14
  const barWidth = 14
  const totalWidth = data.length * (barWidth * 2 + barGap + groupGap)

  // Linhas guia · 25/50/75%
  const guides = [0.25, 0.5, 0.75, 1]

  return (
    <div className="overflow-x-auto">
      <svg
        width="100%"
        height={height + 44}
        viewBox={`0 0 ${totalWidth + 50} ${height + 44}`}
        style={{ minWidth: totalWidth + 50 }}
      >
        {/* Linhas guia horizontais */}
        {guides.map((g) => (
          <g key={g}>
            <line
              x1={40}
              y1={height - height * g}
              x2={totalWidth + 50}
              y2={height - height * g}
              stroke="var(--admin-divider)"
              strokeDasharray="2 4"
            />
            <text
              x={36}
              y={height - height * g + 4}
              textAnchor="end"
              style={{ fontSize: 9, fill: 'var(--admin-text-faded)' }}
            >
              {formatBRL(max * g).replace(/[\sR$,]/g, (m) => m === 'R' ? '' : m === '$' ? '' : m === ' ' ? '' : '')}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = 50 + i * (barWidth * 2 + barGap + groupGap)
          const hCur = Math.max(2, (d.current / max) * height)
          const hPrev = Math.max(2, (d.previous / max) * height)
          return (
            <g key={i}>
              <rect
                x={x}
                y={height - hCur}
                width={barWidth}
                height={hCur}
                rx={3}
                fill="var(--admin-accent)"
              >
                <title>{`${d.label} · Atual: ${formatBRL(d.current)}`}</title>
              </rect>
              <rect
                x={x + barWidth + barGap}
                y={height - hPrev}
                width={barWidth}
                height={hPrev}
                rx={3}
                fill="none"
                stroke="var(--admin-text-faded)"
                strokeWidth={1.5}
                strokeDasharray="3 2"
              >
                <title>{`${d.label} · Anterior: ${formatBRL(d.previous)}`}</title>
              </rect>
              <text
                x={x + barWidth + barGap / 2}
                y={height + 18}
                textAnchor="middle"
                style={{ fontSize: 10, fill: 'var(--admin-text-mute)' }}
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
