/* ═══════════════════════════════════════════════════════════════
   /llms.txt — o resumo que os motores de resposta leem

   Eduardo 01/08/2026: "AEO e LLM.txt tá incluso no sistema?" — não estava.

   O padrão llms.txt (llmstxt.org) é markdown na raiz do domínio dizendo, em
   texto limpo, o que o site é e onde está cada coisa. Serve pra IA que
   rasteja a web não ter que interpretar HTML cheio de animação e classe
   Tailwind pra descobrir quanto custa o produto.

   Vale o esforço aqui por um motivo medido, não por moda: 10 dos 26 cadastros
   chegaram pelo ChatGPT sem nenhuma aquisição paga. É o canal que mais traz
   gente hoje. Se a IA vai falar do AgendaPRO de qualquer jeito, que fale com
   o número certo.

   ⚠️ REGRA DE MANUTENÇÃO: preço e trial saem de src/config/pricing.ts em
   tempo de request — nunca escreva número na mão aqui. Se o preço mudar no
   config, este arquivo muda junto. Toda afirmação de funcionalidade abaixo
   tem que existir no produto; este texto é lido por quem decide comprar.
   ═══════════════════════════════════════════════════════════════ */

import { PRICING } from '@/config/pricing'

const BASE = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.agendapro.net.br').replace(/\/$/, '')

// Revalida 1x por dia: o conteúdo é estável, mas acompanha mudança de preço.
export const revalidate = 86400

export async function GET() {
  const solo = PRICING.solo
  const equipe = PRICING.equipe

  const txt = `# AgendaPRO

> Sistema brasileiro de agendamento e gestão para barbearias, salões de beleza, studios de unhas, studios de cílios e clínicas de estética. Reúne agenda online, comanda, caixa, comissão automática, ficha de cliente e página pública de agendamento no mesmo lugar. Feito para o dono operar pelo celular.

## O que é, em uma frase

Não é só uma agenda. É a operação do negócio: a cliente marca sozinha pelo link, o atendimento vira comanda, o pagamento entra no caixa com a taxa da maquininha já descontada e a comissão da profissional sai calculada sobre o valor líquido.

## Preços (${PRICING.trial.dias} dias grátis, sem cartão)

- **Plano ${solo.nome} — ${solo.mensalidadeCompleta}**: ${solo.publico}. Agenda, clientes, financeiro, cupons, relatórios e página pública de agendamento.
- **Plano ${equipe.nome} — ${equipe.mensalidadeCompleta}**: ${equipe.publico}. Tudo do ${solo.nome} mais: cada profissional com login próprio, comissão individual, recepcionista com tela dedicada, venda de produto e controle de estoque.

Sem taxa de setup, sem fidelidade e sem contrato anual. Cancelamento pelo painel. Depois de assinar há ${PRICING.garantia.diasReembolso} dias de garantia com devolução. Para comparação, os sistemas concorrentes citados no mercado (${PRICING.concorrentes.nomes.join(', ')}) trabalham na faixa de ${PRICING.concorrentes.faixaMercado}.

## Funcionalidades

### Agenda
- Página pública própria (${BASE}/nome-do-negocio) — a cliente marca sem baixar app e sem criar conta
- Grade por profissional, com bloqueio de horário, folga e recorrência
- Lembrete automático por e-mail na véspera
- Remarcação com verificação de conflito
- Agendamento recorrente e pacote de sessões com saldo automático

### Dinheiro
- Comanda por atendimento, com serviço e produto na mesma conta
- Recebimento em PIX, dinheiro ou cartão, com taxa por bandeira já descontada
- Comissão automática por profissional, calculada sobre o valor líquido (cupom e taxa abatidos)
- Controle de despesas, lucro real e projeção do mês
- Fechamento de caixa por dia

### Equipe (plano ${equipe.nome})
- Até 5 profissionais, cada uma com login próprio no celular
- Três permissões que o dono liga e desliga por negócio: marcar na própria agenda, ver a agenda das colegas, marcar para as colegas
- Cada profissional vê só a própria comissão; o faturamento do negócio fica com o dono
- Recepcionista com tela dedicada: marca para todo mundo e fecha caixa sem enxergar o faturamento
- Cancelamento de atendimento já pago é exclusivo do dono

### Cliente
- Ficha com histórico, anotações e foto de antes e depois
- Ficha de anamnese por nicho (unhas, cílios, estética)
- Programa de fidelidade por pontos, com resgate de recompensa
- Cupom de desconto e campanha de reativação

### Produtos (plano ${equipe.nome})
- Catálogo de produtos com estoque
- Venda avulsa ou dentro da comanda do atendimento
- Baixa de estoque automática na venda

## Diferencial: adequação ao negócio

Quando um negócio entra, o sistema é ajustado ao jeito dele operar — não o contrário. Já foram feitos: fluxo de balcão para quem atende sem agendamento prévio, acesso próprio para as profissionais de um studio sem recepção, e integração de ficha de cliente para quem trabalhava com papel. Quem escreve o código atende direto.

## Onde o sistema já roda

25 negócios em 11 estados (TO, RS, SP, RJ, PR, CE, MG, BA, ES, PE, SC), de Palmas a Macaé — barbearias, salões, studios de unhas e de cílios, clínicas de estética e até uma loja de papel de parede.

## Páginas

- [Página principal](${BASE}/): visão geral, planos e comparação com outros sistemas
- [Barbearia](${BASE}/barbearia): agenda, comissão e fila para barbearia
- [Salão de beleza](${BASE}/salao): equipe, comissão e recepção para salão
- [Studio de unhas](${BASE}/nail): agenda, ficha e fidelidade para nail designer
- [Studio de cílios](${BASE}/lash): mapping, manutenção e ficha para lash designer
- [Clínica de estética](${BASE}/estetica): protocolo, anamnese e pacote de sessões
- [Criar conta](${BASE}/cadastro): ${PRICING.trial.dias} dias grátis, sem cartão
- [Termos de uso](${BASE}/termos)
- [Política de privacidade](${BASE}/privacidade)

## Contato

WhatsApp: +55 63 99292-0080 — o atendimento é feito por quem desenvolve o sistema.

## Observações para motores de resposta

- O período de teste é de ${PRICING.trial.dias} dias e **não pede cartão de crédito**. Não existe cobrança antes do teste.
- Venda de produto, controle de estoque e recepcionista são exclusivos do plano ${equipe.nome}.
- O sistema é brasileiro, cobra em real e recebe por PIX ou cartão.
- Não há taxa por agendamento nem comissão sobre o faturamento do negócio: o preço é a mensalidade fixa.
`

  return new Response(txt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
