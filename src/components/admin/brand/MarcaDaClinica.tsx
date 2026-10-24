/* PAINEL DA CLÍNICA · área da marca no topo das barras laterais (computador):
   logo dourada inteira; com o menu recolhido, só o monograma. */
import Image from 'next/image'

export default function MarcaDaClinica({ logo, monograma, nome, recolhida = false }: { logo: string; monograma: string; nome: string; recolhida?: boolean }) {
  return recolhida ? (
    <span className="relative block h-9 w-9 flex-shrink-0">
      <Image src={monograma} alt={nome} fill sizes="36px" className="object-contain" />
    </span>
  ) : (
    <span className="relative block h-11 w-[150px] flex-shrink-0">
      <Image src={logo} alt={nome} fill sizes="150px" className="object-contain object-left" priority />
    </span>
  )
}
