/* ═══════════════════════════════════════════════════════════════
   PACOTES DE AVISOS — o que a dona vê e como ela troca

   GET  → catálogo traduzido pro movimento DELA, e qual sai mais barato
   PUT  → contrata ou troca de pacote

   ─── A tradução é o produto ───────────────────────────────────
   "150 mensagens" não diz nada pra quem atende cliente. "Dá pros seus 50
   atendimentos do mês" diz tudo. Por isso o GET não devolve o catálogo
   seco: devolve quantos ATENDIMENTOS cada pacote cobre com a régua que ela
   ligou, e quanto cada um custaria no movimento real dela — lido dos
   últimos 90 dias, não de média de mercado.

   ─── Quem pode contratar ──────────────────────────────────────
   Ler, qualquer um da operação. CONTRATAR, só o dono. Pacote é gasto
   recorrente, e recepção não decide gasto — a mesma regra que já vale pro
   financeiro. `resolveBusinessIdOperacao` aceita recepção e profissional
   de propósito, então ele NÃO serve pra autorizar a escrita aqui.
   ═══════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { PACOTES, pacotePorId, pacoteRecomendado, custoNoPacote, atendimentosQueCabem, PRECO_EXCEDENTE } from '@/lib/mensagens/pacotes'
import { canalLiberado } from '@/lib/mensagens/liberado'
import { consumoDoMes, primeiraCompraProporcional, diferencaDoUpgrade } from '@/lib/mensagens/franquia'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
  createCustomer,
  createPayment,
  findCustomerByExternalReference,
  getPixQrCode,
  listPaymentsByCustomer,
  getNextDueDate,
} from '@/lib/asaas'
import { unidadesDaFranquia } from '@/lib/mensagens/templates-cloud'
import type { TipoMensagem } from '@/lib/mensagens/tipos'

export const runtime = 'nodejs'

/** Regras que geram UMA mensagem por atendimento. */
const POR_ATENDIMENTO: TipoMensagem[] = ['confirmacao', 'lembrete_vespera', 'lembrete_dia']
/** Regras que geram mensagem por CLIENTE, não por atendimento — e são marketing. */
const POR_CLIENTE: TipoMensagem[] = ['aniversario', 'retorno']

export async function GET() {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  const { data: { user } } = await supabase.auth.getUser()
  const { data: negocio } = await supabase
    .from('businesses')
    .select('avisos_pacote, owner_id')
    .eq('id', businessId)
    .maybeSingle()
  const atual = pacotePorId(negocio?.avisos_pacote)
  const podeContratar = !!user && negocio?.owner_id === user.id

  /* A RÉGUA DELA decide tudo. Quem liga só a véspera gasta um terço de quem
     liga confirmação, véspera e dia — e cabe o triplo no mesmo pacote. */
  const { data: regras } = await supabase
    .from('message_rules')
    .select('tipo, enabled')
    .eq('business_id', businessId)
    .eq('enabled', true)
  const ligadas = new Set((regras ?? []).map((r) => r.tipo as TipoMensagem))
  const porAtendimento = POR_ATENDIMENTO.filter((t) => ligadas.has(t)).length
  /* Nenhuma ligada ainda: projeta com a véspera, que é a régua que a gente
     recomenda de entrada. Sem isso, quem nunca ligou nada veria "cabem
     infinitos atendimentos", que não ajuda a escolher. */
  const msgsPorAtendimento = porAtendimento || 1

  /* MOVIMENTO REAL — 90 dias, não o mês corrente. Mês corrente no dia 3
     projetaria quase zero e recomendaria o pacote errado. */
  const hoje = new Date()
  const de = new Date(hoje.getTime() - 90 * 864e5).toISOString().slice(0, 10)
  const { count: atend90 } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('appointment_date', de)
  const atendimentosMes = Math.round((atend90 ?? 0) / 3)

  /* Aniversário e retorno entram por fora: são por cliente, não por
     atendimento, e cada um consome 7 unidades por ser marketing. */
  let unidadesMarketing = 0
  if (POR_CLIENTE.some((t) => ligadas.has(t))) {
    const { count: clientes } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
    const porMes = Math.round((clientes ?? 0) / 12) // aniversário se espalha no ano
    unidadesMarketing = porMes * unidadesDaFranquia('aniversario')
  }

  const unidadesProjetadas = atendimentosMes * msgsPorAtendimento + unidadesMarketing
  const recomendado = pacoteRecomendado(unidadesProjetadas)
  const consumo = await consumoDoMes(supabase, businessId).catch(() => null)

  return NextResponse.json({
    atual: atual?.id ?? null,
    podeContratar,
    /* Quem decide e o servidor, nao a tela: a liberacao e por negocio
       enquanto a chave mestra estiver desligada. */
    liberado: canalLiberado(businessId),
    precoExcedente: PRECO_EXCEDENTE,
    movimento: {
      atendimentosMes,
      msgsPorAtendimento,
      unidadesProjetadas,
      /* true = ela ainda não ligou nenhuma régua, então a projeção é uma
         hipótese. A tela precisa dizer isso, senão o número parece medido. */
      projecaoHipotetica: porAtendimento === 0,
    },
    consumo,
    recomendado: recomendado.id,
    pacotes: PACOTES.map((p) => ({
      id: p.id,
      nome: p.nome,
      unidades: p.unidades,
      preco: p.preco,
      atendimentosQueCabem: atendimentosQueCabem(p.unidades, msgsPorAtendimento),
      /* Quanto ESTE pacote custaria pra ela, com excedente incluído. É o
         que deixa ela ver que às vezes o menor sai mais barato. */
      custoNoSeuMovimento: custoNoPacote(p, unidadesProjetadas),
    })),
  })
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  /* DONO, e só ele. `resolveBusinessIdOperacao` aceita recepção e
     profissional porque serve pra operação — assumir gasto recorrente não
     é operação. */
  const { data: { user } } = await supabase.auth.getUser()
  const { data: negocio } = await supabase
    .from('businesses')
    .select('owner_id, name, avisos_pacote')
    .eq('id', businessId)
    .maybeSingle()
  if (!user || negocio?.owner_id !== user.id) {
    return NextResponse.json({ error: 'so_o_dono_contrata' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const novo = body?.pacote as string | null
  /* Só chega preenchido na SEGUNDA tentativa, depois de a tela pedir. Mesmo
     contrato do checkout do plano (`needs_customer_data`), de propósito: é
     o mesmo formulário e a dona não aprende dois jeitos de fazer a mesma
     coisa. */
  const cliente = body?.customer as
    | { name?: string; cpfCnpj?: string; email?: string; mobilePhone?: string }
    | undefined

  /* ── CANCELAR ────────────────────────────────────────────────
     Direito dela e não pede confirmação de ninguém. O saldo que sobrou NÃO
     é apagado: ela pagou por aquelas mensagens. Some só a renovação. */
  if (novo === null) {
    const { error } = await supabase
      .from('businesses')
      .update({ avisos_pacote: null })
      .eq('id', businessId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { data: c } = await supabase
      .from('businesses').select('avisos_pacote').eq('id', businessId).maybeSingle()
    if ((c as { avisos_pacote?: string | null } | null)?.avisos_pacote !== null) {
      return NextResponse.json({ error: 'nao_persistiu' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, atual: null })
  }

  if (!pacotePorId(novo)) {
    return NextResponse.json({ error: 'pacote_invalido' }, { status: 400 })
  }

  /* ── UPGRADE NO MEIO DO CICLO ────────────────────────────────
     Já tem pacote pago valendo e quer um maior: troca o BALDE e cobra só a
     diferença. O relógio não reinicia — ver trocarPacoteNoCiclo. */
  const atual = await consumoDoMes(supabase, businessId)
  if (atual.pacote && atual.vigente) {
    const diferenca = diferencaDoUpgrade(atual.pacote.id, novo)
    if (diferenca === null) {
      return NextResponse.json({ error: 'so_da_pra_subir_no_meio_do_ciclo' }, { status: 400 })
    }
    return await cobrarAvisos(businessId, negocio?.name ?? 'seu negócio', cliente, {
      pacoteId: novo,
      valor: diferenca,
      /* unidades = tamanho do novo balde, NÃO um balde novo em cima do
         que ela já usou. É o que segura a margem em 37% em vez de 10%. */
      unidades: pacotePorId(novo)!.unidades,
      dias: 0, // 0 = mesmo ciclo, não mexe nas datas
      descricao: `Upgrade para Avisos ${pacotePorId(novo)!.nome}`,
    })
  }

  /* ── PRIMEIRA COMPRA ─────────────────────────────────────────
     Proporcional aos dias que faltam pro vencimento da mensalidade. É o que
     alinha os dois ciclos: da próxima cobrança em diante o pacote vem no
     MESMO PIX do plano, e ela paga uma vez por mês. */
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('pago_ate')
    .eq('business_id', businessId)
    .maybeSingle()
  const pagoAte = (sub as { pago_ate?: string | null } | null)?.pago_ate
  const dias = pagoAte
    ? Math.max(0, (new Date(pagoAte).getTime() - Date.now()) / 864e5)
    : 30
  const prop = primeiraCompraProporcional(novo, dias)
  if (!prop) return NextResponse.json({ error: 'pacote_invalido' }, { status: 400 })

  return await cobrarAvisos(businessId, negocio?.name ?? 'seu negócio', cliente, {
    pacoteId: novo,
    valor: prop.valor,
    unidades: prop.unidades,
    dias: prop.dias,
    descricao: `Avisos ${prop.unidades} mensagens ${prop.dias} dias`,
  })
}

/**
 * Gera o PIX avulso dos avisos e devolve o QR pra tela.
 *
 * NÃO ativa nada aqui: quem ativa é o webhook, quando o dinheiro entra.
 * Ativar na criação da cobrança seria dar o pacote de graça pra quem
 * gerasse o QR e nunca pagasse.
 *
 * O `externalReference` carrega tudo que o webhook precisa pra recarregar
 * sem consultar mais nada — inclusive as unidades proporcionais, que não
 * dá pra recalcular depois porque dependem do dia da compra.
 */
/** Tira acento e qualquer caractere fora do ASCII imprimivel. */
function apenasAscii(t: string): string {
  return t
    .normalize('NFD')
    // marcas de acento que o NFD separou da letra
    .replace(/[̀-ͯ]/g, '')
    // qualquer coisa fora do ASCII imprimível
    .replace(/[^ -~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function cobrarAvisos(
  businessId: string,
  nomeNegocio: string,
  cliente:
    | { name?: string; cpfCnpj?: string; email?: string; mobilePhone?: string }
    | undefined,
  p: { pacoteId: string; valor: number; unidades: number; dias: number; descricao: string },
) {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data: sub } = await admin
    .from('subscriptions')
    .select('asaas_customer_id')
    .eq('business_id', businessId)
    .maybeSingle()

  let customerId = (sub as { asaas_customer_id?: string | null } | null)?.asaas_customer_id ?? null
  if (!customerId) {
    /* Alguns negócios nunca passaram pelo Asaas (pagam na mão). Tenta achar
       pelo external reference antes de desistir — criar cliente novo aqui
       duplicaria cadastro. */
    const achado = await findCustomerByExternalReference(businessId)
    customerId = achado.ok ? (achado.data?.data?.[0]?.id ?? null) : null
  }
  /* Nunca passou pelo Asaas — é o caso dos que hoje pagam na mão. Em vez
     de recusar, faz o cadastro: a tela pede nome e CPF, reenvia, e a
     cobrança sai legítima e no nome dela.

     Mesmo contrato do checkout do plano: 400 com `needs_customer_data`. */
  if (!customerId) {
    if (!cliente?.name || !cliente?.cpfCnpj) {
      return NextResponse.json(
        {
          error: 'Para gerar a cobrança precisamos do nome completo e CPF/CNPJ.',
          needs_customer_data: true,
        },
        { status: 400 },
      )
    }
    const novoCliente = await createCustomer({
      name: cliente.name,
      cpfCnpj: cliente.cpfCnpj.replace(/\D/g, ''),
      email: cliente.email,
      mobilePhone: cliente.mobilePhone,
      externalReference: businessId,
    })
    if (!novoCliente.ok || !novoCliente.data?.id) {
      return NextResponse.json(
        { error: `Asaas recusou o cadastro: ${novoCliente.error}` },
        { status: 502 },
      )
    }
    customerId = novoCliente.data.id
    /* Guarda pra não recadastrar na próxima — e pra que a cobrança da
       mensalidade dela passe a ter cliente também. */
    await admin
      .from('subscriptions')
      .update({ asaas_customer_id: customerId })
      .eq('business_id', businessId)
  }

  const externalRef = `avisos-avulso|${businessId}|${p.pacoteId}|${p.unidades}|${p.dias}`

  /* ── NUNCA DUAS COBRANCAS PRA MESMA COMPRA ───────────────────
     Em 31/08 o Eduardo clicou em Contratar quatro vezes e o Asaas ficou com
     QUATRO PIX de R$ 23,90 abertos. A tela nao mostrava o PIX no lugar onde
     ele tinha clicado (renderizava la em cima, fora da rolagem), entao ele
     clicou de novo. A tela foi corrigida — mas a defesa tem que morar AQUI:
     duplo-clique, rede lenta e botao sem retorno vao acontecer de novo, e o
     unico lugar que consegue impedir cobranca duplicada e o servidor.

     Se ja existe um PIX PENDENTE identico, devolve ELE. */
  const abertas = await listPaymentsByCustomer(customerId, 20)
  const pendente = abertas.ok
    ? (abertas.data?.data ?? []).find(
        (x) =>
          (x as { status?: string }).status === 'PENDING' &&
          /* Cobranca cancelada no Asaas MANTEM status PENDING e ganha
             `deleted: true`. Reaproveitar uma dessas devolveria um codigo
             que o banco recusa com "nao esta mais disponivel para pagar". */
          (x as { deleted?: boolean }).deleted !== true &&
          (x as { externalReference?: string }).externalReference === externalRef,
      )
    : null

  let pagamentoId: string
  let invoiceUrl: string | null

  if (pendente) {
    pagamentoId = (pendente as { id: string }).id
    invoiceUrl = (pendente as { invoiceUrl?: string }).invoiceUrl ?? null
  } else {
    /* λ.fuso — usa o MESMO helper da mensalidade, que e o caminho testado e
       pago por cliente real. `new Date(Date.now() + …).toISOString()` conta em
       UTC: cobranca gerada depois das 21h no Brasil ganhava um dia a mais.
       Aconteceu em 31/08 as 22h45 — a cobranca de "3 dias" saiu vencendo 04/09
       em vez de 03/09. */
    const venc = getNextDueDate(3)
    const pay = await createPayment({
      customer: customerId,
      billingType: 'PIX',
      value: p.valor,
      dueDate: venc,
      /* SO ASCII, e sem pontuacao decorativa. A descricao vai pro campo
         `solicitacaoPagador` do PSP: o Asaas ja removia os travessoes, e
         caractere fora do ASCII em campo que trafega pro Banco Central e
         causa classica de "indisponibilidade temporaria" no app do banco.
         Nome de negocio com acento tambem e normalizado. */
      description: `${p.descricao} ${apenasAscii(nomeNegocio)}`.slice(0, 120),
      externalReference: externalRef,
    })
    if (!pay.ok || !pay.data?.id) {
      return NextResponse.json({ error: pay.error ?? 'cobranca_falhou' }, { status: 502 })
    }
    pagamentoId = pay.data.id
    invoiceUrl = pay.data.invoiceUrl ?? null
  }

  const qr = await getPixQrCode(pagamentoId)
  return NextResponse.json({
    ok: true,
    aguardandoPagamento: true,
    /* true = a tela pode dizer "voce ja tinha esse PIX aberto" em vez de
       deixar a dona achando que gerou outro. */
    reaproveitada: !!pendente,
    valor: p.valor,
    unidades: p.unidades,
    dias: p.dias,
    pagamentoId,
    link: invoiceUrl,
    pixCopiaECola: qr.ok ? (qr.data?.payload ?? null) : null,
    pixQrBase64: qr.ok ? (qr.data?.encodedImage ?? null) : null,
  })
}
