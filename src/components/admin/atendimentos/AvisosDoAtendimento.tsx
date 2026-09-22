'use client'

/* ═══════════════════════════════════════════════════════════════
   O AVISO CHEGOU NESTA CLIENTE?

   Wanessa, 22/09/2026: "Onde vejo se o cliente recebeu msg de confirmação?"

   Ela perguntou olhando pra UMA cliente, não pro relatório do mês. Por isso
   o bloco mora aqui, no atendimento: é onde ela já está quando a dúvida
   aparece.

   Três decisões:

   1. SOME QUANDO NÃO TEM NADA. Negócio sem avisos ligados não ganha um card
      vazio explicando o que poderia ter. Espaço em tela é caro no celular.

   2. O QUE NÃO CHEGOU VEM PRIMEIRO E EM DESTAQUE. "Entregue" é informação;
      "não chegou" é AÇÃO — ela ainda dá tempo de ligar pra cliente. Um
      relatório que trata os dois igual faz a dona ler tudo pra achar o que
      importa.

   3. SEM BOTÃO DE REENVIAR. Reenviar por aqui pularia a régua (janela de
      24h, template aprovado, franquia) e abriria caminho pra mandar duas
      vezes. Se falhou, o caminho é o telefone dela.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react'

type Aviso = {
  id: string
  rotulo: string
  situacao: 'lida' | 'entregue' | 'enviada' | 'falhou' | 'processando'
  resposta: boolean
  quando: string
  entregueEm: string | null
  lidoEm: string | null
  motivo: string | null
}

const CORES: Record<Aviso['situacao'], { fg: string; bg: string; bd: string }> = {
  lida: { fg: 'var(--admin-success)', bg: 'rgba(5,150,105,0.10)', bd: 'rgba(5,150,105,0.22)' },
  entregue: { fg: 'var(--admin-success)', bg: 'rgba(5,150,105,0.10)', bd: 'rgba(5,150,105,0.22)' },
  enviada: { fg: 'var(--admin-text-mute)', bg: 'var(--admin-input-bg)', bd: 'var(--admin-border)' },
  processando: { fg: 'var(--admin-text-mute)', bg: 'var(--admin-input-bg)', bd: 'var(--admin-border)' },
  falhou: { fg: 'var(--admin-danger)', bg: 'rgba(220,38,38,0.10)', bd: 'rgba(220,38,38,0.22)' },
}

const TEXTO: Record<Aviso['situacao'], string> = {
  lida: 'Lida',
  entregue: 'Entregue',
  enviada: 'Enviada',
  processando: 'Saindo',
  falhou: 'Não chegou',
}

/** "hoje 14:32" · "ontem 09:05" · "18/09 13:14" */
function quando(iso: string): string {
  const d = new Date(iso)
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const dia = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`
  const hoje = new Date()
  if (dia(d) === dia(hoje)) return `hoje ${hora}`
  if (dia(d) === dia(new Date(hoje.getTime() - 864e5))) return `ontem ${hora}`
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hora}`
}

export default function AvisosDoAtendimento({ appointmentId }: { appointmentId: string }) {
  const [avisos, setAvisos] = useState<Aviso[] | null>(null)

  useEffect(() => {
    let cancelado = false
    fetch(`/api/admin/mensagens/status?atendimento=${appointmentId}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelado && d?.avisos) setAvisos(d.avisos as Aviso[])
      })
      /* Silencioso de propósito: isto é informação extra sobre o
         atendimento. Erro aqui não pode sujar a tela de quem só quer
         faturar a comanda. */
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [appointmentId])

  if (!avisos || avisos.length === 0) return null

  /* O que falhou sobe. Dentro de cada grupo, o mais recente primeiro. */
  const ordenados = [...avisos].sort((a, b) => {
    const peso = (x: Aviso) => (x.situacao === 'falhou' ? 0 : 1)
    return peso(a) - peso(b) || b.quando.localeCompare(a.quando)
  })
  const falhou = ordenados.some((a) => a.situacao === 'falhou')

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-wider mb-2.5"
        style={{ color: 'var(--admin-text-faded)' }}
      >
        Avisos no WhatsApp
      </p>

      <div className="space-y-2">
        {ordenados.map((a) => {
          const c = CORES[a.situacao]
          return (
            <div key={a.id} className="flex items-center gap-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate" style={{ color: 'var(--admin-text)' }}>
                  {a.rotulo}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
                  {/* A hora que interessa é a da ENTREGA quando chegou, e a do
                      envio quando não chegou. */}
                  {a.situacao === 'lida' && a.lidoEm
                    ? `enviada ${quando(a.quando)} · lida ${quando(a.lidoEm)}`
                    : a.entregueEm
                      ? `enviada ${quando(a.quando)} · entregue ${quando(a.entregueEm)}`
                      : `enviada ${quando(a.quando)}`}
                </p>
              </div>
              <span
                className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                style={{ background: c.bg, color: c.fg, border: `1px solid ${c.bd}` }}
              >
                {TEXTO[a.situacao]}
              </span>
            </div>
          )
        })}
      </div>

      {falhou && (
        <p className="text-[11px] mt-2.5" style={{ color: 'var(--admin-danger)' }}>
          O WhatsApp não entregou esse aviso. Vale confirmar com a cliente por telefone.
        </p>
      )}
    </div>
  )
}
