'use client'

/* ═══════════════════════════════════════════════════════════════
   UM AVISO — tudo dele numa tela só

   O problema que isso conserta: "Lembrete da véspera" é UMA coisa pra dona —
   tem interruptor, horário, custo e texto. A tela antiga espalhava isso em
   dois blocos distantes: ela ligava embaixo e lia o texto em cima. Cinco
   avisos viravam dez blocos.

   Aqui cada aviso se basta. E a explicação longa mora aqui dentro, não na
   lista: na lista fica uma linha de metadado, senão nada tem hierarquia.
   ═══════════════════════════════════════════════════════════════ */

import { useState } from 'react'
import { Balao, Chip } from './ui'

export type Aviso = {
  tipo: string
  rotulo: string
  porque: string
  quando: string
  enabled: boolean
  comBotao: boolean
  temBotao: boolean
  offsetMinutos: number
  previa: string
  corpoPadrao: string
  meuTexto: string | null
  campos: string[]
  marketing: boolean
  unidadesPorMes?: number
  status: string | null
  motivo: string | null
}

const SELO: Record<string, { texto: string; tom: 'ok' | 'atencao' | 'erro' }> = {
  PENDING: { texto: 'texto em análise', tom: 'atencao' },
  APPROVED: { texto: 'seu texto no ar', tom: 'ok' },
  REJECTED: { texto: 'texto reprovado', tom: 'erro' },
  PAUSED: { texto: 'pausado pela Meta', tom: 'atencao' },
}

/**
 * Sem cabeçalho próprio: o título, o voltar e o interruptor deste aviso vivem
 * na barra grudada no topo, que é do painel. Um componente de conteúdo que
 * desenha o próprio header acaba com dois títulos empilhados.
 */
export default function AvisoDetalhe({
  aviso,
  onBotao,
  onHorario,
  onEnviarTexto,
}: {
  aviso: Aviso
  onBotao: (v: boolean) => void
  onHorario: (horas: number) => void
  onEnviarTexto: (corpo: string) => Promise<string[] | null>
}) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(aviso.meuTexto ?? aviso.corpoPadrao)
  const [erros, setErros] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const selo = aviso.status ? SELO[aviso.status] : null

  async function enviar() {
    setEnviando(true)
    setErros([])
    const e = await onEnviarTexto(rascunho)
    setEnviando(false)
    if (e) setErros(e)
    else setEditando(false)
  }

  return (
    <div className="pb-6">
      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
        {aviso.porque}
      </p>
      <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
        {aviso.quando}
        {aviso.unidadesPorMes ? <> · cerca de {aviso.unidadesPorMes} mensagens por mês</> : null}
        {aviso.marketing && <> · cada envio gasta 7 do pacote</>}
      </p>

      {!editando && (
        <>
          <div className="mt-4 mb-1 flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
              Como a cliente recebe
            </p>
            {selo && <Chip tom={selo.tom}>{selo.texto}</Chip>}
          </div>
          <Balao
            texto={aviso.previa}
            botoes={aviso.temBotao && aviso.comBotao ? ['Confirmar presença', 'Preciso remarcar'] : undefined}
          />
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
            Exemplo com uma cliente chamada Maria. Nome, dia, horário e serviço entram sozinhos.
          </p>

          {aviso.status === 'REJECTED' && (
            <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--admin-danger)' }}>
              O WhatsApp não aprovou esse texto{aviso.motivo ? ` (${aviso.motivo})` : ''}. O aviso
              está saindo com o texto padrão. Edite e envie de novo.
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setRascunho(aviso.meuTexto ?? aviso.corpoPadrao)
              setEditando(true)
            }}
            className="text-[13px] font-semibold underline underline-offset-2 mt-3"
            style={{ color: 'var(--admin-accent)' }}
          >
            {aviso.meuTexto ? 'Editar meu texto' : 'Escrever meu próprio texto'}
          </button>
        </>
      )}

      {editando && (
        <div className="mt-4 space-y-2">
          {/* A regra que a tela existe pra comunicar, no momento em que ela
              importa: ANTES de escrever, não depois de salvar. */}
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.20)' }}
          >
            <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
              <strong style={{ color: 'var(--admin-text)' }}>
                Toda alteração passa pela aprovação do WhatsApp
              </strong>{' '}
              e pode levar de alguns minutos até cerca de um dia. Enquanto isso, o aviso continua
              saindo com o texto padrão — ninguém fica sem lembrete esperando.
            </p>
          </div>

          <textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            rows={9}
            className="w-full text-[13px] rounded-xl px-3 py-2.5 leading-relaxed"
            style={{
              background: 'var(--admin-bg)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text)',
            }}
          />

          <div className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
            <p className="mb-1">
              Os campos entre chaves são preenchidos sozinhos.{' '}
              <strong>Todos precisam continuar no texto:</strong>
            </p>
            <ul className="space-y-0.5">
              {aviso.campos.map((c, i) => (
                <li key={i}>
                  <code>{`{{${i + 1}}}`}</code> — {c}
                </li>
              ))}
            </ul>
          </div>

          {erros.length > 0 && (
            <ul className="text-xs space-y-1" style={{ color: 'var(--admin-danger)' }}>
              {erros.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              disabled={enviando}
              onClick={enviar}
              className="text-[13px] font-semibold px-4 py-2.5 rounded-xl disabled:opacity-60"
              style={{ background: 'var(--admin-accent)', color: '#fff' }}
            >
              {enviando ? 'Enviando…' : 'Enviar para aprovação'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditando(false)
                setErros([])
              }}
              className="text-xs underline underline-offset-2"
              style={{ color: 'var(--admin-text-faded)' }}
            >
              Cancelar
            </button>
            {aviso.meuTexto && (
              <button
                type="button"
                onClick={() => setRascunho(aviso.corpoPadrao)}
                className="text-xs underline underline-offset-2"
                style={{ color: 'var(--admin-text-faded)' }}
              >
                Voltar ao texto padrão
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ajustes que só existem em alguns avisos. Ficam DEPOIS do texto:
          a dona vem aqui pra ver a mensagem, não pra mexer em horário. */}
      {!editando && (aviso.temBotao || aviso.tipo === 'lembrete_dia') && (
        <div
          className="admin-card mt-5 px-4 py-3.5 space-y-3"
        >
          {aviso.temBotao && (
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={aviso.comBotao}
                onChange={(e) => onBotao(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-[13px] leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                <strong style={{ color: 'var(--admin-text)' }}>
                  Deixar a cliente confirmar pelo botão
                </strong>
                <span className="block text-[11px] mt-0.5">
                  Ela toca em &quot;Confirmar presença&quot; e o horário é confirmado sozinho.
                </span>
              </span>
            </label>
          )}

          {aviso.tipo === 'lembrete_dia' && (
            <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--admin-text-mute)' }}>
              Enviar
              <select
                value={Math.round(Math.abs(aviso.offsetMinutos) / 60)}
                onChange={(e) => onHorario(Number(e.target.value))}
                className="rounded-lg px-2 py-1 text-xs"
                style={{
                  background: 'var(--admin-bg)',
                  border: '1px solid var(--admin-border)',
                  color: 'var(--admin-text)',
                }}
              >
                {[1, 2, 3, 4, 6, 8, 12].map((h) => (
                  <option key={h} value={h}>
                    {h}h antes
                  </option>
                ))}
              </select>
              do horário dela
            </label>
          )}
        </div>
      )}
    </div>
  )
}
