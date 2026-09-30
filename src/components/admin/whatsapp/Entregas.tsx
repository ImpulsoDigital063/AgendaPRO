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

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TituloSecao } from './ui'

/* Lista do que NÃO CHEGOU (Eduardo, 29/09): o placar dizia quantos, não
   quem nem o que fazer. Cada linha = cliente, qual aviso, por quê e a ação.
   O push de falha abre a aba em #nao-chegaram e cai aqui. */
type Falha = {
  id: string
  rotulo: string
  quando: string
  cliente: string | null
  telefone: string | null
  customerId: string | null
  motivo: string
  acao: string | null
  culpaNossa: boolean
}

function quandoCurto(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function NaoChegaram() {
  const [falhas, setFalhas] = useState<Falha[] | null>(null)
  useEffect(() => {
    let vivo = true
    fetch('/api/admin/mensagens/falhas')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (vivo) setFalhas(Array.isArray(j?.falhas) ? j.falhas : []) })
      .catch(() => { if (vivo) setFalhas([]) })
    return () => { vivo = false }
  }, [])
  if (!falhas || falhas.length === 0) return null
  return (
    <div id="nao-chegaram" className="rounded-2xl mb-2.5 overflow-hidden scroll-mt-20" style={{ border: '1px solid color-mix(in srgb, var(--admin-danger) 35%, transparent)' }}>
      <p className="px-3.5 pt-3 pb-2 text-[12.5px] font-bold" style={{ color: 'var(--admin-danger)' }}>
        Não chegaram · {falhas.length} {falhas.length === 1 ? 'aviso' : 'avisos'} nos últimos 30 dias
      </p>
      <ul>
        {falhas.map((f) => (
          <li key={f.id} className="px-3.5 py-2.5" style={{ borderTop: '1px solid var(--admin-border)', background: 'var(--admin-surface)' }}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13.5px] font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                {f.cliente ?? f.telefone ?? 'Cliente sem nome'}
              </p>
              <p className="text-[11px] tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text-faded)' }}>{quandoCurto(f.quando)}</p>
            </div>
            <p className="text-[12px]" style={{ color: 'var(--admin-text-2)' }}>{f.rotulo} · {f.motivo}</p>
            {(f.acao || (f.customerId && !f.culpaNossa)) && (
              <div className="flex items-center justify-between gap-2 mt-1">
                {f.acao && <p className="text-[12px] font-semibold" style={{ color: 'var(--admin-text)' }}>{f.acao}</p>}
                {f.customerId && !f.culpaNossa && (
                  <Link href={`/admin/clientes?customer=${f.customerId}`} className="text-[12px] font-bold flex-shrink-0" style={{ color: 'var(--admin-accent)' }}>
                    Abrir ficha
                  </Link>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

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
        {placar.falhas > 0 && (
          <a href="#nao-chegaram" className="flex-1 min-w-[72px] flex" aria-label="Ver os avisos que não chegaram">
            <Numero valor={placar.falhas} texto="não chegaram ↓" tom="erro" />
          </a>
        )}
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

      <NaoChegaram />

    </>
  )
}
