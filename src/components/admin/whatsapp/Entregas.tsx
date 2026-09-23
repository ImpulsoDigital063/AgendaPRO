'use client'

/* ═══════════════════════════════════════════════════════════════
   O QUE JÁ SAIU — e o que isso deu

   Até 22/09/2026 a aba respondia só "quanto você gastou": a barra de
   consumo do pacote. A Wanessa perguntou outra coisa — "onde vejo se o
   cliente recebeu?" — e essa pergunta não tinha tela.

   O placar aqui responde na ordem que importa pra ela:

     enviados → entregues → lidos → CONFIRMARAM

   O último é o único que vira dinheiro: cliente que confirma é agenda que
   não fura. Por isso ele fecha a linha, e não o consumo.

   "Não chegou" aparece só quando existe, e em vermelho: é o único item que
   pede ação. Aviso entregue não precisa de atenção nenhuma.

   A lista que ficava aqui virou conversa de WhatsApp logo abaixo
   (22/09/2026): rótulo + status era relatório, e a dona tinha que traduzir
   linha por linha. Aqui sobrou o placar — o número que ela conta.
   ═══════════════════════════════════════════════════════════════ */

import { TituloSecao } from './ui'

export type Placar = {
  enviados: number
  entregues: number
  lidos: number
  falhas: number
  confirmacoes: number
  dias: number
}




function Numero({ valor, texto, tom }: { valor: number; texto: string; tom?: 'ok' | 'erro' }) {
  const cor =
    tom === 'ok' ? 'var(--admin-success)' : tom === 'erro' ? 'var(--admin-danger)' : 'var(--admin-text)'
  return (
    <div className="flex-1 min-w-[72px] text-center px-2 py-2.5">
      <p className="text-xl font-bold leading-none tabular-nums" style={{ color: cor }}>
        {valor}
      </p>
      <p className="text-[10.5px] mt-1 leading-tight" style={{ color: 'var(--admin-text-faded)' }}>
        {texto}
      </p>
    </div>
  )
}

export default function Entregas({ placar }: { placar: Placar | null }) {
  /* Nunca enviou nada: não mostra placar zerado. Zero em toda coluna parece
     defeito, e a dona nova já tem a barra de consumo dizendo que está em 0. */
  if (!placar || placar.enviados === 0) return null

  return (
    <>
      <TituloSecao>O que já saiu</TituloSecao>

      <div
        className="flex items-stretch rounded-2xl mb-2.5 overflow-hidden"
        style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <Numero valor={placar.enviados} texto="enviados" />
        <Numero valor={placar.entregues} texto="entregues" tom="ok" />
        <Numero valor={placar.lidos} texto="lidos" tom="ok" />
        <Numero valor={placar.confirmacoes} texto="confirmaram" tom="ok" />
        {placar.falhas > 0 && <Numero valor={placar.falhas} texto="não chegaram" tom="erro" />}
      </div>

      <p
        className="text-[12.5px] leading-relaxed mb-2.5 px-1"
        style={{ color: 'var(--admin-text-2)' }}
      >
        Nos últimos {placar.dias} dias.{' '}
        {placar.confirmacoes > 0
          ? `${placar.confirmacoes} ${placar.confirmacoes === 1 ? 'cliente confirmou' : 'clientes confirmaram'} presença respondendo o WhatsApp.`
          : 'Quando a cliente responder confirmando presença, ela aparece aqui.'}
      </p>

    </>
  )
}
