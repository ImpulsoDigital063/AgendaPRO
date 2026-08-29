/* ═══════════════════════════════════════════════════════════════
   PACOTES DE AVISOS — o catálogo, e o que ele significa pra dona

   O módulo de avisos é opcional e não tem custo fixo: a Meta cobra por
   mensagem ENTREGUE, sem mensalidade por conta nem por número. Negócio que
   não contrata não manda, não entrega e não custa nada. Por isso a régua
   comercial pode ser generosa — não existe assento vazio pra pagar.

   ─── Por que cinco degraus ────────────────────────────────────
   Medido na base em 28/08, com a régua cheia (confirmação + véspera +
   dia = 3 por atendimento): Wanessa 135 · Rosy 123 · Realli 123 · CAF 105
   · Gessica 99 · Viva 87 · DN 60 · o resto abaixo de 30. Com só a véspera,
   tudo isso cai pra faixa de 20 a 45.

   Os degraus cobrem de 60 a 1000 não porque alguém está lá em cima hoje —
   o Olímpio, que era o único, disse que não quer agora — mas pra ninguém
   ter que trocar de pacote no primeiro mês bom.

   ─── O excedente é folga, não punição ─────────────────────────
   R$0,12 por unidade que passar. Ele é mais caro por mensagem que qualquer
   pacote, mas isso NÃO significa que estourar seja ruim pra ela: quem passa
   pouco continua saindo mais barato ficando onde está. Um negócio de 135
   unidades paga R$13,70 no Padrão contra R$22,90 no Plus.

   Quem passa MUITO é que acaba no degrau de cima — e chega lá sozinho,
   porque a conta vira. Ninguém precisa empurrar upgrade nenhum, e é por
   isso que `pacoteRecomendado` decide por CUSTO e não por capacidade.

   A dona não pode se sentir obrigada a comprar pacote que não vai usar. Por
   isso a tela mostra quantos ATENDIMENTOS cabem, não quantas mensagens:
   "120 mensagens" não diz nada; "dá pros seus 40 atendimentos" diz tudo.
   ═══════════════════════════════════════════════════════════════ */

export type Pacote = {
  /** Identificador guardado em `businesses.avisos_pacote`. */
  id: 'essencial' | 'padrao' | 'plus' | 'pro' | 'alto'
  nome: string
  /** Unidades inclusas por mês. Marketing consome 7 por mensagem. */
  unidades: number
  /** Mensalidade em reais. */
  preco: number
}

/* Ancorado no Padrão (150 por R$12,90 = R$0,086/msg), decidido em 28/08.
   Os tamanhos dobram a cada degrau e o preço POR MENSAGEM cai em todos:

     Essencial   60  R$  7,90   R$0,1317/msg   margem 62%
     Padrão     150  R$ 12,90   R$0,0860/msg   margem 42%   ← âncora
     Plus       300  R$ 23,90   R$0,0797/msg   margem 37%
     Pro        600  R$ 44,90   R$0,0748/msg   margem 33%
     Alto      1200  R$ 84,90   R$0,0708/msg   margem 29%

   A margem cai junto, e tem que cair: o custo é fixo em R$0,05 por
   mensagem, então desconto de volume sai do nosso lado. O piso é não
   chegar perto de R$0,05 — se a Meta mexer no preço, o degrau de cima é o
   primeiro a virar prejuízo.

   Cada degrau só passa a compensar depois de uma faixa de excedente, o que
   é de propósito: 102 unidades pra sair do Essencial, 242 do Padrão, 475
   do Plus, 933 do Pro. Ninguém sobe antes de a conta mandar subir. */
export const PACOTES: Pacote[] = [
  { id: 'essencial', nome: 'Essencial', unidades: 60, preco: 7.9 },
  { id: 'padrao', nome: 'Padrão', unidades: 150, preco: 12.9 },
  { id: 'plus', nome: 'Plus', unidades: 300, preco: 23.9 },
  { id: 'pro', nome: 'Pro', unidades: 600, preco: 44.9 },
  { id: 'alto', nome: 'Alto volume', unidades: 1200, preco: 84.9 },
]

/** Preço por unidade que passar da franquia. Um só, pra todos os pacotes. */
export const PRECO_EXCEDENTE = 0.12

export function pacotePorId(id: string | null | undefined): Pacote | null {
  if (!id) return null
  return PACOTES.find((p) => p.id === id) ?? null
}

/**
 * Quantos ATENDIMENTOS o pacote cobre, dado o que a dona ligou.
 *
 * É a tradução que faz a tela fazer sentido. Depende da régua dela: quem
 * liga só a véspera gasta 1 por atendimento e cabe o triplo de quem liga
 * confirmação, véspera e dia.
 *
 * Aniversário e retorno ficam DE FORA desta conta de propósito: eles não
 * são por atendimento, são por cliente, e cada um consome 7 unidades. Mistu-
 * rar os dois numa média só produziria um número que erra nos dois casos.
 */
export function atendimentosQueCabem(unidades: number, msgsPorAtendimento: number): number {
  if (msgsPorAtendimento <= 0) return 0
  return Math.floor(unidades / msgsPorAtendimento)
}

/**
 * O pacote MAIS BARATO pro movimento real do negócio.
 *
 * Recomenda por CUSTO TOTAL, não por capacidade — e a diferença não é
 * acadêmica. Um negócio de 135 unidades/mês cabe "melhor" no Plus (250,
 * R$22,90), mas o Padrão (120, R$11,90) com 15 de excedente sai R$13,70:
 * quase metade. Recomendar por capacidade seria empurrar pacote que ela não
 * usa, que é a coisa que faz a dona desconfiar da conta inteira.
 *
 * O excedente aqui é o que ele foi desenhado pra ser: uma folga barata pra
 * quem passa pouco, não uma punição. Quem passa MUITO acaba no degrau de
 * cima sozinho, porque a conta vira — sem ninguém precisar empurrar.
 *
 * Empate vai pro pacote maior: mesmo preço com mais folga é melhor pra ela.
 */
export function pacoteRecomendado(unidadesPorMes: number): Pacote {
  let melhor = PACOTES[0]
  let melhorCusto = Infinity
  for (const p of PACOTES) {
    const c = custoNoPacote(p, unidadesPorMes)
    if (c < melhorCusto - 0.001) {
      melhor = p
      melhorCusto = c
    } else if (Math.abs(c - melhorCusto) <= 0.001) {
      /* Empate: fica com o maior. PACOTES está em ordem crescente, então
         o que chega depois tem mais folga pelo mesmo preço. */
      melhor = p
    }
  }
  return melhor
}

/**
 * Quanto custaria o mês em cada pacote, pro consumo informado.
 *
 * Serve pra tela mostrar a comparação inteira em vez de só o recomendado —
 * a dona decide melhor vendo que o degrau de cima às vezes sai mais barato
 * que o de baixo com excedente. Nada aqui esconde a conta dela.
 */
export function custoNoPacote(p: Pacote, unidadesPorMes: number): number {
  const excedente = Math.max(0, unidadesPorMes - p.unidades)
  return Number((p.preco + excedente * PRECO_EXCEDENTE).toFixed(2))
}
