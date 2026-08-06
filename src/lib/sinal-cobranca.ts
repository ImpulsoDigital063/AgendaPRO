/* Mensagem de cobrança do sinal — um texto só, usado em todo lugar.
   ───────────────────────────────────────────────────────────────────
   Existia só dentro da aba Sinal. Quando o botão de cobrar apareceu
   também na tela de sucesso do agendamento (06/08), duas cópias do
   mesmo texto começariam a divergir na primeira vez que uma fosse
   ajustada — e a cliente receberia uma mensagem diferente conforme o
   caminho que a dona usou pra cobrar. */

export type DadosCobranca = {
  clienteNome: string | null
  clienteTelefone: string | null
  servico: string | null
  data: string // YYYY-MM-DD
  hora: string // HH:MM(:SS)
  valorSinal: number
  copiaECola: string | null
  /** Minutos que o horário ainda aguenta sem o pagamento. */
  minutosPraVencer?: number | null
  /** Nome do salão. Sem ele a cliente recebe uma cobrança de número
   *  desconhecido — a leitura natural é golpe, e ela não paga. */
  nomeNegocio?: string | null
  /** Link da página do sinal (QR + botão de copiar). Quando existe, o
   *  copia-e-cola NÃO vai no texto: no WhatsApp ela copiaria a mensagem
   *  inteira e colaria lixo no banco. */
  linkPagamento?: string | null
  /** Horário-limite já formatado ("15:02"). Não envelhece como "2h". */
  horaLimite?: string | null
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dataCurta = (ymd: string) => ymd.split('-').reverse().slice(0, 2).join('/')

/** "45 min", "2h", "1h20" — ninguém lê "137 minutos" e entende de cara. */
export function textoPrazo(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

export function montarMensagemCobranca(d: DadosCobranca): string {
  const primeiroNome = (d.clienteNome || '').split(' ')[0]

  /* Quem está falando vem primeiro. Sem o nome do salão, ela recebe um pedido
     de PIX de um número que não tem salvo — e a leitura natural disso hoje é
     golpe. Nenhum texto bonito depois recupera essa primeira impressão. */
  const abertura = d.nomeNegocio
    ? `Oi ${primeiroNome}! Aqui é do ${d.nomeNegocio}.\n\n`
    : `Oi ${primeiroNome}!\n\n`

  /* Horário-limite em vez de "faltam 2h": a mensagem é escrita agora e pode
     ser lida daqui a uma hora, quando "2h" já virou mentira. */
  const prazo = d.horaLimite
    ? `Consigo segurar até as ${d.horaLimite} — depois disso o horário volta pra agenda.\n\n`
    : typeof d.minutosPraVencer === 'number' && d.minutosPraVencer > 0
      ? `Consigo segurar por mais ${textoPrazo(d.minutosPraVencer)} — depois disso o horário volta pra agenda.\n\n`
      : ''

  /* Com link, o código NÃO entra no texto. No celular, tocar e segurar copia a
     mensagem inteira — ela colaria saudação e tudo no banco. Na página basta
     um toque, e ainda tem o QR pra quem paga escaneando. */
  const comoPagar = d.linkPagamento
    ? `Pra confirmar, é só pagar o sinal de ${brl(d.valorSinal)} aqui:\n${d.linkPagamento}\n\n` +
      `Tem o QR Code e o botão de copiar o código — o que for mais fácil pra você.\n\n`
    : `Pra confirmar, é só pagar o sinal de ${brl(d.valorSinal)} no PIX abaixo — ` +
      `copia o código e cola no seu banco:\n\n${d.copiaECola ?? ''}\n\n`

  return (
    abertura +
    `Seu horário de ${d.servico ?? 'atendimento'} dia ${dataCurta(d.data)} ` +
    `às ${d.hora.slice(0, 5)} está reservado.\n\n` +
    comoPagar +
    prazo +
    `Assim que cair eu confirmo aqui. Qualquer coisa me chama!`
  )
}

/** Link do WhatsApp já com a mensagem. null quando falta telefone ou PIX. */
export function linkCobrancaWhatsApp(d: DadosCobranca): string | null {
  const tel = (d.clienteTelefone || '').replace(/\D/g, '')
  if (!tel || (!d.copiaECola && !d.linkPagamento)) return null
  const numero = tel.startsWith('55') ? tel : `55${tel}`
  return `https://wa.me/${numero}?text=${encodeURIComponent(montarMensagemCobranca(d))}`
}
