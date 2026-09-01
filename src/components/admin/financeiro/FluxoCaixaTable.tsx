'use client'

import { useState } from 'react'
import Link from 'next/link'
import { IconChevronDown, IconChevronRight, IconExternalLink } from '@/components/ui/Icon'

export type MonthCol = {
  year: number
  month0: number
  label: string
  key: string
}

export type CashMonth = {
  saldoInicial: number
  receitasByMethod: Record<string, number>
  receitasTotal: number
  despesasByCategory: Record<string, number>
  despesasTotal: number
  resultado: number
  saldoFinal: number
  /** Descontos concedidos (cupom + manual) no período · INFORMATIVO · já
   *  embutido na receita líquida · NÃO entra no cálculo do resultado. */
  descontosTotal?: number
}

type Props = {
  months: MonthCol[]
  data: Record<string, CashMonth>
  methodLabels: Record<string, string>
  categoryLabels: Record<string, string>
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// Drill-down range derivado da key da coluna. Funciona pras 4 visões.
// `to` é exclusivo (start do próximo período).
function keyToRange(key: string): { from: string; to: string; label: string } {
  if (key.startsWith('d:')) {
    const [y, m, d] = key.slice(2).split('-').map(Number)
    const start = new Date(y, m, d)
    const end = new Date(y, m, d + 1)
    return { from: ymd(start), to: ymd(end), label: ymd(start) }
  }
  if (key.startsWith('w:')) {
    const [y, m, d] = key.slice(2).split('-').map(Number)
    const start = new Date(y, m, d)
    const end = new Date(y, m, d + 7)
    return { from: ymd(start), to: ymd(end), label: `${ymd(start)} → ${ymd(new Date(y, m, d + 6))}` }
  }
  if (key.startsWith('y:')) {
    const y = parseInt(key.slice(2), 10)
    return { from: `${y}-01-01`, to: `${y + 1}-01-01`, label: String(y) }
  }
  // m:YYYY-M
  const [y, m] = key.slice(2).split('-').map(Number)
  const start = new Date(y, m, 1)
  const end = new Date(y, m + 1, 1)
  return { from: ymd(start), to: ymd(end), label: ymd(start).slice(0, 7) }
}

function drillHref(key: string, type: 'receitas' | 'despesas', extra?: { method?: string; category?: string }) {
  const r = keyToRange(key)
  const params = new URLSearchParams({ from: r.from, to: r.to, type })
  if (extra?.method) params.set('method', extra.method)
  if (extra?.category) params.set('category', extra.category)
  return `/admin/financeiro/fluxo-caixa/detalhamento?${params.toString()}`
}

export default function FluxoCaixaTable({ months, data, methodLabels, categoryLabels }: Props) {
  const [receitasOpen, setReceitasOpen] = useState(false)
  const [despesasOpen, setDespesasOpen] = useState(false)

  const methodKeys = Array.from(
    new Set(
      months.flatMap((m) => Object.keys(data[m.key]?.receitasByMethod ?? {})),
    ),
  ).filter((k) => months.some((m) => (data[m.key]?.receitasByMethod[k] ?? 0) > 0))

  const categoryKeys = Array.from(
    new Set(
      months.flatMap((m) => Object.keys(data[m.key]?.despesasByCategory ?? {})),
    ),
  ).filter((k) => months.some((m) => (data[m.key]?.despesasByCategory[k] ?? 0) > 0))

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm fluxo-table">
          <thead>
            <tr
              style={{
                background: 'var(--admin-surface-hi)',
                borderBottom: '1px solid var(--admin-border)',
              }}
            >
              <th
                className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--admin-text-mute)' }}
              />
              {months.map((m) => (
                <th
                  key={m.key}
                  className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--admin-text-mute)' }}
                >
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Saldo Inicial */}
            <tr style={{ borderBottom: '1px solid var(--admin-divider)' }}>
              <td className="px-4 py-3 font-semibold" style={{ color: 'var(--admin-text)' }}>
                Saldo Inicial
              </td>
              {months.map((m) => {
                const r = data[m.key]
                return (
                  <td
                    key={`si-${m.key}`}
                    className="px-4 py-3 text-right tabular-nums font-semibold"
                    style={{ color: r.saldoInicial < 0 ? 'var(--admin-danger,#EF4444)' : 'var(--admin-text)' }}
                  >
                    {formatBRL(r.saldoInicial)}
                  </td>
                )
              })}
            </tr>

            {/* Receitas · linha principal */}
            <tr
              style={{
                background: 'color-mix(in srgb, #10B981 8%, transparent)',
                borderBottom: '1px solid var(--admin-divider)',
              }}
            >
              <td
                className="px-4 py-3 font-semibold cursor-pointer"
                style={{ color: '#059669' }}
                onClick={() => setReceitasOpen((o) => !o)}
              >
                <span className="inline-flex items-center gap-1.5">
                  {receitasOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                  Receitas
                </span>
              </td>
              {months.map((m) => {
                const r = data[m.key]
                return (
                  <td
                    key={`r-${m.key}`}
                    className="px-4 py-3 text-right tabular-nums font-bold"
                    style={{ color: '#059669' }}
                  >
                    {r.receitasTotal > 0 ? (
                      <Link
                        href={drillHref(m.key, 'receitas')}
                        className="inline-flex items-center gap-1 hover:underline"
                        title="Ver movimentações"
                      >
                        {formatBRL(r.receitasTotal)}
                        <IconExternalLink size={10} />
                      </Link>
                    ) : (
                      <span style={{ opacity: 0.5 }}>{formatBRL(r.receitasTotal)}</span>
                    )}
                  </td>
                )
              })}
            </tr>

            {/* Sub-linhas Receitas */}
            {receitasOpen && methodKeys.map((key) => (
              <tr
                key={`r-sub-${key}`}
                style={{
                  background: 'color-mix(in srgb, #10B981 3%, transparent)',
                  borderBottom: '1px solid var(--admin-divider)',
                }}
              >
                <td className="px-4 py-2 pl-10 text-xs" style={{ color: 'var(--admin-text-2)' }}>
                  {methodLabels[key] ?? key}
                </td>
                {months.map((m) => {
                  const v = data[m.key]?.receitasByMethod[key] ?? 0
                  return (
                    <td
                      key={`r-sub-${key}-${m.key}`}
                      className="px-4 py-2 text-right tabular-nums text-xs"
                    >
                      {v > 0 ? (
                        <Link
                          href={drillHref(m.key, 'receitas', { method: key })}
                          className="inline-flex items-center gap-1 hover:underline"
                          style={{ color: 'var(--admin-text)' }}
                        >
                          {formatBRL(v)}
                          <IconExternalLink size={9} />
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--admin-text-faded)' }}>{formatBRL(v)}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {receitasOpen && methodKeys.length === 0 && (
              <tr
                style={{
                  background: 'color-mix(in srgb, #10B981 3%, transparent)',
                  borderBottom: '1px solid var(--admin-divider)',
                }}
              >
                <td colSpan={months.length + 1} className="px-4 py-2 pl-10 text-xs italic" style={{ color: 'var(--admin-text-faded)' }}>
                  Nenhuma receita registrada no período.
                </td>
              </tr>
            )}

            {/* Despesas · linha principal */}
            <tr
              style={{
                background: 'color-mix(in srgb, #EF4444 8%, transparent)',
                borderBottom: '1px solid var(--admin-divider)',
              }}
            >
              <td
                className="px-4 py-3 font-semibold cursor-pointer"
                style={{ color: 'var(--admin-danger,#EF4444)' }}
                onClick={() => setDespesasOpen((o) => !o)}
              >
                <span className="inline-flex items-center gap-1.5">
                  {despesasOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                  Despesas
                </span>
              </td>
              {months.map((m) => {
                const r = data[m.key]
                return (
                  <td
                    key={`d-${m.key}`}
                    className="px-4 py-3 text-right tabular-nums font-bold"
                    style={{ color: 'var(--admin-danger,#EF4444)' }}
                  >
                    {r.despesasTotal > 0 ? (
                      <Link
                        href={drillHref(m.key, 'despesas')}
                        className="inline-flex items-center gap-1 hover:underline"
                        title="Ver movimentações"
                      >
                        {formatBRL(r.despesasTotal)}
                        <IconExternalLink size={10} />
                      </Link>
                    ) : (
                      <span style={{ opacity: 0.5 }}>{formatBRL(r.despesasTotal)}</span>
                    )}
                  </td>
                )
              })}
            </tr>

            {/* Sub-linhas Despesas */}
            {despesasOpen && categoryKeys.map((key) => (
              <tr
                key={`d-sub-${key}`}
                style={{
                  background: 'color-mix(in srgb, #EF4444 3%, transparent)',
                  borderBottom: '1px solid var(--admin-divider)',
                }}
              >
                <td className="px-4 py-2 pl-10 text-xs" style={{ color: 'var(--admin-text-2)' }}>
                  {categoryLabels[key] ?? key}
                </td>
                {months.map((m) => {
                  const v = data[m.key]?.despesasByCategory[key] ?? 0
                  return (
                    <td
                      key={`d-sub-${key}-${m.key}`}
                      className="px-4 py-2 text-right tabular-nums text-xs"
                    >
                      {v > 0 ? (
                        <Link
                          href={drillHref(m.key, 'despesas', { category: key })}
                          className="inline-flex items-center gap-1 hover:underline"
                          style={{ color: 'var(--admin-text)' }}
                        >
                          {formatBRL(v)}
                          <IconExternalLink size={9} />
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--admin-text-faded)' }}>{formatBRL(v)}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {despesasOpen && categoryKeys.length === 0 && (
              <tr
                style={{
                  background: 'color-mix(in srgb, #EF4444 3%, transparent)',
                  borderBottom: '1px solid var(--admin-divider)',
                }}
              >
                <td colSpan={months.length + 1} className="px-4 py-2 pl-10 text-xs italic" style={{ color: 'var(--admin-text-faded)' }}>
                  Nenhuma despesa registrada no período.
                </td>
              </tr>
            )}

            {/* Resultado Líquido */}
            <tr style={{ borderBottom: '1px solid var(--admin-divider)' }}>
              <td className="px-4 py-3 font-semibold" style={{ color: 'var(--admin-text)' }}>
                Resultado Líquido
              </td>
              {months.map((m) => {
                const r = data[m.key]
                return (
                  <td
                    key={`res-${m.key}`}
                    className="px-4 py-3 text-right tabular-nums font-semibold"
                    style={{
                      color: r.resultado < 0
                        ? 'var(--admin-danger,#EF4444)'
                        : r.resultado > 0
                          ? '#059669'
                          : 'var(--admin-text-mute)',
                    }}
                  >
                    {formatBRL(r.resultado)}
                  </td>
                )
              })}
            </tr>

            {/* Saldo Final */}
            <tr style={{ background: 'var(--admin-surface-hi)' }}>
              <td className="px-4 py-3 font-bold" style={{ color: 'var(--admin-text)' }}>
                Saldo Final
              </td>
              {months.map((m) => {
                const r = data[m.key]
                return (
                  <td
                    key={`sf-${m.key}`}
                    className="px-4 py-3 text-right tabular-nums font-bold"
                    /* Cor de SINAL, nunca cor de marca (04/08/2026).
                       O positivo usava var(--admin-accent), que é a cor do
                       negócio — e a Viva Cacheada tem #a80000 na marca. O saldo
                       dela aparecia VERMELHO estando positivo (R$ 450,23), na
                       mesma tabela em que o Resultado Líquido logo acima já
                       pintava verde. Num número de dinheiro, vermelho só pode
                       significar uma coisa. Mesma régua da linha de Resultado. */
                    style={{
                      color: r.saldoFinal < 0
                        ? 'var(--admin-danger,#EF4444)'
                        : r.saldoFinal > 0
                          ? '#059669'
                          : 'var(--admin-text-mute)',
                    }}
                  >
                    {formatBRL(r.saldoFinal)}
                  </td>
                )
              })}
            </tr>

            {/* Descontos concedidos · INFORMATIVO · só aparece se houver.
                Já embutido na receita líquida · não entra no resultado. */}
            {months.some((m) => (data[m.key]?.descontosTotal ?? 0) > 0) && (
              <tr style={{ borderTop: '1px solid var(--admin-divider)' }}>
                <td className="px-4 py-2 text-xs italic" style={{ color: 'var(--admin-text-mute)' }}>
                  Descontos concedidos
                  <span className="not-italic" title="Cupons + descontos manuais. Já abatidos da receita acima — informativo."> ⓘ</span>
                </td>
                {months.map((m) => {
                  const v = data[m.key]?.descontosTotal ?? 0
                  return (
                    <td
                      key={`desc-${m.key}`}
                      className="px-4 py-2 text-right tabular-nums text-xs"
                      style={{ color: v > 0 ? 'var(--admin-accent)' : 'var(--admin-text-faded)' }}
                    >
                      {v > 0 ? `− ${formatBRL(v)}` : formatBRL(0)}
                    </td>
                  )
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
