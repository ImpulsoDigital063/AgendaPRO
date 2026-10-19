import { NextResponse } from 'next/server'

/**
 * agendapro.net.br/especialista → WhatsApp do suporte com a mensagem pronta (18/10/2026).
 * Link com a marca (regra: todo link que vai pro público leva o nosso domínio).
 * Porta do plano Sob medida: clínica com mais de 5 profissionais ou várias unidades.
 */
const SUPORTE = '5563992920080'
const TEXTO = 'Oi! Vim pela página do AgendaPRO pra clínicas. Quero um plano sob medida (tenho mais de 5 profissionais ou mais de uma unidade).'

export function GET() {
  return NextResponse.redirect(`https://wa.me/${SUPORTE}?text=${encodeURIComponent(TEXTO)}`, 307)
}
