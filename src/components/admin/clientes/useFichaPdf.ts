'use client'

/**
 * PDF da ficha de nicho (cílios etc.) — reusa a abordagem da comanda
 * (jsPDF, texto vetorial, confiável). Embute o mapeamento e a assinatura
 * (convertidos de webp → jpeg, que o jsPDF aceita). Compartilha por WhatsApp
 * com Web Share nativo + fallback wa.me, igual ao useComandaPdf.
 */

import type { NicheFicha, FichaSection } from '@/lib/fichas/types'
import type { FichaValues } from './FichaDedicada'

type Customer = { name: string; phone: string | null; birthday: string | null } | null

function fmtDataLonga(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// webp/data-url/Storage-url → { jpeg dataURL, w, h }. createImageBitmap come webp.
async function toJpeg(src: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(src)
    const blob = await res.blob()
    const bmp = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = bmp.width
    canvas.height = bmp.height
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, bmp.width, bmp.height)
    ctx.drawImage(bmp, 0, 0)
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.9), w: bmp.width, h: bmp.height }
  } catch {
    return null
  }
}

function isImg(v: unknown): v is string {
  return typeof v === 'string' && (v.startsWith('data:image') || /\/storage\/v1\/object\//.test(v))
}

async function buildPdf(ficha: NicheFicha, values: FichaValues, customer: Customer, dateIso?: string) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const mX = 14
  const cw = W - mX * 2
  let y = 18

  const ensure = (need: number) => { if (y + need > H - 14) { doc.addPage(); y = 18 } }

  // Cabeçalho
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(15, 23, 42)
  doc.text(ficha.name, mX, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(107, 114, 128)
  doc.text(fmtDataLonga(dateIso ? new Date(dateIso) : new Date()), W - mX, y, { align: 'right' })
  y += 8
  if (customer?.name) {
    doc.setFontSize(12); doc.setTextColor(15, 23, 42)
    doc.text(customer.name + (customer.phone ? `  ·  ${customer.phone}` : ''), mX, y)
    y += 8
  }
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.3); doc.line(mX, y, W - mX, y); y += 8

  const sectionTitle = (t: string) => {
    ensure(12)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(15, 23, 42)
    doc.text(t.toUpperCase(), mX, y); y += 2
    doc.setDrawColor(229, 231, 235); doc.line(mX, y, W - mX, y); y += 6
  }
  const kv = (label: string, value: string) => {
    if (!value) return
    ensure(7)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(107, 114, 128)
    doc.text(label, mX, y)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(31, 41, 55)
    const lines = doc.splitTextToSize(value, cw - 45)
    doc.text(lines, mX + 45, y)
    y += Math.max(6, lines.length * 5)
  }
  const para = (txt: string, size = 9, color: [number, number, number] = [75, 85, 99]) => {
    const lines = doc.splitTextToSize(txt, cw)
    ensure(lines.length * 4 + 2)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(...color)
    doc.text(lines, mX, y); y += lines.length * (size * 0.42) + 3
  }
  const image = async (src: string, maxW: number, maxH: number) => {
    const im = await toJpeg(src)
    if (!im) { kv('', '(imagem indisponível)'); return }
    const ratio = im.w / im.h
    let w = maxW, h = w / ratio
    if (h > maxH) { h = maxH; w = h * ratio }
    ensure(h + 2)
    doc.addImage(im.dataUrl, 'JPEG', mX, y, w, h)
    y += h + 4
  }

  for (const section of ficha.sections) {
    const s = section as FichaSection
    if (s.kind === 'health') {
      sectionTitle(s.title)
      const marked = Array.isArray(values[s.title]) ? (values[s.title] as string[]) : []
      para(marked.length ? marked.join('  ·  ') : 'Nenhum item marcado', 10, [31, 41, 55])
      const det = typeof values['saude_detalhe'] === 'string' ? (values['saude_detalhe'] as string) : ''
      if (det) { y += 1; kv('Detalhes', det) }
      y += 2
    } else if (s.kind === 'mapping') {
      sectionTitle(s.title)
      const map = values[s.drawName]
      if (isImg(map)) await image(map as string, 120, 70)
      for (const p of s.params) kv(p.label, typeof values[p.name] === 'string' ? (values[p.name] as string) : '')
      y += 2
    } else if (s.kind === 'fields') {
      sectionTitle(s.title)
      for (const p of s.fields) kv(p.label, typeof values[p.name] === 'string' ? (values[p.name] as string) : '')
      y += 2
    } else if (s.kind === 'term') {
      sectionTitle(s.title)
      para(s.text)
      // Consents têm rótulo longo → linha cheia com marcador (não coluna fixa)
      for (const c of s.consents) {
        const yes = values[c.name] === true
        const lines = doc.splitTextToSize(`${yes ? '[X]' : '[   ]'}  ${c.label}`, cw)
        ensure(lines.length * 4.5 + 2)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(31, 41, 55)
        doc.text(lines, mX, y); y += lines.length * 4.5 + 2
      }
      y += 2
    } else {
      sectionTitle(s.label)
      const sig = values[s.name]
      if (isImg(sig)) await image(sig as string, 80, 40)
    }
  }

  const slug = (customer?.name ?? 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().slice(0, 30)
  return { pdf: doc, filename: `ficha-${ficha.slug}-${slug}.pdf` }
}

export async function downloadFichaPdf(args: { ficha: NicheFicha; values: FichaValues; customer: Customer; dateIso?: string }) {
  const { pdf, filename } = await buildPdf(args.ficha, args.values, args.customer, args.dateIso)
  pdf.save(filename)
}

export async function shareFichaPdf(args: { ficha: NicheFicha; values: FichaValues; customer: Customer; dateIso?: string; text: string }) {
  const { pdf, filename } = await buildPdf(args.ficha, args.values, args.customer, args.dateIso)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const blob = pdf.output('blob')
      const file = new File([blob], filename, { type: 'application/pdf' })
      const canShare = typeof navigator.canShare === 'function' ? navigator.canShare({ files: [file] }) : true
      if (canShare) { await navigator.share({ files: [file], title: filename, text: args.text }); return }
    } catch { /* cancelou ou sem suporte → fallback */ }
  }
  pdf.save(filename)
  const phone = (args.customer?.phone ?? '').replace(/\D/g, '')
  if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(args.text)}`, '_blank', 'noopener,noreferrer')
}
