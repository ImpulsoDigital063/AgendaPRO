import type { Metadata } from 'next'
import Image from 'next/image'
import { Lora, Manrope } from 'next/font/google'
import { TEMA_CLINICA } from '@/lib/vitrine/tema-publico'

/* Proposta do sistema personalizado da Ivna Loyola (24/10/2026).
   Valores fechados pelo Eduardo: opção 1 R$ 697 + R$ 97/mês · opção 2
   R$ 1.497 + R$ 147/mês com WhatsApp incluso. Ancoragem: a opção 2 vem por
   último e destacada; a diferença (R$ 800) é menor que o preço de um site
   avulso na nossa tabela (a partir de R$ 1.997).
   Fora do índice: só abre por quem recebeu o link. Sai do código quando a
   proposta fechar (não é página de produto). */

const serif = Lora({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-vitrine', display: 'swap' })
const sans = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-vitrine-sans', display: 'swap' })

export const metadata: Metadata = {
  title: 'Proposta · Ivna Loyola Beauty Clinic',
  description: 'O seu sistema personalizado: agenda e site da clínica.',
  robots: { index: false, follow: false },
}

const DOURADO = '#A47E3B'
const ESCURO = '#2A2520'
const ZAP = '5563992920080'
const PREVIA = 'https://agenda-pro-git-feat-vitrine-clinica-impulsodigitals-projects.vercel.app/ivna-loyola-beauty-clinic'

const zap = (opcao: string) =>
  `https://wa.me/${ZAP}?text=${encodeURIComponent(`Oi, Eduardo! Quero seguir com a ${opcao} do sistema da Ivna Loyola.`)}`

const AGENDA = [
  'Cada profissional com os serviços que faz, o preço e o tempo dela',
  'Aviso na hora quando a profissional tem valor diferente, pra cliente e pra recepção',
  'Recepção marcando, editando e conferindo o sinal com os valores certos',
  'Os 47 serviços com descrição',
  'Pagamento do sinal e cancelamento com a identidade da clínica',
]

const SITE = [
  'Site próprio da clínica, com serviços, pacotes, equipe e localização',
  'Endereço próprio, como ivnaloyola.com.br',
  'Painel com a sua marca, pra você e a equipe',
  'Cupom de influencer abrindo o seu site',
  'Vídeo de apresentação do seu sistema',
]

const ADICIONAIS = ['Integração com a Agenda Google', '1 Reels por mês feito pra clínica', 'Suporte prioritário no WhatsApp']

function Check({ cor = DOURADO }: { cor?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function Lista({ itens }: { itens: string[] }) {
  return (
    <ul className="space-y-2.5">
      {itens.map((t) => (
        <li key={t} className="flex gap-2.5 text-[15px] leading-snug" style={{ color: TEMA_CLINICA.text }}>
          <Check />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

function Preco({ implantacao, mensal, nota }: { implantacao: string; mensal: string; nota?: string }) {
  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-1">
      <p>
        <span className="block text-[12px] font-semibold" style={{ color: TEMA_CLINICA.mute }}>Implantação</span>
        <span className="text-[32px] font-semibold leading-none tabular-nums" style={{ fontFamily: 'var(--font-vitrine), serif' }}>{implantacao}</span>
      </p>
      <p className="pb-1">
        <span className="text-[17px] font-semibold tabular-nums">+ {mensal}</span>
        <span className="text-[14px]" style={{ color: TEMA_CLINICA.mute }}>/mês</span>
        {nota && <span className="block text-[12px]" style={{ color: TEMA_CLINICA.mute }}>{nota}</span>}
      </p>
    </div>
  )
}

export default function PropostaIvna() {
  return (
    <main
      className={`${serif.variable} ${sans.variable} min-h-screen`}
      style={{ background: TEMA_CLINICA.fundo, color: TEMA_CLINICA.text, fontFamily: 'var(--font-vitrine-sans), sans-serif' }}
    >
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6">
        <header className="text-center">
          <div className="relative mx-auto h-16 w-[150px]">
            <Image src="/vitrine/ivna-loyola/logo-dourada.png" alt="Ivna Loyola Beauty Clinic" fill sizes="150px" className="object-contain" priority />
          </div>
          <p className="mt-6 text-[13px] font-semibold" style={{ color: DOURADO }}>Proposta</p>
          <h1 className="mt-1 text-[30px] leading-tight sm:text-[38px]" style={{ fontFamily: 'var(--font-vitrine), serif' }}>
            O seu sistema personalizado
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed" style={{ color: TEMA_CLINICA.mute }}>
            Tudo o que você viu na prévia, do jeito da sua clínica. Escolha como prefere seguir.
          </p>
          <a href={PREVIA} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-[14px] font-semibold underline underline-offset-4" style={{ color: ESCURO }}>
            Ver a prévia do seu site
          </a>
        </header>

        <div className="mt-10 grid gap-5 md:grid-cols-2 md:items-start">
          {/* Opção 1 */}
          <section className="rounded-3xl border p-6 sm:p-7" style={{ background: TEMA_CLINICA.surface, borderColor: TEMA_CLINICA.border }}>
            <p className="text-[13px] font-semibold" style={{ color: TEMA_CLINICA.mute }}>Opção 1</p>
            <h2 className="mt-1 text-[24px] leading-tight" style={{ fontFamily: 'var(--font-vitrine), serif' }}>Agenda personalizada</h2>
            <p className="mt-2 text-[14px] leading-relaxed" style={{ color: TEMA_CLINICA.mute }}>
              O seu agendamento com as regras da clínica, no endereço do AgendaPRO.
            </p>
            <div className="mt-5">
              <Preco implantacao="R$ 697" mensal="R$ 97" nota="a mesma mensalidade de hoje" />
            </div>
            <div className="my-6 h-px" style={{ background: TEMA_CLINICA.border }} />
            <Lista itens={AGENDA} />
            <a href={zap('opção 1')} target="_blank" rel="noopener noreferrer" className="mt-7 block rounded-2xl border py-3.5 text-center text-[15px] font-semibold" style={{ borderColor: ESCURO, color: ESCURO }}>
              Quero a opção 1
            </a>
          </section>

          {/* Opção 2 · recomendada */}
          <section className="relative rounded-3xl border-2 p-6 sm:p-7" style={{ background: TEMA_CLINICA.surface, borderColor: DOURADO, boxShadow: '0 24px 50px -28px rgba(164,126,59,0.55)' }}>
            <span className="absolute -top-3 left-6 rounded-full px-3 py-1 text-[12px] font-bold text-white" style={{ background: DOURADO }}>
              Recomendada
            </span>
            <p className="text-[13px] font-semibold" style={{ color: DOURADO }}>Opção 2</p>
            <h2 className="mt-1 text-[24px] leading-tight" style={{ fontFamily: 'var(--font-vitrine), serif' }}>Agenda + site da clínica</h2>
            <p className="mt-2 text-[14px] leading-relaxed" style={{ color: TEMA_CLINICA.mute }}>
              A sua clínica com casa própria na internet, do primeiro clique ao horário marcado.
            </p>
            <div className="mt-5">
              <Preco implantacao="R$ 1.497" mensal="R$ 147" />
            </div>
            <p className="mt-3 text-[13px] leading-relaxed" style={{ color: TEMA_CLINICA.mute }}>
              Só o site, contratado à parte, sai a partir de R$ 1.997.
            </p>
            <div className="my-6 h-px" style={{ background: TEMA_CLINICA.border }} />
            <p className="mb-3 text-[14px] font-semibold">Tudo da opção 1, e mais:</p>
            <Lista itens={SITE} />
            <div className="mt-5 rounded-2xl p-4" style={{ background: '#F6F0E6' }}>
              <div className="flex gap-2.5">
                <Check cor={ESCURO} />
                <p className="text-[15px] leading-snug">
                  <strong>WhatsApp automático incluso:</strong> confirmação, lembrete da véspera, cobrança do sinal e aniversário, até 400 mensagens por mês.
                </p>
              </div>
            </div>
            <a href={zap('opção 2')} target="_blank" rel="noopener noreferrer" className="mt-7 block rounded-2xl py-3.5 text-center text-[15px] font-semibold text-white" style={{ background: ESCURO }}>
              Quero a opção 2
            </a>
          </section>
        </div>

        <section className="mx-auto mt-10 max-w-3xl rounded-3xl border p-6 sm:p-7" style={{ background: TEMA_CLINICA.surface, borderColor: TEMA_CLINICA.border }}>
          <h3 className="text-[19px]" style={{ fontFamily: 'var(--font-vitrine), serif' }}>Como funciona o pagamento</h3>
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: TEMA_CLINICA.mute }}>
            Metade na aprovação e o restante na entrega, à vista ou em até 3x no cartão. A mensalidade começa no seu próximo ciclo.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: TEMA_CLINICA.mute }}>
            Na opção 2, o endereço próprio é registrado no seu nome, direto no Registro.br (cerca de R$ 40 por ano).
          </p>
          <div className="my-5 h-px" style={{ background: TEMA_CLINICA.border }} />
          <h3 className="text-[19px]" style={{ fontFamily: 'var(--font-vitrine), serif' }}>Pra quando quiser ir além</h3>
          <p className="mt-1 text-[14px]" style={{ color: TEMA_CLINICA.mute }}>Adicionais pra qualquer uma das opções, sob consulta:</p>
          <div className="mt-3">
            <Lista itens={ADICIONAIS} />
          </div>
        </section>

        <p className="mt-10 text-center text-[12px]" style={{ color: '#B3A897' }}>AgendaPRO · Impulso Digital</p>
      </div>
    </main>
  )
}
