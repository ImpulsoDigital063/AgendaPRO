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

export default function FluxoCaixaTable({ months, data, methodLabels, categoryLabels }: Props) {
  const [receitasOpen, setReceitasOpen] = useState(false)
  const [despesasOpen, setDespesasOpen] = useState(false)

  // Métodos presentes em algum mês (ignora os 0 em tudo)
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
        <table className="w-full text-sm">
          <thead>
            <tr
              style={{
                background: 'var(--admin-surface-hi)',
                borderBottom: '1px solid var(--admin-border)',
              }}
            >
              <th
                className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--admin-text-mute)', minWidth: 240 }}
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
                const isMonthly = m.key.startsWith('m:')
                const monthParam = `${m.year}-${String(m.month0 + 1).padStart(2, '0')}`
                return (
                  <td
                    key={`r-${m.key}`}
                    className="px-4 py-3 text-right tabular-nums font-bold"
                    style={{ color: '#059669' }}
                  >
                    {r.receitasTotal > 0 && isMonthly ? (
                      <Link
                        href={`/admin/financeiro/fluxo-caixa/detalhamento?month=${monthParam}&type=receitas`}
                        className="inline-flex items-center gap-1 hover:underline"
                        title="Ver movimentações"
                      >
                        {formatBRL(r.receitasTotal)}
                        <IconExternalLink size={10} />
                      </Link>
                    ) : (
                      <span style={{ opacity: r.receitasTotal > 0 ? 1 : 0.5 }}>{formatBRL(r.receitasTotal)}</span>
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
                  const isMonthly = m.key.startsWith('m:')
                  const monthParam = `${m.year}-${String(m.month0 + 1).padStart(2, '0')}`
                  return (
                    <td
                      key={`r-sub-${key}-${m.key}`}
                      className="px-4 py-2 text-right tabular-nums text-xs"
                    >
                      {v > 0 && isMonthly ? (
                        <Link
                          href={`/admin/financeiro/fluxo-caixa/detalhamento?month=${monthParam}&type=receitas&method=${key}`}
                          className="inline-flex items-center gap-1 hover:underline"
                          style={{ color: 'var(--admin-text)' }}
                        >
                          {formatBRL(v)}
                          <IconExternalLink size={9} />
                        </Link>
                      ) : (
                        <span style={{ color: v > 0 ? 'var(--admin-text)' : 'var(--admin-text-faded)' }}>{formatBRL(v)}</span>
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
                const isMonthly = m.key.startsWith('m:')
                const monthParam = `${m.year}-${String(m.month0 + 1).padStart(2, '0')}`
                return (
                  <td
                    key={`d-${m.key}`}
                    className="px-4 py-3 text-right tabular-nums font-bold"
                    style={{ color: 'var(--admin-danger,#EF4444)' }}
                  >
                    {r.despesasTotal > 0 && isMonthly ? (
                      <Link
                        href={`/admin/financeiro/fluxo-caixa/detalhamento?month=${monthParam}&type=despesas`}
                        className="inline-flex items-center gap-1 hover:underline"
                        title="Ver movimentações"
                      >
                        {formatBRL(r.despesasTotal)}
                        <IconExternalLink size={10} />
                      </Link>
                    ) : (
                      <span style={{ opacity: r.despesasTotal > 0 ? 1 : 0.5 }}>{formatBRL(r.despesasTotal)}</span>
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
                  const isMonthly = m.key.startsWith('m:')
                  const monthParam = `${m.year}-${String(m.month0 + 1).padStart(2, '0')}`
                  return (
                    <td
                      key={`d-sub-${key}-${m.key}`}
                      className="px-4 py-2 text-right tabular-nums text-xs"
                    >
                      {v > 0 && isMonthly ? (
                        <Link
                          href={`/admin/financeiro/fluxo-caixa/detalhamento?month=${monthParam}&type=despesas&category=${key}`}
                          className="inline-flex items-center gap-1 hover:underline"
                          style={{ color: 'var(--admin-text)' }}
                        >
                          {formatBRL(v)}
                          <IconExternalLink size={9} />
                        </Link>
                      ) : (
                        <span style={{ color: v > 0 ? 'var(--admin-text)' : 'var(--admin-text-faded)' }}>{formatBRL(v)}</span>
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
                    style={{ color: r.saldoFinal < 0 ? 'var(--admin-danger,#EF4444)' : 'var(--admin-accent)' }}
                  >
                    {formatBRL(r.saldoFinal)}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
