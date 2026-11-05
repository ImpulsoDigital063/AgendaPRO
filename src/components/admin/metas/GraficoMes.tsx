/* ═══════════════════════════════════════════════════════════════
   Gráfico do mês · UMA linha (05/11/2026)

   Eduardo reprovou anéis e barras múltiplas ("Treino"). Aqui: o acumulado
   dia a dia (dourado, linha cheia) e a linha reta da meta (cinza, tracejada)
   do dia 1º ao último dia. Rótulo direto nas pontas, sem legenda, sem eixo
   Y. SVG puro (renderiza no servidor), escala junto com a largura do
   cartão. O computador (lg:) usa um desenho mais largo e baixo, senão a
   letra cresce junto com o cartão.
   ═══════════════════════════════════════════════════════════════ */

function brlCurto(v: number): string {
  if (v >= 10000) return `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, minimumFractionDigits: 0 })
}

export function GraficoMes({ acumulado, meta, diasNoMes, largura = 340, altura = 168 }: {
  acumulado: { ymd: string; valor: number }[]
  meta: number | null
  diasNoMes: number
  /** largura/altura do desenho: o celular usa 340×168; o computador, mais largo e baixo */
  largura?: number
  altura?: number
}) {
  if (acumulado.length === 0) return null
  const W = largura
  const H = altura
  const padL = 8
  const padR = 8
  const padT = 26
  const padB = 22
  const ultimo = acumulado[acumulado.length - 1].valor
  const topo = Math.max(meta ?? 0, ultimo, 1) * 1.04
  const x = (dia: number) => padL + (dia / diasNoMes) * (W - padL - padR)
  const y = (v: number) => padT + (1 - v / topo) * (H - padT - padB)

  const pontos = [[x(0), y(0)], ...acumulado.map((p, i) => [x(i + 1), y(p.valor)])]
  const caminho = pontos.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ')
  const area = `${caminho} L${x(acumulado.length).toFixed(1)},${y(0).toFixed(1)} Z`
  const [fx, fy] = pontos[pontos.length - 1]
  const hoje = acumulado.length
  // rótulo do "hoje" vai pra esquerda quando o ponto está na metade direita
  const ancoraHoje = hoje > diasNoMes * 0.6 ? 'end' : 'start'
  const dxHoje = ancoraHoje === 'end' ? -8 : 8

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Faturamento acumulado até o dia ${hoje}: ${brlCurto(ultimo)}${meta ? `, meta ${brlCurto(meta)}` : ''}`} className="block">
      {/* base */}
      <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="var(--admin-border)" strokeWidth={1} />
      {/* meta: linha reta do dia 1º ao último dia */}
      {meta ? (
        <>
          <line x1={x(0)} y1={y(0)} x2={x(diasNoMes)} y2={y(meta)} stroke="var(--admin-text-faded)" strokeWidth={1.5} strokeDasharray="4 4" />
          <text x={x(diasNoMes)} y={y(meta) - 8} textAnchor="end" fontSize={11} fontWeight={600} fill="var(--admin-text-mute)">meta {brlCurto(meta)}</text>
        </>
      ) : null}
      {/* acumulado */}
      <path d={area} fill="var(--admin-accent)" opacity={0.1} />
      <path d={caminho} fill="none" stroke="var(--admin-accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={fx} cy={fy} r={4.5} fill="var(--admin-accent)" stroke="var(--admin-surface)" strokeWidth={2} />
      <text x={fx + dxHoje} y={fy - 8} textAnchor={ancoraHoje} fontSize={12} fontWeight={700} fill="var(--admin-text)">{brlCurto(ultimo)}</text>
      {/* hover nativo por dia */}
      {acumulado.map((p, i) => (
        <rect key={p.ymd} x={x(i + 0.5)} y={padT} width={x(1) - x(0)} height={H - padT - padB} fill="transparent">
          <title>{`${p.ymd.slice(8, 10)}/${p.ymd.slice(5, 7)}: ${brlCurto(p.valor)}`}</title>
        </rect>
      ))}
      {/* eixo X: 1º, hoje e último dia */}
      <text x={x(0) + 2} y={H - 6} fontSize={10} fill="var(--admin-text-faded)">dia 1</text>
      {hoje > 3 && hoje < diasNoMes - 3 && (
        <text x={x(hoje)} y={H - 6} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--admin-text-mute)">hoje</text>
      )}
      <text x={x(diasNoMes) - 2} y={H - 6} textAnchor="end" fontSize={10} fill="var(--admin-text-faded)">dia {diasNoMes}</text>
    </svg>
  )
}
