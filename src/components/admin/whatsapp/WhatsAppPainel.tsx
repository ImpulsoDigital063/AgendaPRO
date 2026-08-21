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
import MensagensAutomaticasCard from '../MensagensAutomaticasCard'

type Canal = {
  configurado: boolean
  no_ar: boolean
  numero: string | null
  detalhe: string
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
        <strong style={{ color: 'var(--admin-text)' }}>A cliente sabe de quem é.</strong>{' '}
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
          Os avisos que {businessName} manda sozinho para as clientes.
        </p>
      </header>

      {/* EM BREVE. O motor está pronto e testado, mas a entrega depende de a
          cliente já ter mandado mensagem pro número da instância — e a cliente
          do salão nunca mandou. Sem este aviso, a dona liga, o painel diz
          "enviado" e ninguém recebe: falha silenciosa com cara de sucesso. */}
      <section
        className="rounded-xl px-4 py-3"
        style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          Em ajustes finais — ainda não use com suas clientes
        </p>
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
          Estamos terminando de acertar a entrega das mensagens. Você pode olhar e deixar os textos
          do seu jeito, mas ainda não ligue os avisos: nesta fase eles podem não chegar em quem
          nunca conversou com o nosso número, e o painel mostraria como enviados. Avisamos assim que
          estiver liberado.
        </p>
      </section>

      <section
        className="rounded-xl px-4 py-3"
        style={{ background: cor.fundo, border: `1px solid ${cor.borda}` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              background: !canal ? '#9ca3af' : canal.no_ar ? '#22c55e' : '#f59e0b',
            }}
          />
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            {!canal ? 'Verificando…' : canal.no_ar ? 'Enviando normalmente' : 'Os avisos não estão saindo'}
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

      <section>
        <MensagensAutomaticasCard businessName={businessName} businessPhone={businessPhone ?? null} category={category ?? null} />
      </section>
    </div>
  )
}
