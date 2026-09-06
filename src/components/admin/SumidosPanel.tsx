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
import { IconWhatsapp, IconClock, IconUsers, IconChevronRight } from '@/components/ui/Icon'

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
}

function linkWhatsapp(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  // Telefone já salvo com DDI não vira 5555…
  const comDDI = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${comDDI}`
}

function dataBR(ymd: string): string {
  return new Date(ymd + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

export default function SumidosPanel({ mostrarLinkCampanha = false }: Props) {
  const [dias, setDias] = useState(40)
  const [clientes, setClientes] = useState<Sumido[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscar = useCallback(async (d: number) => {
    setLoading(true)
    setErro(null)
    try {
      const res = await fetch(`/api/admin/sumidos?dias=${d}`)
      if (!res.ok) throw new Error('falhou')
      const json = await res.json()
      setClientes(json.clientes ?? [])
    } catch {
      setErro('Não consegui carregar a lista. Tenta de novo.')
      setClientes([])
    } finally {
      setLoading(false)
    }
  }, [])

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
                  href={linkWhatsapp(c.phone)}
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
