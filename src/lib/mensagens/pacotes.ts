/* ═══════════════════════════════════════════════════════════════
   PACOTES DE AVISOS — o catálogo, e o que ele significa pra dona

   O módulo de avisos é opcional e não tem custo fixo: a Meta cobra por
   mensagem ENTREGUE, sem mensalidade por conta nem por número. Negócio que
   não contrata não manda, não entrega e não custa nada. Por isso a régua
   comercial pode ser generosa — não existe assento vazio pra pagar.

   ─── Por que seis degraus ─────────────────────────────────────
   Medido na base em 28/08, com a régua cheia (confirmação + véspera +
   dia = 3 por atendimento): Wanessa 135 · Rosy 123 · Realli 123 · CAF 105
   · Gessica 99 · Viva 87 · DN 60 · o resto abaixo de 30. Com só a véspera,
   tudo isso cai pra faixa de 20 a 45.

   Os degraus cobrem de 80 a 3200 não porque alguém está lá em cima hoje,
   mas pra ninguém ter que trocar de pacote no primeiro mês bom — e porque
   o CAF, de 70 atendimentos/dia, projeta 3.640/mês. Sem o degrau Clínica
   ele cairia inteiro no excedente e a conta ficaria mais cara que comprar
   pacote, que é o contrário do que essa tabela deveria fazer.

   ─── 01/09: a Meta é mais barata do que a gente achava ────────
   O catálogo foi desenhado com custo de R$0,05/mensagem, anotado como "a
   confirmar no rate card". O rate card oficial em BRL (efetivo 01/07/2026,
   linha do Brasil: `Brazil,BRL,0.3217,0.0350,0.0350`) diz R$0,0350 pra
   template de UTILIDADE. Trinta por cento mais barato.

   Eduardo decidiu devolver essa diferença em MENSAGEM, não em real: o
   preço de cada degrau ficou igual e a franquia subiu 33%. Motivo prático
   — a tela mostra "dá pros seus X atendimentos", não o preço por unidade,
   então mais franquia melhora exatamente o número que a dona lê. Baixar o
   Padrão de R$12,90 pra R$9,90 economizaria três reais e não mudaria
   decisão nenhuma. A margem volta pra faixa que o catálogo já projetava.

   ─── O excedente é folga, não punição ─────────────────────────
   R$0,12 por unidade que passar. Ele é mais caro por mensagem que qualquer
   pacote, mas isso NÃO significa que estourar seja ruim pra ela: quem passa
   pouco continua saindo mais barato ficando onde está. Um negócio de 250
   unidades paga R$18,90 no Padrão contra R$23,90 no Plus.

   O que ele NÃO pode ser é mais caro que o degrau de cima inteiro — e era
   isso que acontecia em volume alto antes do degrau Clínica: 3.640
   unidades saíam por R$377,70 (Alto volume + 2.440 de excedente) quando
   três pacotes de 1200 cobriam o mesmo por R$254,70. Cobrar mais caro do
   que a própria tabela permite é o tipo de conta que faz a dona desconfiar
   de todas as outras.

   Quem passa MUITO é que acaba no degrau de cima — e chega lá sozinho,
   porque a conta vira. Ninguém precisa empurrar upgrade nenhum, e é por
   isso que `pacoteRecomendado` decide por CUSTO e não por capacidade.

   A dona não pode se sentir obrigada a comprar pacote que não vai usar. Por
   isso a tela mostra quantos ATENDIMENTOS cabem, não quantas mensagens:
   "120 mensagens" não diz nada; "dá pros seus 40 atendimentos" diz tudo.
   ═══════════════════════════════════════════════════════════════ */

export type Pacote = {
  /** Identificador guardado em `businesses.avisos_pacote`. */
  id: 'essencial' | 'padrao' | 'plus' | 'pro' | 'alto' | 'clinica'
  nome: string
  /** Unidades inclusas por mês. Marketing consome 7 por mensagem. */
  unidades: number
  /** Mensalidade em reais. */
  preco: number
}

/* Ancorado no Padrão, decidido em 28/08 e recalibrado em 01/09 quando o
   custo real da Meta apareceu (R$0,0350, não R$0,05). Preço intacto,
   franquia +33%. Os tamanhos dobram a cada degrau e o preço POR MENSAGEM
   cai em todos:

     Essencial    80  R$   7,90   R$0,0988/msg   margem 65%
     Padrão      200  R$  12,90   R$0,0645/msg   margem 46%   ← âncora
     Plus        400  R$  23,90   R$0,0598/msg   margem 41%
     Pro         800  R$  44,90   R$0,0561/msg   margem 38%
     Alto       1600  R$  84,90   R$0,0531/msg   margem 34%
     Clínica    3200  R$ 159,90   R$0,0500/msg   margem 30%

   A margem cai junto, e tem que cair: o custo é fixo em R$0,0350 por
   mensagem, então desconto de volume sai do nosso lado. O piso é não
   chegar perto de R$0,035 — se a Meta mexer no preço, o degrau de cima é
   o primeiro a virar prejuízo. Hoje o Clínica para em R$0,05, que é
   exatamente o custo que a gente ACHAVA que tinha: a folga de segurança
   é o erro da estimativa antiga.

   Referência de mercado (varredura de 01/09, ~30 sistemas): iClinic cobra
   R$0,31/msg, Simples Dental R$0,30-0,35, HiDoctor R$0,2625, Fresha
   R$0,20-1,50. São 7,5x a 43x o custo da Meta. Nosso degrau mais caro é
   2,8x e o mais barato 1,4x. Não é para cobrir custo que a margem existe
   — é para cobrir o sistema inteiro que vem junto.

   Cada degrau só passa a compensar depois de uma faixa de excedente, o que
   é de propósito: 122 unidades pra sair do Essencial, 292 do Padrão, 575
   do Plus, 1134 do Pro, 2225 do Alto. Ninguém sobe antes de a conta mandar
   subir. */
export const PACOTES: Pacote[] = [
  { id: 'essencial', nome: 'Essencial', unidades: 80, preco: 7.9 },
  { id: 'padrao', nome: 'Padrão', unidades: 200, preco: 12.9 },
  { id: 'plus', nome: 'Plus', unidades: 400, preco: 23.9 },
  { id: 'pro', nome: 'Pro', unidades: 800, preco: 44.9 },
  { id: 'alto', nome: 'Alto volume', unidades: 1600, preco: 84.9 },
  /* Para clínica de volume alto (CAF projeta 3.640/mês). Existe porque sem
     ele o excedente ficava mais caro que comprar pacote — ver o bloco do
     excedente no topo do arquivo. */
  { id: 'clinica', nome: 'Clínica', unidades: 3200, preco: 159.9 },
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
 * acadêmica. Um negócio de 250 unidades/mês cabe "melhor" no Plus (400,
 * R$23,90), mas o Padrão (200, R$12,90) com 50 de excedente sai R$18,90:
 * cinco reais mais barato. Recomendar por capacidade seria empurrar pacote
 * que ela não usa, que é a coisa que faz a dona desconfiar da conta inteira.
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
