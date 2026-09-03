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
import { gerarBRCode, normalizarChavePix } from '@/lib/pix-brcode'
import { generateSinalToken } from '@/lib/token'
import { SITE_URL } from '@/lib/site-url'
import { todayBR } from '@/lib/date-br'
import { minutosRestantes, podeSoltarHorario, SINAL_EXPIRA_PADRAO_MIN } from '@/lib/sinal-expira'
import { creditoAplicadoEmLote, rotuloLimite } from '@/lib/sinal-saldo'

export async function GET() {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  /* v141 · A LIMPEZA SAIU DAQUI. Abrir a aba cancelava os vencidos antes de
     montar a tela, e isso destruía exatamente o que a dona vinha resolver:
     em 26/08 a Wanessa abriu a aba às 12:51 e três agendamentos morreram no
     mesmo segundo — um deles com o sinal JÁ PAGO, só não marcado.
     A v140 estreitou a armadilha (só cancelava o que já tinha sido avisado),
     mas o aviso é justamente o que traz a dona até aqui: ela chega DEPOIS do
     aviso, ou seja, dentro da janela perigosa. As duas mudanças empurraram o
     problema pra dentro do caminho dela.
     Cancelar de verdade continua acontecendo onde é necessário: na rota de
     marcar horário, quando outra cliente tenta pegar o slot — que é o único
     momento em que a constraint no_overlap exige a linha fora do caminho.
     Aqui a lista mostra o vencido com o estado escrito, e a dona decide. */

  const [{ data: negocio }, { data: pendentes }] = await Promise.all([
    supabase
      .from('businesses')
      .select('pix_key, pix_receiver_name, pix_city, sinal_enabled, sinal_percent, sinal_cancel_horas, sinal_credito_dias, sinal_expira_minutos, sinal_balcao_padrao, name, phone')
      .eq('id', businessId)
      .single(),
    supabase
      .from('appointments')
      .select('id, client_name, client_phone, service_name, appointment_date, start_time, total_price, sinal_valor, sinal_pago_at, sinal_aviso_enviado_at, sinal_declarado_em, status, created_at')
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

  /* Quanto de cada sinal já foi quitado com crédito da própria cliente. Sem
     isto a aba cobrava o sinal CHEIO de quem já tinha pago parte com crédito —
     e o crédito já tinha sido debitado na hora de marcar (auditoria 06/08). */
  const creditos = await creditoAplicadoEmLote(
    supabase,
    (pendentes ?? []).map((a) => a.id as string),
  )

  const lista = (pendentes ?? []).map((a) => ({
    ...a,
    /* sinal_valor sai daqui como o que FALTA receber, não o cheio: é o número
       que a dona cobra, que vai na mensagem e dentro do QR. O cheio continua
       no banco pra comanda abater depois — e vai junto como sinalCheio pra
       tela poder explicar "R$ 18, sendo R$ 10 de crédito". */
    sinal_valor: Math.max(
      0,
      Math.round((Number(a.sinal_valor ?? 0) - (creditos.get(a.id as string) ?? 0)) * 100) / 100,
    ),
    sinalCheio: Number(a.sinal_valor ?? 0),
    creditoAplicado: creditos.get(a.id as string) ?? 0,
    /* Quanto falta pro horário ser solto. A dona precisa disso pra saber se
       ainda vale a pena cobrar ou se já era — cobrar alguém cujo horário
       vence em 3 minutos é pior que não cobrar. */
    /* Nome do salão, link da página de pagamento e horário-limite acompanham
       cada pendente: é o que a mensagem de cobrança precisa, e montar isso na
       tela exigiria o token HMAC, que não sai do servidor. */
    nomeNegocio: negocio?.name ?? null,
    linkPagamento: `${SITE_URL}/sinal?id=${a.id}&token=${generateSinalToken(a.id as string)}`,
    /* Com o dia junto quando nao for hoje: a dona escolhe ate 2 dias de prazo,
       e "ate as 18:00" faz a cliente entender hoje quando e amanha. */
    horaLimite: negocio?.sinal_enabled
      ? rotuloLimite(new Date(new Date(a.created_at as string).getTime() + expiraMin * 60_000))
      : null,
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
    /* v141 · o horário JÁ FOI SOLTO pra outra cliente marcar? Vencer não basta:
       a trava da v140 exige aviso enviado + folga. Sem esta distinção a tela
       trataria igual quem vence em 5 minutos e quem já perdeu o horário — e
       são decisões diferentes: um ainda dá pra cobrar, o outro é resgate. */
    horarioLiberado: negocio?.sinal_enabled
      ? podeSoltarHorario(
          a as unknown as {
            id: string
            status: string | null
            sinal_valor: number | string | null
            sinal_pago_at: string | null
            created_at: string
            sinal_aviso_enviado_at?: string | null
          },
          expiraMin,
        )
      : false,
    copiaECola:
      negocio?.pix_key && a.sinal_valor
        ? gerarBRCode({
            chave: negocio.pix_key,
            nomeRecebedor: negocio.pix_receiver_name || negocio.name || 'RECEBEDOR',
            cidade: negocio.pix_city || 'BRASIL',
            /* O QR cobra o que FALTA, nao o cheio (ver acima). */
            valor: Math.max(
              0,
              Math.round((Number(a.sinal_valor ?? 0) - (creditos.get(a.id as string) ?? 0)) * 100) / 100,
            ),
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
      /* v138 · qual lado vem marcado na pergunta "cobrar sinal?" quando é a
         própria dona (ou a recepção) que marca o horário. O link público não
         pergunta nada — lá o sinal vale sempre que estiver ligado. */
      balcaoPadrao: negocio?.sinal_balcao_padrao === true,
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
  // v114 · normaliza ANTES de gravar. Celular vai pro banco em E.164 (+55…),
  // que e o formato do DICT — sem isso o BR Code sai com uma chave que nao
  // existe e a cliente ve "Conta de destinatario inexistente" (caso da
  // Wanessa, 11/08). O tipo vem da tela; se nao vier, detecta pela chave.
  const pixKeyBruta = typeof body.pixKey === 'string' ? body.pixKey.trim() : ''
  const pixKey = pixKeyBruta ? normalizarChavePix(pixKeyBruta, body.tipoChave) : ''
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
      sinal_balcao_padrao: body.balcaoPadrao === true,
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
  const acao: 'cancelar' | 'recebi' | 'dispensar' =
    body.acao === 'cancelar' ? 'cancelar' : body.acao === 'dispensar' ? 'dispensar' : 'recebi'
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

  /* DISPENSAR (v118) · a dona resolveu não cobrar dessa cliente.
     ─────────────────────────────────────────────────────────────────
     Zera o sinal em vez de marcá-lo como pago. A diferença é dinheiro: se
     ela usasse "Recebi" como atalho pra dispensar — que é o que ia
     acontecer, por falta de opção — a comanda depois abateria um sinal que
     nunca entrou e ela cobraria a menos.

     Se o crédito da cliente já tinha sido consumido pra pagar esse sinal, o
     crédito VOLTA. Dispensar não pode custar o saldo dela. */
  if (acao === 'dispensar') {
    const { data: usados } = await supabase
      .from('customer_credits')
      .select('id')
      .eq('used_in_appointment_id', id)
    if ((usados ?? []).length > 0) {
      await supabase
        .from('customer_credits')
        .update({ used_in_appointment_id: null })
        .in('id', (usados ?? []).map((c) => c.id))
      // A sobra gerada por esse consumo some junto, senão o saldo dobra.
      await supabase
        .from('customer_credits')
        .delete()
        .eq('notes', `Sobra de crédito usado no sinal ${id}`)
    }
  }

  /* "Recebi" confirma o horário — é o único caminho do pending pro
     confirmed quando há sinal. Read-after-write porque isso é dinheiro:
     a resposta só volta ok se o banco confirmar (λ.prova-na-fonte). */
  const updates =
    acao === 'cancelar'
      ? { status: 'cancelled' }
      : acao === 'dispensar'
        ? { sinal_valor: null, sinal_pago_at: null, status: 'confirmed' }
        : { sinal_pago_at: new Date().toISOString(), status: 'confirmed' }

  const { data: salvo, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select('id, status, sinal_pago_at, sinal_valor')
    .maybeSingle()

  /* v141 · com o vencido ficando na lista, ela pode apertar "Recebi" num
     horário que outra cliente JÁ TOMOU no meio tempo. O banco recusa pela
     constraint no_overlap (23P01) e a tela dizia só "não consegui atualizar" —
     mensagem que não ajuda a decidir nada. Aqui o motivo real sobe pra tela. */
  if (error && (error.code === '23P01' || /no_overlap/i.test(error.message ?? ''))) {
    return NextResponse.json(
      { error: 'Esse horário já foi marcado por outra cliente. Remarque o atendimento antes de confirmar o sinal.' },
      { status: 409 },
    )
  }
  if (error || !salvo) return NextResponse.json({ error: 'nao_salvou' }, { status: 500 })
  if (acao === 'recebi' && !salvo.sinal_pago_at) {
    return NextResponse.json({ error: 'nao_confirmado_pelo_banco' }, { status: 500 })
  }
  // λ.prova-na-fonte também aqui: dispensar que não zerou é sinal fantasma
  // esperando pra abater da comanda.
  if (acao === 'dispensar' && salvo.sinal_valor !== null) {
    return NextResponse.json({ error: 'nao_dispensou_pelo_banco' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: salvo.status })
}

