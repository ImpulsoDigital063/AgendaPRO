'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IconClose, IconCalendar, IconClock, IconDollar, IconUser, IconExternalLink } from '@/components/ui/Icon'
import AppointmentActions from './AppointmentActions'
import ClientFichaSection from '../clientes/ClientFichaSection'
import Link from 'next/link'

type Props = {
  appointmentId: string | null
  businessId: string
  onClose: (precisaRecarregar?: boolean) => void
  /** Avisa quem desenha a grade que o atendimento virou pago, pra pintar
   *  localmente em vez de recarregar a pagina toda. */
  onPago?: (id: string, dados: { paid_at: string; total_price?: number | null }) => void
}

type ApptDetail = {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  /** v146 · quando a cliente tocou em "Confirmar presença" no WhatsApp.
   *  NULL = ela não respondeu. NÃO confunda com `status`, que já nasce
   *  'confirmed' em todos os caminhos de criação. */
  confirmado_em: string | null
  paid_at: string | null
  payment_method: string | null
  total_price: number | null
  sinal_valor?: number | null
  sinal_pago_at?: string | null

  notes: string | null
  client_name: string | null
  client_phone: string | null
  customer_id: string | null
  service_name: string | null
  appointment_services: { service_name: string | null; price: number | null }[] | null
  professional: { id: string; name: string } | { id: string; name: string }[] | null
  /** Convênio (CAF · 21/08): sem isso o dono abria o atendimento e não via de
   *  qual empresa era — só o card da grade dizia. */
  company: { id: string; name: string } | { id: string; name: string }[] | null
  customer: { id: string; name: string; phone: string; email: string | null } | { id: string; name: string; phone: string; email: string | null }[] | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando confirmação',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#1AA9A8',
  completed: '#3B82F6',
  cancelled: '#EF4444',
  no_show: '#94A3B8',
}

/** Item de produto lançado na comanda do atendimento (combo / vendido junto). */
type ComandaProduto = { description: string; quantity: number; unit_price: number; total: number }

function formatBRL(v: number | null): string {
  if (v == null) return 'R$ 0,00'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateLong(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}

export default function AppointmentDrawer({ appointmentId, businessId, onClose, onPago }: Props) {
  const pathname = usePathname()
  const ehAreaProfissional = pathname.startsWith('/profissional')
  // Quem está logada · usado só pra decidir se o "Cancelar atendimento" aparece
  // (v98n · profissional cancela só o dela; o da colega é da adm)
  const [meuProfId, setMeuProfId] = useState<string | null>(null)
  const [data, setData] = useState<ApptDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  // Produtos lançados na comanda deste atendimento (combo ou "vendido junto").
  // appointments.total_price guarda SÓ o serviço (é a base da comissão), então
  // sem isso o drawer mostrava R$195 num combo que a cliente paga R$290.
  const [comanda, setComanda] = useState<{ produtos: ComandaProduto[]; total: number | null }>({ produtos: [], total: null })

  useEffect(() => { setPortalReady(true) }, [])

  // Só na área da profissional: descobre o id dela pra comparar com o dono do
  // atendimento. No admin/recepção não roda — lá pode cancelar tudo.
  useEffect(() => {
    if (!ehAreaProfissional) return
    const sb = createClient()
    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: p } = await sb
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      setMeuProfId(p?.id ?? null)
    })()
  }, [ehAreaProfissional])

  useEffect(() => {
    if (!appointmentId) {
      setData(null)
      return
    }
    setLoading(true)
    const sb = createClient()
    sb.from('appointments')
      .select(`
        id, appointment_date, start_time, end_time, status, confirmado_em, paid_at,
        payment_method, total_price, notes, sinal_valor, sinal_pago_at,
        client_name, client_phone, customer_id,
        service_name,
        appointment_services(service_name, price),
        professional:professionals(id, name),
        company:companies(id, name),
        customer:customers(id, name, phone, email)
      `)
      .eq('id', appointmentId)
      .maybeSingle()
      .then(({ data: d }) => {
        setData(d as ApptDetail | null)
        setLoading(false)
      })
  }, [appointmentId])

  // Comanda do atendimento · pega os PRODUTOS e o total real cobrado.
  useEffect(() => {
    if (!appointmentId) return
    let cancelled = false
    const sb = createClient()
    ;(async () => {
      // zera antes de buscar · evita mostrar o produto do atendimento anterior
      setComanda({ produtos: [], total: null })
      // invoice do atendimento (o trigger cria uma por atendimento)
      const { data: ref } = await sb
        .from('invoice_items')
        .select('invoice_id')
        .eq('reference_id', appointmentId)
        .eq('item_type', 'appointment')
        .maybeSingle()
      if (cancelled || !ref?.invoice_id) return

      const [{ data: itens }, { data: inv }] = await Promise.all([
        sb.from('invoice_items')
          .select('description, quantity, unit_price, total, item_type')
          .eq('invoice_id', ref.invoice_id)
          .eq('item_type', 'product'),
        sb.from('invoices').select('total').eq('id', ref.invoice_id).maybeSingle(),
      ])
      if (cancelled) return
      setComanda({
        produtos: (itens ?? []).map((i) => ({
          description: i.description as string,
          quantity: Number(i.quantity ?? 0),
          unit_price: Number(i.unit_price ?? 0),
          total: Number(i.total ?? 0),
        })),
        total: inv?.total != null ? Number(inv.total) : null,
      })
    })()
    return () => { cancelled = true }
  }, [appointmentId])

  useEffect(() => {
    if (!appointmentId) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [appointmentId, onClose])

  if (!appointmentId || !portalReady) return null

  const prof = data && (Array.isArray(data.professional) ? data.professional[0] : data.professional)
  const empresaConvenio = data && (Array.isArray(data.company) ? data.company[0] : data.company)
  const customer = data && (Array.isArray(data.customer) ? data.customer[0] : data.customer)
  const status = data?.status ?? 'pending'
  const statusLabel = STATUS_LABEL[status] ?? status
  const statusColor = STATUS_COLOR[status] ?? '#94A3B8'
  const isPaid = !!data?.paid_at
  const isCancelled = status === 'cancelled' || status === 'no_show'

  return createPortal(
    <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true">
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={() => onClose(false)}
      />

      {/* Drawer lateral · padrão 3D premium.
          LARGURA POR BREAKPOINT (AGENTS.md · isolamento mobile/desktop):
          sem prefixo = min(520px,100vw), que num celular dá 100vw — ou seja,
          MOBILE NÃO MUDA. De tablet pra cima ele abre, porque é ali que a
          ficha do cliente é preenchida com teclado e mouse e 520px espremia
          o formulário numa coluna estreita à toa (pedido do Eduardo 09/08).
          O drawer de cliente já era 880px; este era o único ainda em 520. */}
      <div
        className="absolute inset-y-0 right-0 flex flex-col w-[min(520px,100vw)] md:w-[min(720px,100vw)] xl:w-[min(880px,100vw)]"
        style={{
          background: 'var(--admin-surface)',
          boxShadow: '-12px 0 32px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header sticky */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-3 flex-shrink-0"
          style={{
            background: 'var(--admin-surface-hi)',
            borderBottom: '1px solid var(--admin-border)',
          }}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
              Atendimento
            </p>
            <p className="text-base font-bold truncate" style={{ color: 'var(--admin-text)' }}>
              {data?.service_name ?? (loading ? 'Carregando...' : 'Serviço')}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* "Abrir em tela cheia" leva pra /admin/atendimentos, que é rota de
                dono — a profissional seria chutada pro painel dela. Esconde na
                área dela em vez de entregar botão que não funciona (30/07). */}
            {data && !ehAreaProfissional && (
              <Link
                href={`/admin/atendimentos/${data.id}`}
                aria-label="Abrir em tela cheia"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--admin-input-bg)]"
                style={{ color: 'var(--admin-text-mute)' }}
                title="Abrir página completa"
              >
                <IconExternalLink size={14} />
              </Link>
            )}
            <button
              type="button"
              onClick={() => onClose(false)}
              aria-label="Fechar"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--admin-input-bg)]"
              style={{ color: 'var(--admin-text-mute)' }}
            >
              <IconClose size={16} />
            </button>
          </div>
        </div>

        {/* Body scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <p className="text-center text-sm py-10" style={{ color: 'var(--admin-text-mute)' }}>
              Carregando...
            </p>
          )}

          {data && (
            <>
              {/* Status + Pago */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${statusColor} 0%, color-mix(in srgb, ${statusColor} 75%, black) 100%)`,
                    color: '#fff',
                    boxShadow: `0 2px 6px -1px color-mix(in srgb, ${statusColor} 50%, transparent), inset 0 1px 0 rgba(255,255,255,0.3)`,
                  }}
                >
                  {statusLabel}
                </span>
                {/* ── CONFIRMADO PELA CLIENTE ─────────────────────────
                    Vem SEPARADO do status de propósito. O status diz que o
                    horário está de pé na agenda; este selo diz que a PESSOA
                    respondeu que vem. São coisas diferentes, e era a segunda
                    que faltava — a dona mandava o lembrete e continuava sem
                    saber quem ia aparecer. */}
                {data?.confirmado_em && (
                  <span
                    className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full inline-flex items-center gap-1"
                    style={{
                      background: 'linear-gradient(135deg, #00A884 0%, #008069 100%)',
                      color: '#fff',
                      boxShadow: '0 2px 6px -1px rgba(0,128,105,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
                    }}
                    title={`Confirmou pelo WhatsApp em ${new Date(data.confirmado_em).toLocaleString('pt-BR')}`}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M4 12.5l5.5 5.5L20 7"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Ela confirmou
                  </span>
                )}
                {isPaid && (
                  <span
                    className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#fff',
                      boxShadow: '0 2px 6px -1px rgba(5,150,105,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                    }}
                  >
                    ✓ Pago
                  </span>
                )}
              </div>

              {/* Rows */}
              <div className="space-y-3">
                <Row icon={<IconUser size={16} />} label="Cliente" value={data.client_name ?? customer?.name ?? '—'} sub={data.client_phone ?? customer?.phone ?? undefined} />
                <Row icon={<IconCalendar size={16} />} label="Quando" value={<span className="capitalize">{formatDateLong(data.appointment_date)}</span>} sub={`${data.start_time.slice(0, 5)} até ${data.end_time.slice(0, 5)}`} />
                <Row icon={<IconClock size={16} />} label="Profissional" value={prof?.name ?? '—'} />
                {empresaConvenio && (
                  <Row
                    icon={<IconUser size={16} />}
                    label="Convênio"
                    value={empresaConvenio.name}
                    sub="Quem paga é a empresa · não entra no caixa do dia"
                  />
                )}
                {(() => {
                  // Valor exibido = o que a cliente PAGA (total da comanda).
                  // total_price sozinho é só o serviço — num combo isso mostrava
                  // R$195 numa conta de R$290 (Eduardo 21/07).
                  const temProduto = comanda.produtos.length > 0
                  const valorCobrado = temProduto && comanda.total != null ? comanda.total : data.total_price
                  /* Sinal já pago aparece AQUI também (05/08). A comanda já
                     mostrava "falta receber", mas quem abre o atendimento pra
                     conferir via só R$ 45 — e é essa a tela que ela olha antes
                     de cobrar a cliente na cadeira. */
                  const sinalPago = data.sinal_pago_at ? Number(data.sinal_valor ?? 0) : 0
                  const falta = Math.max(0, Number(valorCobrado ?? 0) - sinalPago)
                  return (
                    <Row
                      icon={<IconDollar size={16} />}
                      label="Valor"
                      value={
                        <span className="font-bold text-lg" style={{ color: 'var(--admin-text)' }}>
                          {formatBRL(valorCobrado)}
                          {sinalPago > 0 && !data.paid_at && (
                            <span className="ml-2 text-xs font-semibold" style={{ color: '#059669' }}>
                              · falta {formatBRL(falta)}
                            </span>
                          )}
                        </span>
                      }
                      sub={
                        sinalPago > 0
                          ? `Sinal de ${formatBRL(sinalPago)} já pago no PIX`
                          : data.payment_method ?? undefined
                      }
                    />
                  )
                })()}
                {(() => {
                  const svcs = (data.appointment_services ?? []).filter((s) => s.service_name)
                  const prods = comanda.produtos
                  // Detalha quando há produto (combo / vendido junto) OU mais de
                  // um serviço. Atendimento simples continua sem lista.
                  if (prods.length === 0 && svcs.length < 2) return null
                  return (
                    <div className="pt-3 border-t" style={{ borderColor: 'var(--admin-divider)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--admin-text-faded)' }}>
                        {prods.length > 0 ? 'O que está incluso' : 'Serviços'}
                      </p>
                      <div className="space-y-1.5">
                        {(svcs.length > 0
                          ? svcs
                          : [{ service_name: data.service_name, price: data.total_price }]
                        ).map((s, i) => (
                          <div key={`s${i}`} className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate" style={{ color: 'var(--admin-text-2)' }}>{s.service_name}</span>
                            <span className="font-semibold flex-shrink-0" style={{ color: 'var(--admin-text)' }}>{formatBRL(s.price)}</span>
                          </div>
                        ))}
                        {prods.map((p, i) => (
                          <div key={`p${i}`} className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate" style={{ color: 'var(--admin-text-2)' }}>
                              {p.quantity !== 1 && (
                                <span className="tabular-nums font-semibold" style={{ color: 'var(--admin-accent)' }}>
                                  {p.quantity.toLocaleString('pt-BR')}× </span>
                              )}
                              {p.description}
                            </span>
                            <span className="font-semibold flex-shrink-0" style={{ color: 'var(--admin-text)' }}>{formatBRL(p.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                {data.notes && (
                  <div className="pt-3 border-t" style={{ borderColor: 'var(--admin-divider)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                      Observação
                    </p>
                    <p className="text-sm" style={{ color: 'var(--admin-text-2)' }}>{data.notes}</p>
                  </div>
                )}
              </div>

              {/* Ficha do cliente · abre o FichasTab aqui dentro do atendimento */}
              {data.customer_id && (
                <ClientFichaSection customerId={data.customer_id} />
              )}

              {/* SINAL PENDENTE (v112c) · Eduardo: "tive que ir na aba sinal
                  pra poder autorizar, sendo que podia mostrar na grade".
                  Certo — quem abre o atendimento pra ver ja deveria poder
                  confirmar ali. A aba continua existindo pra quem quer a
                  lista do dia; isto aqui e pro caso a caso. */}
              {!ehAreaProfissional && data.sinal_valor && !data.sinal_pago_at && (
                <div
                  className="rounded-xl px-4 py-3 mb-3"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-xs font-semibold" style={{ color: '#B45309' }}>
                      Aguardando sinal
                    </span>
                    <span className="text-sm font-black tabular-nums" style={{ color: '#B45309' }}>
                      {Number(data.sinal_valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      const r = await fetch('/api/admin/sinal', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ appointmentId, acao: 'recebi' }),
                      }).then((x) => x.json()).catch(() => null)
                      if (r?.ok) onClose(true)
                    }}
                    className="w-full py-2.5 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid rgba(16,185,129,0.35)' }}
                  >
                    Recebi o sinal — confirmar horário
                  </button>
                  {/* DISPENSAR (v118) · sem esta opção a dona usaria o botão de
                      cima como atalho pra não cobrar da cliente de confiança —
                      e aí a comanda abateria um sinal que nunca entrou, fazendo
                      ela cobrar a menos sem perceber. Aqui o horário confirma e
                      o sinal some de verdade. */}
                  <button
                    onClick={async () => {
                      if (!confirm('Confirmar o horário sem cobrar o sinal?')) return
                      const r = await fetch('/api/admin/sinal', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ appointmentId, acao: 'dispensar' }),
                      }).then((x) => x.json()).catch(() => null)
                      if (r?.ok) onClose(true)
                    }}
                    className="w-full py-2 rounded-lg text-[11px] font-semibold mt-1.5"
                    style={{ background: 'transparent', color: '#B45309' }}
                  >
                    Não vou cobrar dessa cliente
                  </button>
                </div>
              )}

              {/* Ações · sem mostrar pra cancelados */}
              {!isCancelled && (
                <AppointmentActions
                  appointmentId={data.id}
                  isPaid={isPaid}
                  backHref={`/admin?date=${data.appointment_date}`}
                  customerName={data.client_name ?? customer?.name ?? 'Cliente'}
                  customerPhone={data.client_phone ?? customer?.phone ?? null}
                  businessId={businessId}
                  startTime={data.start_time}
                  totalPrice={data.total_price}
                  serviceName={data.service_name}
                  professionalId={prof?.id ?? null}
                  // Convênio troca o "Faturar" por "Marcar como atendido": a
                  // cobrança é da empresa, no extrato, nunca no balcão.
                  convenioNome={empresaConvenio?.name ?? null}
                  jaAtendido={status === 'completed'}
                  // Pagamento: avisa a grade e fecha SEM recarregar a pagina.
                  // Cancelar/remarcar mudam a posicao do card, entao esses
                  // continuam pedindo os dados do servidor (onDone padrao).
                  onPago={(dados) => {
                    if (appointmentId && onPago) onPago(appointmentId, dados)
                    onClose(!onPago)
                  }}
                  onDone={() => onClose(true)}
                  // Na área da profissional, "Cancelar" só aparece no que é dela
                  // E enquanto não estiver pago — depois do pagamento é a dona
                  // quem desfaz (30/07). No admin/recepção nada muda.
                  podeCancelar={
                    !ehAreaProfissional ||
                    (!!meuProfId && meuProfId === prof?.id && !isPaid)
                  }
                  appointmentDate={data.appointment_date}
                  // Remarcar segue a régua de MARCAR (a colega pode, com a flag
                  // de equipe) — mas atendimento pago volta a ser da adm.
                  podeRemarcar={!ehAreaProfissional || !isPaid}
                  // Valor do atendimento fica com dono e recepção. Deixar a
                  // profissional editar seria deixar ela definir a base da
                  // própria comissão (Eduardo, 03/08). Chave reversível.
                  podeEditarValor={!ehAreaProfissional}
                  sinalPago={data.sinal_pago_at ? Number(data.sinal_valor ?? 0) : 0}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Row({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-mute)' }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
          {label}
        </p>
        <div className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{value}</div>
        {sub && (
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>{sub}</p>
        )}
      </div>
    </div>
  )
}
