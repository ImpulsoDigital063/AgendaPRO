'use client'

/**
 * Lista de clientes sumidas com prazo ajustável (15/20/25/30/40/60 dias).
 *
 * Vive em dois lugares (Eduardo, 06/09/2026):
 *   1. /admin/sumidos — aba própria no menu. O Reativar só era alcançável por
 *      dentro de Clientes ou pelo Foco do Dia; quem não sabia que a função
 *      existia nunca ia achar.
 *   2. aba dentro de Consultas — onde a Rosy foi procurar primeiro.
 *
 * A ação por linha é WhatsApp individual, não campanha. A Rosy descreveu uso
 * um-a-um ("sempre que eu for consultar, eu já vejo e mando a mensagem"), e
 * com prazo de 15 dias a lista pega meia base — disparar cupom pra todo mundo
 * daria desconto pra quem ia voltar sozinha. A campanha continua existindo,
 * um passo adiante e deliberado.
 *
 * Cor: --admin-accent (a cor da dona). É o negócio DELA operando, não o
 * AgendaPRO falando — ver a regra de cor do painel.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { IconWhatsapp, IconClock, IconUsers, IconChevronRight, IconPencil, IconCheck } from '@/components/ui/Icon'
import {
  SUMIDOS_TEMPLATE_PADRAO,
  preencherSumidos,
  linkWhatsappSumidos,
} from '@/lib/sumidos-template'

const DIAS_OPCOES = [15, 20, 25, 30, 40, 60]

type Sumido = {
  id: string
  name: string
  phone: string | null
  ultima: string
  diasSem: number
}

type Props = {
  /** Link "criar campanha com todos" — só o dono tem a rota /admin/clientes/reativar. */
  mostrarLinkCampanha?: boolean
  /** Só a dona edita o texto padrão. Recepção usa o que está salvo. */
  podeEditarTexto?: boolean
}

function dataBR(ymd: string): string {
  return new Date(ymd + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

export default function SumidosPanel({ mostrarLinkCampanha = false, podeEditarTexto = false }: Props) {
  const [dias, setDias] = useState(40)
  const [clientes, setClientes] = useState<Sumido[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Editor de texto · o texto vive em businesses.sumidos_template
  const [negocio, setNegocio] = useState('')
  const [texto, setTexto] = useState(SUMIDOS_TEMPLATE_PADRAO)
  const [textoSalvo, setTextoSalvo] = useState(SUMIDOS_TEMPLATE_PADRAO)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroTexto, setErroTexto] = useState<string | null>(null)

  const buscar = useCallback(async (d: number) => {
    setLoading(true)
    setErro(null)
    try {
      const res = await fetch(`/api/admin/sumidos?dias=${d}`)
      if (!res.ok) throw new Error('falhou')
      const json = await res.json()
      setClientes(json.clientes ?? [])
      setNegocio(json.negocio ?? '')
      if (typeof json.template === 'string') {
        setTextoSalvo(json.template)
        // Não pisa no que a dona está digitando
        setTexto((atual) => (editando ? atual : json.template))
      }
    } catch {
      setErro('Não consegui carregar a lista. Tenta de novo.')
      setClientes([])
    } finally {
      setLoading(false)
    }
    // `editando` de propósito fora das deps: só decide se pisa no rascunho
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function salvarTexto() {
    setSalvando(true)
    setErroTexto(null)
    try {
      const res = await fetch('/api/admin/sumidos', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ template: texto }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error ?? 'falhou')
      // λ.prova-na-fonte · adota o que o banco devolveu, não o que eu mandei
      setTextoSalvo(json.template)
      setTexto(json.template)
      setEditando(false)
    } catch {
      setErroTexto('Não consegui salvar. Tenta de novo.')
    } finally {
      setSalvando(false)
    }
  }

  /** Prévia com a primeira cliente da lista, ou um exemplo se estiver vazia. */
  const exemplo = clientes[0]
  const previa = preencherSumidos(texto, {
    nome: exemplo?.name ?? 'Katiany Cristo',
    dias: exemplo?.diasSem ?? dias,
    negocio: negocio || 'seu negócio',
  })

  useEffect(() => { buscar(dias) }, [dias, buscar])

  return (
    <div className="space-y-4">
      {/* Seletor de prazo */}
      <div className="admin-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-mute)' }}>
          Sem voltar há mais de
        </p>
        <div className="flex flex-wrap gap-2">
          {DIAS_OPCOES.map((d) => {
            const ativo = d === dias
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDias(d)}
                aria-pressed={ativo}
                className="px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  background: ativo ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                  color: ativo ? '#fff' : 'var(--admin-text-2)',
                  border: `1px solid ${ativo ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                }}
              >
                {d} dias
              </button>
            )
          })}
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-faded)' }}>
          Quem já tem horário marcado à frente não entra na lista.
        </p>
      </div>

      {/* Contador */}
      {!loading && !erro && (
        <div className="admin-card p-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
            <IconUsers size={12} /> Encontradas
          </span>
          <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--admin-accent)' }}>
            {clientes.length}
          </span>
        </div>
      )}

      {/* Editor do texto · dentro da aba, nao em outra tela (Eduardo, 06/09).
          Nada dispara sozinho: o link abre o WhatsApp com o texto preenchido
          e a dona ainda revisa antes de enviar. */}
      {!loading && !erro && (
        <div className="admin-card p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
              <IconPencil size={12} /> Mensagem do WhatsApp
            </p>
            {podeEditarTexto && !editando && (
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="text-xs font-semibold"
                style={{ color: 'var(--admin-accent)' }}
              >
                Editar
              </button>
            )}
          </div>

          {editando ? (
            <>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={4}
                maxLength={700}
                className="admin-input w-full px-3 py-2 text-sm"
                placeholder="Sua mensagem…"
              />
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded)' }}>
                <strong style={{ color: 'var(--admin-text-2)' }}>{'{nome}'}</strong>,{' '}
                <strong style={{ color: 'var(--admin-text-2)' }}>{'{dias}'}</strong> e{' '}
                <strong style={{ color: 'var(--admin-text-2)' }}>{'{negocio}'}</strong> são
                trocados pelos dados de cada cliente.
              </p>
              {erroTexto && (
                <p className="text-xs mt-2" style={{ color: 'var(--admin-danger,#EF4444)' }}>{erroTexto}</p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={salvarTexto}
                  disabled={salvando}
                  className="px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5"
                  style={{ background: 'var(--admin-accent)', color: '#fff', opacity: salvando ? 0.6 : 1 }}
                >
                  <IconCheck size={14} /> {salvando ? 'Salvando…' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setTexto(textoSalvo); setEditando(false); setErroTexto(null) }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)', border: '1px solid var(--admin-border)' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setTexto(SUMIDOS_TEMPLATE_PADRAO)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold ml-auto"
                  style={{ color: 'var(--admin-text-faded)' }}
                >
                  Voltar ao padrão
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
              {previa}
            </p>
          )}

          {editando && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--admin-divider)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                Como vai chegar
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--admin-text)' }}>{previa}</p>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="admin-card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>Carregando…</p>
        </div>
      )}

      {erro && (
        <div className="admin-card p-6 text-center">
          <p className="text-sm mb-3" style={{ color: 'var(--admin-text-2)' }}>{erro}</p>
          <button
            type="button"
            onClick={() => buscar(dias)}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--admin-accent)', color: '#fff' }}
          >
            Tentar de novo
          </button>
        </div>
      )}

      {!loading && !erro && clientes.length === 0 && (
        <div className="admin-card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
            Ninguém passou de {dias} dias sem voltar. Boa notícia.
          </p>
        </div>
      )}

      {!loading && !erro && clientes.length > 0 && (
        <div className="space-y-2">
          {clientes.map((c) => (
            <div key={c.id} className="admin-card p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                  {c.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                  <IconClock size={11} />{' '}
                  <strong style={{ color: 'var(--admin-text-2)' }}>faz {c.diasSem} dias</strong>
                  {' · última em '}{dataBR(c.ultima)}
                </p>
              </div>
              {c.phone ? (
                <a
                  href={linkWhatsappSumidos(
                    c.phone,
                    preencherSumidos(textoSalvo, { nome: c.name, dias: c.diasSem, negocio }),
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-3 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5"
                  style={{ background: 'var(--admin-accent)', color: '#fff' }}
                >
                  <IconWhatsapp size={14} /> WhatsApp
                </a>
              ) : (
                <span className="shrink-0 text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
                  sem telefone
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Campanha continua sendo um passo separado e deliberado */}
      {mostrarLinkCampanha && !loading && clientes.length > 0 && (
        <Link
          href="/admin/clientes/reativar"
          className="admin-card p-4 flex items-center justify-between gap-3 no-underline"
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              Criar campanha com cupom
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
              Gera um cupom único por cliente e monta a leva de envio
            </p>
          </div>
          <IconChevronRight size={18} />
        </Link>
      )}
    </div>
  )
}
