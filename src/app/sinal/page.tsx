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
import { IconCalendar, IconClock, IconCheck } from '@/components/ui/Icon'
import CopiarPix from './CopiarPix'

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

  const { data } = await getAdminClient()
    .from('appointments')
    .select('sinal_valor, appointment_date, start_time, business:businesses(name)')
    .eq('id', id)
    .single()

  if (!data) return generico

  const nome = (data.business as unknown as { name: string } | null)?.name ?? 'Agendamento'
  const valor = Number(data.sinal_valor ?? 0)
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
      'id, client_name, appointment_date, start_time, status, service_name, sinal_valor, sinal_pago_at, created_at, business:businesses(name, slug, phone, pix_key, pix_receiver_name, pix_city, sinal_enabled, sinal_expira_minutos, brand_primary, brand_secondary, brand_mode)',
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
  const isDark = (business?.brand_mode || 'light') === 'dark'
  const cover = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`
  const text = isDark ? '#F1F5F9' : '#0F172A'
  const mute = isDark ? '#94A3B8' : '#64748B'
  const surface = isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF'
  const border = isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0'

  const valor = Number(appt.sinal_valor ?? 0)
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
  const limite = new Date(new Date(appt.created_at as string).getTime() + expiraMin * 60_000)
  const horaLimite = limite.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })

  const pago = !!appt.sinal_pago_at
  const cancelado = appt.status === 'cancelled' || vencido
  const podePagar = !pago && !cancelado && valor > 0 && !!business?.pix_key

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
      className="min-h-screen"
      style={
        {
          background: isDark ? '#050713' : '#F8FAFC',
          color: text,
          ['--brand-primary' as string]: primary,
          ['--brand-secondary' as string]: secondary,
        } as React.CSSProperties
      }
    >
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Nome do salão em cima de tudo: é o que separa cobrança de golpe
            quando o número dela não tem o contato salvo. */}
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
            {pago ? 'Sinal confirmado' : cancelado ? 'Horário liberado' : 'Reserva do seu horário'}
          </p>
          <h1 className="relative text-2xl font-bold mt-1">{business?.name ?? 'Agendamento'}</h1>
        </div>

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
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: mute }}>
                Sinal pra confirmar
              </p>
              <p className="text-4xl font-extrabold tabular-nums my-1" style={{ color: text }}>
                {brl(valor)}
              </p>
              {restam > 0 && (
                <p className="text-xs" style={{ color: mute }}>
                  Guardamos seu horário até as <strong>{horaLimite}</strong>
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
                Falar com o salão
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
