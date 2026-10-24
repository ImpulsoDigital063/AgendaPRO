/* PAINEL DA CLÍNICA · peças visuais (ver src/lib/vitrine/painel.ts).
   Fontes iguais às do site e do agendamento da clínica: Lora nos títulos,
   Manrope no resto. O tema (creme, dourado) mora no globals.css, bloco
   "PAINEL DA CLÍNICA", e só vale dentro de `.painel-clinica`. */
import Image from 'next/image'
import { Lora, Manrope } from 'next/font/google'

const serif = Lora({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-painel-serif', display: 'swap' })
const sans = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-painel-sans', display: 'swap' })

/** classes pro `.admin-shell` quando a clínica tem painel próprio */
export const classesDoPainel = `painel-clinica ${serif.variable} ${sans.variable}`

/** monograma bem clarinho no canto, atrás de tudo (celular e computador) */
export function FundoDaClinica({ monograma }: { monograma: string }) {
  return (
    <div aria-hidden className="painel-clinica-fundo pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute -right-24 -bottom-20 h-[420px] w-[420px] opacity-[0.06] sm:-right-16 sm:-bottom-16 sm:h-[560px] sm:w-[560px]">
        <Image src={monograma} alt="" fill sizes="560px" className="object-contain" />
      </div>
    </div>
  )
}
