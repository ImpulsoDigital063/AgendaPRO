'use client'

/**
 * Hook pra gerar PDF do recibo da comanda + share via WhatsApp.
 *
 * Estratégia:
 *  - html2pdf.js (client-side · html2canvas + jsPDF wrapper) pega o card
 *    .print-card já estilizado e exporta como PDF A4
 *  - Web Share API (navigator.share com files) tenta abrir seletor nativo
 *    (Android/iOS oferecem WhatsApp). Fallback: wa.me com texto + número
 *
 * Import dinâmico do html2pdf pra não quebrar SSR (lib precisa de window).
 */

type GeneratePdfArgs = {
  /** Elemento DOM com o conteúdo do recibo (ex: .print-card). */
  element: HTMLElement | null
  /** Usado pra nomear o arquivo. Ex: "comanda-12-joao.pdf" */
  filename: string
}

export async function generateComandaPdf({ element, filename }: GeneratePdfArgs): Promise<Blob | null> {
  if (!element) return null
  const mod = await import('html2pdf.js')
  const html2pdf = (mod as { default: unknown }).default ?? mod

  const opt = {
    margin: [10, 10, 10, 10],
    filename,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
  }

  // .save() dispara download direto. Pra ter o blob (pra Web Share),
  // chamamos .outputPdf('blob').
  // Encadeamos: gera blob, e numa segunda passada também salva pro user.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = (html2pdf as any)().from(element).set(opt)
  const blob: Blob = await pdf.outputPdf('blob')
  return blob
}

export async function downloadComandaPdf(args: GeneratePdfArgs): Promise<void> {
  if (!args.element) return
  const mod = await import('html2pdf.js')
  const html2pdf = (mod as { default: unknown }).default ?? mod
  const opt = {
    margin: [10, 10, 10, 10],
    filename: args.filename,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (html2pdf as any)().from(args.element).set(opt).save()
}

/**
 * Tenta share via Web Share API com arquivo (Android/iOS · abre WhatsApp).
 * Retorna true se disparou seletor. Em caso de fallback, abre wa.me com
 * texto simples no número do cliente (sem anexar arquivo — limitação do
 * protocolo WhatsApp web).
 */
export async function shareComandaPdf({
  element,
  filename,
  customerPhone,
  text,
}: {
  element: HTMLElement | null
  filename: string
  customerPhone: string | null
  text: string
}): Promise<{ shared: boolean; via: 'native-share' | 'wa-link' | 'download-only' }> {
  // 1. Tenta share nativo com file (anexa PDF)
  if (element && typeof navigator !== 'undefined' && navigator.share) {
    try {
      const blob = await generateComandaPdf({ element, filename })
      if (blob) {
        const file = new File([blob], filename, { type: 'application/pdf' })
        // canShare é opcional — alguns browsers não expõem
        const canShareFile =
          typeof navigator.canShare === 'function'
            ? navigator.canShare({ files: [file] })
            : true
        if (canShareFile) {
          await navigator.share({ files: [file], title: filename, text })
          return { shared: true, via: 'native-share' }
        }
      }
    } catch {
      // user cancelou OU navegador não suporta · cai pro fallback
    }
  }

  // 2. Fallback wa.me com texto (sem anexo)
  if (customerPhone) {
    const phone = customerPhone.replace(/\D/g, '')
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    return { shared: true, via: 'wa-link' }
  }

  // 3. Sem phone · só baixa o PDF
  if (element) {
    await downloadComandaPdf({ element, filename })
    return { shared: true, via: 'download-only' }
  }

  return { shared: false, via: 'download-only' }
}
