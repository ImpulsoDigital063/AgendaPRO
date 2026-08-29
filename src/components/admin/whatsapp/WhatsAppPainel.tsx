'use client'

/* ═══════════════════════════════════════════════════════════════
   CENTRAL DE WHATSAPP

   A ordem da tela é a ordem da dúvida da dona:
     1. "está mandando?"      → estado do canal, primeiro de tudo
     2. "o que está indo?"    → os avisos, com o texto que ela pode mudar

   O estado do canal vem antes porque é a única pergunta que ela faz em
   pânico. Em 21/08 o canal ficou 6 dias fora do ar e a única pista era uma
   coluna de erro no banco — do lado de dentro. Do lado dela, silêncio.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react'
import PacotesCard from './PacotesCard'
import TextosCard from './TextosCard'
import { CANAL_LIBERADO } from '@/lib/mensagens/liberado'
import MensagensAutomaticasCard from '../MensagensAutomaticasCard'

type Canal = {
  configurado: boolean
  no_ar: boolean
  numero: string | null
  detalhe: string
  /* GREEN | YELLOW | RED. É o sinal que substituiu "a sessão caiu": na
     Cloud API não existe sessão, existe reputação — e ela desce quando as
     clientes bloqueiam. Cai ANTES da Meta restringir o número, que é o
     único momento em que dá pra fazer alguma coisa. */
  qualidade?: string | null
  consumo?: {
    usadas: number
    aguardando: number
    franquia: number
    restantes: number
    excedente: number
    custoExcedente: number
    resumo: string
    pacote?: unknown
  }
  semTelefone?: { quantos: number; nomes: string[] }
}

/** 556381102355 → (63) 98110-2355. O número cru não diz nada pra dona. */
function formatarNumero(bruto: string): string {
  const d = bruto.replace(/\D/g, '')
  const s = d.startsWith('55') ? d.slice(2) : d
  if (s.length === 11) return `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7)}`
  if (s.length === 10) return `(${s.slice(0, 2)}) ${s.slice(2, 6)}-${s.slice(6)}`
  return bruto
}

/* ═══════════════════════════════════════════════════════════════
   POR QUE O AVISO NÃO SAI DO NÚMERO DELA

   A dona vai reparar que o número é desconhecido e a primeira leitura dela
   é ruim: "estão mandando mensagem pra minha cliente de um número que não é
   o meu". Se ela descobre isso pela cliente perguntando, vira desconfiança.
   Dito antes, vira proteção — que é o que de fato é.

   Fica recolhido porque não é informação de operação diária; ela lê uma vez
   e não precisa de novo.
   ═══════════════════════════════════════════════════════════════ */
function PorQueEsseNumero() {
  const [aberto, setAberto] = useState(false)

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-2 text-xs underline underline-offset-2"
        style={{ color: 'var(--admin-text-mute)' }}
      >
        Por que os avisos não saem do meu número?
      </button>
    )
  }

  return (
    <div className="mt-2.5 space-y-2 text-xs leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
      <p>
        <strong style={{ color: 'var(--admin-text)' }}>Para proteger o seu número.</strong>{' '}
        Ligar o WhatsApp do seu negócio a um sistema de envio automático é o tipo de uso que o
        WhatsApp bloqueia — e se bloquear, você perde o contato com as suas clientes, a lista de
        conversas e os grupos. O aviso sai do nosso número justamente para que esse risco nunca
        seja seu.
      </p>
      <p>
        <strong style={{ color: 'var(--admin-text)' }}>O cliente sabe de quem é.</strong>{' '}
        Toda mensagem começa com o nome do seu negócio e termina com o seu telefone, para ela
        remarcar ou tirar dúvida falando com você.
      </p>
      <p>
        <strong style={{ color: 'var(--admin-text)' }}>Se ela responder ali</strong>, recebe na hora
        um aviso automático dizendo que aquele número só manda avisos e não é lido, e que para
        falar com você é pelo telefone que aparece na mensagem do horário dela. Ninguém fica
        esperando resposta que não vem.
      </p>
      <button
        type="button"
        onClick={() => setAberto(false)}
        className="text-xs underline underline-offset-2"
        style={{ color: 'var(--admin-text-faded)' }}
      >
        Fechar
      </button>
    </div>
  )
}

export default function WhatsAppPainel({
  businessName,
  businessPhone,
  category,
}: {
  businessName: string
  category?: string | null
  businessPhone?: string | null
}) {
  const [canal, setCanal] = useState<Canal | null>(null)

  useEffect(() => {
    /* Falha de rede aqui não pode derrubar a tela: os avisos abaixo
       continuam configuráveis mesmo sem saber o estado do canal. */
    void fetch('/api/admin/mensagens/canal')
      .then((r) => r.json())
      .then((d) => setCanal(d?.error ? null : d))
      .catch(() => setCanal(null))
  }, [])

  const cor = !canal
    ? { fundo: 'rgba(120,120,120,0.08)', borda: 'rgba(120,120,120,0.25)' }
    : canal.no_ar
      ? { fundo: 'rgba(34,197,94,0.10)', borda: 'rgba(34,197,94,0.30)' }
      : { fundo: 'rgba(245,158,11,0.10)', borda: 'rgba(245,158,11,0.30)' }

  return (
    <div className="space-y-4 pb-8">
      <header>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
          WhatsApp
        </h1>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
          Os avisos que {businessName} manda sozinho para os clientes.
        </p>
      </header>

      {/* EM BREVE — e o MOTIVO mudou em 28/08.
          Antes era a entrega: a W-API só entregava pra quem já tinha mandado
          mensagem pro número, e a cliente do salão nunca mandou. Isso ACABOU
          com a migração pra Cloud API oficial, provado no aparelho da mesma
          destinatária que não recebia.
          Agora o que falta é operacional: o número de produção ainda não
          existe. Deixar o texto velho no ar seria mentir pra dona sobre uma
          limitação que não existe mais. */}
      {!CANAL_LIBERADO && (
      <section
        className="rounded-xl px-4 py-3"
        style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          Em ajustes finais — ainda não use com suas clientes
        </p>
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
          Estamos trocando o envio para o canal oficial do WhatsApp, e o número novo ainda está
          sendo liberado. Você pode olhar e deixar os textos do seu jeito, mas ainda não ligue os
          avisos: enquanto o número não está no ar, eles não saem. Avisamos assim que estiver
          liberado.
        </p>
      </section>
      )}

      <section
        className="rounded-xl px-4 py-3"
        style={{ background: cor.fundo, border: `1px solid ${cor.borda}` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              /* Cinza enquanto não é dela de verdade: verde é promessa. */
              background:
                !canal || !CANAL_LIBERADO || !canal.consumo?.pacote
                  ? '#9ca3af'
                  : canal.no_ar
                    ? '#22c55e'
                    : '#f59e0b',
            }}
          />
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            {!canal
              ? 'Verificando…'
              : /* O verde só quando os avisos DELA saem de verdade. Antes o
                   card dizia "Enviando normalmente" e, três linhas abaixo,
                   "não estão contratados para este negócio" — o estado era
                   do número da plataforma, não do negócio dela. */
                !CANAL_LIBERADO
                ? 'Ainda não liberado'
                : !canal.consumo?.pacote
                  ? 'Disponível — você ainda não contratou'
                  : canal.no_ar
                    ? 'Enviando normalmente'
                    : 'Os avisos não estão saindo'}
          </p>
        </div>

        {/* Quando está tudo certo, o detalhe repetiria o título ("Enviando
            normalmente" duas vezes). Aí só o número interessa — é a única
            informação nova. O detalhe volta a aparecer quando há problema,
            que é quando ela precisa saber o que houve. */}
        {canal && !canal.no_ar && (
          <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
            {canal.detalhe}
          </p>
        )}

        {canal?.numero && (
          <p className="text-xs mt-1.5" style={{ color: 'var(--admin-text-mute)' }}>
            Suas clientes recebem do número {formatarNumero(canal.numero)}.
          </p>
        )}

        {/* QUALIDADE — o alarme que vem antes do problema.
            YELLOW e RED não impedem o envio hoje, e é justamente por isso
            que precisam aparecer: quando a Meta restringe, já passou da
            hora. Em verde não mostra nada — informação boa demais vira
            ruído e ela para de ler o card. */}
        {canal?.qualidade === 'RED' && (
          <p
            className="text-xs mt-2 leading-relaxed rounded-lg px-3 py-2"
            style={{ background: 'rgba(239,68,68,0.10)', color: 'var(--admin-text)' }}
          >
            <strong>Muita gente bloqueou os avisos.</strong> O WhatsApp pode limitar os envios a
            qualquer momento. Vale rever quem está recebendo e desligar o que não for essencial.
          </p>
        )}
        {canal?.qualidade === 'YELLOW' && (
          <p
            className="text-xs mt-2 leading-relaxed rounded-lg px-3 py-2"
            style={{ background: 'rgba(245,158,11,0.10)', color: 'var(--admin-text)' }}
          >
            <strong>Alguns clientes bloquearam os avisos.</strong> Ainda está enviando normalmente,
            mas é bom ficar de olho.
          </p>
        )}

        {/* CONSUMO DO PACOTE.
            Aparece antes da primeira fatura com excedente, não depois — a
            frase vem pronta do servidor pra não existirem duas versões da
            mesma conta, uma na tela e outra no faturamento. */}
        {canal?.consumo && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--admin-border)' }}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>
                Mensagens do mês
              </p>
              <p className="text-xs tabular-nums" style={{ color: 'var(--admin-text)' }}>
                <strong>{canal.consumo.usadas}</strong>
                <span style={{ color: 'var(--admin-text-faded)' }}> / {canal.consumo.franquia}</span>
              </p>
            </div>
            <div
              className="mt-1.5 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--admin-border)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (canal.consumo.usadas / Math.max(1, canal.consumo.franquia)) * 100)}%`,
                  background: canal.consumo.excedente > 0 ? '#f59e0b' : '#22c55e',
                }}
              />
            </div>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
              {canal.consumo.resumo}
            </p>
            {/* Enviadas sem confirmação de entrega ainda não são cobradas.
                Dizer isso evita a pergunta "mandei 30 e só contou 24". */}
            {canal.consumo.aguardando > 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                Mais {canal.consumo.aguardando} aguardando confirmação de entrega — só entram na
                conta depois que o WhatsApp confirmar.
              </p>
            )}
          </div>
        )}

        {canal?.no_ar && <PorQueEsseNumero />}

        {canal && !canal.no_ar && canal.configurado && (
          /* Diz o que ELA faz, não o que aconteceu por dentro: "sessão caída
             no provedor" não é acionável pra quem está atendendo cliente. */
          <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
            Nada que você configurou foi perdido. Assim que o envio voltar, os avisos saem de novo
            sozinhos. Se demorar, fale com o suporte.
          </p>
        )}
      </section>

      {/* QUEM NAO VAI RECEBER, E POR QUE.
          O problema e de cadastro e existe desde antes do canal novo. Mas
          ate ontem "nao recebeu" era normal; a partir do momento em que ela
          PAGA por aviso, vira reclamacao. Melhor ela saber antes, com nome
          e tudo, do que descobrir pela cliente. */}
      {canal?.semTelefone && canal.semTelefone.quantos > 0 && (
        <section
          className="rounded-xl px-4 py-3"
          style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            {canal.semTelefone.quantos}{' '}
            {canal.semTelefone.quantos === 1 ? 'cliente não vai receber' : 'clientes não vão receber'} aviso
          </p>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
            {canal.semTelefone.quantos === 1 ? 'Tem horário marcado' : 'Têm horário marcado'} mas o
            cadastro está sem telefone ou com o número incompleto:{' '}
            <strong>{canal.semTelefone.nomes.join(', ')}</strong>
            {canal.semTelefone.quantos > canal.semTelefone.nomes.length && (
              <> e mais {canal.semTelefone.quantos - canal.semTelefone.nomes.length}</>
            )}
            . É só abrir a ficha e completar o telefone que o aviso passa a sair.
          </p>
        </section>
      )}

      <section>
        <PacotesCard canalNoAr={!!canal?.no_ar} />
      </section>

      <section>
        <TextosCard />
      </section>

      <section>
        <MensagensAutomaticasCard businessName={businessName} businessPhone={businessPhone ?? null} category={category ?? null} />
      </section>
    </div>
  )
}
