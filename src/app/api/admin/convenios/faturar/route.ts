/**
 * POST /api/admin/convenios/faturar
 *
 * Fecha o período de uma empresa conveniada numa FATURA congelada e,
 * opcionalmente, manda por e-mail pro contato dela.
 *
 * Por que existe (Eduardo, 24/08/2026): o extrato da tela é consulta viva —
 * lançamento retroativo muda o número depois de enviado, e quem parece errado
 * é o dono da clínica na frente do RH. A fatura guarda a FOTO das linhas.
 *
 * Body: { companyId, competencia: 'YYYY-MM', enviarEmail?: boolean }
 *
 * Segurança: SSR client (respeita RLS) pra ler e validar a posse; a empresa tem
 * que ser do negócio do usuário logado.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { monthBoundsBR } from '@/lib/date-br'
import { enviarExtratoConvenio } from '@/lib/email'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'nao_autenticado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const companyId = String(body.companyId ?? '')
  const competencia = String(body.competencia ?? '')
  const enviarEmail = body.enviarEmail === true
  if (!companyId || !/^\d{4}-\d{2}$/.test(competencia)) {
    return NextResponse.json({ error: 'dados_invalidos' }, { status: 400 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, phone, convenios_enabled')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!business) return NextResponse.json({ error: 'negocio_nao_encontrado' }, { status: 404 })
  if (!business.convenios_enabled) return NextResponse.json({ error: 'convenio_desligado' }, { status: 403 })

  const { data: empresa } = await supabase
    .from('companies')
    .select('id, name, contato_nome, contato_email, business_id')
    .eq('id', companyId)
    .eq('business_id', business.id)
    .maybeSingle()
  if (!empresa) return NextResponse.json({ error: 'empresa_nao_encontrada' }, { status: 404 })

  const { start, end } = monthBoundsBR(competencia)

  /* Só entra na fatura o atendimento que AINDA não foi faturado. Sem isso um
     segundo fechamento do mesmo mês cobraria tudo de novo. */
  const { data: atendimentos, error: errAppts } = await supabase
    .from('appointments')
    .select('id, appointment_date, start_time, client_name, service_name, total_price, professional:professionals(name)')
    .eq('business_id', business.id)
    .eq('company_id', empresa.id)
    .gte('appointment_date', start)
    .lte('appointment_date', end)
    .neq('status', 'cancelled')
    .is('company_invoice_id', null)
    .order('appointment_date')
    .order('start_time')
  if (errAppts) return NextResponse.json({ error: errAppts.message }, { status: 500 })
  if (!atendimentos || atendimentos.length === 0) {
    return NextResponse.json({ error: 'nada_a_faturar' }, { status: 400 })
  }

  const linhas = atendimentos.map((a) => {
    const prof = Array.isArray(a.professional) ? a.professional[0] : a.professional
    return {
      data: a.appointment_date as string,
      hora: (a.start_time as string).slice(0, 5),
      funcionario: a.client_name ?? '—',
      profissional: prof?.name ?? '—',
      servico: a.service_name ?? '—',
      valor: Number(a.total_price ?? 0),
    }
  })
  const total = linhas.reduce((s, l) => s + l.valor, 0)

  const { data: numeroRow } = await supabase.rpc('next_company_invoice_number', { p_business: business.id })
  const numero = Number(numeroRow ?? 1)

  const { data: fatura, error: errFat } = await supabase
    .from('company_invoices')
    .insert({
      business_id: business.id,
      company_id: empresa.id,
      numero,
      competencia,
      periodo_ini: start,
      periodo_fim: end,
      qtd: linhas.length,
      total,
      snapshot: linhas,
    })
    .select('id, numero, total, qtd')
    .single()
  if (errFat) return NextResponse.json({ error: errFat.message }, { status: 500 })

  // Carimba os atendimentos: não entram numa segunda fatura.
  const { error: errMark } = await supabase
    .from('appointments')
    .update({ company_invoice_id: fatura.id })
    .in('id', atendimentos.map((a) => a.id))
  if (errMark) {
    // Fatura sem atendimento carimbado viraria cobrança duplicada no mês seguinte.
    await supabase.from('company_invoices').delete().eq('id', fatura.id)
    return NextResponse.json({ error: `falha_ao_vincular: ${errMark.message}` }, { status: 500 })
  }

  let emailEnviado = false
  let emailErro: string | null = null
  if (enviarEmail) {
    if (!empresa.contato_email) {
      emailErro = 'A empresa não tem e-mail cadastrado.'
    } else {
      const r = await enviarExtratoConvenio({
        para: empresa.contato_email,
        empresaNome: empresa.name,
        contatoNome: empresa.contato_nome,
        negocioNome: business.name,
        negocioTelefone: business.phone,
        competencia,
        numero: fatura.numero,
        linhas,
        total,
      })
      emailEnviado = r.ok
      emailErro = r.ok ? null : r.erro
      if (r.ok) {
        await supabase
          .from('company_invoices')
          .update({ enviada_em: new Date().toISOString(), enviada_para: empresa.contato_email })
          .eq('id', fatura.id)
      }
    }
  }

  return NextResponse.json({
    fatura: { id: fatura.id, numero: fatura.numero, total: fatura.total, qtd: fatura.qtd },
    emailEnviado,
    emailErro,
  })
}
