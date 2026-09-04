import type { SupabaseClient } from '@supabase/supabase-js'
import { enviar } from './enviar'
import { chaveIdempotencia } from './tipos'
import { dataCurta } from './textos'
import { todayBR } from '@/lib/date-br'
import { SINAL_EXPIRA_PADRAO_MIN } from '@/lib/sinal-expira'

/* ═══════════════════════════════════════════════════════════════
   CONFIRMAÇÃO DE AGENDAMENTO — um lugar só

   Eduardo, 01/09: "desenvolva para todo caminho de agendamento pelo mobile e
   desktop também dispare".

   Antes disso a lógica morava dentro da rota `/api/mensagens/agendou`, e
   quem inseria agendamento tinha que lembrar de chamar a rota. Varri o
   código: são SETE pontos que inserem em `appointments`, e três chamavam.

     DISPARA  booking/submit            (link público)
     DISPARA  AgendarModal              (desktop e Clientes)
     DISPARA  MarcarAgendamentoForm     (recepção e /admin/marcar no celular)
     mudo     gift-cards/schedule       ← ERRADO, é agendamento futuro real
     mudo     atendimento-historico     ← certo, é atendimento que JÁ ocorreu
     mudo     invoices/items            ← certo, balcão, status completed
     mudo     invoices (comanda)        ← certo, balcão, status completed

   Nem todo mudo era bug: quem lança atendimento passado na ficha ou fecha
   comanda no balcão não pode mandar "seu horário ficou marcado". Só o cartão
   presente estava errado.

   Com a lógica aqui, ponto novo de criação vira uma linha — e não depende de
   alguém lembrar da regra.

   ─── As três guardas ──────────────────────────────────────────

   · status pending/confirmed — cancelado e concluído não avisam nada
   · data no futuro (ou hoje) — confirmar atendimento de semana passada é o
     jeito mais rápido de assustar a cliente e gastar do pacote à toa
   · idempotência pela chave — dois cliques não mandam duas mensagens

   ─── E a bifurcação do sinal (01/09) ──────────────────────────

   Bug que estava no ar: agendamento com sinal nasce `status: 'pending'`, e
   'pending' passava na primeira guarda. Ou seja, quem devia sinal recebia
   "Seu horário no X ficou marcado". Não ficou — ela ainda precisa pagar, e
   o horário cai sozinho quando o prazo vence.

   Eduardo desenhou a saída: "se o sinal estiver ligado e a dona escolher
   enviar o sinal automaticamente, então a primeira msg que vai é a do
   sinal, com o qr e copia e cola para pagar, ai só depois do pagamento e
   confirmação é que vai a msg de confirmação".

   Então esta função escolhe UMA das duas mensagens. Nunca as duas:

     deve sinal   →  sinal_pendente   (link de pagamento + "Já paguei")
     não deve     →  confirmacao      (o que já existia)

   Escolher aqui, e não em quem chama, é o mesmo motivo de a confirmação
   ter vindo pra cá: são sete pontos que criam agendamento, e a regra não
   pode depender de cada um lembrar dela.
   ═══════════════════════════════════════════════════════════════ */

/** Até quando pagar, como a cliente lê. Em BR, não em UTC — o prazo de 4h
 *  de um agendamento criado às 22h cai no dia seguinte, e "as 02:00" sem o
 *  "amanhã" faz ela achar que já perdeu. */
function prazoLegivel(criadoEm: string, minutos: number, hojeBR: string): string {
  const alvo = new Date(new Date(criadoEm).getTime() + minutos * 60_000)
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    alvo.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', ...opts })
  const hora = fmt({ hour: '2-digit', minute: '2-digit' })
  const dia = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' })
    .split('/')
    .reverse()
    .join('-')
  if (dia === hojeBR) return `as ${hora}`
  const [a, m, d] = hojeBR.split('-').map(Number)
  const amanha = new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10)
  if (dia === amanha) return `amanha as ${hora}`
  const [, mm, dd] = dia.split('-')
  return `${dd}/${mm} as ${hora}`
}

export type ResultadoConfirmacao =
  | { ok: true; resultado: Awaited<ReturnType<typeof enviar>> }
  | { ok: false; motivo: 'nao_encontrado' | 'status' | 'passado' | 'serie' | 'erro_consulta' }

export async function confirmarAgendamento(
  db: SupabaseClient,
  appointmentId: string,
): Promise<ResultadoConfirmacao> {
  const { data: a, error: erroSelect } = await db
    .from('appointments')
    .select(
      `id, business_id, appointment_date, start_time, client_name, client_phone,
       client_email, service_name, customer_id, status, created_at,
       recurring_group_id, recurring_index,
       sinal_valor, sinal_pago_at,
       business:businesses(name, phone, sinal_expira_minutos),
       professional:professionals(name),
       customer:customers(sinal_isento)`,
    )
    .eq('id', appointmentId)
    .maybeSingle()

  /* Query quebrada NÃO pode se disfarçar de "não encontrado". Foi assim que
     a coluna inexistente passou meses despercebida: `maybeSingle()` devolve
     data null tanto pra "esse id não existe" quanto pra "sua query está
     errada", e quem chama trata os dois como o mesmo silêncio. Um motivo
     próprio e um erro no log separam as duas coisas. */
  if (erroSelect) {
    console.error('confirmarAgendamento · SELECT FALHOU', appointmentId, erroSelect.message)
    return { ok: false, motivo: 'erro_consulta' }
  }
  if (!a) return { ok: false, motivo: 'nao_encontrado' }
  if (!['pending', 'confirmed'].includes(String(a.status))) {
    return { ok: false, motivo: 'status' }
  }
  /* λ.fuso — dia BR, não UTC. Sem isso, um agendamento de hoje criado depois
     das 21h seria lido como "ontem" e a confirmação não sairia. */
  if (String(a.appointment_date) < todayBR()) {
    return { ok: false, motivo: 'passado' }
  }

  /* ── SÉRIE MANDA UMA CONFIRMAÇÃO SÓ ──────────────────────────
     Pergunta do Eduardo em 01/09, pensando no CAF: clínica que marca um
     pacote de 10 sessões de uma vez.

     O `AgendarModal` insere as 10 em lote e chama a confirmação PARA CADA
     UMA. A cliente receberia dez mensagens quase iguais em segundos. O risco
     não é ela reclamar — é ela BLOQUEAR o número. E o número é um só,
     compartilhado por todos os negócios: um bloqueio derruba o
     `quality_rating` da base inteira. De quebra custaria 10 unidades onde
     cabe 1.

     Então confirma só a PRIMEIRA sessão da série. As outras nove seguem
     recebendo os lembretes normalmente — esses são por sessão e cada um
     avisa de um dia diferente, que é justamente o que ela precisa. */
  const indice = a.recurring_index as number | null
  if (a.recurring_group_id && indice !== null && indice > 1) {
    return { ok: false, motivo: 'serie' }
  }

  const negocio = a.business as unknown as {
    name: string
    phone: string | null
    sinal_expira_minutos: number | null
  } | null
  const prof = a.professional as unknown as { name: string } | null

  /* ── DEVE SINAL? ─────────────────────────────────────────────
     `sinal_isento` existe porque a dona libera cliente de casa do sinal
     caso a caso. Isento é tratado como pago: o horário vale, e a mensagem
     que sai é a confirmação normal. */
  /* 🔴 A ISENÇÃO MORA EM `customers`, NÃO EM `appointments` (04/09).
     Até aqui o select pedia `appointments.sinal_isento` — coluna que NUNCA
     existiu. O PostgREST devolve erro, `a` vem null, e a função saía em
     `nao_encontrado` para TODO agendamento, em TODO caminho.

     Ou seja: `confirmarAgendamento` nunca funcionou uma vez sequer. As
     confirmações que a base recebeu vieram da varredura horária, que monta
     a fila à mão e não toca nessa coluna — por isso ninguém percebeu, e por
     isso a cobrança de sinal (que só existe aqui) nunca saiu.

     Achado testando o caminho real depois de trocar o link público pra cá:
     o submit parou de mandar qualquer coisa, e o log ficou vazio em vez de
     registrar 'ignorado'. Nenhum erro em lugar nenhum — o `.catch` do
     chamador engolia, e `maybeSingle()` não distingue "não achei" de "sua
     query está errada". */
  const isenta = (a.customer as unknown as { sinal_isento?: boolean } | null)?.sinal_isento === true
  const valorSinal = Number(a.sinal_valor ?? 0)
  const deveSinal = valorSinal > 0 && !a.sinal_pago_at && !isenta

  const tipo = deveSinal ? ('sinal_pendente' as const) : ('confirmacao' as const)

  const resultado = await enviar(db, {
    businessId: a.business_id as string,
    tipo,
    /* Chave por TIPO: se ela pagar depois, a confirmação tem chave própria
       e sai — a idempotência não pode confundir as duas mensagens. */
    chave: chaveIdempotencia(tipo, a.id as string),
    destino: { telefone: a.client_phone as string | null, email: a.client_email as string | null },
    appointmentId: a.id as string,
    customerId: (a.customer_id as string) ?? null,
    variaveis: {
      cliente: (a.client_name as string) || 'Cliente',
      salao: negocio?.name ?? 'seu negócio',
      data: dataCurta(a.appointment_date as string),
      hora: String(a.start_time).slice(0, 5),
      servico: (a.service_name as string) || 'seu atendimento',
      telefoneSalao: negocio?.phone ?? null,
      profissional: prof?.name,
      /* Só o tipo sinal_pendente usa. Nos outros ficam undefined e os
         params nem olham pra eles. */
      sinal: deveSinal
        ? valorSinal.toFixed(2).replace('.', ',').replace(/^/, 'R$ ')
        : undefined,
      prazo: deveSinal
        ? prazoLegivel(
            String(a.created_at),
            negocio?.sinal_expira_minutos ?? SINAL_EXPIRA_PADRAO_MIN,
            todayBR(),
          )
        : undefined,
    },
  })

  return { ok: true, resultado }
}
