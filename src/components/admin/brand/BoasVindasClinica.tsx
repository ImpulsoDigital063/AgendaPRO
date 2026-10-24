/* PAINEL DA CLÍNICA · boas-vindas de cada pessoa no Início dela (dona,
   recepção, profissional): foto redonda com anel dourado, "Bom dia, Ilana",
   o papel dela na clínica e o dia. A foto vem do que a clínica mandou
   (conteudo.ts) e, sem ela, do cadastro; sem nenhuma, a inicial.
   Tamanhos pelo ESPAÇO do cartão (@container), não pela tela: no painel da
   profissional ele mora numa coluna estreita mesmo no computador, e pela
   largura da tela a logo aparecia e espremia o nome em três linhas. */
import Image from 'next/image'
import Greeting from '@/components/admin/Greeting'

export default function BoasVindasClinica({
  nome,
  foto,
  papel,
  clinica,
  logo,
  dia,
}: {
  nome: string
  foto?: string | null
  papel?: string | null
  clinica: string
  logo: string
  dia: string
}) {
  const primeiro = nome.trim().split(/\s+/)[0] ?? nome
  return (
    <header
      className="@container relative overflow-hidden rounded-[28px] border px-5 py-6"
      style={{ background: 'linear-gradient(160deg, #FFFFFF 0%, #FBF7F0 100%)', borderColor: 'var(--admin-border)' }}
    >
      <div className="relative z-10 flex items-center gap-4 @2xl:gap-6 @2xl:px-3 @2xl:py-2">
        <span
          className="relative h-16 w-16 flex-shrink-0 rounded-full p-[3px] @xl:h-20 @xl:w-20"
          style={{ background: 'linear-gradient(135deg, #CBAA62, #A47E3B 55%, #E2CB8F)' }}
        >
          <span className="relative block h-full w-full overflow-hidden rounded-full" style={{ background: '#F5EFE6', boxShadow: '0 0 0 2px #FFFFFF' }}>
            {foto ? (
              <Image src={foto} alt={nome} fill sizes="80px" className="object-cover" style={{ objectPosition: 'center 22%' }} />
            ) : (
              <span className="painel-titulo flex h-full w-full items-center justify-center text-2xl" style={{ color: '#A47E3B' }}>
                {primeiro.slice(0, 1).toUpperCase()}
              </span>
            )}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="painel-titulo text-[26px] leading-tight @xl:text-[32px]" style={{ color: 'var(--admin-text)' }}>
            <Greeting />, {primeiro}
          </h1>
          <p className="mt-1 truncate text-sm font-medium" style={{ color: 'var(--admin-text-mute)' }}>
            {papel ? `${papel} · ` : ''}{clinica}
          </p>
          {/* "sexta-feira, 23 de outubro" → só a 1ª letra maiúscula (capitalize subia o "De") */}
          <p className="mt-0.5 text-sm" style={{ color: 'var(--admin-text-faded)' }}>{dia.charAt(0).toUpperCase() + dia.slice(1)}</p>
        </div>
        <span className="relative hidden h-14 w-[170px] flex-shrink-0 @2xl:block">
          <Image src={logo} alt={clinica} fill sizes="170px" className="object-contain object-right" />
        </span>
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #CBAA62 30%, #A47E3B 70%, transparent)', opacity: 0.55 }} />
    </header>
  )
}
