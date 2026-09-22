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

   A lista mostra os últimos, com NOME da cliente. Resposta automática do
   robô fica de fora — aquilo é conversa, e já tem a seção de respostas.
   ═══════════════════════════════════════════════════════════════ */

import { Chip, Lista, Linha, TituloSecao } from './ui'

export type Entrega = {
  id: string
  rotulo: string
  situacao: 'lida' | 'entregue' | 'enviada' | 'falhou' | 'processando'
  resposta: boolean
  quando: string
  entregueEm: string | null
  lidoEm: string | null
  cliente: string | null
}

export type Placar = {
  enviados: number
  entregues: number
  lidos: number
  falhas: number
  confirmacoes: number
  dias: number
}

const TOM: Record<Entrega['situacao'], 'ok' | 'neutro' | 'erro'> = {
  lida: 'ok',
  entregue: 'ok',
  enviada: 'neutro',
  processando: 'neutro',
  falhou: 'erro',
}

const TEXTO: Record<Entrega['situacao'], string> = {
  lida: 'lida',
  entregue: 'entregue',
  enviada: 'enviada',
  processando: 'saindo',
  falhou: 'não chegou',
}

function quando(iso: string): string {
  const d = new Date(iso)
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const dia = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`
  const hoje = new Date()
  if (dia(d) === dia(hoje)) return `hoje ${hora}`
  if (dia(d) === dia(new Date(hoje.getTime() - 864e5))) return `ontem ${hora}`
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hora}`
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

export default function Entregas({
  placar,
  entregas,
}: {
  placar: Placar | null
  entregas: Entrega[]
}) {
  const lista = entregas.filter((e) => !e.resposta).slice(0, 8)

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

      {lista.length > 0 && (
        <Lista>
          {lista.map((e, i) => (
            <Linha
              key={e.id}
              primeira={i === 0}
              destaque={e.situacao === 'falhou' ? 'atencao' : undefined}
              titulo={
                <>
                  <span className="text-[14.5px] font-semibold" style={{ color: 'var(--admin-text)' }}>
                    {e.cliente ?? 'Cliente'}
                  </span>
                  <Chip tom={TOM[e.situacao]}>{TEXTO[e.situacao]}</Chip>
                </>
              }
              snippet={e.rotulo}
              meta={
                e.situacao === 'lida' && e.lidoEm
                  ? `enviada ${quando(e.quando)} · lida ${quando(e.lidoEm)}`
                  : e.entregueEm
                    ? `enviada ${quando(e.quando)} · entregue ${quando(e.entregueEm)}`
                    : `enviada ${quando(e.quando)}`
              }
            />
          ))}
        </Lista>
      )}
    </>
  )
}
