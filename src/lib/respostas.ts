/* ═══════════════════════════════════════════════════════════════
   CENTRAL DE RESPOSTAS — conteúdo que motor de busca e IA citam

   Eduardo 03/08/2026, depois de plugar JSON-LD/llms.txt/sitemap: "boa,
   então vamos fazer" — a parte que CRIA procura, não só remove atrito.

   A tese: 10 dos 26 cadastros vieram do ChatGPT sem nenhuma aquisição.
   Motor de resposta cita quem responde a pergunta de forma direta e
   verificável. As LPs vendem; estas páginas respondem. São coisas
   diferentes e a segunda é a que a IA copia.

   FORMATO OBRIGATÓRIO de cada resposta:
   1. `curta` — 2 a 4 frases que respondem sozinhas, sem depender do resto
      da página. É esse bloco que vira citação. Se não fizer sentido lido
      isolado, está errado.
   2. `blocos` — a profundidade, pra quem clicou e quer entender.
   3. `faqs` — vira FAQPage no schema.org.

   REGRAS DURAS:
   · Nenhuma afirmação sobre o AgendaPRO que o produto não faça hoje.
   · Preço nunca escrito na mão — vem de config/pricing.ts na página.
   · Número de mercado (taxa de maquininha) entra como FAIXA e declarado
     como faixa, nunca como fato exato: taxa é negociada, varia por
     credenciadora e por volume. Chutar número redondo aqui é mentir com
     cara de precisão.
   · Conteúdo tem que ser útil MESMO pra quem não vai assinar. É isso que
     faz a IA citar em vez de ignorar como publicidade.
   ═══════════════════════════════════════════════════════════════ */

export type Bloco = { h: string; p: string[] }

export type Resposta = {
  slug: string
  pergunta: string
  tituloSeo: string
  descricaoSeo: string
  curta: string[]
  blocos: Bloco[]
  faqs: { q: string; a: string }[]
  relacionadas: string[]
}

export const RESPOSTAS: Resposta[] = [
  /* ───────────────────────────────────────────────────────────── */
  {
    slug: 'quanto-custa-sistema-de-agendamento-para-salao',
    pergunta: 'Quanto custa um sistema de agendamento para salão de beleza?',
    tituloSeo: 'Quanto custa um sistema de agendamento para salão? (preços de 2026)',
    descricaoSeo:
      'Quanto custa um sistema de agendamento e gestão para salão, barbearia ou studio no Brasil: faixas de preço, o que muda de um plano pro outro e as cobranças que não aparecem na tabela.',
    curta: [
      'No Brasil, um sistema de agendamento e gestão para salão custa entre R$ 60 e R$ 500 por mês, dependendo de quantos profissionais usam e do que está incluso.',
      'Os sistemas mais conhecidos do mercado — Trinks, Booksy, Avec, Belezzia — trabalham na faixa mais alta, e boa parte deles cobra taxa de implantação e pede fidelidade de 12 meses.',
      'O AgendaPRO fica na ponta de baixo: R$ 67/mês para um profissional e R$ 97/mês para até cinco, sem setup e sem fidelidade.',
    ],
    blocos: [
      {
        h: 'O preço não é o que você paga por mês',
        p: [
          'Antes de comparar mensalidade, olhe três linhas que costumam ficar fora da tabela: taxa de implantação (cobrada uma vez, no começo, e frequentemente maior que a própria mensalidade), fidelidade contratual (12 meses é o padrão do setor — se sair antes, paga multa) e cobrança por profissional adicional.',
          'É a terceira que mais pega. Um sistema anunciado a R$ 89 pode virar R$ 269 quando você tem três profissionais, porque cada uma entra como assento pago.',
        ],
      },
      {
        h: 'O que precisa estar incluso',
        p: [
          'Agenda com página pública própria, para a cliente marcar sozinha sem baixar aplicativo — se ela precisa instalar algo, metade não marca.',
          'Controle de caixa ligado ao atendimento. Agenda que não vira dinheiro registrado deixa você conferindo comanda no papel do mesmo jeito.',
          'Comissão calculada automaticamente. É a conta que mais consome tempo do dono no fim do mês e a que mais gera atrito com a equipe quando sai errada.',
          'Ficha de cliente com histórico. Sem isso você perde a informação que faz a cliente voltar: o que ela fez, quando, com quem e por quanto.',
        ],
      },
      {
        h: 'Quando vale pagar mais',
        p: [
          'Vale se o sistema resolve algo específico do seu jeito de trabalhar. Salão que atende sem hora marcada, clínica que precisa de anamnese assinada, studio onde cada profissional recebe direto da cliente — são operações que o sistema genérico não cobre, e aí o barato sai caro em retrabalho.',
          'Não vale pagar mais por quantidade de recurso que você não vai usar. A maioria dos negócios de beleza usa quatro coisas: agenda, caixa, comissão e ficha.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Existe sistema de agendamento gratuito para salão?',
        a: 'Existem versões gratuitas, mas quase sempre limitadas a agenda simples, com marca do fornecedor na sua página e sem controle financeiro. Funcionam para quem está começando sozinha. A partir do momento em que entra uma segunda pessoa e comissão a pagar, a planilha volta.',
      },
      {
        q: 'Vale a pena pagar taxa de implantação?',
        a: 'Só se o fornecedor for cadastrar seus serviços, horários e clientes por você e isso for trabalho real. Sistema que se configura em minutos não justifica taxa de entrada — é custo de aquisição repassado ao cliente.',
      },
      {
        q: 'Quanto tempo leva para começar a usar?',
        a: 'Um sistema pensado para o dono operar sozinho fica pronto no primeiro acesso: nome do negócio, serviços, horários e a página de agendamento já sai funcionando. Implantação de semanas costuma indicar sistema desenhado para empresa com equipe de TI.',
      },
    ],
    relacionadas: ['como-calcular-comissao-de-profissional', 'taxa-da-maquininha-quanto-desconta'],
  },

  /* ───────────────────────────────────────────────────────────── */
  {
    slug: 'como-calcular-comissao-de-profissional',
    pergunta: 'Como calcular a comissão de uma profissional de salão?',
    tituloSeo: 'Como calcular comissão de profissional de salão (com desconto e taxa)',
    descricaoSeo:
      'A conta certa da comissão em salão, barbearia e studio: por que ela sai sobre o valor líquido, como tratar cupom de desconto e taxa de maquininha, e o erro que faz o dono pagar comissão sobre dinheiro que não entrou.',
    curta: [
      'A comissão se calcula sobre o valor que efetivamente entrou no caixa, não sobre o preço de tabela do serviço.',
      'Se o serviço custa R$ 100, a cliente usou um cupom de R$ 20 e pagou no cartão com 3% de taxa, entraram R$ 77,60. Uma comissão de 40% é R$ 31,04 — e não R$ 40.',
      'Pagar sobre o preço cheio é o erro mais comum e mais caro: em um salão com movimento, a diferença passa de mil reais por mês.',
    ],
    blocos: [
      {
        h: 'A conta, passo a passo',
        p: [
          'Comece pelo preço do serviço. Subtraia o desconto que a cliente realmente teve — cupom, promoção, cortesia parcial. O que sobra é a receita bruta daquele atendimento.',
          'Dessa receita, tire a taxa de quem processou o pagamento: maquininha de cartão cobra percentual por bandeira e por tipo, e parcelado custa mais que à vista. PIX e dinheiro não têm essa linha.',
          'O que restou é o líquido. A comissão da profissional é o percentual dela sobre esse líquido.',
        ],
      },
      {
        h: 'Por que sobre o líquido e não sobre o bruto',
        p: [
          'O desconto é uma decisão do negócio para atrair ou reter a cliente, mas quem financia esse desconto é o caixa. Se a comissão sai sobre o preço cheio, o dono banca o cupom sozinho e ainda paga comissão sobre um valor que nunca existiu.',
          'A taxa da maquininha segue a mesma lógica: é custo de receber, não é faturamento. Nenhum dos dois entrou na conta do negócio.',
          'A regra precisa estar combinada e escrita antes de começar. Comissão é o assunto que mais gera conflito em salão, e quase sempre porque a base de cálculo nunca foi dita em voz alta.',
        ],
      },
      {
        h: 'Percentuais praticados no setor',
        p: [
          'A faixa mais comum em salão e barbearia vai de 30% a 50%, variando com quem paga o material e quem trouxe a cliente. Profissional que usa produto do salão costuma ficar na parte de baixo; quem leva o próprio material, na de cima.',
          'Em modelo de aluguel de cadeira a lógica muda: a profissional paga valor fixo pelo espaço e fica com o atendimento inteiro. Não é comissão, é locação — e a contabilidade é outra.',
        ],
      },
      {
        h: 'O que o AgendaPRO faz nessa conta',
        p: [
          'O percentual é cadastrado uma vez por profissional. A cada atendimento pago, o cálculo sai sozinho sobre o líquido: cupom abatido e taxa da maquininha descontada, com o parcelamento considerado.',
          'Cada profissional acompanha pelo celular o que já recebeu e o que tem a receber, vendo só a própria comissão — nunca o faturamento do negócio.',
          'Na hora de pagar, o fechamento sai por período e fica registrado, com o histórico de todos os pagamentos anteriores.',
        ],
      },
    ],
    faqs: [
      {
        q: 'A comissão é sobre o valor com ou sem desconto?',
        a: 'Sobre o valor com o desconto já aplicado. O cupom reduz o que entrou no caixa, então reduz proporcionalmente a base da comissão. Calcular sobre o preço de tabela faz o negócio pagar comissão sobre dinheiro que não recebeu.',
      },
      {
        q: 'Desconta a taxa do cartão antes de calcular a comissão?',
        a: 'A prática mais usada é sim, descontar. A taxa é custo de receber e não é faturamento. O importante é que a regra esteja combinada com a equipe desde o começo, porque as duas formas existem no mercado.',
      },
      {
        q: 'Qual percentual de comissão é justo?',
        a: 'De 30% a 50% cobre a maioria dos casos em salão e barbearia. O que define a posição dentro da faixa é quem paga o material, quem atraiu a cliente e se a profissional tem carteira própria.',
      },
    ],
    relacionadas: ['taxa-da-maquininha-quanto-desconta', 'agenda-para-salao-com-varias-profissionais'],
  },

  /* ───────────────────────────────────────────────────────────── */
  {
    slug: 'agenda-para-salao-com-varias-profissionais',
    pergunta: 'Como organizar a agenda de um salão com várias profissionais?',
    tituloSeo: 'Como organizar a agenda de um salão com várias profissionais',
    descricaoSeo:
      'Como dividir a agenda entre profissionais sem conflito de horário, o que cada uma deve poder ver e fazer, e quando faz sentido ter uma recepcionista com acesso próprio.',
    curta: [
      'Cada profissional precisa da própria coluna na agenda, com os próprios horários de trabalho e o próprio login.',
      'A decisão que organiza o resto é de permissão, não de tela: quem pode marcar, quem enxerga a agenda das colegas e quem pode cancelar um atendimento já pago.',
      'Sem isso, tudo passa pelo dono — que vira gargalo e responde WhatsApp durante o próprio atendimento.',
    ],
    blocos: [
      {
        h: 'Três decisões antes de escolher o sistema',
        p: [
          'Quem marca. Se só o dono ou a recepção marcam, a equipe fica dependente e o dono não sai de perto do telefone. Se cada uma marca, resolve na hora — mas precisa de regra clara.',
          'Quem vê o quê. Transparência total (todas veem a agenda de todas) ajuda a equipe a encaixar cliente e cobrir horário vago. Em alguns negócios, porém, agenda cheia de uma e vazia de outra vira atrito.',
          'Quem cancela. É a permissão mais sensível. Cancelamento de atendimento já pago mexe no caixa e na comissão, e deve ficar com quem responde pelo negócio.',
        ],
      },
      {
        h: 'O erro que mais quebra agenda compartilhada',
        p: [
          'Horário duplicado. Duas pessoas marcando ao mesmo tempo, em telas diferentes, na mesma profissional. Só se resolve no sistema — que precisa bloquear o conflito no momento de salvar, não avisar depois.',
          'O segundo erro é a profissional não conseguir bloquear a própria agenda. Almoço, folga, curso, médico: se ela não bloqueia sozinha, a cliente marca em cima e alguém vai ter que desmarcar.',
        ],
      },
      {
        h: 'Quando entra uma recepcionista',
        p: [
          'A partir de três ou quatro profissionais atendendo ao mesmo tempo, alguém precisa cuidar do fluxo — receber, marcar o retorno, fechar a conta.',
          'Essa pessoa precisa de acesso próprio, com uma tela que permita marcar para toda a equipe e fechar caixa, sem enxergar o faturamento do negócio nem as comissões individuais. Dar a senha do dono para a recepção é o atalho que todo mundo faz e que ninguém deveria fazer.',
        ],
      },
      {
        h: 'Como isso funciona no AgendaPRO',
        p: [
          'No plano Equipe são até cinco profissionais, cada uma com login próprio no celular, mais uma recepcionista com tela dedicada.',
          'As três permissões são chaves que o dono liga e desliga por negócio: marcar na própria agenda, ver a agenda das colegas, marcar para as colegas. Cancelamento de atendimento já pago fica sempre com o dono.',
          'Cada uma bloqueia a própria agenda — almoço, folga semanal, dia inteiro ou período de férias — e a grade já nasce com o horário de trabalho padrão preenchido.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Cada profissional precisa de um login?',
        a: 'Precisa, se ela vai marcar ou receber. Conta compartilhada torna impossível saber quem marcou, quem cancelou e quem recebeu — e é justamente esse rastro que resolve discussão sobre comissão no fim do mês.',
      },
      {
        q: 'As profissionais devem ver a agenda umas das outras?',
        a: 'Depende do clima da equipe. Ver ajuda a encaixar cliente e cobrir horário vago; em equipe com atrito, pode virar comparação. Por isso deve ser uma configuração que o dono liga e desliga, não uma regra fixa do sistema.',
      },
      {
        q: 'Como evitar que duas pessoas marquem no mesmo horário?',
        a: 'O sistema precisa validar o conflito no momento de salvar, comparando com os atendimentos já marcados e com os bloqueios daquela profissional. Aviso depois de salvo não resolve: a cliente já foi confirmada.',
      },
    ],
    relacionadas: ['como-calcular-comissao-de-profissional', 'quanto-custa-sistema-de-agendamento-para-salao'],
  },

  /* ───────────────────────────────────────────────────────────── */
  {
    slug: 'taxa-da-maquininha-quanto-desconta',
    pergunta: 'Quanto a maquininha desconta do faturamento do salão?',
    tituloSeo: 'Quanto a maquininha desconta do faturamento do salão',
    descricaoSeo:
      'Como a taxa do cartão come o faturamento de um salão ou barbearia, por que o parcelado custa mais caro e como registrar o valor líquido para não errar a comissão e o lucro.',
    curta: [
      'A taxa varia por credenciadora, por bandeira e por tipo de transação, e é negociável conforme o volume — por isso não existe número único.',
      'Como ordem de grandeza no varejo brasileiro, débito costuma ficar abaixo de 2%, crédito à vista entre 3% e 4%, e parcelado sobe conforme o número de parcelas.',
      'O que importa para a gestão não é decorar a taxa: é registrar o líquido de cada recebimento, porque é sobre ele que saem a comissão e o lucro real.',
    ],
    blocos: [
      {
        h: 'Por que o parcelado custa mais',
        p: [
          'Quando a cliente parcela, a credenciadora antecipa ao lojista um dinheiro que só receberá ao longo dos meses. Essa antecipação tem custo, e ele entra na taxa — quanto mais parcelas, maior.',
          'É por isso que oferecer parcelamento sem repassar nada muda a conta do serviço. Em ticket alto, como progressiva ou pacote de sessões, a diferença entre à vista e parcelado pesa mais que o desconto que você daria à vista.',
        ],
      },
      {
        h: 'O erro de contar o bruto',
        p: [
          'Anotar R$ 200 quando entraram R$ 193 parece detalhe. Em cem atendimentos por mês, viram setecentos reais de faturamento que nunca existiu — e o negócio toma decisão de preço, de contratação e de compra em cima de um número inflado.',
          'Pior: se a comissão é calculada sobre esse bruto, o erro é pago duas vezes. O dono perde a taxa e ainda paga comissão sobre ela.',
        ],
      },
      {
        h: 'Como reduzir o que a taxa come',
        p: [
          'Incentive PIX. Não tem taxa de credenciadora, cai na hora e é o meio que mais cresceu em serviço no Brasil. Um desconto pequeno à vista costuma sair mais barato que a taxa do crédito.',
          'Negocie a taxa. Credenciadora trabalha com tabela por volume, e a maioria dos donos aceita a primeira proposta e nunca mais revisa. Seis meses de histórico já dão argumento.',
          'Confira o extrato contra os atendimentos. Divergência entre o que a maquininha depositou e o que foi registrado é comum, e só aparece se alguém compara.',
        ],
      },
      {
        h: 'Como o AgendaPRO trata isso',
        p: [
          'Você cadastra as suas maquininhas com o nome que usa no dia a dia — Stone, Point Pro, o que for. No recebimento, informa bandeira, tipo e parcelamento.',
          'A taxa fica gravada junto do atendimento, e todas as telas de dinheiro passam a mostrar o líquido: o que entrou de verdade, não o preço de tabela.',
          'A comissão da profissional sai desse líquido automaticamente, sem ninguém precisar refazer a conta.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Posso repassar a taxa do cartão para a cliente?',
        a: 'A cobrança de preço diferente por meio de pagamento é permitida no Brasil desde 2017, desde que informada de forma clara e visível antes do pagamento. O caminho mais usado no setor é o inverso: manter o preço e oferecer desconto no PIX ou dinheiro.',
      },
      {
        q: 'PIX tem taxa para o salão?',
        a: 'Para pessoa física não costuma ter. Para conta jurídica, depende do banco: alguns cobram por recebimento, outros isentam até certo volume. Vale conferir na sua conta antes de assumir que é gratuito.',
      },
      {
        q: 'Vale a pena antecipar o recebimento do cartão?',
        a: 'Só se o dinheiro tiver destino definido e urgente. Antecipação é empréstimo com o seu próprio recebível, e a taxa costuma ser alta. Usada por hábito, ela vira desconto permanente sobre o faturamento.',
      },
    ],
    relacionadas: ['como-calcular-comissao-de-profissional', 'quanto-custa-sistema-de-agendamento-para-salao'],
  },
]

export function getResposta(slug: string) {
  return RESPOSTAS.find((r) => r.slug === slug)
}
