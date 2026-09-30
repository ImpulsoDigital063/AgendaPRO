'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { AlvoDesconto } from '@/lib/desconto-geral'
import { createClient } from '@/lib/supabase/client'
import { IconClose, IconCheck, IconArrowLeft } from '@/components/ui/Icon'
import {
  CARD_BRANDS,
  CARD_BRAND_LABEL,
  type CardBrand,
  type CardType,
  type MerchantDevice,
  type MerchantDeviceFee,
} from '@/lib/types'

export type PaymentMethodChoice = 'pix' | 'cash' | 'card' | 'points' | null

export type CardPaymentDetails = {
  device_id: string | null
  card_brand: CardBrand
  card_type: CardType
  fee_percent: number
  installments: number
}

type Props = {
  open: boolean
  clientName: string
  totalPrice?: number | null
  /**
   * Sinal já pago (PIX ou crédito) que NÃO entra agora.
   *
   * Eduardo, 06/08: serviço de R$ 50 com sinal de R$ 10 já pago — a comanda
   * dizia "falta receber R$ 40,00" e o passo seguinte perguntava "Como Edu
   * pagou? R$ 50,00". Quem está com a cliente na frente recebe R$ 40 na mão e
   * registra R$ 50 no método escolhido. O total da venda continua R$ 50 (isso
   * está certo e é o que vai pro relatório), mas ESTA tela pergunta sobre o
   * que entra agora — e é ela que a dona usa pra fechar o caixa.
   */
  sinalPago?: number
  /** Cliente disse que pagou no WhatsApp e ninguem conferiu o extrato. */
  sinalDeclarado?: { valor: number; quando: string } | null
  /** Quando fornecido, ao escolher 'card' abre step de detalhes (maquininha + bandeira). */
  businessId?: string
  /** Modo "Atendi +bonus" altera o copy e a cor do header. */
  withPunctualityBonus?: boolean
  punctualityPoints?: number
  /** Copy do header · sobrepõe o default ("Atendimento concluído" / "Como X pagou?").
   *  Ex: venda de pacote usa "Venda de pacote" / "Como X vai pagar?". */
  eyebrow?: string
  heading?: string
  loading?: boolean
  /** Quando fornecido, mostra um botão explícito que dispara onChoose(null) com
   *  esse texto (ex: "Manter comanda aberta" / "Pagar depois"). Sem ele, o modal
   *  só oferece os métodos + fechar (X) — comportamento legado preservado. */
  deferLabel?: string
  /** v100 · libera edicao do valor no ato do pagamento. Opt-in: quem nao passa
   *  segue com o comportamento antigo (valor so exibido). Ver comentario da
   *  rota /appointments/[id]/payment sobre a propagacao pra comanda. */
  permiteEditarValor?: boolean
  /** Wanessa 28/09 · libera "Dar desconto". Opt-in pelo mesmo motivo do
   *  permiteEditarValor: o modal é usado em 7 fluxos e só quem grava o
   *  desconto na comanda (AppointmentActions → /payment) pode ligar. */
  permiteDesconto?: boolean
  /** Esconde "Pontos" (venda de produto no PDV · Eduardo 28/09). */
  semPontos?: boolean
  /** Cliente do atendimento · "Pontos" mostra o saldo dela e as recompensas
   *  (Eduardo 29/09: pontos = resgate de recompensa, não método solto). */
  customerId?: string | null
  /** Sem customerId: o servidor acha a cliente pelo atendimento. */
  appointmentId?: string | null
  /** Comanda tem serviço E produto: pergunta de onde sai o desconto
   *  (Eduardo 28/09 · a comissão depende disso). */
  perguntarOrigemDesconto?: boolean
  /** Erro do chamador (ex: rota recusou o desconto) mostrado DENTRO do modal —
   *  fora dele fica escondido atrás do overlay. */
  erro?: string | null
  /** 3o argumento so chega quando permiteEditarValor esta ligado e o valor mudou.
   *  4o só quando permiteDesconto está ligado e há desconto > 0.
   *  5o = de onde sai o desconto (só com perguntarOrigemDesconto).
   *  6o = recompensa escolhida quando method = 'points' (vai no body como reward_id). */
  onChoose: (method: PaymentMethodChoice, cardDetails?: CardPaymentDetails, valor?: number, desconto?: number, origem?: AlvoDesconto, rewardId?: string) => void
  onClose: () => void
}

type MethodOption = {
  id: NonNullable<PaymentMethodChoice>
  label: string
  symbol: string
  color: string
  glow: string
}

const METHODS: MethodOption[] = [
  { id: 'pix',    label: 'Pix',      symbol: 'PIX', color: '#10B981', glow: 'rgba(16,185,129,0.18)' },
  { id: 'cash',   label: 'Dinheiro', symbol: '$',   color: '#16A34A', glow: 'rgba(22,163,74,0.18)' },
  { id: 'card',   label: 'Cartão',   symbol: '▭',   color: '#3B82F6', glow: 'rgba(59,130,246,0.18)' },
  { id: 'points', label: 'Pontos',   symbol: '★',   color: '#F59E0B', glow: 'rgba(245,158,11,0.18)' },
]

function formatPrice(value: number | null | undefined) {
  if (value == null || value <= 0) return null
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function PaymentMethodModal({
  open,
  clientName,
  totalPrice,
  sinalPago = 0,
  sinalDeclarado = null,
  permiteEditarValor = false,
  permiteDesconto = false,
  semPontos = false,
  customerId = null,
  appointmentId = null,
  perguntarOrigemDesconto = false,
  erro = null,
  businessId,
  withPunctualityBonus = false,
  punctualityPoints = 0,
  eyebrow,
  heading,
  loading = false,
  deferLabel,
  onChoose,
  onClose,
}: Props) {
  // Step 2 — abre quando escolhe 'card' e businessId existe
  const [cardStep, setCardStep] = useState(false)

  /* PONTOS (Eduardo 29/09): o botão só existe com a fidelidade LIGADA, e
     escolher = trocar por uma recompensa (o saldo da cliente cai no servidor).
     Antes aparecia pra todo negócio e só marcava o método: 7 atendimentos
     saíram de graça sem descontar ponto nenhum. */
  const [pontosStep, setPontosStep] = useState(false)
  const [fid, setFid] = useState<{ ativo: boolean; saldo: number | null; recompensas: { id: string; name: string; points_required: number }[] } | null>(null)
  useEffect(() => {
    if (!open || semPontos) { setFid(null); return }
    let vivo = true
    const q = customerId
      ? `?customer_id=${encodeURIComponent(customerId)}`
      : appointmentId ? `?appointment_id=${encodeURIComponent(appointmentId)}` : ''
    fetch(`/api/admin/fidelidade/contexto${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (vivo) setFid(j) })
      .catch(() => { if (vivo) setFid(null) })
    return () => { vivo = false }
  }, [open, semPontos, customerId, appointmentId])

  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) {
        if (cardStep) setCardStep(false)
        else if (pontosStep) setPontosStep(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, loading, onClose, cardStep, pontosStep])

  // Reset cardStep ao fechar
  useEffect(() => {
    if (!open) { setCardStep(false); setPontosStep(false) }
  }, [open])

  // Portal-mount guard: createPortal precisa de document. Sem essa flag,
  // SSR explode no build. Setado apos primeiro mount no client.
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])

  /* Valor editável (v100) — texto cru, não número, porque o dono digita
     "450", "450,00" e "1.450,00". Converter só na hora de enviar. */
  const [valorTexto, setValorTexto] = useState('')
  useEffect(() => {
    if (open) setValorTexto(totalPrice != null && totalPrice > 0 ? String(totalPrice).replace('.', ',') : '0')
  }, [open, totalPrice])

  const valorDigitado = (() => {
    const limpo = valorTexto.replace(/\./g, '').replace(',', '.').trim()
    if (!limpo) return null
    const n = Number(limpo)
    return Number.isFinite(n) && n >= 0 ? n : null
  })()

  // O que vale pra taxa de cartão e pro que vai ser gravado.
  /* Regra 04/08: o campo so existe pra servico SEM valor fixo. Atendimento
     com preco definido volta a exibir o valor como texto, como sempre foi —
     Eduardo: "voltar ao normal e alterar somente a situacao do DN". */
  const semValorFixo = totalPrice == null || totalPrice <= 0
  const campoValor = permiteEditarValor && semValorFixo
  const valorEfetivo = campoValor ? valorDigitado : (totalPrice ?? null)

  /* Desconto (R$) · fechado por padrão pra não pesar a tela de quem não dá
     desconto; abre com "Dar desconto". Mesmo parse do valor editável. */
  const [descontoAberto, setDescontoAberto] = useState(false)
  const [descontoTexto, setDescontoTexto] = useState('')
  useEffect(() => {
    if (open) { setDescontoAberto(false); setDescontoTexto('') }
  }, [open])
  const desconto = (() => {
    if (!permiteDesconto || !descontoAberto) return 0
    const n = Number(descontoTexto.replace(/\./g, '').replace(',', '.').trim())
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0
  })()
  const descontoMaiorQueValor = desconto > 0 && desconto > Number(valorEfetivo ?? 0)
  const descontoEnviado = desconto > 0 ? desconto : undefined
  const [origem, setOrigem] = useState<AlvoDesconto>('proporcional')
  useEffect(() => { if (open) setOrigem('proporcional') }, [open])
  const origemEnviada = descontoEnviado && perguntarOrigemDesconto ? origem : undefined

  if (!open || !portalReady) return null

  // Sem valor, PIX/dinheiro/cartão fecham atendimento zerado — foi o que
  // aconteceu com 6 dos 14 atendimentos do Diogo. Cortesia e pontos são
  // zero por natureza e seguem liberados.
  // Sem valor o atendimento não entra no faturamento nem gera comissão — mas
  // AVISA, não trava: Viva Cacheada fecha atendimento a R$0 de propósito e
  // travar o botão quebraria a operação dela (medido em 03/08: 3 pagos, 3
  // em aberto). Bloquear um cliente pagante pra proteger o hábito de outro é
  // a troca errada.
  const semValor = campoValor && (valorEfetivo == null || valorEfetivo <= 0)

  function handleMethodClick(method: NonNullable<PaymentMethodChoice>) {
    if (method === 'card' && businessId) {
      setCardStep(true)
      return
    }
    if (method === 'points') {
      setPontosStep(true)
      return
    }
    onChoose(method, undefined, campoValor ? valorEfetivo ?? undefined : undefined, descontoEnviado, origemEnviada)
  }

  /* O que entra AGORA, na mão de quem está no balcão. O sinal já entrou antes
     e por outro meio; somar os dois aqui faria a dona conferir o caixa com um
     valor que não existe. */
  const aReceberAgora =
    (sinalPago > 0 || desconto > 0) && totalPrice != null
      ? Math.max(0, Math.round((totalPrice - sinalPago - desconto) * 100) / 100)
      : totalPrice
  const priceLabel = formatPrice(aReceberAgora)

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => !loading && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
        }}
      >
        {cardStep && businessId ? (
          <CardStep
            businessId={businessId}
            // Taxa da maquininha incide sobre o que passa NA maquininha: o
            // sinal já entrou por PIX e não paga taxa de cartão.
            totalPrice={aReceberAgora}
            clientName={clientName}
            loading={loading}
            onBack={() => setCardStep(false)}
            onConfirm={(details) => onChoose('card', details, campoValor ? valorEfetivo ?? undefined : undefined, descontoEnviado, origemEnviada)}
            onClose={onClose}
          />
        ) : pontosStep ? (
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--admin-text-faded, #94A3B8)' }}>
                  Pagar com pontos
                </p>
                <h3 className="text-lg font-bold leading-tight" style={{ color: 'var(--admin-text, #0F172A)' }}>
                  Qual recompensa {clientName} vai trocar?
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute, #64748B)' }}>
                  {fid?.saldo == null ? 'Sem cliente vinculada · não dá pra usar pontos.' : `Saldo: ${fid.saldo.toLocaleString('pt-BR')} pts`}
                </p>
              </div>
              <button type="button" onClick={() => setPontosStep(false)} disabled={loading} className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ color: 'var(--admin-text-mute, #64748B)' }}>
                Voltar
              </button>
            </div>
            {erro && (
              <p className="mb-3 text-xs font-semibold rounded-lg px-2.5 py-2" role="alert" style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>
                {erro}
              </p>
            )}
            {(fid?.recompensas.length ?? 0) === 0 ? (
              <p className="text-sm py-4" style={{ color: 'var(--admin-text-mute, #64748B)' }}>
                Nenhuma recompensa ativa. Cadastre em Configurações › Fidelidade.
              </p>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {fid!.recompensas.map((r) => {
                  const falta = fid!.saldo == null ? null : r.points_required - fid!.saldo
                  const pode = falta != null && falta <= 0
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={loading || !pode}
                      onClick={() => onChoose('points', undefined, campoValor ? valorEfetivo ?? undefined : undefined, descontoEnviado, origemEnviada, r.id)}
                      className="w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left transition-all disabled:opacity-45 active:scale-[0.98]"
                      style={{ background: 'var(--admin-surface, #F8FAFC)', border: '1.5px solid rgba(245,158,11,0.35)' }}
                    >
                      <span className="text-sm font-bold" style={{ color: 'var(--admin-text, #0F172A)' }}>{r.name}</span>
                      <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: pode ? '#B45309' : 'var(--admin-text-faded, #94A3B8)' }}>
                        {r.points_required.toLocaleString('pt-BR')} pts{falta != null && falta > 0 ? ` · faltam ${falta.toLocaleString('pt-BR')}` : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between p-5 pb-3">
              <div className="min-w-0">
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider mb-1"
                  style={{ color: 'var(--admin-text-faded, #94A3B8)' }}
                >
                  {eyebrow ?? (withPunctualityBonus ? `Atendido + ${punctualityPoints} pts pontualidade` : 'Atendimento concluído')}
                </p>
                <h3
                  id="payment-modal-title"
                  className="text-lg font-bold leading-tight"
                  style={{ color: 'var(--admin-text, #0F172A)' }}
                >
                  {heading ?? `Como ${clientName} pagou?`}
                </h3>
                {priceLabel && !campoValor && (
                  <>
                    <p
                      className="text-sm font-semibold mt-1.5 tabular-nums"
                      style={{ color: 'var(--admin-text-2, #475569)' }}
                    >
                      {priceLabel}
                    </p>
                    {/* Dizer só "R$ 40,00" onde o serviço é R$ 50 levanta a
                        pergunta na hora errada. A conta aparece resolvida. */}
                    {(sinalPago > 0 || desconto > 0) && (
                      <p className="text-xs mt-0.5 tabular-nums" style={{ color: 'var(--admin-text-faded, #94A3B8)' }}>
                        {formatPrice(totalPrice)} no total
                        {sinalPago > 0 && <> · {formatPrice(sinalPago)} já pagos no sinal</>}
                        {desconto > 0 && <> · {formatPrice(desconto)} de desconto</>}
                      </p>
                    )}
                    {/* A SEGUNDA PORTA (04/09). Este modal e o
                        FaturarComandaModal fecham a mesma conta por caminhos
                        diferentes, e os dois abatem o sinal. O aviso tem que
                        existir nos DOIS: se aparecesse só num, metade dos
                        fechamentos cobraria o valor cheio de quem ja declarou
                        ter pago o sinal. */}
                    {sinalDeclarado && sinalDeclarado.valor > 0 && (
                      <p
                        className="text-xs mt-1.5 leading-relaxed rounded-lg px-2 py-1.5"
                        style={{ background: 'rgba(217,119,6,0.10)', color: '#b45309' }}
                      >
                        <strong>Sinal de {formatPrice(sinalDeclarado.valor)} — confira seu extrato.</strong>{' '}
                        A cliente avisou que pagou pelo PIX, mas ninguém confirmou ainda.
                        O valor NÃO está abatido acima.
                      </p>
                    )}
                  </>
                )}
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                aria-label="Fechar"
                className="p-1 rounded-full transition-opacity hover:opacity-70 disabled:opacity-30 flex-shrink-0"
                style={{ color: 'var(--admin-text-mute, #64748B)' }}
              >
                <IconClose size={18} />
              </button>
            </div>

            {/* Valor do atendimento — só quando o chamador liga a edição.
                Mesmo campo em mobile e desktop: a necessidade é a mesma nos
                dois (dono no celular, recepção no computador). */}
            {campoValor && (
              <div className="px-5 pb-3">
                <label
                  className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--admin-text-faded, #94A3B8)' }}
                >
                  Valor cobrado
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none"
                    style={{ color: 'var(--admin-text-mute, #64748B)' }}
                  >
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={valorTexto}
                    onChange={(e) => setValorTexto(e.target.value.replace(/[^\d.,]/g, ''))}
                    placeholder="0,00"
                    disabled={loading}
                    className="admin-input w-full text-base font-bold tabular-nums py-2.5 pl-10 pr-3"
                  />
                </div>
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded, #94A3B8)' }}>
                  {semValor
                    ? '⚠ Sem valor, este atendimento não entra no seu faturamento nem gera comissão.'
                    : 'Pode ajustar se o valor final ficou diferente do combinado.'}
                </p>
              </div>
            )}

            {permiteDesconto && (
              <div className="px-5 pb-3">
                {!descontoAberto ? (
                  <button
                    type="button"
                    onClick={() => setDescontoAberto(true)}
                    disabled={loading}
                    className="text-xs font-semibold disabled:opacity-40"
                    style={{ color: 'var(--admin-accent, #7C3AED)' }}
                  >
                    + Dar desconto
                  </button>
                ) : (
                  <>
                    <label
                      className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: 'var(--admin-text-faded, #94A3B8)' }}
                    >
                      Desconto
                    </label>
                    <div className="relative">
                      <span
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none"
                        style={{ color: 'var(--admin-text-mute, #64748B)' }}
                      >
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        autoFocus
                        value={descontoTexto}
                        onChange={(e) => setDescontoTexto(e.target.value.replace(/[^\d.,]/g, ''))}
                        placeholder="0,00"
                        disabled={loading}
                        className="admin-input w-full text-base font-bold tabular-nums py-2.5 pl-10 pr-3"
                      />
                    </div>
                    <p className="text-[11px] mt-1.5" style={{ color: descontoMaiorQueValor ? '#DC2626' : 'var(--admin-text-faded, #94A3B8)' }}>
                      {descontoMaiorQueValor
                        ? '⚠ O desconto é maior que o valor do atendimento.'
                        : 'Entra no faturamento como desconto · o valor do serviço não muda.'}
                    </p>
                    {perguntarOrigemDesconto && desconto > 0 && !descontoMaiorQueValor && (
                      <div className="mt-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-faded, #94A3B8)' }}>
                          Tirar o desconto de
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {([['servico', 'Serviço'], ['produto', 'Produto'], ['proporcional', 'Dividir']] as const).map(([v, rot]) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setOrigem(v)}
                              disabled={loading}
                              className="py-2 rounded-lg text-xs font-bold"
                              style={origem === v
                                ? { background: 'var(--admin-accent, #7C3AED)', color: '#fff' }
                                : { background: 'var(--admin-surface, #F8FAFC)', color: 'var(--admin-text-2, #475569)', border: '1px solid var(--admin-border, #E2E8F0)' }}
                            >
                              {rot}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-faded, #94A3B8)' }}>
                          A comissão é calculada sobre o que sobra depois do desconto.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {erro && (
              <p className="mx-5 mb-3 text-xs font-semibold rounded-lg px-2.5 py-2" role="alert" style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>
                {erro}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2.5 px-5 pb-3">
              {METHODS.filter((m) => m.id !== 'points' || (!semPontos && fid?.ativo === true)).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleMethodClick(m.id)}
                  disabled={loading || descontoMaiorQueValor}
                  className="relative rounded-2xl p-3.5 text-left transition-all disabled:opacity-40 hover:translate-y-[-1px] active:scale-[0.98]"
                  style={{
                    background: 'var(--admin-surface, #F8FAFC)',
                    border: `1.5px solid ${m.color}40`,
                    minHeight: 76,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 font-bold"
                    style={{
                      background: m.glow,
                      color: m.color,
                      fontSize: m.id === 'pix' ? 10 : 18,
                    }}
                  >
                    {m.symbol}
                  </div>
                  <p
                    className="text-sm font-bold leading-tight"
                    style={{ color: 'var(--admin-text, #0F172A)' }}
                  >
                    {m.label}
                  </p>
                </button>
              ))}
            </div>

            {/* Opção explícita de NÃO receber agora (opt-in via deferLabel).
                Ex: "Manter comanda aberta" (balcão) · "Pagar depois" (venda). */}
            {deferLabel && (
              <div className="px-5 pb-4">
                <button
                  type="button"
                  onClick={() => onChoose(null)}
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-transform hover:translate-y-[-1px] disabled:opacity-40 disabled:translate-y-0"
                  style={{
                    background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
                    borderTop: '1px solid rgba(255,255,255,0.25)',
                    color: '#fff',
                    boxShadow: '0 8px 22px -8px rgba(16,185,129,0.45)',
                  }}
                >
                  {deferLabel}
                </button>
              </div>
            )}

            {loading && (
              <div className="px-5 pb-4">
                <p className="text-xs text-center" style={{ color: 'var(--admin-text-faded)' }}>
                  Salvando...
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

/* ============================================================
 * Step 2 · Detalhes do cartão (maquininha + bandeira + tipo)
 * Carrega devices+fees do business, calcula taxa e líquido.
 * ============================================================ */
function CardStep({
  businessId,
  totalPrice,
  clientName,
  loading,
  onBack,
  onConfirm,
  onClose,
}: {
  businessId: string
  totalPrice?: number | null
  clientName: string
  loading: boolean
  onBack: () => void
  onConfirm: (details: CardPaymentDetails) => void
  onClose: () => void
}) {
  const supabase = createClient()
  const [devices, setDevices] = useState<MerchantDevice[]>([])
  const [fees, setFees] = useState<MerchantDeviceFee[]>([])
  const [fetching, setFetching] = useState(true)

  const [deviceId, setDeviceId] = useState<string>('')
  const [cardType, setCardType] = useState<CardType>('credit')
  const [brand, setBrand] = useState<CardBrand>('visa')
  const [installments, setInstallments] = useState<number>(1)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: devs } = await supabase
        .from('merchant_devices')
        .select('*')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('name')
      if (cancelled) return
      const list = (devs ?? []) as MerchantDevice[]
      setDevices(list)
      if (list.length === 0) {
        setFetching(false)
        return
      }
      setDeviceId(list[0].id)
      const { data: f } = await supabase
        .from('merchant_device_fees')
        .select('*')
        .in('device_id', list.map((d) => d.id))
        .eq('active', true)
      if (cancelled) return
      setFees((f ?? []) as MerchantDeviceFee[])
      setFetching(false)
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  // Taxa atual baseada em device + brand + cardType + installments
  const currentFee = fees.find(
    (f) => f.device_id === deviceId && f.brand === brand && f.card_type === cardType,
  )
  const isParcelado = installments > 1
  const rate =
    currentFee == null
      ? null
      : isParcelado && currentFee.installment_rate_percent != null
        ? currentFee.installment_rate_percent
        : currentFee.rate_percent
  const allowsInstallments = currentFee?.allows_installments && cardType === 'credit'
  const maxInstallments = allowsInstallments ? (currentFee?.installments_max ?? 1) : 1

  // Reset installments quando troca tipo ou bandeira (evita ficar com 3x num débito)
  // Hook simples · effect com deps
  useEffect(() => {
    if (!allowsInstallments && installments > 1) setInstallments(1)
    if (installments > maxInstallments) setInstallments(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardType, brand, deviceId, allowsInstallments, maxInstallments])

  const feeValue =
    totalPrice && rate != null ? (totalPrice * rate) / 100 : null
  const netValue = totalPrice && rate != null ? totalPrice - (feeValue ?? 0) : null

  function handleConfirm() {
    onConfirm({
      device_id: deviceId || null,
      card_brand: brand,
      card_type: cardType,
      fee_percent: rate ?? 0,
      installments,
    })
  }

  return (
    <>
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="min-w-0 flex items-start gap-2">
          <button
            onClick={onBack}
            aria-label="Voltar"
            className="p-1 -ml-1 rounded-full"
            style={{ color: 'var(--admin-text-mute, #64748B)', marginTop: 2 }}
          >
            <IconArrowLeft size={18} />
          </button>
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--admin-text-faded, #94A3B8)' }}
            >
              Pagamento em cartão
            </p>
            <h3 className="text-lg font-bold leading-tight" style={{ color: 'var(--admin-text, #0F172A)' }}>
              {clientName}
            </h3>
            {totalPrice != null && totalPrice > 0 && (
              <p className="text-sm font-semibold mt-1.5 tabular-nums" style={{ color: 'var(--admin-text-2, #475569)' }}>
                Valor bruto: {totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          disabled={loading}
          aria-label="Fechar"
          className="p-1 rounded-full transition-opacity hover:opacity-70 disabled:opacity-30 flex-shrink-0"
          style={{ color: 'var(--admin-text-mute, #64748B)' }}
        >
          <IconClose size={18} />
        </button>
      </div>

      <div className="px-5 pb-3 space-y-3">
        {fetching ? (
          <p className="text-sm text-center py-3" style={{ color: 'var(--admin-text-mute)' }}>
            Carregando…
          </p>
        ) : devices.length === 0 ? (
          <div
            className="rounded-xl p-3 text-xs"
            style={{
              background: 'color-mix(in srgb, var(--admin-warn,#F59E0B) 12%, transparent)',
              color: 'var(--admin-text-2)',
              border: '1px solid color-mix(in srgb, var(--admin-warn,#F59E0B) 30%, transparent)',
            }}
          >
            Nenhuma maquininha cadastrada ainda. Você pode confirmar o pagamento sem taxa agora · cadastrar maquininhas em Configurações → Maquininhas pra começar a controlar.
          </div>
        ) : (
          <>
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                Maquininha
              </p>
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="admin-input w-full text-sm py-2 px-2"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                Tipo
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(['credit', 'debit'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCardType(t)}
                    className="rounded-lg p-2 text-sm font-semibold transition-all"
                    style={{
                      background:
                        cardType === t
                          ? 'color-mix(in srgb, var(--admin-accent) 14%, transparent)'
                          : 'var(--admin-surface)',
                      border: `1.5px solid ${
                        cardType === t ? 'color-mix(in srgb, var(--admin-accent) 45%, transparent)' : 'var(--admin-border)'
                      }`,
                      color: cardType === t ? 'var(--admin-accent)' : 'var(--admin-text-2)',
                    }}
                  >
                    {t === 'credit' ? 'Crédito' : 'Débito'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                Bandeira
              </p>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value as CardBrand)}
                className="admin-input w-full text-sm py-2 px-2"
              >
                {CARD_BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {CARD_BRAND_LABEL[b]}
                  </option>
                ))}
              </select>
            </div>

            {/* Parcelas · só se permitido pra essa combinação */}
            {allowsInstallments && maxInstallments > 1 && (
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--admin-text-mute)' }}
                >
                  Parcelas
                </p>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(parseInt(e.target.value, 10))}
                  className="admin-input w-full text-sm py-2 px-2"
                >
                  {Array.from({ length: maxInstallments }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n === 1 ? 'À vista' : `${n}x` + (totalPrice ? ` de ${(totalPrice / n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : '')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Display taxa + líquido */}
            <div
              className="rounded-xl p-3 space-y-1.5 text-sm"
              style={{ background: 'var(--admin-surface-hi)', border: '1px solid var(--admin-border)' }}
            >
              {rate == null ? (
                <p style={{ color: 'var(--admin-warn,#F59E0B)' }}>
                  Sem taxa cadastrada pra essa combinação. Será salvo como 0%.
                </p>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--admin-text-mute)' }}>Taxa aplicada</span>
                    <span className="tabular-nums font-bold" style={{ color: 'var(--admin-text)' }}>
                      {rate.toString().replace('.', ',')}%
                    </span>
                  </div>
                  {feeValue != null && totalPrice != null && (
                    <>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--admin-text-mute)' }}>Taxa em R$</span>
                        <span className="tabular-nums" style={{ color: 'var(--admin-danger,#EF4444)' }}>
                          − {feeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1.5" style={{ borderColor: 'var(--admin-divider)' }}>
                        <span style={{ color: 'var(--admin-text)' }}>Você recebe</span>
                        <span className="tabular-nums" style={{ color: 'var(--admin-success,#10B981)' }}>
                          {netValue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={handleConfirm}
          disabled={loading || fetching}
          className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, var(--brand-primary,#3B82F6), var(--brand-secondary,#06B6D4))',
            color: '#fff',
          }}
        >
          {loading ? 'Salvando…' : 'Confirmar pagamento em cartão'}
        </button>
      </div>
    </>
  )
}
