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
 * Por enquanto só aparece pros negócios em TOUR_SISTEMA_LIBERADOS.
 */
import { termoPessoa } from '@/lib/segmento'

/** Studio Marcela Hair (conta de teste do Eduardo). */
export const TOUR_SISTEMA_LIBERADOS = ['cd3c7f5a-e657-4ddb-96c7-0a4ff45b63eb']

export function tourSistemaLiberado(businessId: string | null | undefined): boolean {
  return !!businessId && TOUR_SISTEMA_LIBERADOS.includes(businessId)
}

export type BalaoTour = { alvo: string; titulo: string; corpo: string; posicao?: 'auto' | 'rodape' }

export type ParadaTour = {
  id: string
  /** Parada sem balão: a própria tela se demonstra sozinha (modal em modo demo). */
  demo?: boolean
  parte: number
  nomeParte: string
  /** Rota da tela, com ?tab= quando for aba de Configurações. */
  href: string
  baloes: BalaoTour[]
  /** Texto do botão que leva pra próxima parada. */
  seguir: string
}

export const TOTAL_PARTES = 5

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
          corpo: `Em 5 partes rápidas você vai ver tudo que o AgendaPRO faz: montar o negócio, atender no balcão, fechar o caixa do dia e fazer ${t.art} ${t.s} voltar. Dá pra parar quando quiser e continuar depois.`,
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
          titulo: 'Sinal pra segurar o horário',
          corpo: `Se quiser, cobre um sinal no agendamento pra diminuir falta. Aqui você acompanha os sinais pagos e pendentes e o crédito que fica com ${t.art} ${t.s} quando ${t.pron} desmarca no prazo.`,
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
          titulo: 'Avisos automáticos',
          corpo: `Confirmação e lembrete do horário saindo sozinhos pelo WhatsApp oficial, sem você mandar um por um. Está em beta e sendo liberado aos poucos pros negócios.`,
        },
      ],
    },

    /* ── Parte 5 · Deixe agendar sozinha ── */
    {
      id: 'link',
      parte: 5,
      nomeParte: 'Agendamento online',
      href: '/admin/configuracoes?tab=qr-code',
      seguir: 'Concluir',
      baloes: [
        {
          alvo: 'tab-qr-code',
          titulo: `${t.art.toUpperCase()} ${t.s} também pode agendar sozinh${t.art}`,
          corpo: 'Além de marcar pelo painel, você tem uma página de agendamento: é o link e o QR code desta tela. Coloque na bio do Instagram ou mande no WhatsApp, e o horário cai direto na agenda.',
        },
      ],
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
