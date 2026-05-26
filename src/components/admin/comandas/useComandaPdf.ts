'use client'

import type { InvoiceFull } from './ComandaDetalhe'

/**
 * Gera PDF do recibo da comanda usando jsPDF + autoTable.
 *
 * Por que NÃO html2pdf/html2canvas: renderizar DOM em canvas é flaky
 * (depende de fonts carregadas, viewport, position, opacity, etc).
 * jsPDF + autoTable desenha texto vetorial direto no PDF · 100%
 * previsível, texto selecionável, arquivo menor.
 *
 * Layout: padrão Salão99 (Fatura formal, monocromático).
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

async function buildPdf(invoice: InvoiceFull): Promise<{ pdf: import('jspdf').jsPDF; filename: string }> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth() // 210mm
  const marginX = 14
  const contentWidth = pageWidth - marginX * 2
  let y = 18

  const totalPago = invoice.payments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const pendente = Math.max(0, invoice.total - totalPago)
  const itemsCount = invoice.items.length
  const itemsDiscount = invoice.items.reduce((s, it) => s + Number(it.discount ?? 0), 0)
  const manualDiscount = Number(invoice.manual_discount ?? 0)
  const dataGeracao = invoice.closed_at ?? invoice.cancelled_at ?? invoice.created_at

  // ─── CABEÇALHO ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(15, 23, 42) // slate-900
  doc.text(`Fatura #${invoice.invoice_number}`, marginX, y)

  // Direita: geração da fatura + data
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128) // gray-500
  doc.text('Geração da Fatura', pageWidth - marginX, y - 4, { align: 'right' })
  doc.setFontSize(10)
  doc.setTextColor(31, 41, 55) // gray-800
  doc.text(fmtDataLonga(dataGeracao), pageWidth - marginX, y, { align: 'right' })

  // Cliente abaixo do número
  y += 8
  if (invoice.customer?.name) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(13)
    doc.setTextColor(15, 23, 42)
    doc.text(invoice.customer.name, marginX, y)
  }
  y += 8

  // ─── TABELA DE ITENS ───────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [['Descrição', 'Profissional', 'Valor']],
    body: invoice.items.map((it) => [
      it.description + (it.quantity > 1 ? ` · qtd ${it.quantity}` : ''),
      it.professional_name ?? '—',
      brl(it.total),
    ]),
    margin: { left: marginX, right: marginX },
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 3,
      textColor: [31, 41, 55],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [107, 114, 128],
      fontStyle: 'bold',
      fontSize: 9,
      lineWidth: { bottom: 0.3 },
      lineColor: [229, 231, 235],
    },
    bodyStyles: {
      lineWidth: { bottom: 0.1 },
      lineColor: [243, 244, 246],
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 45 },
      2: { cellWidth: 30, halign: 'right' },
    },
    theme: 'plain',
  })

  // autoTable atualiza lastAutoTable.finalY
  // @ts-expect-error · jspdf-autotable adiciona prop em runtime
  y = (doc.lastAutoTable?.finalY ?? y) + 8

  // ─── RESUMO DA FATURA (direita) ────────────────────────────────
  const resumoX = pageWidth - marginX
  const labelX = pageWidth - marginX - 50
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  const linhasResumo: Array<[string, string, boolean?]> = [
    ['Quantidade', `${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'}`],
    ['Subtotal', brl(invoice.subtotal)],
  ]
  if (itemsDiscount > 0) linhasResumo.push(['Descontos por item', `- ${brl(itemsDiscount)}`])
  if (manualDiscount > 0) linhasResumo.push(['Desconto geral', `- ${brl(manualDiscount)}`])
  linhasResumo.push(['Total da Fatura', brl(invoice.total), true])

  linhasResumo.forEach(([label, value, strong]) => {
    doc.setFont('helvetica', strong ? 'bold' : 'normal')
    doc.setTextColor(strong ? 15 : 75, strong ? 23 : 85, strong ? 42 : 99)
    doc.text(label, labelX, y, { align: 'right' })
    doc.setTextColor(31, 41, 55)
    doc.text(value, resumoX, y, { align: 'right' })
    y += 6
  })

  y += 4

  // ─── DIVISOR ───────────────────────────────────────────────────
  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.2)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 8

  // ─── FORMAS DE PAGAMENTO ───────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text('FORMAS DE PAGAMENTO', marginX, y)
  y += 6

  if (invoice.payments.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(156, 163, 175)
    doc.text('Sem pagamento registrado', marginX, y)
    y += 8
  } else {
    invoice.payments.forEach((p) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(31, 41, 55)
      doc.text(METHOD_LABEL[p.payment_method] ?? p.payment_method, marginX, y)
      doc.text(brl(p.amount), pageWidth - marginX, y, { align: 'right' })
      y += 4
      doc.setFontSize(8)
      doc.setTextColor(107, 114, 128)
      doc.text(`Pago em: ${fmtDataCurta(p.paid_at)}`, marginX, y)
      y += 7
    })
  }

  y += 4
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 6

  // ─── RESUMO DE PAGAMENTO (direita) ─────────────────────────────
  const linhasPgto: Array<[string, string, boolean?]> = [
    ['Pagamentos', brl(totalPago)],
  ]
  if (pendente > 0) linhasPgto.push(['Pendente Pagamento', brl(pendente)])
  linhasPgto.push(['Total Pago', brl(totalPago), true])

  linhasPgto.forEach(([label, value, strong]) => {
    doc.setFont('helvetica', strong ? 'bold' : 'normal')
    doc.setFontSize(strong ? 11 : 10)
    doc.setTextColor(strong ? 15 : 75, strong ? 23 : 85, strong ? 42 : 99)
    doc.text(label, labelX, y, { align: 'right' })
    doc.setTextColor(31, 41, 55)
    doc.text(value, resumoX, y, { align: 'right' })
    y += strong ? 7 : 6
  })

  // ─── OBSERVAÇÕES ───────────────────────────────────────────────
  if (invoice.notes) {
    y += 4
    doc.line(marginX, y, pageWidth - marginX, y)
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    doc.text('OBSERVAÇÕES', marginX, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(31, 41, 55)
    const lines = doc.splitTextToSize(invoice.notes, contentWidth)
    doc.text(lines, marginX, y)
  }

  const cliente = (invoice.customer?.name ?? 'sem-cliente')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().slice(0, 30)
  const filename = `comanda-${invoice.invoice_number}-${cliente}.pdf`

  return { pdf: doc, filename }
}

export async function downloadComandaPdf({ invoice }: { invoice: InvoiceFull }): Promise<void> {
  const { pdf, filename } = await buildPdf(invoice)
  pdf.save(filename)
}

export async function shareComandaPdf({
  invoice,
  customerPhone,
  text,
}: {
  invoice: InvoiceFull
  customerPhone: string | null
  text: string
}): Promise<{ shared: boolean; via: 'native-share' | 'wa-link' | 'download-only' }> {
  const { pdf, filename } = await buildPdf(invoice)

  // 1. Tenta share nativo com file (Android/iOS abre seletor WhatsApp)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const blob = pdf.output('blob')
      const file = new File([blob], filename, { type: 'application/pdf' })
      const canShareFile =
        typeof navigator.canShare === 'function'
          ? navigator.canShare({ files: [file] })
          : true
      if (canShareFile) {
        await navigator.share({ files: [file], title: filename, text })
        return { shared: true, via: 'native-share' }
      }
    } catch {
      // user cancelou OU não suportado · cai pro fallback
    }
  }

  // 2. Fallback: baixa PDF + abre wa.me com texto (desktop sem Web Share API)
  pdf.save(filename)
  if (customerPhone) {
    const phone = customerPhone.replace(/\D/g, '')
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    return { shared: true, via: 'wa-link' }
  }

  return { shared: true, via: 'download-only' }
}
