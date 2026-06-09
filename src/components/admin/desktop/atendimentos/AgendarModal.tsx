'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import { getAreaPrefix } from '@/lib/area-prefix'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activity-log'
import {
  IconClose,
  IconSearch,
  IconPlus,
  IconUser,
  IconCalendar,
  IconClock,
  IconCheck,
} from '@/components/ui/Icon'
import TimeSlotPicker from './TimeSlotPicker'
import PaymentMethodModal, { type PaymentMethodChoice, type CardPaymentDetails } from '@/components/admin/PaymentMethodModal'
import dynamic from 'next/dynamic'

// Lazy: o cadastro full-form é grande (form com 20+ campos). Só baixa
// quando o usuário decide criar cliente novo dentro do modal.
const NovoClienteModal = dynamic(() => import('@/components/admin/clientes/NovoClienteModal'), {
  ssr: false,
})

type Customer = { id: string; name: string; phone: string; total_points: number | null }
type Professional = { id: string; name: string }
type Service = { id: string; name: string; price: number | null; duration_minutes: number | null }

type ServiceLine = {
  /** id local pra key do React · não vai pro banco */
  uid: string
  serviceId: string
  duration: number
  price: number
  discount: number
}

function newLine(): ServiceLine {
  return {
    uid: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}${Math.random()}`,
    serviceId: '',
    duration: 60,
    price: 0,
    discount: 0,
  }
}

type Props = {
  open: boolean
  businessId: string
  professionals: Professional[]
  services: Service[]
  /** Prefill vindos do popover de slot vazio ou do botão +Agendar */
  defaultProfId?: string | null
  defaultDate?: string | null
  defaultTime?: string | null
  /** Modo balcão (Eduardo 09/06): negócio que atende e registra na hora, sem
   *  agendar. Abre com "já concluído" ON, hora=agora, data=hoje, sem grade nem
   *  recorrência. Fluxo: cliente/avulso → serviço + produto → pagar → fim. */
  balcao?: boolean
  onClose: () => void
}

function todayISO(): string {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

function nowHHMM(): string {
  const t = new Date()
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  // NÃO deixar o horário "dar a volta" no dia (% 24). A coluna gerada
  // appointment_range monta tstzrange(data+início, data+fim) usando a MESMA
  // appointment_date nos dois lados — se o fim passar da meia-noite ele vira
  // um horário MENOR que o início e o Postgres rejeita com "range lower bound
  // must be less than or equal to range upper bound" (ex: serviço de 300min
  // começando 19:07 → fim 00:07). Trava em 23:59 do mesmo dia: range válido,
  // sem crash. Atendimento que atravessa meia-noite não é representável aqui.
  if (total >= 24 * 60) return '23:59'
  const eh = Math.floor(total / 60)
  const em = total % 60
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
}

/** Gera as N datas da série a partir da data inicial. Mensal usa mesmo dia
 *  do próximo mês (com clamp pra meses curtos: 31/01 → 28/02 ou 29/02). */
function buildRecurringDates(
  startISO: string,
  freq: 'weekly' | 'biweekly' | 'monthly',
  count: number,
): string[] {
  const out: string[] = [startISO]
  const base = new Date(startISO + 'T12:00:00') // meio-dia evita pulada de DST
  for (let i = 1; i < count; i++) {
    const d = new Date(base)
    if (freq === 'weekly') d.setDate(base.getDate() + 7 * i)
    else if (freq === 'biweekly') d.setDate(base.getDate() + 14 * i)
    else {
      const target = new Date(base)
      target.setMonth(base.getMonth() + i)
      // Se o mês destino tem menos dias, JavaScript faz overflow (ex 31/01 + 1m vira 02/03).
      // Clampamos pro último dia do mês quando isso acontece.
      if (target.getMonth() !== (base.getMonth() + i) % 12) {
        target.setDate(0) // último dia do mês anterior, que é o mês alvo
      }
      d.setTime(target.getTime())
    }
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    out.push(`${y}-${m}-${day}`)
  }
  return out
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function AgendarModal({
  open,
  businessId,
  professionals,
  services,
  defaultProfId = null,
  defaultDate = null,
  defaultTime = null,
  balcao = false,
  onClose,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const areaPrefix = getAreaPrefix(pathname)
  const supabase = useMemo(() => createClient(), [])

  // Form state · multi-serviços (V2)
  const [cliente, setCliente] = useState<Customer | null>(null)
  const [profId, setProfId] = useState<string>('')
  const [date, setDate] = useState<string>('')
  const [time, setTime] = useState<string>('')
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>(() => [newLine()])
  const [notes, setNotes] = useState<string>('')
  // Walk-in / avulso (sem cadastro) + horário fora do grid (Eduardo 05/06).
  // Universais — valem pro sistema todo, não só um negócio.
  const [avulso, setAvulso] = useState(false)
  const [avulsoName, setAvulsoName] = useState('')
  const [manualTime, setManualTime] = useState(false)
  // "Atendimento já concluído?" → ao salvar, abre o modal de pagamento (como
  // foi pago). Não → cria normal (paga depois). Eduardo 05/06.
  const [jaConcluido, setJaConcluido] = useState(false)
  const [payAppt, setPayAppt] = useState<{ id: string; name: string; total: number | null } | null>(null)
  // Produtos vendidos JUNTO com o atendimento (balcão: atende + vende · Eduardo
  // 07/06). Viram uma venda (sales+sale_items → baixa estoque), ligada ao
  // appointment. Paga junto se "já concluído". Universal (todo o sistema).
  const [products, setProducts] = useState<{ id: string; name: string; price: number | null; commission_type: string | null; commission_value: number | null }[]>([])
  const [prodCart, setProdCart] = useState<{ product_id: string; product_name: string; unit_price: number; commission_type: string | null; commission_value: number | null }[]>([])
  const [prodPickerOpen, setProdPickerOpen] = useState(false)
  const [prodSearch, setProdSearch] = useState('')

  // V3: Repetir atendimento (recorrência)
  const [recurring, setRecurring] = useState<boolean>(false)
  const [recurFreq, setRecurFreq] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [recurCount, setRecurCount] = useState<number>(4) // total de ocorrências (inclui a primeira)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null)

  // Cliente search/create
  const [showClientPicker, setShowClientPicker] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [searching, setSearching] = useState(false)
  // V3: cadastro completo via NovoClienteModal compartilhado · substitui
  // o quick-create antigo (que só tinha nome+telefone inline).
  const [showFullClientForm, setShowFullClientForm] = useState(false)

  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => { setPortalReady(true) }, [])

  // Reset ao abrir
  useEffect(() => {
    if (!open) return
    setCliente(null)
    setProfId(defaultProfId ?? '')
    setServiceLines([newLine()])
    setDate(defaultDate ?? todayISO())
    // Balcão: hora = agora (timestamp do registro · sem grade de horário).
    setTime(defaultTime ?? (balcao ? nowHHMM() : ''))
    setNotes('')
    setAvulso(false)
    setAvulsoName('')
    // Balcão lança hora livre (não slot da grade) e já entra como concluído.
    setManualTime(balcao)
    setJaConcluido(balcao)
    setPayAppt(null)
    setRecurring(false)
    setRecurFreq('weekly')
    setRecurCount(4)
    setError(null)
    setCreatedId(null)
    setCreatedCustomerId(null)
    setShowClientPicker(false)
    setShowFullClientForm(false)
    setSearch('')
    setResults([])
    setProdCart([])
    setProdPickerOpen(false)
    setProdSearch('')
  }, [open, defaultProfId, defaultDate, defaultTime, balcao])

  // Carrega produtos do negócio (pro picker de "vender junto")
  useEffect(() => {
    if (!open) return
    supabase
      .from('products')
      .select('id, name, price, commission_type, commission_value')
      .eq('business_id', businessId)
      .eq('active', true)
      .eq('sale_active', true)
      .order('name')
      .then(({ data }) => setProducts((data ?? []) as typeof products))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, businessId])

  // Lock scroll + ESC
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, saving, onClose])

  // Operações em linhas de serviço
  function updateLine(uid: string, partial: Partial<ServiceLine>) {
    setServiceLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...partial } : l)))
  }

  function handleServicePick(uid: string, newServiceId: string) {
    const s = services.find((x) => x.id === newServiceId)
    if (!s) {
      updateLine(uid, { serviceId: '' })
      return
    }
    updateLine(uid, {
      serviceId: newServiceId,
      duration: s.duration_minutes ?? 60,
      price: Number(s.price ?? 0),
    })
  }

  function addLine() {
    setServiceLines((prev) => [...prev, newLine()])
  }

  function removeLine(uid: string) {
    setServiceLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.uid !== uid)))
  }

  // Busca cliente (debounced)
  useEffect(() => {
    if (!showClientPicker) return
    const term = search.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    const id = setTimeout(async () => {
      const digits = term.replace(/\D/g, '')
      let query = supabase
        .from('customers')
        .select('id, name, phone, total_points')
        .eq('business_id', businessId)
        .limit(20)
      if (digits.length >= 3) {
        query = query.ilike('phone', `%${digits}%`)
      } else {
        query = query.ilike('name', `%${term}%`)
      }
      const { data } = await query.order('name')
      if (!cancelled) {
        setResults((data ?? []) as Customer[])
        setSearching(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [search, showClientPicker, businessId, supabase])

  // V3: cadastro full-form usa NovoClienteModal · onSuccess devolve só o id
  // do customer criado · fazemos fetch dos campos básicos pra setar cliente
  // sem precisar re-abrir o picker.
  async function handleFullClientCreated(createdId?: string) {
    setShowFullClientForm(false)
    if (!createdId) return
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, total_points')
      .eq('id', createdId)
      .single()
    if (data) {
      setCliente(data as Customer)
      setShowClientPicker(false)
    }
  }

  // Linhas válidas = têm serviceId selecionado
  const validLines = serviceLines.filter((l) => l.serviceId)
  const valorTotal = validLines.reduce(
    (sum, l) => sum + Math.max(0, Number(l.price) - Number(l.discount)),
    0,
  )
  const totalDuration = validLines.reduce((sum, l) => sum + Number(l.duration || 0), 0)
  const subtotalProds = prodCart.reduce((sum, p) => sum + Number(p.unit_price || 0), 0)
  const totalGeral = valorTotal + subtotalProds // serviços + produtos (o que o cliente paga)
  const canSave = (!!cliente || avulso) && !!profId && validLines.length >= 1 && !!date && !!time && totalDuration > 0

  const prodDisponiveis = (() => {
    const q = prodSearch.trim().toLowerCase()
    const list = q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products
    return list.slice(0, 30)
  })()
  function addProduct(p: { id: string; name: string; price: number | null; commission_type: string | null; commission_value: number | null }) {
    setProdCart((prev) => [...prev, { product_id: p.id, product_name: p.name, unit_price: p.price ?? 0, commission_type: p.commission_type, commission_value: p.commission_value }])
    setProdSearch('')
    setProdPickerOpen(false)
  }
  function updateProdLine(idx: number, patch: Partial<{ unit_price: number }>) {
    setProdCart((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }
  function removeProdLine(idx: number) {
    setProdCart((prev) => prev.filter((_, i) => i !== idx))
  }

  // Pega a comanda (invoice) ABERTA que o trigger v77 auto-criou pro atendimento.
  async function getComandaId(appointmentId: string): Promise<string | null> {
    const { data: it } = await supabase
      .from('invoice_items')
      .select('invoice_id')
      .eq('reference_id', appointmentId)
      .eq('item_type', 'appointment')
      .maybeSingle()
    return (it?.invoice_id as string) ?? null
  }

  // Lança os produtos "vendidos junto" DENTRO da comanda do atendimento, via a
  // rota canônica /items (cria sale com invoice_id + sale_item p/ baixar estoque +
  // invoice_item + recalcula o total da comanda). É o MESMO caminho usado ao
  // adicionar produto por dentro da comanda → serviço + produto na MESMA conta
  // (antes o balcão gravava venda avulsa fora da comanda · Eduardo 09/06).
  // Retorna mensagem de erro legível na 1ª falha, ou null se lançou tudo ok.
  async function addProductsToComanda(invoiceId: string): Promise<string | null> {
    for (const line of prodCart) {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: line.product_id,
          quantity: 1,
          unit_price: line.unit_price,
          professional_id: profId || null,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as { error?: string }))
        return `${line.product_name}: ${j.error ?? `HTTP ${res.status}`}`
      }
    }
    return null
  }

  async function handleSave() {
    if (!canSave || (!cliente && !avulso)) return
    setError(null)
    setSaving(true)
    // BALCÃO = registro de venda (atendimento que muitas vezes JÁ aconteceu).
    // A duração ali é irrelevante: o sistema não pode obrigar a recepcionista a
    // adivinhar que serviço longo + hora tardia estoura o range, nem deixar o
    // registro ocupar um bloco gigante na agenda. Por isso o registro vira um
    // PONTO no tempo (fim = início → appointment_range fica VAZIO: nunca cruza
    // meia-noite e a trava de exclusão por overlap não pega). Agenda normal
    // segue usando a duração. (Eduardo 09/06.) A duração real do serviço
    // continua salva em appointment_services pra relatório/comissão.
    const endTime = balcao ? time : addMinutesToTime(time, totalDuration)
    const prof = professionals.find((p) => p.id === profId)

    // Snapshot dos serviços usados (resolve nome via lookup pra log/denormalização)
    const linesWithMeta = validLines.map((l) => {
      const s = services.find((x) => x.id === l.serviceId)
      const linePrice = Math.max(0, Number(l.price) - Number(l.discount))
      return { ...l, name: s?.name ?? '—', linePrice }
    })
    const first = linesWithMeta[0]
    const displayName = linesWithMeta.length === 1 ? first.name : `${first.name} +${linesWithMeta.length - 1}`

    // V3 · Repetir: gera N datas (ou 1 se sem recorrência)
    const allDates = recurring && !jaConcluido && recurCount >= 1
      ? buildRecurringDates(date, recurFreq, Math.max(1, Math.min(recurCount, 52)))
      : [date]
    const recurringGroupId = recurring && allDates.length > 1
      ? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : null)
      : null

    // Insert TODOS os appointments da série em batch
    const appointmentRows = allDates.map((d, idx) => ({
      business_id: businessId,
      professional_id: profId,
      customer_id: avulso ? null : cliente!.id,
      client_name: avulso ? (avulsoName.trim() || 'Cliente avulso') : cliente!.name,
      client_phone: avulso ? '' : cliente!.phone, // client_phone é NOT NULL — avulso usa vazio
      appointment_date: d,
      start_time: `${time}:00`,
      end_time: `${endTime}:00`,
      service_id: first.serviceId,
      service_name: displayName,
      total_price: valorTotal,
      status: 'confirmed',
      notes: notes.trim() || null,
      recurring_group_id: recurringGroupId,
      recurring_index: recurringGroupId ? idx + 1 : null,
    }))
    const { data: insertedRows, error: e } = await supabase
      .from('appointments')
      .insert(appointmentRows)
      .select('id, appointment_date')

    if (e || !insertedRows || insertedRows.length === 0) {
      setSaving(false)
      setError(`Erro ao salvar: ${e?.message ?? 'desconhecido'}`)
      return
    }

    // Insert appointment_services pra TODAS as linhas × TODOS os appointments
    const servicesRows = insertedRows.flatMap((row) =>
      linesWithMeta.map((l) => ({
        appointment_id: row.id,
        service_id: l.serviceId,
        service_name: l.name,
        price: l.linePrice,
        duration_minutes: l.duration,
      })),
    )
    const { error: svcErr } = await supabase.from('appointment_services').insert(servicesRows)
    if (svcErr) {
      console.error('appointment_services insert error:', svcErr)
    }

    // O primeiro appointment é o "principal" pra fins de log/redirect
    const inserted = insertedRows[0]

    setSaving(false)

    // 3. Log
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: prof2 } = await supabase
        .from('professionals')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      const serieInfo = recurringGroupId
        ? ` · série de ${insertedRows.length} (${recurFreq === 'weekly' ? 'semanal' : recurFreq === 'biweekly' ? 'quinzenal' : 'mensal'})`
        : ''
      logActivity({
        business_id: businessId,
        professional_id: prof2?.id,
        action: 'create_appointment',
        target_type: 'appointment',
        target_id: inserted.id,
        description: `${avulso ? (avulsoName.trim() || 'Cliente avulso') : cliente!.name} · ${displayName} · ${date} ${time} · com ${prof?.name ?? '—'} · ${formatBRL(valorTotal)}${serieInfo}`,
      })
    }

    // "Já concluído?" → abre o modal de pagamento (como foi pago) em vez da
    // tela de sucesso. Senão, fluxo normal (paga depois).
    if (jaConcluido) {
      // a venda dos produtos é criada (paga) no concludeWithPayment, com o método
      setPayAppt({
        id: inserted.id,
        name: avulso ? (avulsoName.trim() || 'Cliente avulso') : cliente!.name,
        total: totalGeral, // serviços + produtos
      })
      return
    }

    // Não concluído: produtos entram como itens da comanda ABERTA do atendimento
    // (faturado/pago depois). Mesma comanda do serviço — não vira venda solta.
    if (prodCart.length > 0) {
      const invoiceId = await getComandaId(inserted.id)
      if (invoiceId) {
        const prodErr = await addProductsToComanda(invoiceId)
        if (prodErr) setError(`Atendimento salvo, mas falhou lançar produto na comanda · ${prodErr}`)
      } else {
        setError('Atendimento salvo, mas não achei a comanda pra lançar o produto.')
      }
    }

    setCreatedId(inserted.id)
    setCreatedCustomerId(avulso ? null : cliente!.id)
  }

  // Reusa o PaymentMethodModal (pix/dinheiro/cartão+maquininha/pontos). Espelha
  // o completeWithPayment do AppointmentCard: status=completed + paid + snapshot
  // de cartão. method=null = "Pagar depois" (concluído, sem pagamento).
  async function concludeWithPayment(method: PaymentMethodChoice, cardDetails?: CardPaymentDetails) {
    if (!payAppt) return
    setSaving(true)

    // A comanda (invoice) ABERTA já foi auto-criada pelo trigger v77 quando o
    // atendimento entrou (serviço como item). Aqui:
    //  1. lançamos os produtos vendidos junto NA MESMA comanda (rota /items)
    //  2. fechamos a comanda inteira (serviço + produtos) pela rota /pay — que
    //     registra o invoice_payment com o total recalculado, marca o
    //     atendimento e as vendas como pagos e faz read-after-write (λ.prova-na-fonte).
    // Substitui o fluxo antigo (pagamento direto no appointment + venda avulsa
    // solta), que deixava o produto FORA da comanda e gerava limbo (Eduardo 09/06).
    const invoiceId = await getComandaId(payAppt.id)

    if (invoiceId && prodCart.length > 0) {
      const prodErr = await addProductsToComanda(invoiceId)
      if (prodErr) {
        setSaving(false)
        setError(`Não consegui lançar o produto na comanda · ${prodErr}`)
        return
      }
    }

    if (method != null) {
      if (invoiceId) {
        const res = await fetch(`/api/admin/invoices/${invoiceId}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method,
            device_id: cardDetails?.device_id ?? null,
            card_brand: cardDetails?.card_brand ?? null,
            card_type: cardDetails?.card_type ?? null,
            installments: cardDetails?.installments ?? 1,
            fee_percent: cardDetails?.fee_percent ?? 0,
          }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({} as { error?: string }))
          setSaving(false)
          setError(`Erro ao receber pagamento da comanda · ${j.error ?? `HTTP ${res.status}`}`)
          return
        }
      } else {
        // Defensivo: trigger não criou comanda → marca o atendimento pago direto.
        const updates: Record<string, unknown> = {
          status: 'completed',
          paid_at: new Date().toISOString(),
          payment_method: method,
        }
        if (method === 'card' && cardDetails) {
          updates.payment_device_id = cardDetails.device_id
          updates.payment_card_brand = cardDetails.card_brand
          updates.payment_card_type = cardDetails.card_type
          updates.payment_fee_percent = cardDetails.fee_percent
          updates.payment_installments = cardDetails.installments ?? 1
        }
        const { error: payErr } = await supabase.from('appointments').update(updates).eq('id', payAppt.id)
        if (payErr) {
          setSaving(false)
          setError(`Erro ao registrar pagamento: ${payErr.message}`)
          return
        }
      }
    } else {
      // "Pagar depois": conclui o atendimento, comanda fica ABERTA pra faturar.
      const { error: doneErr } = await supabase
        .from('appointments').update({ status: 'completed' }).eq('id', payAppt.id)
      if (doneErr) {
        setSaving(false)
        setError(`Erro ao concluir atendimento: ${doneErr.message}`)
        return
      }
    }
    setSaving(false)
    fetch('/api/notify-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: payAppt.id, status: 'completed' }),
    }).catch(() => {})
    setCreatedId(payAppt.id)
    setCreatedCustomerId(avulso ? null : cliente?.id ?? null)
    setPayAppt(null)
  }

  function novoAtendimento() {
    setCliente(null)
    setProfId('')
    setServiceLines([newLine()])
    setDate(todayISO())
    setTime('')
    setNotes('')
    setCreatedId(null)
    setCreatedCustomerId(null)
    setError(null)
  }

  function verCliente() {
    // Fallback pro cliente.id caso createdCustomerId não tenha sido setado
    // (defensive · pega de qualquer fonte de verdade disponível).
    const customerId = createdCustomerId ?? cliente?.id ?? null
    if (!customerId) {
      setError('Cliente não vinculado · não consegui abrir o cadastro')
      return
    }
    // Fecha primeiro · senão o desmontar do modal pode cancelar o push
    onClose()
    // ClientesView (admin) e RecepClientesList (recep) leem ?customer=ID
    router.push(`${areaPrefix}/clientes?customer=${customerId}`)
  }

  function irParaAgenda() {
    onClose()
    router.refresh()
  }

  if (!open || !portalReady) return null

  // ===== POS-SAVE · modal de sucesso com 3 acoes (Salao99-style) =====
  if (createdId) {
    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[300] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={irParaAgenda}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl overflow-hidden"
          style={{
            background: 'var(--admin-popover-bg, #FFFFFF)',
            border: '1px solid var(--admin-popover-border, #E2E8F0)',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          }}
        >
          <div className="p-6 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#fff',
                boxShadow: '0 8px 20px -6px rgba(5,150,105,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
              }}
            >
              <IconCheck size={24} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>
              Atendimento criado com sucesso!
            </h3>
          </div>
          <div className="px-3 pb-3 space-y-1">
            <ActionRow label="Novo atendimento" onClick={novoAtendimento} />
            {createdCustomerId && <ActionRow label="Visualizar cliente" onClick={verCliente} />}
          </div>
          <div className="p-4 pt-1">
            <button
              type="button"
              onClick={irParaAgenda}
              className="w-full py-3 rounded-xl text-sm font-bold transition-transform hover:translate-y-[-1px]"
              style={{
                background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
                color: '#fff',
                borderTop: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 8px 22px -6px color-mix(in srgb, var(--brand-primary, #1AA9A8) 55%, transparent)',
              }}
            >
              Ir para a agenda
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  // ===== FORM PRINCIPAL =====
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="agendar-title"
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => !saving && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--admin-popover-bg, #FFFFFF)',
          border: '1px solid var(--admin-popover-border, #E2E8F0)',
          boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 pb-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--admin-divider)' }}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--admin-text-faded)' }}>
              {balcao ? 'Balcão' : 'Novo'}
            </p>
            <h3 id="agendar-title" className="text-lg font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
              {balcao ? 'Registrar venda' : 'Agendamento'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--admin-input-bg)]"
            style={{ color: 'var(--admin-text-mute)' }}
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Cliente · ou avulso (sem cadastro) */}
          <Field icon={<IconUser size={14} />} label="Cliente">
            {avulso ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={avulsoName}
                  onChange={(e) => setAvulsoName(e.target.value)}
                  placeholder="Nome (opcional) — ex: cliente passante"
                  className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={() => setAvulso(false)}
                  className="text-xs underline"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  usar cliente cadastrado
                </button>
              </div>
            ) : cliente ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{cliente.name}</p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>{cliente.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setCliente(null); setShowClientPicker(true) }}
                  className="text-xs underline flex-shrink-0"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  trocar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowClientPicker(true)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-left transition-colors hover:bg-[var(--admin-input-bg)]"
                  style={{
                    background: 'var(--admin-input-bg)',
                    border: '1px dashed var(--admin-border)',
                    color: 'var(--admin-text-mute)',
                  }}
                >
                  Selecionar cliente
                </button>
                <button
                  type="button"
                  onClick={() => { setAvulso(true); setCliente(null) }}
                  className="text-xs underline"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  Sem cadastro (cliente avulso)
                </button>
              </div>
            )}
          </Field>

          {/* Data */}
          <Field icon={<IconCalendar size={14} />} label="Data">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
            />
          </Field>

          {/* Profissional */}
          <Field icon={<IconUser size={14} />} label="Profissional">
            <select
              value={profId}
              onChange={(e) => setProfId(e.target.value)}
              className="w-full px-3 py-2.5 pr-9 rounded-xl text-sm transition-colors"
              style={{
                background: `var(--admin-input-bg) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 0.875rem center`,
                border: '1px solid var(--admin-border)',
                color: 'var(--admin-text)',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
              }}
            >
              <option value="">Selecionar profissional</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>

          {/* Linhas de serviço · multi-serviços inline (V2)
              Vem ANTES do horário · duração total alimenta o TimeSlotPicker abaixo
              pra calcular sobreposição corretamente (decisão cravada 22/05). */}
          {serviceLines.map((line, idx) => (
            <ServiceLineBlock
              key={line.uid}
              index={idx}
              line={line}
              services={services}
              canRemove={serviceLines.length > 1}
              onPickService={(id) => handleServicePick(line.uid, id)}
              onChangeDuration={(v) => updateLine(line.uid, { duration: v })}
              onChangePrice={(v) => updateLine(line.uid, { price: v })}
              onChangeDiscount={(v) => updateLine(line.uid, { discount: v })}
              onRemove={() => removeLine(line.uid)}
            />
          ))}

          {/* Botão adicionar mais serviços */}
          <button
            type="button"
            onClick={addLine}
            className="w-full py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
            style={{
              background: 'color-mix(in srgb, var(--admin-accent) 8%, transparent)',
              border: '1px dashed color-mix(in srgb, var(--admin-accent) 50%, transparent)',
              color: 'var(--admin-accent)',
            }}
          >
            <IconPlus size={14} /> Adicionar mais serviços
          </button>

          {/* Produtos vendidos JUNTO com o atendimento (balcão) · Eduardo 07/06 */}
          {prodCart.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)' }}>Produtos vendidos junto</p>
              {prodCart.map((line, idx) => (
                <div
                  key={`${line.product_id}-${idx}`}
                  className="rounded-xl p-2.5 grid grid-cols-[1fr_90px_28px] gap-2 items-center"
                  style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)' }}
                >
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{line.product_name}</p>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={line.unit_price}
                    onChange={(e) => updateProdLine(idx, { unit_price: Number(e.target.value) })}
                    className="admin-input px-2 py-1.5 rounded-lg text-sm text-right tabular-nums"
                    aria-label={`Preço ${line.product_name}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeProdLine(idx)}
                    className="w-7 h-7 rounded-full flex items-center justify-center mx-auto"
                    style={{ color: '#DC2626' }}
                    aria-label={`Remover ${line.product_name}`}
                  >
                    <IconClose size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Picker de produto · só aparece se o negócio tem produtos cadastrados */}
          {products.length > 0 && (
            <div
              className="rounded-xl p-2.5 space-y-2"
              style={{ background: 'color-mix(in srgb, var(--admin-accent) 6%, transparent)', border: '1px dashed color-mix(in srgb, var(--admin-accent) 40%, transparent)' }}
            >
              {!prodPickerOpen ? (
                <button
                  type="button"
                  onClick={() => setProdPickerOpen(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2"
                  style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-accent)', border: '1px solid var(--admin-border)' }}
                >
                  <IconPlus size={14} /> Adicionar produto
                </button>
              ) : (
                <>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--admin-text-faded)' }}>
                      <IconSearch size={14} />
                    </span>
                    <input
                      autoFocus
                      type="search"
                      value={prodSearch}
                      onChange={(e) => setProdSearch(e.target.value)}
                      placeholder="Buscar produto..."
                      className="admin-input w-full pl-9 pr-3 py-2 rounded-xl text-sm"
                    />
                  </div>
                  {prodDisponiveis.length === 0 ? (
                    <p className="text-xs text-center py-2" style={{ color: 'var(--admin-text-mute)' }}>
                      {prodSearch ? 'Nenhum produto bate com a busca' : 'Sem produtos'}
                    </p>
                  ) : (
                    <ul className="space-y-1 max-h-48 overflow-y-auto">
                      {prodDisponiveis.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => addProduct(p)}
                            className="w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-3 hover:bg-[color-mix(in_srgb,var(--admin-accent)_10%,transparent)]"
                            style={{ background: 'var(--admin-surface)' }}
                          >
                            <span className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{p.name}</span>
                            <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--admin-text)' }}>
                              {p.price != null ? formatBRL(p.price) : '—'}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button type="button" onClick={() => setProdPickerOpen(false)} className="text-xs underline" style={{ color: 'var(--admin-text-mute)' }}>
                    fechar
                  </button>
                </>
              )}
            </div>
          )}

          {/* Horário (início) · vem DEPOIS do serviço · grid de chips agora sabe
              a duração total e calcula sobreposição corretamente */}
          <Field icon={<IconClock size={14} />} label={balcao ? 'Hora (registro)' : 'Horário (início)'}>
            {manualTime ? (
              <div className="space-y-2">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="admin-input w-full px-3 py-2.5 rounded-xl text-sm"
                />
                {/* No balcão não existe "agenda" pra voltar · esconde o link */}
                {!balcao && (
                  <button
                    type="button"
                    onClick={() => setManualTime(false)}
                    className="text-xs underline"
                    style={{ color: 'var(--admin-accent)' }}
                  >
                    voltar pros horários da agenda
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <TimeSlotPicker
                  businessId={businessId}
                  profId={profId}
                  date={date}
                  totalDuration={totalDuration}
                  value={time}
                  onChange={setTime}
                />
                <button
                  type="button"
                  onClick={() => { setManualTime(true); setTime('') }}
                  className="text-xs underline"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  Outro horário (fora da agenda)
                </button>
              </div>
            )}
          </Field>

          {/* V3: Repetir atendimento (recorrência) · não faz sentido se já concluído */}
          {!jaConcluido && (
            <RecurringBlock
              enabled={recurring}
              onToggle={setRecurring}
              freq={recurFreq}
              onChangeFreq={setRecurFreq}
              count={recurCount}
              onChangeCount={setRecurCount}
              startDate={date}
            />
          )}

          {/* Atendimento já concluído? → ao salvar abre "como foi pago".
              No balcão é sempre "sim" (atende e registra na hora) · escondido. */}
          {!balcao && (
          <Field label="Atendimento já concluído?">
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: false, l: 'Não' },
                { v: true, l: 'Sim, já atendi' },
              ] as const).map((opt) => (
                <button
                  key={String(opt.v)}
                  type="button"
                  onClick={() => setJaConcluido(opt.v)}
                  className="py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={
                    jaConcluido === opt.v
                      ? {
                          background: 'color-mix(in srgb, var(--admin-accent) 14%, transparent)',
                          border: '1.5px solid color-mix(in srgb, var(--admin-accent) 45%, transparent)',
                          color: 'var(--admin-accent)',
                        }
                      : {
                          background: 'var(--admin-input-bg)',
                          border: '1px solid var(--admin-border)',
                          color: 'var(--admin-text-mute)',
                        }
                  }
                >
                  {opt.l}
                </button>
              ))}
            </div>
            {jaConcluido && (
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--admin-text-mute)' }}>
                Ao salvar, você escolhe <strong>como foi pago</strong> (ou “pagar depois”).
              </p>
            )}
          </Field>
          )}

          {/* Observação */}
          <Field label="Observação (opcional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="admin-input w-full px-3 py-2.5 rounded-xl text-sm resize-none"
              placeholder="Algo importante sobre o atendimento"
            />
          </Field>
        </div>

        {/* Footer · resumo + ações · erro fica AQUI pra usuário ver logo
            acima do botão Salvar (regra cravada 22/05: erro no topo do body
            era invisível com scroll) */}
        <div
          className="flex-shrink-0"
          style={{
            borderTop: '1px solid var(--admin-divider)',
            background: 'var(--admin-surface-hi)',
          }}
        >
          {error && (
            <div
              className="px-4 pt-3 pb-1 text-xs font-semibold flex items-start gap-2"
              style={{ color: '#DC2626' }}
              role="alert"
            >
              <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>⚠</span>
              <span className="flex-1">{error}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
                Total
              </p>
              <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                {formatBRL(totalGeral)}
              </p>
              {subtotalProds > 0 && (
                <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
                  Serviço {formatBRL(valorTotal)} + Produtos {formatBRL(subtotalProds)}
                </p>
              )}
            </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
              style={{
                background: 'transparent',
                color: 'var(--admin-text-2)',
                border: '1px solid var(--admin-border)',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || saving}
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-transform hover:translate-y-[-1px] disabled:opacity-40 disabled:translate-y-0"
              style={{
                background: 'linear-gradient(180deg, var(--brand-primary, #1AA9A8) 0%, color-mix(in srgb, var(--brand-primary, #1AA9A8) 70%, black) 100%)',
                color: '#fff',
                borderTop: '1px solid rgba(255,255,255,0.25)',
                boxShadow: '0 8px 22px -8px color-mix(in srgb, var(--brand-primary, #1AA9A8) 55%, transparent)',
              }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Popup de seleção de cliente · z mais alto */}
      {showClientPicker && (
        <div
          className="fixed inset-0 z-[310] flex items-start justify-center p-4 pt-20"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowClientPicker(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: 'var(--admin-popover-bg, #FFFFFF)',
              border: '1px solid var(--admin-popover-border, #E2E8F0)',
              boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
              maxHeight: '70vh',
            }}
          >
            {/* Search bar */}
            <div className="flex items-center gap-2 p-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--admin-divider)' }}>
              <IconSearch size={16} />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente por nome ou telefone"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--admin-text)' }}
              />
              <button
                type="button"
                onClick={() => setShowFullClientForm(true)}
                aria-label="Cadastrar novo cliente"
                title="Cadastro completo (Apelido, CPF, endereço...)"
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'var(--admin-accent)', color: '#fff' }}
              >
                <IconPlus size={14} />
              </button>
              <button
                type="button"
                onClick={() => setShowClientPicker(false)}
                aria-label="Fechar"
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ color: 'var(--admin-text-mute)' }}
              >
                <IconClose size={14} />
              </button>
            </div>

            <div className="overflow-y-auto">
                {searching && (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--admin-text-mute)' }}>Buscando...</p>
                )}
                {!searching && results.length === 0 && search.trim().length >= 2 && (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--admin-text-mute)' }}>
                    Nenhum cliente encontrado. Clique no <strong>+</strong> pra criar novo.
                  </p>
                )}
                {!searching && search.trim().length < 2 && (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--admin-text-mute)' }}>
                    Digite pelo menos 2 letras pra buscar
                  </p>
                )}
                {results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCliente(c)
                      setShowClientPicker(false)
                      setSearch('')
                      setResults([])
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--admin-surface-hi)]"
                    style={{ borderBottom: '1px solid var(--admin-divider)' }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{c.name}</p>
                      <p className="text-xs" style={{ color: 'var(--admin-text-mute)' }}>{c.phone}</p>
                    </div>
                    {(c.total_points ?? 0) > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)', color: '#D97706' }}>
                        {c.total_points} pts
                      </span>
                    )}
                  </button>
                ))}
              </div>
          </div>
        </div>
      )}

      {/* V3 · cadastro full-form de cliente · NovoClienteModal compartilhado */}
      {showFullClientForm && (
        <NovoClienteModal
          onClose={() => setShowFullClientForm(false)}
          onSuccess={handleFullClientCreated}
        />
      )}

      {/* "Já concluído?" → como foi pago · reusa o PaymentMethodModal existente
          (pix/dinheiro/cartão+maquininha/pontos · taxa correta no cartão) */}
      <PaymentMethodModal
        open={!!payAppt}
        clientName={payAppt?.name ?? ''}
        totalPrice={payAppt?.total}
        businessId={businessId}
        loading={saving}
        deferLabel="Manter comanda aberta"
        onChoose={(method, cardDetails) => concludeWithPayment(method, cardDetails)}
        onClose={() => {
          // Fecha sem escolher: o agendamento já existe (confirmado). Mostra
          // a tela de sucesso pra não perder o registro.
          if (payAppt) {
            setCreatedId(payAppt.id)
            setCreatedCustomerId(avulso ? null : cliente?.id ?? null)
          }
          setPayAppt(null)
        }}
      />
    </div>,
    document.body,
  )
}

function Field({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--admin-text-faded)' }}>
        {icon}
        {label}
      </label>
      {children}
    </div>
  )
}

/* Linha de serviço · usada em loop pelo array serviceLines (V2 multi-serviços) */
function ServiceLineBlock({
  index,
  line,
  services,
  canRemove,
  onPickService,
  onChangeDuration,
  onChangePrice,
  onChangeDiscount,
  onRemove,
}: {
  index: number
  line: ServiceLine
  services: Service[]
  canRemove: boolean
  onPickService: (id: string) => void
  onChangeDuration: (v: number) => void
  onChangePrice: (v: number) => void
  onChangeDiscount: (v: number) => void
  onRemove: () => void
}) {
  const lineTotal = Math.max(0, Number(line.price) - Number(line.discount))
  return (
    <div
      className="rounded-2xl p-3 space-y-3"
      style={{
        background: 'var(--admin-surface-hi)',
        border: '1px solid var(--admin-border)',
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-faded)' }}>
          Serviço {index + 1}
        </p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remover serviço"
            className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--admin-input-bg)]"
            style={{ color: '#DC2626' }}
            title="Remover este serviço"
          >
            <IconClose size={12} />
          </button>
        )}
      </div>

      <select
        value={line.serviceId}
        onChange={(e) => onPickService(e.target.value)}
        className="w-full px-3 py-2.5 pr-9 rounded-xl text-sm transition-colors"
        style={{
          background: `var(--admin-input-bg) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 0.875rem center`,
          border: '1px solid var(--admin-border)',
          color: 'var(--admin-text)',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
        }}
      >
        <option value="">Selecionar serviço</option>
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} · {s.duration_minutes ?? 60}min · {(Number(s.price ?? 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
            Duração (min)
          </label>
          <input
            type="number"
            min={5}
            step={5}
            value={line.duration}
            onChange={(e) => onChangeDuration(Math.max(5, parseInt(e.target.value, 10) || 0))}
            className="admin-input w-full px-2.5 py-2 rounded-lg text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
            Preço (R$)
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={line.price}
            onChange={(e) => onChangePrice(Math.max(0, parseFloat(e.target.value) || 0))}
            className="admin-input w-full px-2.5 py-2 rounded-lg text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
            Desconto
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={line.discount}
            onChange={(e) => onChangeDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
            className="admin-input w-full px-2.5 py-2 rounded-lg text-sm tabular-nums"
            placeholder="0,00"
          />
        </div>
      </div>

      {line.serviceId && (line.discount > 0 || line.price > 0) && (
        <div className="flex items-center justify-between text-xs pt-1" style={{ color: 'var(--admin-text-mute)' }}>
          <span>Subtotal desta linha</span>
          <span className="font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
            {lineTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      )}
    </div>
  )
}

/** V3 · Bloco "Repetir atendimento" com toggle + frequência + quantidade +
 *  preview das datas calculadas. Não dispara save direto; muda state no
 *  AgendarModal pai que monta o batch de N appointments. */
function RecurringBlock({
  enabled,
  onToggle,
  freq,
  onChangeFreq,
  count,
  onChangeCount,
  startDate,
}: {
  enabled: boolean
  onToggle: (v: boolean) => void
  freq: 'weekly' | 'biweekly' | 'monthly'
  onChangeFreq: (f: 'weekly' | 'biweekly' | 'monthly') => void
  count: number
  onChangeCount: (n: number) => void
  startDate: string
}) {
  const dates = enabled && startDate
    ? buildRecurringDates(startDate, freq, Math.max(1, Math.min(count, 52)))
    : []
  return (
    <div
      className="rounded-2xl p-3 space-y-3"
      style={{
        background: 'var(--admin-surface-hi)',
        border: enabled ? '1px solid color-mix(in srgb, var(--admin-accent) 40%, transparent)' : '1px solid var(--admin-border)',
      }}
    >
      <label className="flex items-center justify-between cursor-pointer">
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
            Repetir atendimento
          </p>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-mute)' }}>
            Cliente que marca toda semana, mês, etc
          </p>
        </div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="w-5 h-5 cursor-pointer"
        />
      </label>

      {enabled && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                Frequência
              </label>
              <select
                value={freq}
                onChange={(e) => onChangeFreq(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                className="w-full px-2.5 py-2 pr-8 rounded-lg text-sm"
                style={{
                  background: `var(--admin-input-bg) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 0.625rem center`,
                  border: '1px solid var(--admin-border)',
                  color: 'var(--admin-text)',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                }}
              >
                <option value="weekly">Toda semana</option>
                <option value="biweekly">A cada 2 semanas</option>
                <option value="monthly">Todo mês</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--admin-text-faded)' }}>
                Quantidade (inclui hoje)
              </label>
              <input
                type="number"
                min={2}
                max={52}
                value={count}
                onChange={(e) => onChangeCount(Math.max(2, Math.min(52, parseInt(e.target.value, 10) || 2)))}
                className="admin-input w-full px-2.5 py-2 rounded-lg text-sm tabular-nums"
              />
            </div>
          </div>

          {dates.length > 0 && (
            <div
              className="rounded-lg p-2.5 text-[11px] space-y-1"
              style={{
                background: 'var(--admin-input-bg)',
                border: '1px solid var(--admin-border)',
              }}
            >
              <p className="font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-faded)', fontSize: 10 }}>
                Vai criar {dates.length} agendamentos
              </p>
              <p style={{ color: 'var(--admin-text-2)' }}>
                {dates.slice(0, 6).map((d) => {
                  const dt = new Date(d + 'T12:00:00')
                  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                }).join(' · ')}
                {dates.length > 6 && ` · ... +${dates.length - 6}`}
              </p>
              <p className="italic" style={{ color: 'var(--admin-text-faded)' }}>
                Se algum horário estiver ocupado o sistema avisa qual.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ActionRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-left transition-colors hover:bg-[var(--admin-surface-hi)]"
      style={{ color: 'var(--admin-text)' }}
    >
      <span className="font-semibold">{label}</span>
      <span style={{ color: 'var(--admin-text-mute)' }}>›</span>
    </button>
  )
}
