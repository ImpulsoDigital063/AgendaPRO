/* ═══════════════════════════════════════════════════════════════
   Configuração do sinal + confirmação de recebimento

   Wanessa Silva (05/08): "manualmente. muito trabalhoso. e tenho faltas.
   então preciso de sinal".

   Medido na base: ~90% dos agendamentos são o próprio dono marcando, não
   a cliente pelo link. Por isso o caminho que importa não é o PIX
   aparecer sozinho na tela da cliente — é o dono conseguir COBRAR de quem
   ele mesmo agendou.

   GET  → configuração atual + lista de quem está devendo o sinal
   PUT  → salva chave PIX, percentual e liga/desliga
   POST → { appointmentId, acao: 'recebi' | 'cancelar' }

   Autorização: dono ou recepcionista. Profissional não entra — quem
   define e confere dinheiro é quem responde pelo negócio (mesma régua da
   v100, que tirou dela a edição de valor).
   ═══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { gerarBRCode } from '@/lib/pix-brcode'
import { todayBR } from '@/lib/date-br'
import { limparSinaisVencidos, minutosRestantes, SINAL_EXPIRA_PADRAO_MIN } from '@/lib/sinal-expira'

export async function GET() {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  /* Abrir a aba limpa os vencidos (v115). É o outro momento em que a limpeza
     precisa acontecer: quem olha a lista de quem está devendo não pode ver
     horário que já morreu, e a agenda ao lado tem que refletir isso na hora.
     A outra ponta é a rota de marcar horário. */
  await limparSinaisVencidos(supabase, { businessId })

  const [{ data: negocio }, { data: pendentes }] = await Promise.all([
    supabase
      .from('businesses')
      .select('pix_key, pix_receiver_name, pix_city, sinal_enabled, sinal_percent, sinal_cancel_horas, sinal_credito_dias, sinal_expira_minutos, name, phone')
      .eq('id', businessId)
      .single(),
    supabase
      .from('appointments')
      .select('id, client_name, client_phone, service_name, appointment_date, start_time, total_price, sinal_valor, sinal_pago_at, status, created_at')
      .eq('business_id', businessId)
      .not('sinal_valor', 'is', null)
      .is('sinal_pago_at', null)
      .neq('status', 'cancelled')
      .gte('appointment_date', todayBR())
      .order('appointment_date')
      .order('start_time'),
  ])

  /* O copia-e-cola é montado aqui, por atendimento, e não guardado no
     banco: se a dona trocar a chave PIX, todo mundo que ainda não pagou
     passa a receber o código novo. Guardar o código junto do atendimento
     deixaria cobrança antiga apontando pra chave velha. */
  const expiraMin = Number(negocio?.sinal_expira_minutos ?? SINAL_EXPIRA_PADRAO_MIN)
  const lista = (pendentes ?? []).map((a) => ({
    ...a,
    /* Quanto falta pro horário ser solto. A dona precisa disso pra saber se
       ainda vale a pena cobrar ou se já era — cobrar alguém cujo horário
       vence em 3 minutos é pior que não cobrar. */
    minutosPraVencer: negocio?.sinal_enabled
      ? minutosRestantes(
          a as unknown as {
            id: string
            status: string | null
            sinal_valor: number | string | null
            sinal_pago_at: string | null
            created_at: string
          },
          expiraMin,
        )
      : null,
    copiaECola:
      negocio?.pix_key && a.sinal_valor
        ? gerarBRCode({
            chave: negocio.pix_key,
            nomeRecebedor: negocio.pix_receiver_name || negocio.name || 'RECEBEDOR',
            cidade: negocio.pix_city || 'BRASIL',
            valor: Number(a.sinal_valor),
            identificador: a.id.replace(/-/g, '').slice(0, 25),
          })
        : null,
  }))

  return NextResponse.json({
    config: {
      pixKey: negocio?.pix_key ?? '',
      recebedor: negocio?.pix_receiver_name ?? '',
      cidade: negocio?.pix_city ?? '',
      ativo: negocio?.sinal_enabled ?? false,
      percentual: negocio?.sinal_percent ?? 50,
      cancelHoras: negocio?.sinal_cancel_horas ?? 24,
      creditoDias: negocio?.sinal_credito_dias ?? 30,
      expiraMinutos: negocio?.sinal_expira_minutos ?? SINAL_EXPIRA_PADRAO_MIN,
      nomeNegocio: negocio?.name ?? '',
      /* WhatsApp do NEGÓCIO (não da cliente). Sem ele a cliente que quer
         remarcar não tem pra onde ligar: o botão "Prefiro remarcar" na tela
         de cancelamento some, e ela cancela em vez de remarcar. Medido em
         06/08: de 23 negócios só um estava sem — a Wanessa, justamente quem
         pediu o sinal. */
      telefoneNegocio: negocio?.phone ?? null,
    },
    pendentes: lista,
  })
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const pixKey = typeof body.pixKey === 'string' ? body.pixKey.trim() : ''
  const percentual = Number(body.percentual)

  if (body.ativo === true && !pixKey) {
    return NextResponse.json({ error: 'Informe a chave PIX antes de ativar o sinal.' }, { status: 400 })
  }
  if (!Number.isFinite(percentual) || percentual < 1 || percentual > 100) {
    return NextResponse.json({ error: 'O percentual precisa ficar entre 1 e 100.' }, { status: 400 })
  }

  /* Prazo pra pagar (v115). O CHECK do banco recusa fora de 5 min–7 dias, mas
     a mensagem daqui é a que a dona lê — erro de constraint não explica nada. */
  const expiraMinutos = Number(body.expiraMinutos)
  if (body.expiraMinutos !== undefined && (!Number.isFinite(expiraMinutos) || expiraMinutos < 5 || expiraMinutos > 10080)) {
    return NextResponse.json(
      { error: 'O prazo pra pagar precisa ficar entre 5 minutos e 7 dias.' },
      { status: 400 },
    )
  }

  const { error } = await supabase
    .from('businesses')
    .update({
      pix_key: pixKey || null,
      pix_receiver_name: typeof body.recebedor === 'string' ? body.recebedor.trim() || null : null,
      pix_city: typeof body.cidade === 'string' ? body.cidade.trim() || null : null,
      sinal_enabled: body.ativo === true,
      sinal_percent: Math.round(percentual),
      sinal_cancel_horas: Number.isFinite(Number(body.cancelHoras)) ? Math.max(0, Math.round(Number(body.cancelHoras))) : 24,
      sinal_credito_dias: Number.isFinite(Number(body.creditoDias)) ? Math.max(1, Math.round(Number(body.creditoDias))) : 30,
      sinal_expira_minutos: Number.isFinite(expiraMinutos) ? Math.round(expiraMinutos) : SINAL_EXPIRA_PADRAO_MIN,
    })
    .eq('id', businessId)

  if (error) return NextResponse.json({ error: 'nao_salvou' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const id = typeof body.appointmentId === 'string' ? body.appointmentId : ''
  const acao = body.acao === 'cancelar' ? 'cancelar' : 'recebi'
  if (!id) return NextResponse.json({ error: 'sem_id' }, { status: 400 })

  // Confere que o atendimento é deste negócio antes de mexer.
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, business_id')
    .eq('id', id)
    .maybeSingle()
  if (!appt || appt.business_id !== businessId) {
    return NextResponse.json({ error: 'nao_encontrado' }, { status: 404 })
  }

  /* "Recebi" confirma o horário — é o único caminho do pending pro
     confirmed quando há sinal. Read-after-write porque isso é dinheiro:
     a resposta só volta ok se o banco confirmar (λ.prova-na-fonte). */
  const updates =
    acao === 'cancelar'
      ? { status: 'cancelled' }
      : { sinal_pago_at: new Date().toISOString(), status: 'confirmed' }

  const { data: salvo, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select('id, status, sinal_pago_at')
    .maybeSingle()

  if (error || !salvo) return NextResponse.json({ error: 'nao_salvou' }, { status: 500 })
  if (acao === 'recebi' && !salvo.sinal_pago_at) {
    return NextResponse.json({ error: 'nao_confirmado_pelo_banco' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: salvo.status })
}

