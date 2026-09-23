'use client'

/* ═══════════════════════════════════════════════════════════════
   QUAL MENSAGEM SAI EM CADA CASO

   Wanessa, áudio de 23/09/2026: "uma de hoje não recebeu a mensagem de
   confirmação... gostaria de saber se tem algum erro, alguma configuração".

   Não havia erro naquele caso: o horário tinha sinal, e a cobrança do sinal
   SUBSTITUI a confirmação. A regra já estava escrita — mas dentro da linha
   da Cobrança do sinal, que ela só leria se já desconfiasse. A dúvida dela
   nasceu olhando a cliente, não a régua.

   Então a regra sobe pro começo da aba, em quatro linhas, antes da lista de
   avisos. Quem bater o olho entende sem abrir nada.

   O que este bloco NÃO faz de propósito:
   · não vira tutorial com passo a passo — a régua logo abaixo já é a tela
     onde ela liga e desliga;
   · não promete o que o sistema não manda. Por isso a última linha diz, com
     todas as letras, que depois do sinal pago não sai mensagem nenhuma:
     é verdade hoje, e é melhor ela saber do que descobrir pela cliente.
   ═══════════════════════════════════════════════════════════════ */

import type { TermoPessoa } from '@/lib/segmento'
import { TituloSecao } from './ui'

function Linha({ quando, sai, detalhe }: { quando: string; sai: string; detalhe?: string }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold leading-snug" style={{ color: 'var(--admin-text)' }}>
          {quando}
        </p>
        {detalhe && (
          <p className="text-[12px] leading-snug mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
            {detalhe}
          </p>
        )}
      </div>
      <p
        className="text-[12.5px] font-bold text-right flex-shrink-0 max-w-[45%] leading-snug"
        style={{ color: 'var(--admin-text-2)' }}
      >
        {sai}
      </p>
    </div>
  )
}

export default function QuandoSaiCada({
  T,
  sinalAtivo,
}: {
  T: TermoPessoa
  /** Sem sinal ligado, a regra da substituição não existe pra ela. */
  sinalAtivo: boolean
}) {
  return (
    <>
      <TituloSecao>Qual mensagem sai em cada caso</TituloSecao>
      <div
        className="rounded-2xl px-4 py-2 mb-3"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        {sinalAtivo ? (
          <>
            <Linha
              quando="Marcou e o horário pede sinal"
              sai="Cobrança do sinal"
              detalhe={`Com o PIX pra pagar. Nesse caso a confirmação NÃO sai — seria dizer que está confirmado antes de ${T.pron} pagar.`}
            />
            <div style={{ borderTop: '1px solid var(--admin-divider)' }} />
            <Linha quando="Marcou e não tem sinal" sai="Confirmação" detalhe="Vai o dia, a hora e o serviço." />
          </>
        ) : (
          <Linha quando="Marcou o horário" sai="Confirmação" detalhe="Vai o dia, a hora e o serviço." />
        )}
        <div style={{ borderTop: '1px solid var(--admin-divider)' }} />
        <Linha quando="Um dia antes" sai="Lembrete da véspera" detalhe="Se você deixar ligado abaixo." />
        <div style={{ borderTop: '1px solid var(--admin-divider)' }} />
        <Linha quando="No dia do atendimento" sai="Lembrete do dia" detalhe="Se você deixar ligado abaixo." />
        {sinalAtivo && (
          <>
            <div style={{ borderTop: '1px solid var(--admin-divider)' }} />
            <Linha
              quando={`Depois que ${T.art} ${T.s} paga o sinal`}
              sai="Nada por enquanto"
              detalhe="O horário fica confirmado na sua agenda, mas o sistema ainda não avisa de volta."
            />
          </>
        )}
      </div>
    </>
  )
}
