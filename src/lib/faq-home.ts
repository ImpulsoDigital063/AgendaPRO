/* ═══════════════════════════════════════════════════════════════
   FAQ da home — em módulo neutro, NÃO dentro do FAQ.tsx

   O FAQ.tsx é 'use client'. Importar um VALOR (não componente) de módulo
   client dentro de server component devolve um proxy de referência, não o
   dado: quebrou a home com 500 ("a.map is not a function") no momento em
   que a page passou a gerar o JSON-LD a partir dessas perguntas.

   Por isso o array vive aqui: lido pelo componente na tela E pelo
   schema.org FAQPage no servidor, uma fonte só pros dois.
   ═══════════════════════════════════════════════════════════════ */

import type { FAQItem } from '@/components/FAQ'

export const DEFAULT_FAQS: FAQItem[] = [
  {
    q: 'Meu cliente precisa baixar algum aplicativo?',
    a: 'Não. O cliente acessa pelo link direto no celular — abre no navegador, escolhe o horário e confirma. Sem cadastro, sem download, sem atrito.',
  },
  {
    q: 'É difícil de configurar?',
    a: 'Não precisa de técnico. Você preenche o nome do negócio, adiciona os serviços e horários, e em menos de 5 minutos já tem uma página pronta. A maioria dos clientes configura tudo no primeiro acesso.',
  },
  {
    q: 'Como meus clientes encontram a página de agendamento?',
    a: 'Você recebe um link personalizado (agendapro.app/seu-negocio) e cola onde quiser: bio do Instagram, Google Meu Negócio, status do WhatsApp ou manda direto nas conversas.',
  },
  {
    q: 'Como funciona o lembrete automático?',
    a: 'Na véspera do agendamento, o sistema manda um lembrete automático por e-mail pro cliente. Ele confirma ou avisa que não vem, e você reorganiza a agenda antes de perder o horário. Automático — sem você precisar fazer nada.',
  },
  {
    q: 'Tenho mais de um profissional. Funciona?',
    a: 'Sim. No plano Equipe, cada profissional tem agenda e horários independentes, e entra com o login dela pelo celular. Você decide o que cada uma pode fazer: marcar só na própria agenda, marcar também pras colegas, receber o pagamento da cliente. A comissão é calculada sozinha e cada uma vê só a dela. O Equipe (R$97) inclui até 5 profissionais mais 1 recepcionista com tela própria — ela marca pra todo mundo e fecha caixa sem enxergar seu faturamento. Venda de produto e controle de estoque também entram só nesse plano.',
  },
  {
    q: 'Vocês adaptam o sistema pro meu negócio?',
    a: 'Sim, e é o que mais fazemos. Quando um negócio entra, a gente estuda como ele funciona de verdade e ajusta o sistema pra aquilo — já mudamos o fluxo pra quem atende no balcão sem agendamento prévio, criamos acesso próprio pras profissionais num studio sem recepção e integramos ficha de cliente pra quem trabalhava com papel. Você fala direto com quem escreve o código, não com atendimento de primeiro nível.',
  },
  {
    q: 'O sistema controla comissão e pagamento?',
    a: 'Controla. Você recebe em PIX, dinheiro ou cartão — parcelado, com a taxa da maquininha por bandeira já descontada. A comissão de cada profissional sai automática sobre o valor líquido: se a cliente usou cupom, a comissão cai proporcional. E você acompanha despesas, lucro real e projeção do mês.',
  },
  {
    q: 'Como funciona a garantia?',
    a: 'São 7 dias grátis, sem cartão. Você cadastra, usa com cliente de verdade e só decide depois. Se continuar, escolhe o plano e paga — e mesmo aí tem 7 dias de garantia: se não fizer sentido, devolvo sem burocracia.',
  },
  {
    q: 'Quanto custa?',
    a: 'Plano Solo (admin + 1 colaborador): R$67/mês. Plano Equipe (até 5 profissionais): R$97/mês. Sem setup pra ninguém, preço fixo, sem fidelidade. Garantia de 7 dias — se não fizer sentido pro seu negócio, devolvo sem burocracia. Concorrentes cobram R$200-500/mês com fidelidade anual.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. Sem multa, sem fidelidade, sem contrato anual. Se decidir cancelar, é pelo painel ou pelo WhatsApp.',
  },
]
