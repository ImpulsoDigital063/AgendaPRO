/* ═══════════════════════════════════════════════════════════════
   PIX copia-e-cola (BR Code) — gerado aqui, sem intermediário

   Pedido da Wanessa Silva (05/08/2026), que descreveu o fluxo inteiro:
   "quando o cliente realiza o agendamento, antes de confirmar deveria
   aparecer o QR code do Pix da empresa, aí o cliente após o pagamento tem
   seu agendamento confirmado. Na academia que trabalho é assim."

   Ela também deu o motivo: "os dois maiores gargalos são as faltas".
   Na base inteira, 30 dias: R$ 5.395 em atendimento cancelado ou não
   comparecido.

   POR QUE GERAR AQUI E NÃO USAR GATEWAY: o BR Code é um formato aberto
   do Banco Central (EMV®QRCPS-MPM). Montar a string é aritmética de
   texto — sem API, sem taxa, sem cadastro. O dinheiro cai DIRETO na
   conta do salão, e a gente não toca no dinheiro de ninguém, o que
   também nos mantém fora de qualquer discussão regulatória.

   O preço disso é que a confirmação é manual: o dono olha o banco e
   marca "recebi". Automatizar exigiria PSP (Asaas, Mercado Pago), que
   cobra taxa e exige conta de cada cliente. Fica pra depois — o valor
   está em travar o horário, não em confirmar sozinho.

   ⚠️ Campos com limite de tamanho pelo padrão: nome do recebedor 25 e
   cidade 15 caracteres. Passar disso gera um código que ALGUNS bancos
   leem e outros recusam — o pior tipo de bug, porque funciona no teste
   de quem escreveu. Por isso truncamos e removemos acento aqui dentro.
   ═══════════════════════════════════════════════════════════════ */

/* ── Normalização da chave (v114 · 11/08/2026) ────────────────────────
   A Wanessa cadastrou o celular como "91991517429" e o Pix da paciente
   dela morreu com "Conta de destinatário inexistente". No DICT, celular é
   registrado em E.164 — `+5591991517429` — e o BR Code carrega a chave
   CRUA: se não bater caractere por caractere, o banco não acha a conta.

   Ninguém digita "+55" (o app do banco põe sozinho ao cadastrar a chave),
   então o campo aberto sempre vai receber o número do jeito que a pessoa
   escreve. Normalizar aqui é o que evita o erro chegar na paciente.        */

export type TipoChavePix = 'celular' | 'cpf' | 'cnpj' | 'email' | 'aleatoria'

/** CPF válido pelos dois dígitos verificadores. */
function cpfValido(c: string): boolean {
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false
  let s = 0
  for (let i = 0; i < 9; i++) s += +c[i] * (10 - i)
  let d1 = (s * 10) % 11
  if (d1 === 10) d1 = 0
  if (d1 !== +c[9]) return false
  s = 0
  for (let i = 0; i < 10; i++) s += +c[i] * (11 - i)
  let d2 = (s * 10) % 11
  if (d2 === 10) d2 = 0
  return d2 === +c[10]
}

/**
 * Adivinha o tipo pela cara da chave. 11 dígitos é ambíguo (CPF ou celular)
 * — desempata pelo dígito verificador: se não é CPF válido, é telefone.
 * Serve pra pré-selecionar o tipo de uma chave JÁ salva; na hora de gravar,
 * quem manda é o tipo que a pessoa escolheu.
 */
export function detectarTipoChave(chave: string): TipoChavePix {
  const v = String(chave || '').trim()
  if (v.includes('@')) return 'email'
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return 'aleatoria'
  const d = v.replace(/\D/g, '')
  if (v.startsWith('+') || d.length === 13) return 'celular'
  if (d.length === 14) return 'cnpj'
  if (d.length === 11) return cpfValido(d) ? 'cpf' : 'celular'
  return 'aleatoria'
}

/**
 * Devolve a chave no formato que o DICT espera. Celular sempre sai `+55…`,
 * sem duplicar o 55 de quem já digitou com DDI.
 */
export function normalizarChavePix(chave: string, tipo?: TipoChavePix): string {
  const v = String(chave || '').trim()
  if (!v) return ''
  const t = tipo || detectarTipoChave(v)
  if (t === 'email') return v.toLowerCase()
  if (t === 'aleatoria') return v
  const d = v.replace(/\D/g, '')
  if (t === 'cpf' || t === 'cnpj') return d
  // celular: 11 dígitos locais, ou 13 já com DDI
  const local = d.length === 13 && d.startsWith('55') ? d.slice(2) : d
  return `+55${local}`
}

/** Monta um campo no formato ID + tamanho(2 dígitos) + valor. */
function campo(id: string, valor: string): string {
  return id + String(valor.length).padStart(2, '0') + valor
}

/** Remove acento e o que o padrão não aceita, e corta no limite. */
function limpar(texto: string, max: number): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .-]/g, '')
    .trim()
    .slice(0, max)
    .toUpperCase()
}

/**
 * CRC16/CCITT-FALSE — exigido no fim do payload.
 * Polinômio 0x1021, valor inicial 0xFFFF. Sem isso o banco recusa o código.
 */
function crc16(payload: string): string {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export type DadosPix = {
  /** Chave PIX: CPF/CNPJ (só dígitos), e-mail, telefone (+55...) ou aleatória. */
  chave: string
  /** Nome de quem recebe — vai truncado em 25 no padrão. */
  nomeRecebedor: string
  /** Cidade do recebedor — truncada em 15. */
  cidade: string
  /** Valor em reais. Omitido gera código sem valor (cliente digita). */
  valor?: number
  /** Identificador do pagamento (até 25). Aparece no extrato do dono. */
  identificador?: string
}

/**
 * Devolve a string do copia-e-cola. A mesma string vira o QR Code —
 * é literalmente o conteúdo dele, não uma imagem gerada por serviço.
 */
export function gerarBRCode({ chave, nomeRecebedor, cidade, valor, identificador }: DadosPix): string {
  const chaveLimpa = chave.trim()

  const merchantAccount = campo('00', 'br.gov.bcb.pix') + campo('01', chaveLimpa)

  const partes = [
    campo('00', '01'),                       // versão do payload
    campo('01', '12'),                       // 12 = uso múltiplo (não expira ao ler)
    campo('26', merchantAccount),            // conta do recebedor (PIX)
    campo('52', '0000'),                     // categoria do estabelecimento
    campo('53', '986'),                      // moeda: 986 = BRL
    ...(valor && valor > 0 ? [campo('54', valor.toFixed(2))] : []),
    campo('58', 'BR'),                       // país
    campo('59', limpar(nomeRecebedor, 25)),
    campo('60', limpar(cidade || 'BRASIL', 15)),
    campo('62', campo('05', limpar(identificador || '***', 25))),
  ].join('')

  // O CRC é calculado sobre o payload JÁ COM "6304" no fim.
  const comMarcador = partes + '6304'
  return comMarcador + crc16(comMarcador)
}

/** Valor do sinal a partir do preço e do percentual configurado. */
export function calcularSinal(precoTotal: number, percentual: number): number {
  if (!precoTotal || !percentual) return 0
  return Math.round(precoTotal * (percentual / 100) * 100) / 100
}
