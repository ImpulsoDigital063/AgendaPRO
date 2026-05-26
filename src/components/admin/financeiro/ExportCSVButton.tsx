'use client'

import { useState } from 'react'

function IconDownload({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

type Row = {
  date: string
  description: string
  amount: number
  origin_label?: string | null
}

type Props = {
  rows: Row[]
  filename: string
  /** Sinal antes do valor numérico · útil pra despesas */
  signedAmount?: '-' | ''
}

function csvEscape(v: string): string {
  if (v.includes('"') || v.includes(',') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`
  }
  return v
}

function formatBRL(n: number): string {
  // Excel/Google Sheets pt-BR · vírgula decimal
  return n.toFixed(2).replace('.', ',')
}

export default function ExportCSVButton({ rows, filename, signedAmount = '' }: Props) {
  const [done, setDone] = useState(false)

  function handleExport() {
    const header = ['Data', 'Descrição', 'Origem', 'Valor (R$)']
    const lines = [header.join(',')]
    for (const r of rows) {
      const date = new Date(r.date).toLocaleDateString('pt-BR')
      const desc = csvEscape(r.description)
      const origin = csvEscape(r.origin_label ?? '')
      const amount = `${signedAmount}${formatBRL(r.amount)}`
      lines.push([date, desc, origin, amount].join(','))
    }
    const total = rows.reduce((s, r) => s + r.amount, 0)
    lines.push(['', 'Total', '', `${signedAmount}${formatBRL(total)}`].join(','))

    // BOM pra Excel reconhecer UTF-8
    const csv = '﻿' + lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setDone(true)
    setTimeout(() => setDone(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={rows.length === 0}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:-translate-y-px disabled:opacity-40 disabled:hover:transform-none"
      style={{
        background: done ? 'rgba(16,185,129,0.15)' : 'var(--admin-surface-hi)',
        color: done ? 'var(--admin-success,#16A34A)' : 'var(--admin-text)',
        border: '1px solid var(--admin-border)',
      }}
      title="Baixar como CSV (abre no Excel/Sheets)"
    >
      <IconDownload size={14} />
      {done ? 'Baixado!' : 'Exportar CSV'}
    </button>
  )
}
