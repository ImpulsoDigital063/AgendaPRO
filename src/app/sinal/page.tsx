/* Página pública de pagamento do sinal.
   ───────────────────────────────────────────────────────────────────
   Antes o copia-e-cola ia dentro da mensagem de WhatsApp. No celular a
   cliente toca e segura e copia a mensagem INTEIRA — saudação, valor,
   tudo. Colar isso no banco não funciona, então ela teria que selecionar
   à mão um bloco de 100 caracteres. Boa parte desiste e responde "não
   consegui". E um paredão de caracteres vindo de número desconhecido
   tem cara de golpe.

   Aqui ela tem o QR pra escanear, um botão que copia só o código, e o
   nome do salão em cima — que é o que separa cobrança de golpe.

   O token é próprio do sinal, não o de cancelamento: este link roda no
   WhatsApp e pode ser reencaminhado. Quem recebe pode ver e pagar; não
   pode cancelar o horário de ninguém. */

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { verifySinalToken } from '@/lib/token'
import { gerarBRCode } from '@/lib/pix-brcode'
import { sinalVencido, minutosRestantes, SINAL_EXPIRA_PADRAO_MIN } from '@/lib/sinal-expira'
import { valorAindaDevido, rotuloLimite } from '@/lib/sinal-saldo'
import { IconCalendar, IconClock, IconCheck } from '@/components/ui/Icon'
import CopiarPix from './CopiarPix'
import Image from 'next/image'
import { Lora, Manrope } from 'next/font/google'
import { conteudoDaVitrine } from '@/lib/vitrine/conteudo'
import { TEMA_CLINICA } from '@/lib/vitrine/tema-publico'

// só usadas quando a clínica tem vitrine (mesmas fontes do site e do agendamento dela)
const serif = Lora({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-vitrine', display: 'swap' })
const sans = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-vitrine-sans', display: 'swap' })

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/* PRÉVIA DO LINK NO WHATSAPP (06/08).
   ───────────────────────────────────────────────────────────────────
   Sem isto o WhatsApp puxava a metadata global do site e a cliente do
   Studio Marcela recebia uma cobrança com o card do AgendaPRO em cima:
   "Agenda inteligente pro seu negócio crescer sozinho · a partir de
   R$ 67/mês". Ela podia entender que os R$ 67 são pra ela, e a dona
   ficava com o fornecedor dela exposto numa conversa que é dela com a
   cliente. O card tem que ser do salão.

   Nada de nome da cliente aqui: a prévia aparece na lista de conversas
   e em notificação de tela bloqueada. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string }>
}) {
  const { id, token } = await searchParams
  const generico = { title: 'Sinal do agendamento', robots: { index: false, follow: false } }
  if (!id || !token || !verifySinalToken(id, token)) return generico

  const db = getAdminClient()
  const { data } = await db
    .from('appointments')
    .select('sinal_valor, appointment_date, start_time, business:businesses(name, slug)')
    .eq('id', id)
    .single()

  if (!data) return generico

  const neg = data.business as unknown as { name: string; slug: string } | null
  const nome = neg?.name ?? 'Agendamento'
  const ogClinica = neg?.slug ? conteudoDaVitrine(neg.slug)?.og?.imagem : undefined
  /* Mesmo valor da página: com crédito parcial, a prévia dizia R$18 e a tela
     R$8 — a cliente via dois preços antes mesmo de abrir o link. */
  const valor = await valorAindaDevido(db, id, data.sinal_valor as number | null)
  const [, mes, dia] = String(data.appointment_date).split('-')
  const quando = `${dia}/${mes} às ${String(data.start_time).slice(0, 5)}`
  const descricao =
    valor > 0
      ? `Sinal de ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} pra confirmar seu horário de ${quando}.`
      : `Confirme seu horário de ${quando}.`

  return {
    title: `Confirmar horário · ${nome}`,
    description: descricao,
    // Link de cobrança não entra em buscador.
    robots: { index: false, follow: false },
    openGraph: {
      title: `Confirmar horário · ${nome}`,
      description: descricao,
      type: 'website',
      /* A marca fica, o anúncio sai. siteName põe "AgendaPRO" no rodapé do
         card e o domínio aparece de qualquer jeito — exposição de graça, que
         é o que interessa. O que não podia era o pitch com preço de
         assinatura em cima de uma cobrança: a cliente está decidindo pagar
         R$ 14 e lia "a partir de R$ 67/mês". */
      siteName: 'AgendaPRO',
      // clínica com vitrine: a prévia da cobrança leva a peça dela (logo dourada)
      ...(ogClinica ? { images: [{ url: ogClinica }] } : {}),
    },
  }
}

export default async function SinalPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string }>
}) {
  const { id, token } = await searchParams
  if (!id) notFound()
  if (!token || !verifySinalToken(id, token)) notFound()

  const supabase = getAdminClient()
  const { data: appt } = await supabase
    .from('appointments')
    .select(
      'id, client_name, appointment_date, start_time, status, service_name, sinal_valor, sinal_pago_at, sinal_declarado_em, created_at, business:businesses(name, slug, phone, pix_key, pix_receiver_name, pix_city, sinal_enabled, sinal_expira_minutos, brand_primary, brand_secondary, brand_mode)',
    )
    .eq('id', id)
    .single()

  if (!appt) notFound()

  const business = appt.business as unknown as {
    name: string
    slug: string
    phone: string | null
    pix_key: string | null
    pix_receiver_name: string | null
    pix_city: string | null
    sinal_enabled: boolean | null
    sinal_expira_minutos: number | null
    brand_primary: string | null
    brand_secondary: string | null
    brand_mode: 'dark' | 'light' | null
  } | null

  const primary = business?.brand_primary || '#3B82F6'
  const secondary = business?.brand_secondary || '#06B6D4'
  // clínica com vitrine: a cobrança tem a cara do site dela (creme, logo dourada)
  const clinica = business?.slug ? conteudoDaVitrine(business.slug) : null
  const isDark = !clinica && (business?.brand_mode || 'light') === 'dark'
  const cover = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`
  const text = clinica ? TEMA_CLINICA.text : isDark ? '#F1F5F9' : '#0F172A'
  const mute = clinica ? TEMA_CLINICA.mute : isDark ? '#94A3B8' : '#64748B'
  const surface = clinica ? TEMA_CLINICA.surface : isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF'
  const border = clinica ? TEMA_CLINICA.border : isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0'
  // "já avisou que pagou": âmbar no padrão; dourado da marca na clínica
  const aviso = clinica ? primary : '#F59E0B'

  /* O que ela ainda deve EM DINHEIRO — não o sinal cheio. Se o crédito dela
     cobriu parte, essa parte já foi debitada na hora de marcar; pedir o cheio
     aqui cobrava duas vezes o mesmo pedaço (auditoria 06/08). */
  const valor = await valorAindaDevido(supabase, appt.id as string, appt.sinal_valor as number | null)
  const [ano, mes, dia] = String(appt.appointment_date).split('-')
  const dataLonga = new Date(Number(ano), Number(mes) - 1, Number(dia)).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const hora = String(appt.start_time).slice(0, 5)

  const expiraMin = Number(business?.sinal_expira_minutos ?? SINAL_EXPIRA_PADRAO_MIN)
  const linha = {
    id: appt.id as string,
    status: appt.status as string,
    sinal_valor: appt.sinal_valor as number | null,
    sinal_pago_at: appt.sinal_pago_at as string | null,
    created_at: appt.created_at as string,
  }
  const vencido = !!business?.sinal_enabled && sinalVencido(linha, expiraMin)
  const restam = minutosRestantes(linha, expiraMin)

  // Horário-limite em vez de "faltam 2h": a mensagem foi lida agora, mas pode
  // ser aberta daqui a uma hora — e aí "2h" já é mentira.
  /* Leva o DIA junto quando não é hoje: a dona pode dar até 2 dias de prazo, e
     "até as 18:00" faz a cliente entender hoje quando é amanhã. */
  const limite = new Date(new Date(appt.created_at as string).getTime() + expiraMin * 60_000)
  const horaLimite = rotuloLimite(limite)

  const pago = !!appt.sinal_pago_at
  /* 🔴 A cliente JA avisou que pagou (05/09).
     ─────────────────────────────────────────────────────────────
     Sem isto a pagina continuava gritando "FALTA PAGAR O SINAL" com o botao
     de copiar em destaque DEPOIS de ela ter pago e tocado "Ja paguei" — e o
     link fica no WhatsApp dela pra sempre. Ela volta, le que falta pagar,
     acha que nao deu certo e paga de novo. O sistema nao escuta a conta da
     dona, entao ninguem percebe: o duplicado so aparece como dois PIX iguais
     no extrato.

     Risco levantado pelo Eduardo olhando as duas telas lado a lado. Nao e a
     coexistencia das superficies que duplica — o BRCode e o mesmo dos dois
     lados, mesmo `identificador` derivado do appointment. O que duplica e a
     pagina nao saber o que a cliente ja disse. */
  const declarou = !pago && !!appt.sinal_declarado_em
  const cancelado = appt.status === 'cancelled' || vencido
  const podePagar = !pago && !declarou && !cancelado && valor > 0 && !!business?.pix_key

  const brcode = podePagar
    ? gerarBRCode({
        chave: business!.pix_key as string,
        nomeRecebedor: business!.pix_receiver_name || business!.name || 'RECEBEDOR',
        cidade: business!.pix_city || 'BRASIL',
        valor,
        identificador: (appt.id as string).replace(/-/g, '').slice(0, 25),
      })
    : null

  const zap = (business?.phone || '').replace(/\D/g, '')
  const linkZap = zap ? `https://wa.me/${zap.startsWith('55') ? zap : '55' + zap}` : null
  const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <main
      className={clinica ? `${serif.variable} ${sans.variable} min-h-screen` : 'min-h-screen'}
      style={
        {
          background: clinica ? TEMA_CLINICA.fundo : isDark ? '#050713' : '#F8FAFC',
          ...(clinica ? { fontFamily: 'var(--font-vitrine-sans), sans-serif', fontWeight: 500 } : {}),
          color: text,
          ['--brand-primary' as string]: primary,
          ['--brand-secondary' as string]: secondary,
        } as React.CSSProperties
      }
    >
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Nome do salão em cima de tudo: é o que separa cobrança de golpe
            quando o número dela não tem o contato salvo. */}
        {clinica ? (
          <div className="rounded-3xl border px-6 py-7 text-center" style={{ background: surface, borderColor: border }}>
            {clinica.logoDourada ? (
              <div className="relative mx-auto h-16 w-[140px]">
                <Image src={clinica.logoDourada} alt={business?.name ?? ''} fill sizes="140px" className="object-contain" priority />
              </div>
            ) : (
              <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-vitrine), serif' }}>{business?.name}</h1>
            )}
            <p className="mt-4 text-[22px] font-semibold leading-tight" style={{ fontFamily: 'var(--font-vitrine), serif', color: text }}>
              {pago ? 'Sinal confirmado' : declarou ? 'Horário garantido' : cancelado ? 'Horário liberado' : 'Reserva do seu horário'}
            </p>
          </div>
        ) : (
        <div
          className="relative overflow-hidden rounded-3xl p-6 text-white"
          style={{ background: cover, boxShadow: '0 18px 40px -18px rgba(0,0,0,0.45)' }}
        >
          <div
            aria-hidden
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)', filter: 'blur(14px)' }}
          />
          <p className="relative text-[11px] font-bold uppercase tracking-widest opacity-80">
            {pago
              ? 'Sinal confirmado'
              : declarou
                ? 'Horário garantido'
                : cancelado
                  ? 'Horário liberado'
                  : 'Reserva do seu horário'}
          </p>
          <h1 className="relative text-2xl font-bold mt-1">{business?.name ?? 'Agendamento'}</h1>
        </div>
        )}

        {/* O horário, sempre — ela precisa reconhecer o que está pagando. */}
        <div className="rounded-2xl p-4 space-y-2" style={{ background: surface, border: `1px solid ${border}` }}>
          <p className="font-semibold text-sm" style={{ color: text }}>
            {appt.service_name ?? 'Atendimento'}
          </p>
          <p className="text-xs flex items-center gap-1.5" style={{ color: mute }}>
            <IconCalendar size={13} />
            {dataLonga.charAt(0).toUpperCase() + dataLonga.slice(1)}
          </p>
          <p className="text-xs flex items-center gap-1.5" style={{ color: mute }}>
            <IconClock size={13} /> {hora}
          </p>
        </div>

        {pago && (
          <div
            className="rounded-2xl p-5 text-center space-y-2"
            style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.32)' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
              style={{ background: '#10B981', color: '#fff' }}
            >
              <IconCheck size={24} />
            </div>
            <p className="font-bold" style={{ color: text }}>
              Sinal recebido
            </p>
            <p className="text-xs" style={{ color: mute }}>
              Seu horário está garantido. Te esperamos no dia!
            </p>
          </div>
        )}

        {/* ELA JA AVISOU QUE PAGOU (05/09).
            Estado proprio, entre "falta pagar" e "recebido": o horario esta
            garantido, mas o dinheiro ainda nao foi conferido pela dona.

            NAO diz "pagamento confirmado" — o sistema nao escuta a conta dela
            e nao tem como saber. Diz o que e verdade: ela avisou, o horario
            esta guardado, e o salao esta conferindo.

            O botao de copiar o PIX some daqui de proposito (`podePagar` ja
            exclui este caso). Deixar o codigo em destaque numa tela que ela
            reabre dias depois e o caminho curto pro pagamento duplicado. O
            "se ainda nao pagou" existe pra quem tocou no botao por engano —
            sem isso ela ficaria presa, sem como pagar e sem entender. */}
        {declarou && (
          <div
            className="rounded-2xl p-5 text-center space-y-2"
            style={clinica ? { background: surface, border: `1px solid ${border}` } : { background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.32)' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
              style={{ background: aviso, color: '#fff' }}
            >
              <IconCheck size={24} />
            </div>
            <p className="font-bold" style={{ color: text }}>
              Seu horário está garantido
            </p>
            <p className="text-xs" style={{ color: mute }}>
              Você avisou que já pagou o sinal. {business?.name ?? 'O estabelecimento'} está
              conferindo — não precisa pagar de novo.
            </p>
            {linkZap && (
              <p className="text-xs pt-1" style={{ color: mute }}>
                Se ainda não pagou,{' '}
                <a href={linkZap} className="underline font-semibold" style={{ color: primary }}>
                  fale com {business?.name ?? 'o estabelecimento'}
                </a>
                .
              </p>
            )}
          </div>
        )}

        {cancelado && !pago && (
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.28)' }}
          >
            <p className="font-bold text-sm" style={{ color: text }}>
              Esse horário não está mais reservado
            </p>
            <p className="text-xs leading-relaxed" style={{ color: mute }}>
              O prazo pra confirmar passou e o horário voltou pra agenda. Se ainda quiser, é só
              falar com a gente que a gente vê o que tem disponível.
            </p>
            {linkZap && (
              <a
                href={linkZap}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-xl py-3 text-center text-sm font-bold"
                style={{ background: '#25D366', color: '#fff' }}
              >
                Falar no WhatsApp
              </a>
            )}
          </div>
        )}

        {podePagar && brcode && (
          <>
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: surface, border: `1px solid ${border}` }}
            >
              <p className={clinica ? 'text-sm font-semibold' : 'text-[11px] font-bold uppercase tracking-widest'} style={{ color: mute }}>
                Sinal pra confirmar
              </p>
              <p className="text-4xl font-extrabold tabular-nums my-1" style={{ color: text }}>
                {brl(valor)}
              </p>
              {restam > 0 && (
                <p className="text-xs" style={{ color: mute }}>
                  Guardamos seu horário até <strong>{horaLimite}</strong>
                </p>
              )}
            </div>

            <CopiarPix codigo={brcode} isDark={isDark} />

            {linkZap && (
              <a
                href={linkZap}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-xl py-3 text-center text-sm font-semibold"
                style={{ background: 'transparent', color: mute, border: `1px solid ${border}` }}
              >
                Falar no WhatsApp
              </a>
            )}
          </>
        )}

        {business?.slug && (
          <Link
            href={`/${business.slug}`}
            className="block text-center text-xs py-2"
            style={{ color: mute }}
          >
            Ver {business.name}
          </Link>
        )}

        {/* Selo do AgendaPRO · a propaganda vive AQUI, não na prévia da
            cobrança. A diferença é o momento: na conversa ela está decidindo
            pagar e um preço de assinatura ao lado confunde; aqui ela já pagou
            ou está resolvendo, e uma linha discreta no rodapé é o padrão que
            todo mundo aceita (Calendly, Typeform). Mesmo raciocínio do pack
            de divulgação: cada cliente vira distribuidor passivo. */}
        <a
          href="https://www.agendapro.net.br?utm_source=sinal&utm_medium=rodape"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-[11px] pt-4 pb-2 transition-opacity hover:opacity-80"
          style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.35)' }}
        >
          Agendamento e pagamento por <strong>AgendaPRO</strong>
        </a>
      </div>
    </main>
  )
}
