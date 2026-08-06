/* GET /api/admin/sinal/cobranca?appointmentId=<id>
   ───────────────────────────────────────────────────────────────────
   A cobrança do sinal de UM atendimento, pronta pra mandar.

   Nasceu de uma pergunta do Eduardo em 06/08: "como foi desenhado o
   sistema pra cobrança do sinal feito por agendamento manual?". A
   resposta era ruim — a dona marcava, a tela dizia "atendimento criado
   com sucesso" e ia embora sem saber que havia um sinal a cobrar. Ela
   só descobria abrindo o atendimento ou a aba Sinal. Com o prazo da
   v115 rodando, o horário era solto sem ninguém nunca ter cobrado.

   O momento certo é o de sempre: logo depois de marcar, com o telefone
   na mão. Esta rota entrega o texto e o link pra tela de sucesso do
   agendamento fazer isso em um toque.

   O copia-e-cola é montado na hora, nunca guardado: se a dona trocar a
   chave PIX, quem ainda não pagou passa a receber o código novo. */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { gerarBRCode } from '@/lib/pix-brcode'
import { linkCobrancaWhatsApp, montarMensagemCobranca } from '@/lib/sinal-cobranca'
import { minutosRestantes, SINAL_EXPIRA_PADRAO_MIN } from '@/lib/sinal-expira'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  const appointmentId = new URL(req.url).searchParams.get('appointmentId')
  if (!appointmentId) return NextResponse.json({ error: 'sem_id' }, { status: 400 })

  const [{ data: appt }, { data: negocio }] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, business_id, client_name, client_phone, service_name, appointment_date, start_time, sinal_valor, sinal_pago_at, status, created_at')
      .eq('id', appointmentId)
      .maybeSingle(),
    supabase
      .from('businesses')
      .select('pix_key, pix_receiver_name, pix_city, sinal_enabled, sinal_expira_minutos, name')
      .eq('id', businessId)
      .maybeSingle(),
  ])

  if (!appt || appt.business_id !== businessId) {
    return NextResponse.json({ error: 'nao_encontrado' }, { status: 404 })
  }

  const valor = Number(appt.sinal_valor ?? 0)
  // Já pago, cancelado ou sem sinal: não há o que cobrar.
  if (!valor || appt.sinal_pago_at || appt.status === 'cancelled' || !negocio?.pix_key) {
    return NextResponse.json({ cobrar: false })
  }

  const copiaECola = gerarBRCode({
    chave: negocio.pix_key,
    nomeRecebedor: negocio.pix_receiver_name || negocio.name || 'RECEBEDOR',
    cidade: negocio.pix_city || 'BRASIL',
    valor,
    identificador: appt.id.replace(/-/g, '').slice(0, 25),
  })

  const expiraMin = Number(negocio.sinal_expira_minutos ?? SINAL_EXPIRA_PADRAO_MIN)
  const restam = negocio.sinal_enabled
    ? minutosRestantes(
        appt as unknown as {
          id: string
          status: string | null
          sinal_valor: number | string | null
          sinal_pago_at: string | null
          created_at: string
        },
        expiraMin,
      )
    : null

  const dados = {
    clienteNome: appt.client_name as string | null,
    clienteTelefone: appt.client_phone as string | null,
    servico: appt.service_name as string | null,
    data: appt.appointment_date as string,
    hora: appt.start_time as string,
    valorSinal: valor,
    copiaECola,
    minutosPraVencer: restam,
  }

  return NextResponse.json({
    cobrar: true,
    valor,
    copiaECola,
    minutosPraVencer: restam,
    mensagem: montarMensagemCobranca(dados),
    link: linkCobrancaWhatsApp(dados),
  })
}
