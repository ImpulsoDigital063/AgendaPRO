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

/* MARCA DO NEGÓCIO NO PDF.
   A ficha impressa é documento que sai da clínica e vai pra mão da paciente —
   e antes saía com cara de sistema, não da clínica. Tudo aqui vem do cadastro
   do PRÓPRIO negócio: cada um imprime a marca dele, ninguém herda a de outro.

   `rodapeLinha` e `rodapeNota` são texto livre por negócio porque a linha de
   conformidade é específica da profissão (CFBio pra biomédica, CRO pra
   dentista, nada pra barbearia) — cravar um texto único imprimiria conselho
   errado no documento de alguém. */
export type MarcaPdf = {
  nome?: string | null
  logoUrl?: string | null
  corPrimaria?: string | null
  telefone?: string | null
  endereco?: string | null
  rodapeLinha?: string | null
  rodapeNota?: string | null
}

function hexToRgb(hex?: string | null): [number, number, number] | null {
  if (!hex) return null
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

async function buildPdf(ficha: NicheFicha, values: FichaValues, customer: Customer, dateIso?: string, carimbo?: CarimboPdf, marca?: MarcaPdf) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const mX = 14
  const cw = W - mX * 2

  const cor = hexToRgb(marca?.corPrimaria)
  /* Só vira documento de marca se houver o que mostrar. Negócio sem logo nem
     cor cadastrada segue com o PDF limpo de antes, sem faixa vazia no topo. */
  const temMarca = Boolean(marca && (marca.logoUrl || cor))
  const FAIXA = 16
  const topo = temMarca ? FAIXA + 10 : 18
  /* Rodapé reserva mais espaço quando tem marca: são até 4 linhas embaixo
     (contato, conformidade e as 2 do carimbo de integridade). Sem esta conta
     o texto do corpo encosta no rodapé na última página. */
  const rodapeAltura = (temMarca ? 22 : 14) + (carimbo?.assinado_em ? 7 : 0)
  let y = topo

  const ensure = (need: number) => { if (y + need > H - rodapeAltura) { doc.addPage(); y = topo } }

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

  /* ── FAIXA DE MARCA + RODAPE DE CONTATO ────────────────────────
     Pintado DEPOIS do conteúdo e página a página: o corpo já nasce abaixo da
     faixa (topo) e acima do rodapé (rodapeAltura), então não há sobreposição —
     e assim toda página sai com a marca, não só a primeira. Folha de ficha
     circula solta. */
  if (temMarca) {
    const logo = marca?.logoUrl ? await toJpeg(marca.logoUrl) : null
    const contato = marca?.rodapeLinha?.trim()
      || [marca?.nome, marca?.telefone, marca?.endereco].filter(Boolean).join('  ·  ')
    const total = doc.getNumberOfPages()
    for (let p = 1; p <= total; p++) {
      doc.setPage(p)
      if (cor) {
        doc.setFillColor(cor[0], cor[1], cor[2])
        doc.rect(0, 0, W, FAIXA, 'F')
      }
      if (logo) {
        const h = FAIXA - 3
        const w = h * (logo.w / logo.h)
        doc.addImage(logo.dataUrl, 'JPEG', (W - w) / 2, 1.5, w, h)
      }
      if (contato) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(90, 90, 90)
        doc.text(contato, W / 2, H - (carimbo?.assinado_em ? 20 : 12), { align: 'center', maxWidth: cw })
      }
      if (marca?.rodapeNota) {
        doc.setFontSize(5.5); doc.setTextColor(140, 140, 140)
        doc.text(marca.rodapeNota, W / 2, H - (carimbo?.assinado_em ? 17 : 9), { align: 'center', maxWidth: cw })
      }
      if (cor) {
        doc.setFillColor(cor[0], cor[1], cor[2])
        doc.rect(0, H - 3, W, 3, 'F')
      }
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

export async function downloadFichaPdf(args: { ficha: NicheFicha; values: FichaValues; customer: Customer; dateIso?: string; carimbo?: CarimboPdf; marca?: MarcaPdf }) {
  const { pdf, filename } = await buildPdf(args.ficha, args.values, args.customer, args.dateIso, args.carimbo, args.marca)
  pdf.save(filename)
}

/* IMPRIMIR. Antes só dava pra baixar o arquivo e achar ele depois pra mandar
   pra impressora — no celular, que é onde ela atende, isso é um caminho que
   ninguém percorre no meio do atendimento. Abre o PDF já no diálogo de
   impressão. Se o navegador bloquear o popup, cai no download, que é o
   comportamento antigo e nunca deixa a profissional sem saída. */
export async function imprimirFichaPdf(args: { ficha: NicheFicha; values: FichaValues; customer: Customer; dateIso?: string; carimbo?: CarimboPdf; marca?: MarcaPdf }) {
  const { pdf, filename } = await buildPdf(args.ficha, args.values, args.customer, args.dateIso, args.carimbo, args.marca)
  try {
    pdf.autoPrint()
    const url = URL.createObjectURL(pdf.output('blob'))
    const win = window.open(url, '_blank')
    if (!win) { URL.revokeObjectURL(url); pdf.save(filename); return }
    // libera o blob depois que o visualizador já leu
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch {
    pdf.save(filename)
  }
}

export async function shareFichaPdf(args: { ficha: NicheFicha; values: FichaValues; customer: Customer; dateIso?: string; text: string; carimbo?: CarimboPdf; marca?: MarcaPdf }) {
  const { pdf, filename } = await buildPdf(args.ficha, args.values, args.customer, args.dateIso, args.carimbo, args.marca)
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
