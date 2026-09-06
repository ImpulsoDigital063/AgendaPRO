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
 *   - templates por nicho: suggestTemplates(description) de coupon-templates
 *   - preenchimento: fillTemplate com {nome} {negocio} {desconto} {validade} {link}
 *   - cupom + link: POST /api/admin/coupons/campaign, que agora aceita `dias`
 * O único acréscimo foi o prazo: a rota tinha 40 cravado.
 *
 * Cor: --admin-accent (a cor da dona). É o negócio DELA operando, não o
 * AgendaPRO falando — ver a regra de cor do painel.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  IconWhatsapp, IconClock, IconUsers, IconChevronRight, IconCheck,
} from '@/components/ui/Icon'
import {
  suggestTemplates, sampleNameFor, fillTemplate, formatDiscount, formatValidity,
} from '@/lib/coupon-templates'

const DIAS_OPCOES = [15, 20, 25, 30, 40, 60]

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

function dataBR(ymd: string): string {
  return new Date(ymd + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

/** wa.me sem cupom — usado antes de a dona montar a campanha. */
function linkSimples(phone: string): string {
  const d = phone.replace(/\D/g, '')
  return `https://wa.me/${d.startsWith('55') ? d : `55${d}`}`
}

export default function SumidosPanel({ mostrarLinkCampanha = false, podeCriarCampanha = false }: Props) {
  const [dias, setDias] = useState(40)
  const [clientes, setClientes] = useState<Sumido[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [negocio, setNegocio] = useState('')
  const [slug, setSlug] = useState('')
  const [descricao, setDescricao] = useState<string | null>(null)

  // Passo da mensagem · mesma máquina do Reativar
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
  useEffect(() => { setCupons(null); setAbrirMsg(false) }, [dias])
  useEffect(() => {
    if (!customMessage || customMessage === templates[templateIdx]) {
      setCustomMessage(templates[templateIdx] || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateIdx, templates])

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
          validity_days: d, message_template: customMessage,
          dias, // <- o unico acrescimo: o prazo escolhido na aba
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Erro')
      setCupons(json.coupons || [])
    } catch (e) {
      setErroMsg(e instanceof Error ? e.message : 'Erro')
    } finally { setEnviando(false) }
  }

  /** Mesma montagem do Reativar: template preenchido + link do cupom. */
  function abrirWhatsApp(item: CupomGerado) {
    if (!item.customer) return
    const fone = item.customer.phone.replace(/\D/g, '')
    if (fone.length < 10) return
    const expira = new Date(item.coupon.expires_at)
    const msg = fillTemplate(item.coupon.whatsapp_message || '', {
      nome: item.customer.name,
      negocio: negocio,
      desconto: formatDiscount(item.coupon.discount_type, Number(item.coupon.discount_value)),
      validade: formatValidity(expira),
      link: `${window.location.origin}/${slug}?cupom=${item.coupon.code}`,
    })
    window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer')
    setEnviados((p) => ({ ...p, [item.coupon.id]: true }))
    fetch(`/api/admin/coupons/${item.coupon.id}/sent`, { method: 'POST' }).catch(() => {})
  }

  const btn = (ativo: boolean) => ({
    background: ativo ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
    color: ativo ? '#fff' : 'var(--admin-text-2)',
    border: `1px solid ${ativo ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
  })

  return (
    <div className="space-y-4">
      <div className="admin-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-mute)' }}>
          Sem voltar há mais de
        </p>
        <div className="flex flex-wrap gap-2">
          {DIAS_OPCOES.map((d) => (
            <button key={d} type="button" onClick={() => setDias(d)} aria-pressed={d === dias}
              className="px-3 py-2 rounded-xl text-sm font-semibold transition-colors" style={btn(d === dias)}>
              {d} dias
            </button>
          ))}
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--admin-text-faded)' }}>
          Quem já tem horário marcado à frente não entra na lista.
        </p>
      </div>

      {!loading && !erro && (
        <div className="admin-card p-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
            <IconUsers size={12} /> Encontradas
          </span>
          <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--admin-accent)' }}>{clientes.length}</span>
        </div>
      )}

      {loading && <div className="admin-card p-8 text-center"><p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>Carregando…</p></div>}

      {erro && (
        <div className="admin-card p-6 text-center">
          <p className="text-sm mb-3" style={{ color: 'var(--admin-text-2)' }}>{erro}</p>
          <button type="button" onClick={() => buscar(dias)} className="px-4 py-2 rounded-xl text-sm font-semibold" style={btn(true)}>
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

      {/* Passo 2 · texto + cupom + link, com o sistema que ja existe */}
      {!loading && !erro && clientes.length > 0 && podeCriarCampanha && !cupons && (
        <div className="admin-card p-4">
          {!abrirMsg ? (
            <button type="button" onClick={() => setAbrirMsg(true)}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold" style={btn(true)}>
              Criar mensagem para essas {clientes.length}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-mute)' }}>Desconto</p>
                  <div className="flex gap-1.5 mb-1.5">
                    {(['fixed', 'percent'] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setDiscountType(t)}
                        className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold" style={btn(discountType === t)}>
                        {t === 'fixed' ? 'R$' : '%'}
                      </button>
                    ))}
                  </div>
                  <input type="number" inputMode="numeric" value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)} className="admin-input w-full px-2 py-2 text-sm" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-mute)' }}>Cupom vale</p>
                  <input type="number" inputMode="numeric" value={validityDays}
                    onChange={(e) => setValidityDays(e.target.value)} className="admin-input w-full px-2 py-2 text-sm" />
                  <p className="text-[11px] mt-1" style={{ color: 'var(--admin-text-faded)' }}>dias</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-mute)' }}>
                  Modelo ({templates.length} pro seu nicho)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {templates.map((_, i) => (
                    <button key={i} type="button" onClick={() => setTemplateIdx(i)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={btn(i === templateIdx)}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              <textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)}
                rows={4} maxLength={2000} className="admin-input w-full px-3 py-2 text-sm" placeholder="Sua mensagem aqui..." />
              <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
                <strong style={{ color: 'var(--admin-accent)' }}>{'{nome}'}, {'{negocio}'}, {'{desconto}'}, {'{validade}'}</strong> e{' '}
                <strong style={{ color: 'var(--admin-accent)' }}>{'{link}'}</strong> são preenchidos por cliente.
              </p>

              <div className="pt-3" style={{ borderTop: '1px solid var(--admin-divider)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                  Como vai chegar (exemplo: {sampleName})
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--admin-text)' }}>{previa}</p>
              </div>

              {erroMsg && <p className="text-xs" style={{ color: 'var(--admin-danger,#EF4444)' }}>{erroMsg}</p>}

              <div className="flex gap-2">
                <button type="button" onClick={criarCampanha} disabled={enviando}
                  className="px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5"
                  style={{ ...btn(true), opacity: enviando ? 0.6 : 1 }}>
                  <IconCheck size={14} /> {enviando ? 'Gerando…' : 'Gerar cupons'}
                </button>
                <button type="button" onClick={() => setAbrirMsg(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold" style={btn(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Depois da campanha: um botao por cliente, com cupom e link */}
      {cupons && cupons.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>
            {cupons.length} cupons gerados · toque pra abrir o WhatsApp
          </p>
          {cupons.map((item) => (
            <div key={item.coupon.id} className="admin-card p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
                  {item.customer?.name ?? '—'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                  cupom {item.coupon.code}
                </p>
              </div>
              <button type="button" onClick={() => abrirWhatsApp(item)}
                className="shrink-0 px-3 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5"
                style={{ ...btn(true), opacity: enviados[item.coupon.id] ? 0.55 : 1 }}>
                <IconWhatsapp size={14} /> {enviados[item.coupon.id] ? 'Enviado' : 'WhatsApp'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lista crua · antes de montar campanha, ou pra recepcao */}
      {!loading && !erro && !cupons && clientes.length > 0 && (
        <div className="space-y-2">
          {clientes.map((c) => (
            <div key={c.id} className="admin-card p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{c.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
                  <IconClock size={11} />{' '}
                  <strong style={{ color: 'var(--admin-text-2)' }}>faz {c.diasSem} dias</strong>
                  {' · última em '}{dataBR(c.ultima)}
                </p>
              </div>
              {c.phone && (
                <a href={linkSimples(c.phone)} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 px-3 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5" style={btn(true)}>
                  <IconWhatsapp size={14} /> WhatsApp
                </a>
              )}
            </div>
          ))}
        </div>
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
