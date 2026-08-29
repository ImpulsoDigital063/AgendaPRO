'use client'

/* ═══════════════════════════════════════════════════════════════
   TEXTOS DOS AVISOS — onde a dona escreve o texto dela

   A regra que a tela inteira existe pra comunicar: **não existe salvar e
   usar**. Fora da janela de 24h o WhatsApp só entrega texto aprovado pela
   Meta, e a análise leva de minutos a cerca de um dia.

   Se a dona não souber disso ANTES de editar, ela salva, manda um teste,
   não vê a mudança e conclui que o sistema está quebrado. Por isso o aviso
   fica no topo, sempre visível — não num toast que some.

   E enquanto o texto dela está em análise, o aviso continua saindo com o
   texto padrão. Ficar sem lembrete porque está esperando aprovação seria
   trocar um problema por outro pior.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react'

type Aviso = {
  tipo: string
  rotulo: string
  corpoPadrao: string
  /** O texto já com os campos preenchidos — é o que a cliente vai ler. */
  previa: string
  campos: string[]
  marketing: boolean
  meuTexto: string | null
  status: string | null
  motivo: string | null
  atualizadoEm: string | null
}

const SELO: Record<string, { texto: string; cor: string; fundo: string }> = {
  PENDING: { texto: 'Em análise', cor: '#b45309', fundo: 'rgba(245,158,11,0.12)' },
  APPROVED: { texto: 'No ar', cor: '#15803d', fundo: 'rgba(34,197,94,0.12)' },
  REJECTED: { texto: 'Reprovado', cor: '#b91c1c', fundo: 'rgba(239,68,68,0.12)' },
  PAUSED: { texto: 'Pausado pela Meta', cor: '#b45309', fundo: 'rgba(245,158,11,0.12)' },
}

export default function TextosCard() {
  const [avisos, setAvisos] = useState<Aviso[] | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)
  const [rascunho, setRascunho] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState<string[]>([])

  const carregar = () => {
    void fetch('/api/admin/mensagens/templates')
      .then((r) => r.json())
      .then((j) => setAvisos(j?.error ? null : (j.avisos ?? [])))
      .catch(() => setAvisos(null))
  }
  useEffect(carregar, [])

  function abrir(a: Aviso) {
    setAberto(a.tipo)
    setRascunho(a.meuTexto ?? a.corpoPadrao)
    setErros([])
  }

  async function enviar(tipo: string) {
    setSalvando(true)
    setErros([])
    try {
      const r = await fetch('/api/admin/mensagens/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, corpo: rascunho }),
      })
      const j = await r.json()
      if (!r.ok) {
        /* Erro de validação nossa vem em lista; recusa da Meta vem com
           título e detalhe. Os dois em português, porque "Invalid
           parameter" não diz nada pra quem está atendendo cliente. */
        setErros(j?.erros ?? [j?.titulo, j?.detalhe].filter(Boolean))
        return
      }
      setAberto(null)
      carregar()
    } catch {
      setErros(['Não deu para enviar agora. Tente de novo em alguns instantes.'])
    } finally {
      setSalvando(false)
    }
  }

  if (!avisos) return null

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          Os textos que suas clientes recebem
        </h2>
      </header>

      {/* A LEGENDA. Fica sempre visível, antes de qualquer edição. */}
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}
      >
        <p className="text-xs leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
          <strong style={{ color: 'var(--admin-text)' }}>
            Toda alteração passa pela aprovação do WhatsApp.
          </strong>{' '}
          Quando você salva um texto novo, ele vai para análise da Meta e pode levar de alguns
          minutos até cerca de um dia para ser liberado. Não é o sistema travando: é regra deles
          para qualquer mensagem automática.
        </p>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
          Enquanto o seu texto está em análise, <strong>os avisos continuam saindo normalmente</strong>{' '}
          com o texto padrão. Ninguém fica sem lembrete esperando aprovação.
        </p>
        {/* Uma vez, aqui em cima. Repetir embaixo de cada mensagem virava
            ruído numa tela que ja tem muita coisa. */}
        <p className="text-xs mt-2" style={{ color: 'var(--admin-text-faded)' }}>
          Os textos abaixo aparecem preenchidos com uma cliente de exemplo chamada Maria. Nome,
          dia, horário e serviço entram sozinhos na hora do envio.
        </p>
      </div>

      <div className="space-y-2">
        {avisos.map((a) => {
          const selo = a.status ? SELO[a.status] : null
          const editando = aberto === a.tipo
          return (
            <div
              key={a.tipo}
              className="rounded-xl px-4 py-3"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                  {a.rotulo}
                </p>
                <div className="flex items-center gap-2">
                  {a.marketing && (
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                      style={{ background: 'rgba(245,158,11,0.12)', color: '#b45309' }}
                      title="Mensagens de aniversário e retorno custam mais e gastam 7 do seu pacote"
                    >
                      gasta 7
                    </span>
                  )}
                  {selo && (
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
                      style={{ background: selo.fundo, color: selo.cor }}
                    >
                      {selo.texto}
                    </span>
                  )}
                </div>
              </div>

              {a.status === 'REJECTED' && (
                <p className="text-xs mt-2 leading-relaxed" style={{ color: '#b91c1c' }}>
                  O WhatsApp não aprovou esse texto{a.motivo ? ` (${a.motivo})` : ''}. O aviso está
                  saindo com o texto padrão. Edite e envie de novo.
                </p>
              )}

              {!editando && (
                <>
                  {/* A PRÉVIA, não o texto cru. "{{1}}" é código pra quem
                      atende cliente; os campos só aparecem no editor. */}
                  <p
                    className="text-xs mt-2 leading-relaxed whitespace-pre-line"
                    style={{ color: 'var(--admin-text-mute)' }}
                  >
                    {a.previa}
                  </p>
                  <button
                    type="button"
                    onClick={() => abrir(a)}
                    className="text-xs underline underline-offset-2 mt-2"
                    style={{ color: 'var(--admin-text-mute)' }}
                  >
                    {a.meuTexto ? 'Editar meu texto' : 'Escrever meu próprio texto'}
                  </button>
                </>
              )}

              {editando && (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={rascunho}
                    onChange={(e) => setRascunho(e.target.value)}
                    rows={8}
                    className="w-full text-xs rounded-lg px-3 py-2 leading-relaxed"
                    style={{
                      background: 'var(--admin-bg)',
                      border: '1px solid var(--admin-border)',
                      color: 'var(--admin-text)',
                    }}
                  />

                  {/* Sem isso ela apaga um campo sem saber o que era. */}
                  <div className="text-xs" style={{ color: 'var(--admin-text-faded)' }}>
                    <p className="mb-1">
                      Os campos entre chaves são preenchidos sozinhos na hora do envio.{' '}
                      <strong>Todos precisam continuar no texto:</strong>
                    </p>
                    <ul className="space-y-0.5">
                      {a.campos.map((c, i) => (
                        <li key={i}>
                          <code style={{ color: 'var(--admin-text-mute)' }}>{`{{${i + 1}}}`}</code> — {c}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {erros.length > 0 && (
                    <ul className="text-xs space-y-1" style={{ color: '#b91c1c' }}>
                      {erros.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() => enviar(a.tipo)}
                      className="text-xs font-semibold px-3 py-1.5 rounded"
                      style={{ background: 'var(--admin-text)', color: 'var(--admin-bg)' }}
                    >
                      {salvando ? 'Enviando…' : 'Enviar para aprovação'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAberto(null)
                        setErros([])
                      }}
                      className="text-xs underline underline-offset-2"
                      style={{ color: 'var(--admin-text-faded)' }}
                    >
                      Cancelar
                    </button>
                    {a.meuTexto && (
                      <button
                        type="button"
                        onClick={() => setRascunho(a.corpoPadrao)}
                        className="text-xs underline underline-offset-2"
                        style={{ color: 'var(--admin-text-faded)' }}
                      >
                        Voltar ao texto padrão
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
