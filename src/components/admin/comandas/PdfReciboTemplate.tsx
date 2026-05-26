'use client'

import { forwardRef } from 'react'
import type { InvoiceFull } from './ComandaDetalhe'

/**
 * Template do recibo em PDF · estilo Salão99 (fatura formal).
 *
 * Layout:
 *  - Cabeçalho: Fatura #N (esq) | Geração da Fatura + data (dir)
 *  - Cliente
 *  - Tabela enxuta: Descrição | Profissional | Valor
 *  - Resumo: Quantidade · Subtotal · Descontos · Cancelados · Total
 *  - Formas de Pagamento (lista)
 *  - Resumo final: Pagamentos · Estornos · Pendente · Total Pago
 *
 * Renderizado OFFSCREEN no DOM (position absolute · left -9999px) pra
 * html2canvas capturar em layout consistente. Não aparece pro usuário.
 *
 * Referência: reference_salao99_pdf_recibo_layout.md
 */

const METHOD_LABEL: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  card: 'Cartão de Crédito',
  courtesy: 'Cortesia',
  points: 'Pontos',
  credit: 'Crédito do cliente',
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDataLonga(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function fmtDataCurta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

type Props = {
  invoice: InvoiceFull
}

const PdfReciboTemplate = forwardRef<HTMLDivElement, Props>(function PdfReciboTemplate(
  { invoice },
  ref,
) {
  const totalPago = invoice.payments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const pendente = Math.max(0, invoice.total - totalPago)
  const itemsCount = invoice.items.length
  const itemsDiscount = invoice.items.reduce((s, it) => s + Number(it.discount ?? 0), 0)
  const manualDiscount = Number(invoice.manual_discount ?? 0)
  const descontoTotal = itemsDiscount + manualDiscount
  const dataGeracao =
    invoice.closed_at ?? invoice.cancelled_at ?? invoice.created_at

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: -9999,
        top: 0,
        width: 800,
        padding: 32,
        background: '#FFFFFF',
        color: '#1F2937',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      {/* CABEÇALHO */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#0F172A' }}>
            Fatura #{invoice.invoice_number}
          </h1>
          {invoice.customer?.name && (
            <p style={{ margin: '4px 0 0 0', fontSize: 18, color: '#0F172A' }}>
              {invoice.customer.name}
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>Geração da Fatura</p>
          <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#1F2937' }}>{fmtDataLonga(dataGeracao)}</p>
        </div>
      </header>

      {/* TABELA DE ITENS */}
      <section style={{ marginTop: 32 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ textAlign: 'left', padding: '0 0 8px 0', fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
                Descrição
              </th>
              <th style={{ textAlign: 'left', padding: '0 0 8px 16px', fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
                Profissional
              </th>
              <th style={{ textAlign: 'right', padding: '0 0 8px 16px', fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
                Valor
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it) => (
              <tr key={it.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '12px 0', color: '#1F2937' }}>
                  {it.description}
                  {it.quantity > 1 && (
                    <span style={{ color: '#6B7280', fontSize: 12 }}> · qtd {it.quantity}</span>
                  )}
                </td>
                <td style={{ padding: '12px 0 12px 16px', color: '#4B5563' }}>
                  {it.professional_name ?? '—'}
                </td>
                <td style={{ padding: '12px 0 12px 16px', color: '#1F2937', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {brl(it.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* RESUMO DA FATURA · direita */}
      <section style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <table style={{ width: '50%', borderCollapse: 'collapse' }}>
          <tbody>
            <PdfRow label="Quantidade" value={`${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'}`} />
            <PdfRow label="Subtotal" value={brl(invoice.subtotal)} />
            {itemsDiscount > 0 && <PdfRow label="Descontos por item" value={brl(itemsDiscount)} />}
            {manualDiscount > 0 && <PdfRow label="Desconto geral" value={brl(manualDiscount)} />}
            <PdfRow label="Total da Fatura" value={brl(invoice.total)} strong />
          </tbody>
        </table>
      </section>

      {/* FORMAS DE PAGAMENTO */}
      <section style={{ marginTop: 32, borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
        <p style={{ margin: '0 0 12px 0', fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
          Formas de Pagamento
        </p>
        {invoice.payments.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: '#6B7280', fontStyle: 'italic' }}>
            Sem pagamento registrado
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {invoice.payments.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '10px 0', color: '#1F2937' }}>
                    <div>{METHOD_LABEL[p.payment_method] ?? p.payment_method}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      Pago em: {fmtDataCurta(p.paid_at)}
                    </div>
                  </td>
                  <td style={{ padding: '10px 0', color: '#1F2937', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {brl(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* RESUMO DE PAGAMENTO · direita */}
      <section style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <table style={{ width: '50%', borderCollapse: 'collapse' }}>
          <tbody>
            <PdfRow label="Pagamentos" value={brl(totalPago)} />
            {pendente > 0 && <PdfRow label="Pendente Pagamento" value={brl(pendente)} />}
            <PdfRow label="Total Pago" value={brl(totalPago)} strong />
          </tbody>
        </table>
      </section>

      {/* RODAPÉ */}
      {invoice.notes && (
        <section style={{ marginTop: 32, borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
          <p style={{ margin: '0 0 4px 0', fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
            Observações
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#1F2937', whiteSpace: 'pre-wrap' }}>{invoice.notes}</p>
        </section>
      )}
    </div>
  )
})

function PdfRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr>
      <td style={{ padding: '4px 0', color: '#4B5563', fontSize: 13, fontWeight: strong ? 700 : 400 }}>
        {label}
      </td>
      <td style={{ padding: '4px 0', color: '#1F2937', textAlign: 'right', fontSize: 13, fontWeight: strong ? 700 : 400, whiteSpace: 'nowrap' }}>
        {value}
      </td>
    </tr>
  )
}

export default PdfReciboTemplate
