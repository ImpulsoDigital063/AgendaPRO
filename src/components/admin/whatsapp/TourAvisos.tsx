'use client'

/**
 * Tours da aba Avisos · dois, no padrão da aba Sumidos (08/09).
 *
 *   parte 1 · apresenta a aba. Abre sozinho na primeira visita de quem tem
 *             pacote. Termina levando a dona pro editor de um aviso.
 *   parte 2 · ensina a editar um texto. Abre dentro do editor, na primeira
 *             vez que ele é aberto — pelo botão do tour 1 ou por conta própria.
 *
 * Nasceu em 10/09/2026, na véspera de liberar o beta pra três negócios. O
 * Eduardo perguntou se a aba explicava o disparo automático do sinal — não
 * explicava — e pediu três coisas explícitas: por que o número é oficial, a
 * segurança de usar o sistema oficial da Meta, e como editar um texto sabendo
 * que ele passa pela aprovação dela (em média um dia, às vezes mais).
 *
 * Tudo que o texto afirma foi conferido no código antes de escrever: os
 * códigos {{1}} não são tocáveis (é lista, com a regra "todos precisam
 * continuar"); reprovado mostra o motivo e segue saindo o padrão; enquanto
 * está em análise, sai o padrão.
 *
 * Os textos falam de quem o negócio atende (cliente, paciente, aluno) via
 * `termoPessoa`.
 */

import { useCallback, useMemo } from 'react'
import TourGuiado, { type PassoTour } from '@/components/admin/tour/TourGuiado'
import { termoPessoa } from '@/lib/segmento'

type Props = {
  /** Quem chama decide se deve aparecer. */
  aberto: boolean
  categoria?: string | null
  /** Só a parte 1 usa: muda o passo do sinal. */
  sinalAtivo?: boolean
  parte?: 1 | 2
  /** Avisa quem chama que foi visto, pra não reabrir ao trocar de tela. */
  onVisto?: () => void
  /** Parte 1: sem isto, o último passo não oferece levar ao editor. */
  onAbrirEdicao?: () => void
}

function passosApresentacao(
  categoria: string | null,
  sinalAtivo: boolean,
  onAbrirEdicao?: () => void,
): PassoTour[] {
  const t = termoPessoa(categoria)
  const passos: PassoTour[] = [
    {
      alvo: 'avisos-estado',
      titulo: 'Número oficial do WhatsApp',
      corpo: `As mensagens pr${t.art}s ${t.p} saem desse número, pelo sistema oficial da Meta, a empresa dona do WhatsApp. Elas chegam com o nome AgendaPRO, e o seu celular fica livre pra você conversar.`,
    },
    {
      alvo: 'avisos-estado',
      titulo: 'Por que é mais seguro',
      corpo: 'Mensagem automática saindo de WhatsApp pessoal é o que mais leva a número bloqueado. No sistema oficial, a Meta aprova cada texto antes de sair, e nada sai do seu número — então o seu WhatsApp não corre esse risco.',
    },
    {
      alvo: 'avisos-lista',
      titulo: 'O que sai sozinho',
      corpo: 'Cada linha é um aviso. Ligado, ele sai sem você digitar nada. Toque na linha pra ver o texto e quando ele é enviado. O de aniversário vem desligado porque custa mais caro.',
    },
    {
      alvo: 'avisos-conta',
      titulo: 'Pacote e conta do mês',
      corpo: 'O cartão do número mostra quanto do pacote já foi usado. Aqui soma quanto os avisos ligados gastam por mês — se passar do pacote, você fica sabendo antes, e não na fatura.',
    },
    {
      alvo: 'avisos-sinal',
      titulo: 'Cobrança do sinal',
      corpo: sinalAtivo
        ? 'Quando o horário tem sinal, sai a cobrança com o PIX no lugar da confirmação. Pelo link de agendamento, sempre. Quando você marca o horário, só se escolher cobrar.'
        : 'Se você cobrar sinal, a cobrança com o PIX sai sozinha no lugar da confirmação. Hoje está desligada: liga na aba Sinal, com a sua chave PIX.',
    },
  ]

  if (sinalAtivo) {
    passos.push({
      alvo: 'avisos-sinal',
      titulo: `Quando ${t.art} ${t.s} diz que pagou`,
      corpo: `Se ${t.art} ${t.s} tocar em "Já paguei", o horário confirma na hora e você recebe um aviso. O valor só abate na comanda depois que você conferir no extrato e registrar.`,
    })
  }

  passos.push({
    alvo: 'avisos-beta',
    titulo: 'Isso é beta',
    corpo: 'Essa área é nova e está sendo feita junto com quem usa. Se algo não fizer sentido no seu dia a dia, conta pra gente: sugestão sua vira melhoria.',
  })

  passos.push({
    alvo: 'avisos-lista',
    titulo: 'Quer mudar um texto?',
    corpo: 'Você pode escrever cada aviso do seu jeito. Todo texto novo vai pra aprovação da Meta antes de sair e leva em média um dia, às vezes mais. Enquanto isso, sai o texto padrão.',
    ...(onAbrirEdicao ? { acao: { rotulo: 'Me mostra como editar', executar: onAbrirEdicao } } : {}),
  })

  return passos
}

function passosEdicao(categoria: string | null): PassoTour[] {
  const t = termoPessoa(categoria)
  return [
    {
      alvo: 'edit-aprovacao',
      titulo: 'Passa pela Meta primeiro',
      corpo: `Todo texto novo vai pra aprovação da Meta antes de sair. Leva em média um dia, às vezes mais. Enquanto isso ${t.art} ${t.s} continua recebendo o texto padrão — nenhum aviso deixa de sair.`,
    },
    {
      alvo: 'edit-texto',
      titulo: 'Escreva do seu jeito',
      corpo: `Esse é o texto que ${t.art} ${t.s} recebe. Pode reescrever com o jeito que você fala.`,
    },
    {
      alvo: 'edit-campos',
      titulo: 'Não apague os códigos',
      corpo: 'Os códigos entre chaves, como {{1}}, viram o nome, a data, o horário e o serviço de cada agendamento. Todos precisam continuar no texto, senão ele não é aceito.',
    },
    {
      alvo: 'edit-enviar',
      titulo: 'Enviar pra aprovação',
      corpo: 'Terminou? Toque aqui. O aviso mostra "texto em análise" até a Meta responder e "seu texto no ar" quando aprovar. Se reprovar, aparece o motivo — é só ajustar e mandar de novo.',
    },
  ]
}

export default function TourAvisos({
  aberto,
  categoria = null,
  sinalAtivo = false,
  parte = 1,
  onVisto,
  onAbrirEdicao,
}: Props) {
  const passos = useMemo(
    () =>
      parte === 2
        ? passosEdicao(categoria ?? null)
        : passosApresentacao(categoria ?? null, sinalAtivo, onAbrirEdicao),
    [parte, categoria, sinalAtivo, onAbrirEdicao],
  )

  /* Marca no banco. Se falhar, o tour volta na próxima visita — melhor que
     sumir sem a dona ter visto. O onVisto é o que impede de reabrir ao trocar
     de tela na mesma visita: a flag do servidor só atualiza no próximo load. */
  const aoEncerrar = useCallback(() => {
    fetch(`/api/admin/tour-avisos?parte=${parte}`, { method: 'POST' }).catch(() => {})
    onVisto?.()
  }, [parte, onVisto])

  return (
    <TourGuiado
      aberto={aberto}
      passos={passos}
      rotulo={parte === 2 ? 'Tour de edição de texto' : 'Tour da aba Avisos'}
      aoEncerrar={aoEncerrar}
    />
  )
}
