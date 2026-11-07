/* ═══════════════════════════════════════════════════════════════
   NOVA TENTATIVA DE MENSAGEM BARRADA POR MOTIVO PASSAGEIRO (06/11/2026)

   O defeito: o portão do módulo (franquia.ts · podeEnviar) barra a mensagem
   DEPOIS de a chave entrar no message_log. A linha fica 'ignorado' com a
   chave do aviso, e a chave é UNIQUE — então, quando a dona renova o pacote
   ou paga a mensalidade, a varredura descarta a tarefa ("já saiu?") e o
   `enviar` bate no UNIQUE. O aviso nunca mais é tentado.
   Caso real: Wanessa, 06/11 11h, 6 avisos 'sem_saldo'; saldo liberado às
   22h e nada saiu.

   A regra nova, em quatro travas:

   1. SÓ MOTIVO DE DINHEIRO/LIBERAÇÃO volta. São os que mudam sem ninguém
      mexer no aviso: ela compra pacote, paga a mensalidade, ou o Eduardo
      libera o canal. Motivo do DESTINATÁRIO (opt-out, telefone inválido,
      número sem WhatsApp) continua definitivo — tentar de novo não muda nada
      e só gasta consulta.
   2. SÓ QUEM PEDIU volta. O chamador diz até quando o aviso ainda faz
      sentido (`retentarAte`): lembrete até o atendimento/teto de atraso,
      confirmação até o horário, sinal até o prazo do sinal, aniversário até
      o fim do dia. Sem `retentarAte`, o comportamento é o antigo.
   3. SÓ LINHA NOVA volta. Linha 'ignorado' gravada antes de RETENTAR_DESDE
      fica como está — inclusive os 6 da Wanessa, que o Eduardo decidiu não
      reenviar. Corte por data e não por coluna nova: não depende de
      migration aplicada antes do deploy.
   4. A RETOMADA É ATÔMICA. Quem tenta de novo faz
        UPDATE ... SET status='processando' WHERE chave=? AND status='ignorado'
      e só segue quem recebeu a linha de volta. No Postgres, o segundo
      UPDATE concorrente espera o primeiro e reavalia o WHERE na versão nova
      (já 'processando') — casa zero linhas. A garantia de "nunca em dobro"
      continua sendo do banco, como a do INSERT.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Motivos que caem sozinhos. Quem decide se ainda vale é `podeEnviar`, que
 * devolve exatamente estes.
 *
 * · sem_saldo            — ela compra/renova o pacote.
 * · sem_pacote_contratado — ela contrata. (Ivna: sem pacote de propósito;
 *                           a varredura pergunta o portão antes e não grava
 *                           nada enquanto ele seguir fechado.)
 * · assinatura_bloqueada  — ela paga a mensalidade.
 * · sem_assinatura        — a assinatura passa a existir.
 * · canal_nao_liberado    — o Eduardo libera o negócio (deploy da lista).
 *
 * FORA de propósito:
 * · regra_desligada, conta_demo, negocio_sem_telefone e o
 *   assinatura_bloqueada de `podeFalarPelo` — devolvem ANTES de gravar no
 *   log, então nunca travaram a chave.
 * · opt_out, telefone_invalido, numero_sem_whatsapp, sem_canal — são do
 *   destinatário, não passam com o tempo.
 * · sem_credencial_cloud, sem_template_aprovado — são do sistema e raros;
 *   ficam como estão até alguém decidir.
 */
export const MOTIVOS_PASSAGEIROS: ReadonlySet<string> = new Set([
  'sem_saldo',
  'sem_pacote_contratado',
  'assinatura_bloqueada',
  'sem_assinatura',
  'canal_nao_liberado',
])

/** Linha 'ignorado' gravada antes disto não volta (ver trava 3). */
export const RETENTAR_DESDE = Date.parse('2026-11-07T00:00:00-03:00')

export type LinhaDoLog = {
  status: string | null
  erro: string | null
  created_at: string | null
}

/** A linha que já está no log pode ser retomada? (sem olhar o portão) */
export function linhaRetomavel(linha: LinhaDoLog | null | undefined): boolean {
  if (!linha) return false
  if (linha.status !== 'ignorado') return false
  if (!linha.erro || !MOTIVOS_PASSAGEIROS.has(linha.erro)) return false
  const criada = linha.created_at ? Date.parse(linha.created_at) : NaN
  if (!Number.isFinite(criada) || criada < RETENTAR_DESDE) return false
  return true
}

/** O aviso ainda está dentro da janela que o chamador declarou? */
export function dentroDaJanela(retentarAte: number | null | undefined, agora = Date.now()): boolean {
  return typeof retentarAte === 'number' && Number.isFinite(retentarAte) && agora < retentarAte
}
