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
 * TEXTO E LINK: reusa o sistema que já existe, não um novo (Eduardo, 06/09).
 * templates por nicho de coupon-templates + POST /api/admin/coupons/campaign,
 * que agora aceita `dias`. O único acréscimo foi o prazo: a rota tinha 40 fixo.
 *
 * ORGANIZAÇÃO (Eduardo, 06/09 — "melhora tudo"): a lista é agrupada por faixa
 * de urgência, porque quem sumiu há 70 dias e quem sumiu há 16 não pedem a
 * mesma atitude. Ordem estável (dias desc, depois nome) — antes empatava e
 * embaralhava. Busca aparece quando a lista passa de 8. Teto de 60 linhas com
 * "mostrar mais", senão 15 dias num salão real despeja 200 cards de uma vez.
 *
 * Cor: --admin-accent (a cor da dona). É o negócio DELA operando, não o
 * AgendaPRO falando — ver a regra de cor do painel.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  IconWhatsapp, IconUsers, IconChevronRight, IconCheck, IconSearch, IconClose,
} from '@/components/ui/Icon'
import {
  suggestTemplates, sampleNameFor, fillTemplate, formatDiscount, formatValidity,
} from '@/lib/coupon-templates'

const DIAS_OPCOES = [15, 20, 25, 30, 40, 60]
const TETO_INICIAL = 60

type Sumido = { id: string; name: string; phone: string | null; ultima: string; diasSem: number }

type CupomGerado = {
  coupon: {
    id: string; code: string; discount_type: 'fixed' | 'percent'
    discount_value: number; expires_at: string; whatsapp_message: string | null
  }
  customer: { name: string; phone: string } | null
}

type Props = {
  mostrarLinkCampanha?: boolean
  /** Só a dona cria campanha/cupom. Recepção vê a lista e chama no WhatsApp. */
  podeCriarCampanha?: boolean
}

/** Faixas de urgência. A primeira que casa manda. */
const FAIXAS = [
  { min: 90, titulo: 'Há mais de 3 meses', tom: 'danger' as const },
  { min: 60, titulo: 'Há mais de 2 meses', tom: 'danger' as const },
  { min: 30, titulo: 'Há mais de 1 mês', tom: 'warn' as const },
  { min: 0, titulo: 'Nas últimas semanas', tom: 'calmo' as const },
]

const TONS = {
  danger: { bg: 'rgba(239,68,68,0.12)', fg: 'var(--admin-danger,#EF4444)' },
  warn: { bg: 'rgba(245,158,11,0.15)', fg: 'var(--admin-warn)' },
  calmo: { bg: 'var(--admin-accent-bg)', fg: 'var(--admin-accent)' },
}

function faixaDe(dias: number) {
  return FAIXAS.find((f) => dias >= f.min) ?? FAIXAS[FAIXAS.length - 1]
}

function dataBR(ymd: string): string {
  return new Date(ymd + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?'
}

/** wa.me sem cupom — usado antes de a dona montar a campanha. */
function linkSimples(phone: string): string {
  const d = phone.replace(/\D/g, '')
  return `https://wa.me/${d.startsWith('55') ? d : `55${d}`}`
}

function normaliza(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export default function SumidosPanel({ mostrarLinkCampanha = false, podeCriarCampanha = false }: Props) {
  const [dias, setDias] = useState(40)
  const [clientes, setClientes] = useState<Sumido[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [negocio, setNegocio] = useState('')
  const [slug, setSlug] = useState('')
  const [descricao, setDescricao] = useState<string | null>(null)

  const [busca, setBusca] = useState('')
  const [teto, setTeto] = useState(TETO_INICIAL)

  const [abrirMsg, setAbrirMsg] = useState(false)
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountValue, setDiscountValue] = useState('10')
  const [validityDays, setValidityDays] = useState('14')
  const [templateIdx, setTemplateIdx] = useState(0)
  const [customMessage, setCustomMessage] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erroMsg, setErroMsg] = useState<string | null>(null)
  const [cupons, setCupons] = useState<CupomGerado[] | null>(null)
  const [enviados, setEnviados] = useState<Record<string, boolean>>({})

  const templates = useMemo(() => suggestTemplates(descricao), [descricao])
  const sampleName = useMemo(() => sampleNameFor(descricao), [descricao])

  const buscar = useCallback(async (d: number) => {
    setLoading(true); setErro(null)
    try {
      const res = await fetch(`/api/admin/sumidos?dias=${d}`)
      if (!res.ok) throw new Error('falhou')
      const json = await res.json()
      setClientes(json.clientes ?? [])
      setNegocio(json.negocio ?? '')
      setSlug(json.slug ?? '')
      setDescricao(json.descricao ?? null)
    } catch {
      setErro('Não consegui carregar a lista. Tenta de novo.')
      setClientes([])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { buscar(dias) }, [dias, buscar])
  // Trocar o prazo invalida a campanha do prazo anterior
  useEffect(() => { setCupons(null); setAbrirMsg(false); setBusca(''); setTeto(TETO_INICIAL) }, [dias])
  useEffect(() => {
    if (!customMessage || customMessage === templates[templateIdx]) {
      setCustomMessage(templates[templateIdx] || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateIdx, templates])

  /* Ordem ESTÁVEL: mais dias primeiro, empate resolvido por nome. Antes o
     empate ficava na ordem que o banco devolveu e a lista embaralhava a cada
     carga (G70 2, G70 3, G70 1 no print do Eduardo). */
  const ordenados = useMemo(() => {
    const q = normaliza(busca.trim())
    return [...clientes]
      .filter((c) => !q || normaliza(c.name).includes(q))
      .sort((a, b) => b.diasSem - a.diasSem || a.name.localeCompare(b.name, 'pt-BR'))
  }, [clientes, busca])

  const visiveis = ordenados.slice(0, teto)

  /** Agrupa os visíveis por faixa, preservando a ordem. */
  const grupos = useMemo(() => {
    const out: { titulo: string; tom: keyof typeof TONS; itens: Sumido[] }[] = []
    for (const c of visiveis) {
      const f = faixaDe(c.diasSem)
      const ultimo = out[out.length - 1]
      if (ultimo && ultimo.titulo === f.titulo) ultimo.itens.push(c)
      else out.push({ titulo: f.titulo, tom: f.tom, itens: [c] })
    }
    return out
  }, [visiveis])

  const previa = useMemo(() => {
    const base = customMessage || templates[templateIdx] || ''
    const expira = new Date(Date.now() + Number(validityDays || 14) * 86400000)
    return fillTemplate(base, {
      nome: sampleName,
      negocio: negocio || 'seu negócio',
      desconto: formatDiscount(discountType, Number(discountValue) || 0),
      validade: formatValidity(expira),
      link: `.../${slug || 'seu-link'}?cupom=XXXX`,
    })
  }, [customMessage, templates, templateIdx, validityDays, sampleName, negocio, discountType, discountValue, slug])

  async function criarCampanha() {
    setErroMsg(null)
    const v = Number(discountValue)
    if (!Number.isFinite(v) || v <= 0) return setErroMsg('Valor do desconto inválido')
    if (discountType === 'percent' && v > 100) return setErroMsg('Percentual máximo 100%')
    const d = Number(validityDays)
    if (!Number.isFinite(d) || d < 1 || d > 365) return setErroMsg('Validade entre 1 e 365 dias')
    if (!customMessage.trim()) return setErroMsg('Mensagem obrigatória')

    setEnviando(true)
    try {
      const res = await fetch('/api/admin/coupons/campaign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          discount_type: discountType, discount_value: v,
          validity_days: d, message_template: customMessage, dias,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Erro')
      setCupons(json.coupons || [])
      setAbrirMsg(false)
    } catch (e) {
      setErroMsg(e instanceof Error ? e.message : 'Erro')
    } finally { setEnviando(false) }
  }

  function abrirWhatsApp(item: CupomGerado) {
    if (!item.customer) return
    const fone = item.customer.phone.replace(/\D/g, '')
    if (fone.length < 10) return
    const msg = fillTemplate(item.coupon.whatsapp_message || '', {
      nome: item.customer.name,
      negocio,
      desconto: formatDiscount(item.coupon.discount_type, Number(item.coupon.discount_value)),
      validade: formatValidity(new Date(item.coupon.expires_at)),
      link: `${window.location.origin}/${slug}?cupom=${item.coupon.code}`,
    })
    window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer')
    setEnviados((p) => ({ ...p, [item.coupon.id]: true }))
    fetch(`/api/admin/coupons/${item.coupon.id}/sent`, { method: 'POST' }).catch(() => {})
  }

  const solido = { background: 'var(--admin-accent)', color: '#fff', border: '1px solid var(--admin-accent)' }
  const vazio = { background: 'var(--admin-input-bg)', color: 'var(--admin-text-2)', border: '1px solid var(--admin-border)' }
  const enviadosCount = Object.keys(enviados).length

  return (
    <div className="space-y-3">
      {/* ── Seletor de prazo · controle segmentado, não 6 pílulas soltas ── */}
      <div className="admin-card p-3 sm:p-4">
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
            Sem voltar há mais de
          </p>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
            quem tem hora marcada não conta
          </p>
        </div>
        <div
          className="grid grid-cols-6 gap-0 rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--admin-border)' }}
          role="group"
          aria-label="Prazo"
        >
          {DIAS_OPCOES.map((d, i) => {
            const ativo = d === dias
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDias(d)}
                aria-pressed={ativo}
                className="py-2.5 text-sm font-semibold transition-colors"
                style={{
                  background: ativo ? 'var(--admin-accent)' : 'transparent',
                  color: ativo ? '#fff' : 'var(--admin-text-2)',
                  borderLeft: i === 0 ? 'none' : '1px solid var(--admin-border)',
                }}
              >
                {d}
                <span className="hidden sm:inline text-[11px] font-normal opacity-75">{' '}dias</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Resumo + ação principal, numa linha só ── */}
      {!loading && !erro && (
        <div className="admin-card p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0"
              style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}
            >
              <IconUsers size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-[20px] font-bold leading-none tabular-nums" style={{ color: 'var(--admin-text)' }}>
                {ordenados.length}
                <span className="text-sm font-semibold ml-1.5" style={{ color: 'var(--admin-text-2)' }}>
                  {ordenados.length === 1 ? 'cliente' : 'clientes'}
                </span>
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>
                sem voltar há mais de {dias} dias
                {busca.trim() && ` · filtrando "${busca.trim()}"`}
              </p>
            </div>
          </div>

          {podeCriarCampanha && clientes.length > 0 && !cupons && (
            <button
              type="button"
              onClick={() => setAbrirMsg((v) => !v)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0"
              style={abrirMsg ? vazio : solido}
            >
              {abrirMsg ? 'Fechar' : 'Criar mensagem'}
            </button>
          )}
        </div>
      )}

      {/* ── Montagem da mensagem · sistema existente (templates por nicho) ── */}
      {abrirMsg && !cupons && (
        <div className="admin-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>Desconto</p>
              <div className="flex gap-1.5">
                {(['fixed', 'percent'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setDiscountType(t)}
                    className="px-3 py-2 rounded-lg text-xs font-bold" style={discountType === t ? solido : vazio}>
                    {t === 'fixed' ? 'R$' : '%'}
                  </button>
                ))}
                <input type="number" inputMode="numeric" value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="admin-input flex-1 min-w-0 px-2 py-2 text-sm" />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>Cupom vale</p>
              <div className="flex items-center gap-2">
                <input type="number" inputMode="numeric" value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  className="admin-input flex-1 min-w-0 px-2 py-2 text-sm" />
                <span className="text-xs shrink-0" style={{ color: 'var(--admin-text-faded)' }}>dias</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>
              Modelo · {templates.length} sugeridos pro seu nicho
            </p>
            <div className="flex flex-wrap gap-1.5">
              {templates.map((_, i) => (
                <button key={i} type="button" onClick={() => setTemplateIdx(i)}
                  className="w-9 h-9 rounded-lg text-xs font-bold" style={i === templateIdx ? solido : vazio}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)}
            rows={4} maxLength={2000} className="admin-input w-full px-3 py-2 text-sm"
            placeholder="Sua mensagem aqui..." />
          <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
            <strong style={{ color: 'var(--admin-accent)' }}>{'{nome}'} {'{negocio}'} {'{desconto}'} {'{validade}'} {'{link}'}</strong>
            {' '}viram os dados de cada cliente.
          </p>

          <div className="rounded-xl p-3" style={{ background: 'var(--admin-input-bg)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-faded)' }}>
              Como chega pra {sampleName}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--admin-text)' }}>{previa}</p>
          </div>

          {erroMsg && <p className="text-xs" style={{ color: 'var(--admin-danger,#EF4444)' }}>{erroMsg}</p>}

          <button type="button" onClick={criarCampanha} disabled={enviando}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            style={{ ...solido, opacity: enviando ? 0.6 : 1 }}>
            <IconCheck size={15} />
            {enviando ? 'Gerando…' : `Gerar cupom para ${clientes.length}`}
          </button>
        </div>
      )}

      {/* ── Busca · só quando a lista justifica ── */}
      {!loading && !erro && clientes.length > 8 && !cupons && (
        <div className="admin-card px-3 py-2 flex items-center gap-2">
          <IconSearch size={15} />
          <input
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setTeto(TETO_INICIAL) }}
            placeholder="Procurar pelo nome…"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none py-1"
            style={{ color: 'var(--admin-text)' }}
          />
          {busca && (
            <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca"
              style={{ color: 'var(--admin-text-faded)' }}>
              <IconClose size={15} />
            </button>
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
          <button type="button" onClick={() => buscar(dias)}
            className="px-4 py-2 rounded-xl text-sm font-semibold" style={solido}>Tentar de novo</button>
        </div>
      )}

      {!loading && !erro && clientes.length === 0 && (
        <div className="admin-card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
            Ninguém passou de {dias} dias sem voltar. Boa notícia.
          </p>
        </div>
      )}

      {!loading && !erro && clientes.length > 0 && ordenados.length === 0 && (
        <div className="admin-card p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>
            Nenhum nome com “{busca.trim()}”.
          </p>
        </div>
      )}

      {/* ── Cupons gerados ── */}
      {cupons && cupons.length > 0 && (
        <>
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
              {cupons.length} cupons · toque pra abrir o WhatsApp
            </p>
            <p className="text-[11px] font-semibold tabular-nums" style={{ color: 'var(--admin-accent)' }}>
              {enviadosCount}/{cupons.length} enviados
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {cupons.map((item) => {
              const ja = enviados[item.coupon.id]
              return (
                <div key={item.coupon.id} className="admin-card p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{ background: 'var(--admin-accent-bg)', color: 'var(--admin-accent)' }}>
                      {iniciais(item.customer?.name ?? '?')}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                        {item.customer?.name ?? '—'}
                      </p>
                      <p className="text-[11px] mt-0.5 font-mono" style={{ color: 'var(--admin-text-faded)' }}>
                        {item.coupon.code}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => abrirWhatsApp(item)}
                    className="shrink-0 px-3 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5"
                    style={ja ? vazio : solido}>
                    <IconWhatsapp size={15} />
                    <span className="hidden sm:inline">{ja ? 'Enviado' : 'WhatsApp'}</span>
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Lista agrupada por faixa de urgência ── */}
      {!loading && !erro && !cupons && grupos.map((g) => (
        <div key={g.titulo} className="space-y-2">
          <div className="flex items-center gap-2 px-1 pt-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: TONS[g.tom].fg }} />
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-mute)' }}>
              {g.titulo}
            </p>
            <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--admin-text-faded)' }}>
              {g.itens.length}
            </span>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {g.itens.map((c) => (
              <div key={c.id} className="admin-card p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ background: TONS[g.tom].bg, color: TONS[g.tom].fg }}>
                    {iniciais(c.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{c.name}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-faded)' }}>
                      última em {dataBR(c.ultima)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full tabular-nums"
                    style={{ background: TONS[g.tom].bg, color: TONS[g.tom].fg }}>
                    {c.diasSem}d
                  </span>
                  {c.phone && (
                    <a href={linkSimples(c.phone)} target="_blank" rel="noopener noreferrer"
                      aria-label={`WhatsApp de ${c.name}`}
                      className="px-3 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5"
                      style={solido}>
                      <IconWhatsapp size={15} />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!cupons && ordenados.length > teto && (
        <button type="button" onClick={() => setTeto((t) => t + TETO_INICIAL)}
          className="w-full admin-card p-3 text-sm font-semibold" style={{ color: 'var(--admin-accent)' }}>
          Mostrar mais {Math.min(TETO_INICIAL, ordenados.length - teto)} · de {ordenados.length}
        </button>
      )}

      {mostrarLinkCampanha && !loading && clientes.length > 0 && (
        <Link href="/admin/clientes/reativar" className="admin-card p-4 flex items-center justify-between gap-3 no-underline">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Tela completa de reativação</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
              Cupons ativos, ROI estimado e histórico das campanhas
            </p>
          </div>
          <IconChevronRight size={18} />
        </Link>
      )}
    </div>
  )
}
