/**
 * Tour "Conheça seu sistema" · roteiro que mostra o AgendaPRO inteiro.
 *
 * Nasceu em 13/09/2026 do diagnóstico dos trials que não ficaram: o
 * onboarding antigo só levava pro link público e dava por concluído com um
 * agendamento de teste. Quem paga usa o painel no balcão (Rosy e Viva
 * Cacheada marcaram 100% pelo painel de 24/08 a 13/09). Então o roteiro
 * segue o dia do salão: monta a casa, atende no balcão, fecha o dia, faz a
 * cliente voltar, e só no fim fala do link.
 *
 * Cada PARADA é uma tela com 1 a 3 balões. O último balão da parada leva pra
 * próxima pela URL (?tour=<id>), então o tour atravessa telas sem estado
 * global: recarregar a página mantém a parada.
 *
 * Quem vê: os negócios em TOUR_SISTEMA_LIBERADOS e todo negócio cadastrado a
 * partir de TOUR_SISTEMA_CADASTRO_DESDE (decisão do Eduardo em 14/09/2026:
 * Marcela + novos cadastros; clientes antigos não veem).
 */
import { termoPessoa } from '@/lib/segmento'

/** Liberados à mão, fora da regra de data: Studio Marcela Hair (conta de
    teste do Eduardo) e Gustavo Souza Hair (trial de 09/09, pedido 14/09). */
export const TOUR_SISTEMA_LIBERADOS = [
  'cd3c7f5a-e657-4ddb-96c7-0a4ff45b63eb',
  '5202c5b6-5377-46ee-b48d-9aa0fbf405e8',
]

/** Cadastros a partir daqui veem o tour. 13/09 00:00 BRT pega a AvA beauty. */
export const TOUR_SISTEMA_CADASTRO_DESDE = '2026-09-13T03:00:00Z'

export function tourSistemaLiberado(
  business: { id?: string | null; created_at?: string | null } | null | undefined,
): boolean {
  if (!business?.id) return false
  if (TOUR_SISTEMA_LIBERADOS.includes(business.id)) return true
  return !!business.created_at && business.created_at >= TOUR_SISTEMA_CADASTRO_DESDE
}

/** localStorage: card dispensado no X ou tour concluído. Só esconde o card;
    o tour em si continua abrindo por link. */
export const TOUR_SISTEMA_CARD_OCULTO = 'ap_tour_sistema_card_oculto'

export type BalaoTour = { alvo: string; titulo: string; corpo: string; posicao?: 'auto' | 'rodape' }

export type ParadaTour = {
  id: string
  /** Parada sem balão: a própria tela se demonstra sozinha (modal em modo demo). */
  demo?: boolean
  /** Encerramento: abre o card de conclusão (TourFinal) em vez de balões. */
  final?: boolean
  parte: number
  nomeParte: string
  /** Rota da tela, com ?tab= quando for aba de Configurações. */
  href: string
  baloes: BalaoTour[]
  /** Texto do botão que leva pra próxima parada. */
  seguir: string
  /** Na última parada: o botão final abre este link (nova aba) e encerra. */
  seguirLink?: string
}

export const TOTAL_PARTES = 6

/** WhatsApp do atendimento (o mesmo do PlanoCard e da tela de bloqueio). */
const WHATSAPP_SUPORTE = '5563992920080'

/** O modal de agendar em modo demo não conhece o roteiro: ao terminar, manda
    pra esta parada. */
export const PARADA_DEPOIS_DA_DEMO_AGENDAR = 'balcao-venda'

export function montarRoteiro(opts: { categoria: string | null; vendeProduto: boolean }): ParadaTour[] {
  const t = termoPessoa(opts.categoria)
  const paradas: ParadaTour[] = [
    {
      id: 'abertura',
      parte: 0,
      nomeParte: 'Boas-vindas',
      href: '/admin/inicio',
      seguir: 'Começar',
      baloes: [
        {
          alvo: '',
          titulo: 'Seu negócio inteiro num lugar só',
          corpo: `Em ${TOTAL_PARTES} partes rápidas você vai ver tudo que o AgendaPRO faz: montar o negócio, atender no balcão, fechar o caixa do dia e fazer ${t.art} ${t.s} voltar. Dá pra parar quando quiser e continuar depois.`,
        },
      ],
    },

    /* ── Parte 1 · Monte seu negócio ── */
    {
      id: 'servicos',
      parte: 1,
      nomeParte: 'Monte seu negócio',
      href: '/admin/configuracoes?tab=servicos',
      seguir: 'Próximo: profissionais',
      baloes: [
        {
          alvo: 'adicionar-servico',
          titulo: 'Seus serviços',
          corpo: 'Cadastre aqui cada serviço com preço e duração. É com eles que a agenda calcula o horário, o caixa soma o valor e a comissão sai certa.',
        },
      ],
    },
    {
      id: 'equipe',
      parte: 1,
      nomeParte: 'Monte seu negócio',
      href: '/admin/configuracoes?tab=profissionais',
      seguir: 'Próximo: horários',
      baloes: [
        {
          alvo: 'tab-profissionais',
          titulo: 'Seus profissionais',
          corpo: 'Cada profissional tem a própria agenda, o próprio acesso pelo celular e a comissão calculada sozinha. Você decide o que cada um pode ver e fazer.',
        },
      ],
    },
    {
      id: 'horarios',
      parte: 1,
      nomeParte: 'Monte seu negócio',
      href: '/admin/configuracoes?tab=horarios',
      seguir: `Próximo: ${t.p}`,
      baloes: [
        {
          alvo: 'tab-horarios',
          titulo: 'Horários de atendimento',
          corpo: 'Cada profissional tem os próprios dias e horários. Escolha a pessoa nas abas e defina quando ela atende: a agenda só oferece horário livre dentro deles.',
        },
      ],
    },
    {
      id: 'clientes',
      parte: 1,
      nomeParte: 'Monte seu negócio',
      href: '/admin/clientes',
      seguir: 'Próximo: o balcão',
      baloes: [
        {
          alvo: 'novo-cliente',
          titulo: `${t.possP[0].toUpperCase()}${t.possP.slice(1)} ${t.p}`,
          corpo: `Cadastre ${t.possP} ${t.p} aqui. Cada ficha guarda telefone, histórico de atendimentos, quanto já gastou e as anotações.`,
        },
        {
          alvo: 'importar-clientes',
          titulo: 'Já tem uma lista?',
          corpo: `${t.possP[0].toUpperCase()}${t.possP.slice(1)} ${t.p} estão numa planilha ou em outro sistema? Toque em Importar e traga tudo de uma vez. É o passo que mais adianta o seu começo.`,
        },
      ],
    },

    /* ── Parte 2 · Seu dia no balcão ── */
    {
      id: 'balcao',
      parte: 2,
      nomeParte: 'Seu dia no balcão',
      href: '/admin',
      seguir: 'Ver um exemplo',
      baloes: [
        {
          alvo: 'agendar',
          titulo: 'Marque pelo painel',
          corpo: `${t.art.toUpperCase()} ${t.s} ligou ou mandou mensagem? É por aqui, em Agendar. Tocar num horário vazio da agenda também abre. Vou te mostrar um exemplo sendo feito.`,
        },
      ],
    },
    {
      id: 'balcao-demo',
      demo: true,
      parte: 2,
      nomeParte: 'Seu dia no balcão',
      href: '/admin?agendar=1&demo=1',
      seguir: '',
      baloes: [],
    },
    {
      id: 'balcao-venda',
      parte: 2,
      nomeParte: 'Seu dia no balcão',
      href: '/admin',
      seguir: opts.vendeProduto ? 'Próximo: produtos' : 'Próximo: o caixa',
      baloes: [
        {
          alvo: 'registrar-venda',
          titulo: 'Atendimento na hora',
          corpo: `Chegou ${t.s} sem horário marcado? Registrar venda atende e recebe na hora, sem passar pela agenda.`,
        },
      ],
    },
  ]

  if (opts.vendeProduto) {
    paradas.push({
      id: 'produtos',
      parte: 2,
      nomeParte: 'Seu dia no balcão',
      href: '/admin/produtos',
      seguir: 'Próximo: o caixa',
      baloes: [
        {
          alvo: 'novo-produto',
          titulo: 'Venda de produtos',
          corpo: 'Cadastre os produtos que você revende com preço e estoque. A venda pode entrar junto com o atendimento, e o estoque baixa sozinho.',
        },
      ],
    })
  }

  paradas.push(
    /* ── Parte 3 · Feche o dia ── */
    {
      id: 'caixa',
      parte: 3,
      nomeParte: 'Feche o dia',
      href: '/admin/caixa',
      seguir: 'Próximo: financeiro',
      baloes: [
        {
          alvo: 'cabecalho',
          posicao: 'rodape',
          titulo: 'Caixa do dia',
          corpo: 'Abra o caixa com o fundo de troco, registre sangria e suprimento, e no fim do dia confira dinheiro, cartão e pix. O sistema mostra se sobrou ou faltou.',
        },
      ],
    },
    {
      id: 'financeiro',
      parte: 3,
      nomeParte: 'Feche o dia',
      href: '/admin/financeiro',
      seguir: 'Próximo: fluxo',
      baloes: [
        {
          alvo: 'cabecalho',
          posicao: 'rodape',
          titulo: 'Relatório financeiro',
          corpo: 'Quanto entrou, quanto falta receber, as despesas e o resultado do período. Tudo que foi lançado no balcão aparece aqui, já com desconto de cupom abatido.',
        },
      ],
    },
    {
      id: 'fluxo',
      parte: 3,
      nomeParte: 'Feche o dia',
      href: '/admin/financeiro/fluxo-caixa',
      seguir: 'Próximo: comissão',
      baloes: [
        {
          alvo: 'cabecalho',
          posicao: 'rodape',
          titulo: 'Fluxo de caixa',
          corpo: 'Todas as entradas e saídas em ordem, com o saldo de cada período. É onde você enxerga se o dinheiro do mês fecha antes de ele acabar.',
        },
      ],
    },
    {
      id: 'comissao',
      parte: 3,
      nomeParte: 'Feche o dia',
      href: '/admin/financeiro/remuneracoes',
      seguir: 'Próximo: sinal',
      baloes: [
        {
          alvo: 'regra-comissao',
          titulo: 'Comissão da equipe',
          corpo: 'A comissão de cada profissional sai calculada sozinha sobre o faturamento, com a regra que você define pra cada um. Toque na linha pra ver o detalhe e registrar o pagamento.',
        },
      ],
    },

    {
      id: 'sinal',
      parte: 3,
      nomeParte: 'Feche o dia',
      href: '/admin/financeiro/sinal',
      seguir: 'Próximo: fichas',
      baloes: [
        {
          alvo: 'cabecalho',
          posicao: 'rodape',
          titulo: 'Sinal: chega de furo na agenda',
          corpo: `Peça um sinal por PIX pra confirmar o horário. Com o horário pago antes, o furo diminui.`,
        },
        {
          alvo: 'cabecalho',
          posicao: 'rodape',
          titulo: 'O dinheiro cai direto na sua conta',
          corpo: 'O PIX vai pra sua chave, sem taxa e sem intermediário: o sistema só monta o código. Você liga aqui mesmo, com a sua chave PIX, e escolhe a porcentagem do sinal, o prazo pra pagar e o que acontece se desmarcar.',
        },
        {
          alvo: 'cabecalho',
          posicao: 'rodape',
          titulo: 'Como funciona no dia a dia',
          corpo: `Pelo link de agendamento, o sinal é pedido sempre. Quando você marca pelo painel, cobra só se escolher. O que acontece com o valor quando ${t.art} ${t.s} desmarca segue a regra que você definiu. Nesta tela você acompanha o que foi pago, o que está pendente e os créditos.`,
        },
      ],
    },

    /* ── Parte 4 · Faça a cliente voltar ── */
    {
      id: 'fichas',
      parte: 4,
      nomeParte: `Faça ${t.art} ${t.s} voltar`,
      href: '/admin/configuracoes?tab=fichas-modelo',
      seguir: 'Próximo: fidelidade',
      baloes: [
        {
          alvo: 'nova-ficha',
          titulo: 'Fichas modelo (anamnese)',
          corpo: `Modelos de ficha prontos pro seu segmento. Preenchida uma vez, ela fica guardada no cadastro ${t.de} pra você consultar antes de cada atendimento.`,
        },
      ],
    },
    {
      id: 'fidelidade',
      parte: 4,
      nomeParte: `Faça ${t.art} ${t.s} voltar`,
      href: '/admin/configuracoes?tab=fidelidade',
      seguir: 'Próximo: sumidos',
      baloes: [
        {
          alvo: 'dica-fidelidade|tab-fidelidade',
          titulo: 'Fidelidade e cupons',
          corpo: `Dê pontos por atendimento e troque por recompensas: o passo a passo desta tela mostra como configurar. No menu, Cupons cria desconto pra oferecer quando quiser.`,
        },
      ],
    },

    {
      id: 'sumidos',
      parte: 4,
      nomeParte: `Faça ${t.art} ${t.s} voltar`,
      href: '/admin/sumidos',
      seguir: 'Próximo: avisos',
      baloes: [
        {
          alvo: 'faixa',
          titulo: 'Quem parou de voltar',
          corpo: `Escolha o prazo (15, 20, 30 dias) e veja ${t.possP} ${t.p} que sumiram. Dá pra chamar no WhatsApp com ou sem cupom de desconto.`,
        },
      ],
    },
    {
      id: 'avisos',
      parte: 4,
      nomeParte: `Faça ${t.art} ${t.s} voltar`,
      href: '/admin/whatsapp',
      seguir: 'Próximo: QR code',
      baloes: [
        {
          alvo: 'avisos-estado|avisos-lista|avisos-beta',
          titulo: 'Avisos automáticos no WhatsApp',
          corpo: `Marcou o horário, ${t.art} ${t.s} recebe a confirmação. Na véspera, o lembrete. Tudo sai sozinho, sem você digitar uma mensagem. Se o horário tem sinal, no lugar da confirmação sai a cobrança com o PIX.`,
        },
        {
          alvo: 'avisos-lista|avisos-estado|avisos-beta',
          titulo: 'Por que vale a pena',
          corpo: `Menos falta e menos tempo no celular confirmando um por um. As mensagens saem do número oficial da Meta, não do seu, então o seu WhatsApp não corre risco de bloqueio. E você pode escrever cada aviso do seu jeito.`,
        },
        {
          alvo: 'avisos-conta|avisos-estado|avisos-beta',
          titulo: 'Funciona com pacote mensal',
          corpo: 'Pra ligar os avisos, você escolhe um pacote de mensagens por mês, a partir de R$ 7,90. A tela mostra quantos atendimentos cabem em cada pacote e soma quanto os avisos ligados gastam, então você sabe antes de pagar. Está em beta e sendo liberado aos poucos.',
        },
      ],
    },

    /* ── Parte 5 · Deixe agendar sozinha ── */
    {
      id: 'link',
      parte: 5,
      nomeParte: 'Agendamento online',
      href: '/admin/configuracoes?tab=qr-code',
      seguir: 'Próximo: seu plano',
      baloes: [
        {
          alvo: 'tab-qr-code',
          titulo: `${t.art.toUpperCase()} ${t.s} também pode agendar sozinh${t.art}`,
          corpo: 'Além de marcar pelo painel, você tem uma página de agendamento: é o link e o QR code desta tela. Coloque na bio do Instagram ou mande no WhatsApp, e o horário cai direto na agenda.',
        },
      ],
    },
  )

  paradas.push(
    /* ── Parte 6 · Seu plano ── */
    {
      id: 'plano',
      parte: 6,
      nomeParte: 'Seu plano',
      href: '/admin/configuracoes?tab=plano',
      seguir: 'Concluir',
      baloes: [
        {
          alvo: 'tab-plano',
          titulo: 'Qual plano serve pra você',
          corpo: 'Solo, R$ 67 por mês: até 2 profissionais. Equipe, R$ 97 por mês: até 5 profissionais e 1 acesso de recepção. Precisa de mais acessos? Chame o suporte que a gente aumenta de acordo com a sua demanda.',
        },
        {
          alvo: 'tab-plano',
          titulo: 'Como contratar',
          corpo: 'Aqui você escolhe o plano e a forma de pagar: PIX mensal, semestral ou anual, ou cartão com cobrança automática. Não existe cobrança antes do fim do teste.',
        },
      ],
    },
    {
      /* Fecha na Início, não em cima da tela de Plano: os planos escurecidos
         atrás do card pareciam cobrança (teste 14/09). */
      id: 'fim',
      final: true,
      parte: 6,
      nomeParte: 'Seu plano',
      href: '/admin/inicio',
      seguir: '',
      seguirLink: `https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent(
        'Oi! Terminei o tour do AgendaPRO e quero marcar a call de alinhamento e personalização.',
      )}`,
      baloes: [],
    },
  )

  return paradas
}

/** Id da parada lido da URL. Tira pontuação colada: link copiado de mensagem
    chega como "?tour=abertura." e não abria nada (teste 14/09). */
export function limparIdParada(bruto: string | null): string | null {
  const id = (bruto ?? '').toLowerCase().replace(/[^a-z-]/g, '')
  return id || null
}

/** Junta ?tour=<id> no href, respeitando o ?tab= que já possa existir. */
export function hrefDaParada(p: ParadaTour): string {
  return `${p.href}${p.href.includes('?') ? '&' : '?'}tour=${p.id}`
}
