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

// webp/data-url/Storage-url → { jpeg dataURL, w, h }.
// Decodifica via <img> (não createImageBitmap): webp funciona em todo browser
// que renderiza webp em <img>, incluindo Safari iOS — onde createImageBitmap
// falha em webp. crossOrigin='anonymous' + CORS '*' do Storage = canvas limpo.
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('img load fail'))
    img.src = src
  })
}
async function toJpeg(src: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const img = await loadImg(src)
    const w = img.naturalWidth || 1
    const h = img.naturalHeight || 1
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0)
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.9), w, h }
  } catch {
    return null
  }
}

function isImg(v: unknown): v is string {
  return typeof v === 'string' && (v.startsWith('data:image') || /\/storage\/v1\/object\//.test(v))
}

/* Carimbo do ato, quando a ficha foi assinada. Vem do banco (v120), nunca
   do navegador: data do servidor, hash do conteudo, IP e dispositivo. */
export type CarimboPdf = {
  assinado_em?: string | null
  assinatura_hash?: string | null
  assinatura_ip?: string | null
  assinante_nome?: string | null
  assinante_cpf?: string | null
  versao?: number | null
}

async function buildPdf(ficha: NicheFicha, values: FichaValues, customer: Customer, dateIso?: string, carimbo?: CarimboPdf) {
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
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(107, 114, 128)
    // Rótulo largo (textarea de procedimento etc.) não cabe na coluna de 45mm →
    // empilha: rótulo em cima, valor embaixo. Rótulo curto = duas colunas.
    if (doc.getTextWidth(label) > 40) {
      const labelLines = doc.splitTextToSize(label, cw)
      ensure(labelLines.length * 4.5 + 5)
      doc.text(labelLines, mX, y); y += labelLines.length * 4.5 + 1
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(31, 41, 55)
      const lines = doc.splitTextToSize(value, cw)
      ensure(lines.length * 5)
      doc.text(lines, mX, y); y += lines.length * 5 + 2
    } else {
      ensure(7)
      doc.text(label, mX, y)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(31, 41, 55)
      const lines = doc.splitTextToSize(value, cw - 45)
      doc.text(lines, mX + 45, y)
      y += Math.max(6, lines.length * 5)
    }
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

  /* ── RODAPE DE INTEGRIDADE ─────────────────────────────────────
     E o PDF que ela apresenta se alguem questionar. De nada adianta o hash
     ficar so no banco: quem recebe o papel precisa ter como conferir. Vai
     em TODAS as paginas porque folha solta de PDF circula sozinha. */
  if (carimbo?.assinado_em && carimbo?.assinatura_hash) {
    const quando = new Date(carimbo.assinado_em)
    const dataBR = quando.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const linha1 =
      `Documento assinado eletronicamente em ${dataBR}` +
      (carimbo.assinante_nome ? ` por ${carimbo.assinante_nome}` : '') +
      (carimbo.assinante_cpf ? ` (CPF ${carimbo.assinante_cpf})` : '') +
      (carimbo.versao && carimbo.versao > 1 ? ` · versao ${carimbo.versao}` : '')
    const linha2 =
      `Verificacao (SHA-256): ${carimbo.assinatura_hash}` +
      (carimbo.assinatura_ip ? ` · IP ${carimbo.assinatura_ip}` : '')

    const total = doc.getNumberOfPages()
    for (let p = 1; p <= total; p++) {
      doc.setPage(p)
      doc.setDrawColor(200, 200, 200)
      doc.line(mX, H - 13, W - mX, H - 13)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(110, 110, 110)
      doc.text(linha1, mX, H - 9.5)
      doc.text(linha2, mX, H - 6.5)
      doc.text(`${p}/${total}`, W - mX, H - 6.5, { align: 'right' })
    }
  }

  const slug = (customer?.name ?? 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().slice(0, 30)
  return { pdf: doc, filename: `ficha-${ficha.slug}-${slug}.pdf` }
}

export async function downloadFichaPdf(args: { ficha: NicheFicha; values: FichaValues; customer: Customer; dateIso?: string; carimbo?: CarimboPdf }) {
  const { pdf, filename } = await buildPdf(args.ficha, args.values, args.customer, args.dateIso, args.carimbo)
  pdf.save(filename)
}

export async function shareFichaPdf(args: { ficha: NicheFicha; values: FichaValues; customer: Customer; dateIso?: string; text: string; carimbo?: CarimboPdf }) {
  const { pdf, filename } = await buildPdf(args.ficha, args.values, args.customer, args.dateIso, args.carimbo)
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
