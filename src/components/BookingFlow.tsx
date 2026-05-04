'use client'

import { useState, useCallback, useEffect, useRef, Fragment } from 'react'
import { Business, Professional, WorkingHours, TimeSlot, Service, Client } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import {
  IconClock,
  IconSparkles,
  IconCheck,
  IconArrowRight,
  IconCalendar,
  IconCopy,
  IconWhatsapp,
  IconClose,
  IconUsers,
} from '@/components/ui/Icon'

type Prefill = {
  name: string
  phone: string
  email: string
  date: string
  time: string
  professionalId: string
  serviceIds: string[]
  otherAppointment: { id: string; start_time: string; cancel_token: string } | null
} | null

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function fromMinutes(n: number) {
  const h = Math.floor(n / 60).toString().padStart(2, '0')
  const m = (n % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

/** Antecedência mínima pra agendar — cliente precisa de tempo pra chegar. */
const BOOKING_BUFFER_MIN = 30

/**
 * Gera os slots de um dia.
 * - `step`: granularidade configurada no dia (ex: 15min) — "régua" dos horários mostrados.
 * - `serviceDuration`: tempo total do agendamento (soma dos serviços escolhidos).
 * - `booked`: agendamentos já existentes no dia, com seu inicio e duração real,
 *   pra checar sobreposição (não só igualdade).
 * - `minStartMin`: opcional — corte mínimo em minutos do dia. Slots que começam
 *   antes desse valor não entram na lista. Usado pra filtrar horários já passados
 *   (ou dentro do buffer de antecedência) quando o dia selecionado é hoje.
 * Um slot é `available` se cabe inteiro dentro do expediente E não sobrepõe nenhum outro.
 */
function generateSlots(
  start: string,
  end: string,
  step: number,
  serviceDuration: number,
  booked: { start: number; end: number }[],
  minStartMin?: number,
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const startMin = toMinutes(start)
  const endMin = toMinutes(end)
  const dur = Math.max(1, serviceDuration)

  for (let current = startMin; current + dur <= endMin; current += step) {
    if (minStartMin != null && current < minStartMin) continue
    const slotStart = current
    const slotEnd = current + dur
    const conflicts = booked.some((b) => slotStart < b.end && slotEnd > b.start)
    slots.push({ time: fromMinutes(current), available: !conflicts })
  }

  return slots
}

/** Mesmo dia (ano/mês/dia coincidem)? — comparação local, sem timezone bug. */
function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatPrice(price: number | null) {
  if (!price) return null
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDuration(min: number) {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

function GoogleGLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  )
}

type Step = 'service' | 'professional' | 'date' | 'time' | 'form' | 'done'

type AppliedCoupon = {
  id: string
  code: string
  discount_type: 'fixed' | 'percent'
  discount_value: number
  expires_at: string
} | null

export default function BookingFlow({
  business,
  professionals,
  workingHours,
  services,
  referralCode,
  prefill,
  coupon,
}: {
  business: Business
  professionals: Professional[]
  workingHours: WorkingHours[]
  services: Service[]
  referralCode?: string
  prefill?: Prefill
  coupon?: AppliedCoupon
}) {
  const hasServices = services.length > 0
  const hasMultipleProfessionals = professionals.length > 1
  const isDark = (business.brand_mode || 'dark') === 'dark'
  // Paleta unificada — todos os steps usam essas vars pra consistência dark/light
  const C = isDark
    ? {
        text:    '#F1F5F9',
        body:    '#CBD5E1',
        mute:    '#94A3B8',
        faded:   '#64748B',
        surface: 'rgba(255,255,255,0.04)',
        surfaceHi: 'rgba(255,255,255,0.07)',
        border:  'rgba(255,255,255,0.10)',
        borderHi:'rgba(255,255,255,0.18)',
        input:   'rgba(0,0,0,0.30)',
      }
    : {
        text:    '#0F172A',
        body:    '#334155',
        mute:    '#64748B',
        faded:   '#94A3B8',
        surface: '#FFFFFF',
        surfaceHi: '#F8FAFC',
        border:  '#E2E8F0',
        borderHi:'#CBD5E1',
        input:   '#FFFFFF',
      }

  // Profissional inicial: se prefill bater com algum, usa; senão primeiro.
  const initialProf =
    (prefill && professionals.find((p) => p.id === prefill.professionalId)) || professionals[0]

  // Serviços iniciais: se prefill traz service_ids da fila, pré-seleciona
  const initialServices: Service[] = prefill?.serviceIds?.length
    ? services.filter((s) => prefill.serviceIds.includes(s.id))
    : []
  const profMatchesPrefill = !!prefill && initialProf.id === prefill.professionalId

  // Step inicial respeitando o que prefill já resolveu
  const initialStep: Step =
    hasServices && initialServices.length === 0
      ? 'service'
      : hasMultipleProfessionals && !profMatchesPrefill
      ? 'professional'
      : 'date'

  const [step, setStep] = useState<Step>(initialStep)
  const [selectedServices, setSelectedServices] = useState<Service[]>(initialServices)
  const [selectedProfessional, setSelectedProfessional] = useState<Professional>(initialProf)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  // Razão do "vazio" — usada pra diagnóstico inteligente em vez de
  // mensagem genérica. 'duration' = serviço maior que qualquer período;
  // 'full' = caberia mas tudo ocupado/passou do buffer; null = tem slots.
  const [slotsEmptyReason, setSlotsEmptyReason] = useState<'duration' | 'full' | null>(null)

  // Dados do cliente — pre-preenchidos se vier da fila
  const [clientName, setClientName] = useState(prefill?.name || '')
  const [clientPhone, setClientPhone] = useState(prefill?.phone || '')
  const [clientEmail, setClientEmail] = useState(prefill?.email || '')

  // Modal "você já tem outro agendamento esse dia"
  const [showOtherApptAlert, setShowOtherApptAlert] = useState(!!prefill?.otherAppointment)
  const [cancelingOther, setCancelingOther] = useState(false)
  const [otherCancelled, setOtherCancelled] = useState(false)

  // Marca quando já tentamos auto-selecionar a data, pra não repetir
  const autoSelectedDateRef = useRef(false)
  // Marca quando já tentamos auto-selecionar o horario, pra não repetir
  const autoSelectedTimeRef = useRef(false)
  const [returningClient, setReturningClient] = useState<Client | null>(null)
  const [lookingUpClient, setLookingUpClient] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [cancelUrl, setCancelUrl] = useState<string | null>(null)

  // Referral
  const [myReferralLink, setMyReferralLink] = useState<string | null>(null)
  const [referralCopied, setReferralCopied] = useState(false)

  // Claim de pontos por review no Google
  const [reviewOpened, setReviewOpened] = useState(false)
  const [reviewClaiming, setReviewClaiming] = useState(false)
  const [reviewClaimMsg, setReviewClaimMsg] = useState<string | null>(null)
  const [reviewClaimError, setReviewClaimError] = useState<string | null>(null)
  const [reviewName, setReviewName] = useState('')

  // Modal de cancelamento na tela done (evita toque acidental)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // Fila de espera
  const [waitlistSlot, setWaitlistSlot] = useState<string | null>(null)
  const [waitlistName, setWaitlistName] = useState('')
  const [waitlistPhone, setWaitlistPhone] = useState('')
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false)
  const [waitlistDone, setWaitlistDone] = useState(false)

  // Profissional ativo selecionado
  const professional = selectedProfessional

  // Totais calculados dos serviços selecionados
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0)
  const subtotal = selectedServices.reduce((sum, s) => sum + (s.price ?? 0), 0)
  const totalPoints = selectedServices.reduce((sum, s) => sum + (s.points ?? 0), 0)
  const hasPrice = selectedServices.some((s) => s.price !== null)

  // Cupom aplicado: calcula desconto sobre subtotal
  const couponDiscount = coupon
    ? coupon.discount_type === 'fixed'
      ? Math.min(coupon.discount_value, subtotal)
      : Math.min((subtotal * coupon.discount_value) / 100, subtotal)
    : 0
  const totalPrice = Math.max(0, subtotal - couponDiscount)

  // Granularidade do dia (step entre horários mostrados). Ex: 15min.
  function getSlotStep(date: Date): number {
    const wh = workingHours.find(
      (w) => w.professional_id === professional?.id && w.day_of_week === date.getDay()
    )
    return wh?.slot_duration || 30
  }

  // Duração real do agendamento (soma dos serviços). Se nada escolhido, cai no step.
  function getServiceDuration(date: Date): number {
    return totalDuration > 0 ? totalDuration : getSlotStep(date)
  }

  // Gera as datas disponíveis dos próximos 14 dias INCLUINDO hoje.
  // Pra hoje: só entra na lista se o expediente ainda tem janela válida
  // após o buffer de antecedência (BOOKING_BUFFER_MIN). Se tudo já passou,
  // hoje é pulado e a lista começa em amanhã.
  // Bug histórico (até 04/05/2026): loop começava em i+1 e cliente nunca
  // via o dia atual — perdia agendamentos do dia.
  const today = new Date()
  const nowMin = today.getHours() * 60 + today.getMinutes()
  const earliestBookingMin = nowMin + BOOKING_BUFFER_MIN
  const availableDates: Date[] = []
  for (let i = 0; i < 14; i++) {
    const d = addDays(today, i)
    const dayOfWeek = d.getDay()
    const hoursOfDay = workingHours.filter(
      (wh) => wh.professional_id === professional?.id && wh.day_of_week === dayOfWeek
    )
    if (hoursOfDay.length === 0) continue
    if (i === 0) {
      // Hoje: pré-check rápido — se nenhum período termina depois do
      // buffer, expediente acabou. Pula pra evitar tela vazia ao clicar.
      const lastEndMin = Math.max(...hoursOfDay.map((wh) => toMinutes(wh.end_time)))
      if (lastEndMin <= earliestBookingMin) continue
    }
    availableDates.push(d)
  }

  // Toggle de serviço (seleciona/deseleciona)
  function handleToggleService(service: Service) {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === service.id)
      const next = exists ? prev.filter((s) => s.id !== service.id) : [...prev, service]
      return next
    })
    // Reseta data/hora ao mudar serviços (duração pode mudar)
    setSelectedDate(null)
    setSelectedTime(null)
    setSlots([])
  }

  function handleProceedFromServices() {
    if (selectedServices.length === 0) return
    // Se prefill já tem o profissional certo, pula a etapa "professional"
    if (prefill && professional?.id === prefill.professionalId) {
      setStep('date')
    } else {
      setStep(hasMultipleProfessionals ? 'professional' : 'date')
    }
    // Scroll é disparado via useEffect[step] abaixo — requestAnimationFrame
    // inline aqui era chamado ANTES do React re-renderizar a próxima
    // seção (id ainda não existe no DOM). useEffect roda APÓS o
    // re-render = scroll funciona consistente.
  }

  function handleSelectProfessional(prof: Professional) {
    setSelectedProfessional(prof)
    setSelectedDate(null)
    setSelectedTime(null)
    setSlots([])
    setStep('date')
  }

  // Auto-scroll quando o step avança — feedback visual de "avancei".
  // useEffect roda APÓS o re-render, então o id-target da seção
  // próxima já existe no DOM. (Tentativa anterior com requestAnimationFrame
  // inline em handleProceedFromServices falhava: scroll era chamado antes
  // do React renderizar a nova seção.)
  const prevStepRef = useRef<Step>(step)
  useEffect(() => {
    const prev = prevStepRef.current
    prevStepRef.current = step
    if (prev === step) return  // ignora init
    // Só scrolla em transições "pra frente" (service→professional, etc)
    let targetId: string | null = null
    if (prev === 'service' && step === 'professional') targetId = 'profissionais-list'
    else if ((prev === 'service' || prev === 'professional') && step === 'date') targetId = 'datas-list'
    else if (prev === 'date' && step === 'time') targetId = 'horarios-disponiveis'
    else if (prev === 'time' && step === 'form') targetId = 'form-cliente'
    if (!targetId) return
    // setTimeout > requestAnimationFrame — garante que React commitou DOM
    setTimeout(() => {
      const el = document.getElementById(targetId!)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }, [step])

  // Auto-seleção da data quando vem da fila (após user escolher serviço).
  useEffect(() => {
    if (!prefill || autoSelectedDateRef.current) return
    if (step !== 'date') return
    if (selectedServices.length === 0 && hasServices) return
    const target = availableDates.find((d) => formatDate(d) === prefill.date)
    if (!target) return
    autoSelectedDateRef.current = true
    handleSelectDate(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedServices.length])

  // Auto-seleção do horário quando os slots carregam.
  useEffect(() => {
    if (!prefill || autoSelectedTimeRef.current) return
    if (step !== 'time' || loadingSlots) return
    const target = slots.find((s) => s.time === prefill.time && s.available)
    if (!target) return
    autoSelectedTimeRef.current = true
    setSelectedTime(prefill.time)
    setStep('form')
  }, [step, slots, loadingSlots, prefill])

  async function handleSelectDate(date: Date) {
    setSelectedDate(date)
    setSelectedTime(null)
    setLoadingSlots(true)

    const supabase = createClient()
    const dayOfWeek = date.getDay()
    // V31: dia pode ter MULTIPLOS periodos (manha + tarde com pausa
    // de almoco). Pega todos e itera abaixo. Ordenacao por start_time
    // garante que o array de slots vem cronologico.
    const periods = workingHours
      .filter((w) => w.professional_id === professional?.id && w.day_of_week === dayOfWeek)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))

    if (periods.length === 0) {
      setSlots([])
      setSlotsEmptyReason('full')
      setLoadingSlots(false)
      setStep('time')
      return
    }

    const { data: existing } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('professional_id', professional.id)
      .eq('appointment_date', formatDate(date))
      .in('status', ['pending', 'confirmed'])

    const booked = (existing || []).map((a) => ({
      start: toMinutes(a.start_time.slice(0, 5)),
      end: toMinutes(a.end_time.slice(0, 5)),
    }))
    const step = getSlotStep(date)
    const serviceDuration = getServiceDuration(date)

    // Se o dia selecionado é hoje, filtra slots que já passaram + buffer
    // de antecedência. Cliente não consegue agendar pras próximas
    // BOOKING_BUFFER_MIN minutos (precisa de tempo pra chegar).
    const now = new Date()
    const minStartMin = isSameLocalDay(date, now)
      ? now.getHours() * 60 + now.getMinutes() + BOOKING_BUFFER_MIN
      : undefined

    // Gera slots pra cada periodo do dia e concatena na ordem cronologica
    const generated = periods.flatMap((p) =>
      generateSlots(p.start_time, p.end_time, step, serviceDuration, booked, minStartMin)
    )

    // Diagnóstico do "vazio": se a duração total dos serviços é maior
    // que o maior período do dia, é IMPOSSÍVEL caber. UI mostra mensagem
    // específica ("tira serviços ou outro dia"). Senão, é caso "lotado".
    if (generated.length === 0) {
      const maxPeriodLength = Math.max(
        ...periods.map((p) => toMinutes(p.end_time) - toMinutes(p.start_time))
      )
      setSlotsEmptyReason(serviceDuration > maxPeriodLength ? 'duration' : 'full')
    } else {
      setSlotsEmptyReason(null)
    }

    setSlots(generated)
    setLoadingSlots(false)
    setStep('time')
  }

  // Busca cliente pelo telefone ao sair do campo
  const handlePhoneBlur = useCallback(async () => {
    const phone = clientPhone.trim().replace(/\D/g, '')
    if (phone.length < 10) return

    setLookingUpClient(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('clients')
      .select('id, name, phone, email, created_at')
      .eq('phone', clientPhone.trim())
      .maybeSingle()

    if (data) {
      setReturningClient(data as Client)
      setClientName(data.name)
      setClientEmail(data.email ?? '')
    } else {
      setReturningClient(null)
    }
    setLookingUpClient(false)
  }, [clientPhone])

  async function handleJoinWaitlist() {
    if (!selectedDate || !waitlistSlot || !waitlistName.trim() || !waitlistPhone.trim()) return
    setWaitlistSubmitting(true)

    const supabase = createClient()
    await supabase.from('waitlist').insert({
      business_id: business.id,
      professional_id: professional.id,
      appointment_date: formatDate(selectedDate),
      start_time: waitlistSlot,
      client_name: waitlistName.trim(),
      client_phone: waitlistPhone.trim(),
      client_email: waitlistEmail.trim() || null,
      service_ids: selectedServices.length > 0 ? selectedServices.map((s) => s.id) : null,
    })

    setWaitlistSubmitting(false)
    setWaitlistDone(true)
  }

  async function handleSubmit() {
    if (!selectedDate || !selectedTime || !clientName.trim() || !clientPhone.trim()) return
    setSubmitting(true)
    setError(null)

    // Defesa anti-stale-tab: usuário com a aba aberta há horas pode
    // clicar num slot que entrementes virou passado. Revalida antes
    // de gravar.
    const now = new Date()
    if (isSameLocalDay(selectedDate, now)) {
      const [h0, m0] = selectedTime.split(':').map(Number)
      const slotMin = h0 * 60 + m0
      const limitMin = now.getHours() * 60 + now.getMinutes() + BOOKING_BUFFER_MIN
      if (slotMin < limitMin) {
        setError('Esse horário acabou de passar. Escolha outro.')
        setSubmitting(false)
        return
      }
    }

    const duration = getServiceDuration(selectedDate)
    const [h, m] = selectedTime.split(':').map(Number)
    const endMinutes = h * 60 + m + duration
    const endH = Math.floor(endMinutes / 60).toString().padStart(2, '0')
    const endM = (endMinutes % 60).toString().padStart(2, '0')
    const endTime = `${endH}:${endM}`

    const supabase = createClient()

    // 1. Criar ou recuperar cliente global (clients)
    let clientId: string | null = returningClient?.id ?? null

    if (!clientId) {
      const { data: existing } = await supabase
        .from('clients')
        .select('id')
        .eq('phone', clientPhone.trim())
        .maybeSingle()

      if (existing) {
        clientId = existing.id
        await supabase
          .from('clients')
          .update({ name: clientName.trim(), email: clientEmail.trim() || null })
          .eq('id', clientId)
      } else {
        const { data: created } = await supabase
          .from('clients')
          .insert({
            name: clientName.trim(),
            phone: clientPhone.trim(),
            email: clientEmail.trim() || null,
          })
          .select('id')
          .single()
        clientId = created?.id ?? null
      }
    }

    // 1b. Criar ou recuperar customer do negócio (para pontos)
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, total_points')
      .eq('business_id', business.id)
      .eq('phone', clientPhone.trim())
      .maybeSingle()

    let customerId: string | null = existingCustomer?.id ?? null

    if (!customerId) {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          business_id: business.id,
          name: clientName.trim(),
          phone: clientPhone.trim(),
          email: clientEmail.trim() || null,
        })
        .select('id, referral_code')
        .single()
      customerId = newCustomer?.id ?? null
      if (newCustomer?.referral_code) {
        setMyReferralLink(`${window.location.origin}/${business.slug}?ref=${newCustomer.referral_code}`)
      }
    } else {
      // Cliente existente — busca o referral_code dele
      const { data: existingFull } = await supabase
        .from('customers')
        .select('referral_code')
        .eq('id', customerId)
        .single()
      if (existingFull?.referral_code) {
        setMyReferralLink(`${window.location.origin}/${business.slug}?ref=${existingFull.referral_code}`)
      }
    }

    // 2. Verificação de conflito antes de inserir (proteção client-side)
    const { data: conflict } = await supabase
      .from('appointments')
      .select('id')
      .eq('professional_id', professional.id)
      .eq('appointment_date', formatDate(selectedDate))
      .in('status', ['pending', 'confirmed'])
      .lt('start_time', endTime)
      .gt('end_time', selectedTime)
      .limit(1)
      .maybeSingle()

    if (conflict) {
      setError('Esse horário acabou de ser reservado. Escolha outro.')
      setSubmitting(false)
      return
    }

    // 3. Criar agendamento
    const firstService = selectedServices[0] ?? null
    const { data: appointment, error: apptErr } = await supabase
      .from('appointments')
      .insert({
        business_id: business.id,
        professional_id: professional.id,
        client_id: clientId,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        client_email: clientEmail.trim() || null,
        service_id: firstService?.id ?? null,
        service_name: firstService?.name ?? null,
        total_price: hasPrice ? totalPrice : null,
        appointment_date: formatDate(selectedDate),
        start_time: selectedTime,
        end_time: endTime,
        status: 'confirmed',
      })
      .select('id')
      .single()

    if (apptErr || !appointment) {
      const msg = apptErr?.message?.includes('horário')
        ? 'Esse horário acabou de ser reservado. Escolha outro.'
        : 'Erro ao agendar. Tente novamente.'
      setError(msg)
      setSubmitting(false)
      return
    }

    // 3. Inserir serviços do agendamento
    if (selectedServices.length > 0) {
      await supabase.from('appointment_services').insert(
        selectedServices.map((s) => ({
          appointment_id: appointment.id,
          service_id: s.id,
          service_name: s.name,
          price: s.price,
          duration_minutes: s.duration_minutes,
        }))
      )
    }

    // Marca cupom como usado (via API server-side com service-role —
    // RLS bloqueia UPDATE público de cupons). Não bloqueia o flow se
    // falhar; agendamento já confirmado.
    if (coupon) {
      fetch('/api/coupons/use', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: coupon.code, appointment_id: appointment.id }),
      }).catch((err) => {
        console.warn('Falha ao marcar cupom como usado:', err)
      })
    }

    // 4. Calcular pontos que o cliente VAI ganhar após o atendimento.
    // Os pontos só são creditados pelo trigger SQL 'credit_points_on_confirm' (V15)
    // quando o status vira 'completed' (cron auto-fecha agendamentos passados).
    const totalPoints = selectedServices.reduce((sum, s) => sum + (s.points ?? 0), 0)
    if (totalPoints > 0) {
      setPointsEarned(totalPoints)
    }

    // 5. Marcar referred_by quando é cliente NOVO vindo por link de indicação.
    // Os pontos do indicador são creditados pelo trigger SQL quando o agendamento
    // vira 'completed' (ver migration V15). Se o agendamento for cancelado ou
    // marcado como no_show, o indicador nunca ganha pontos.
    if (referralCode && customerId && !existingCustomer) {
      const { data: referrer } = await supabase
        .from('customers')
        .select('id')
        .eq('referral_code', referralCode)
        .eq('business_id', business.id)
        .maybeSingle()

      if (referrer && referrer.id !== customerId) {
        await supabase
          .from('customers')
          .update({ referred_by: referrer.id })
          .eq('id', customerId)
      }
    }

    // 6. Notificar profissional + cliente + capturar cancelUrl
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: appointment.id }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.cancelUrl) setCancelUrl(data.cancelUrl)
      })
      .catch(() => {})

    setStep('done')
    setSubmitting(false)
  }

  if (!professional) {
    return (
      <div className="p-6 text-center" style={{ color: C.mute }}>
        Nenhum profissional disponível no momento.
      </div>
    )
  }

  // TELA: AGENDAMENTO CONFIRMADO
  if (step === 'done') {
    // Google Calendar URL (template) com início/fim e metadados
    const pad = (n: number) => String(n).padStart(2, '0')
    const fmtCalDate = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
    let gcalUrl: string | null = null
    if (selectedDate && selectedTime) {
      const [sh, sm] = selectedTime.split(':').map(Number)
      const startDt = new Date(selectedDate)
      startDt.setHours(sh, sm, 0, 0)
      const endDt = new Date(startDt.getTime() + Math.max(totalDuration, 30) * 60 * 1000)
      const serviceNames = selectedServices.map((s) => s.name).join(', ') || 'Agendamento'
      const title = `${serviceNames} — ${business.name}`
      const details =
        `Profissional: ${professional.name}` +
        (business.phone ? `\nContato: ${business.phone}` : '') +
        (cancelUrl ? `\nCancelar: ${cancelUrl}` : '')
      const qp: Record<string, string> = {
        action: 'TEMPLATE',
        text: title,
        dates: `${fmtCalDate(startDt)}/${fmtCalDate(endDt)}`,
        details,
      }
      if (business.address) qp.location = business.address
      gcalUrl = `https://www.google.com/calendar/render?${new URLSearchParams(qp).toString()}`
    }

    // Mensagem pronta para compartilhar no WhatsApp
    const waShareMsg = myReferralLink
      ? `Agendei em ${business.name} e tá top — se você também agendar por esse link a gente ganha pontos: ${myReferralLink}`
      : ''
    const waShareUrl = myReferralLink
      ? `https://wa.me/?text=${encodeURIComponent(waShareMsg)}`
      : null

    return (
      <div className="p-4 space-y-4" style={{ color: C.text }}>
        {/* A) HERO BRANDED com resumo dentro */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 text-white"
          style={{
            background:
              'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
            boxShadow: '0 18px 40px -16px rgba(0,0,0,0.45)',
          }}
        >
          <div
            aria-hidden
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)', filter: 'blur(12px)' }}
          />
          <div
            aria-hidden
            className="absolute -bottom-14 -left-10 w-44 h-44 rounded-full"
            style={{ background: 'rgba(255,255,255,0.08)', filter: 'blur(16px)' }}
          />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'rgba(255,255,255,0.22)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  backdropFilter: 'blur(6px)',
                }}
              >
                <IconCheck size={26} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
                  Tudo certo
                </p>
                <h2 className="text-xl font-bold leading-tight">Agendamento confirmado!</h2>
              </div>
            </div>

            {selectedServices.length > 0 && (
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{
                  background: 'rgba(255,255,255,0.14)',
                  border: '1px solid rgba(255,255,255,0.22)',
                  backdropFilter: 'blur(6px)',
                }}
              >
                {/* data + hora */}
                {selectedDate && (
                  <div className="flex items-center gap-2">
                    <IconCalendar size={16} />
                    <p className="text-sm font-semibold capitalize">
                      {selectedDate.toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                      <span className="mx-1.5 opacity-70">•</span>
                      {selectedTime}
                    </p>
                  </div>
                )}
                {/* serviços */}
                <div className="space-y-1">
                  {selectedServices.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <span className="opacity-95">{s.name}</span>
                      {s.price !== null && (
                        <span className="font-semibold tabular-nums">{formatPrice(s.price)}</span>
                      )}
                    </div>
                  ))}
                  {coupon && couponDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm" style={{ color: '#A7F3D0' }}>
                      <span>Cupom {coupon.code}</span>
                      <span className="tabular-nums">− {formatPrice(couponDiscount)}</span>
                    </div>
                  )}
                  {hasPrice && (selectedServices.length > 1 || (coupon && couponDiscount > 0)) && (
                    <div
                      className="flex items-center justify-between pt-2 mt-1 text-sm font-bold"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.22)' }}
                    >
                      <span>Total</span>
                      <span className="tabular-nums">{formatPrice(totalPrice)}</span>
                    </div>
                  )}
                </div>
                {/* profissional */}
                <div className="flex items-center gap-2 text-xs opacity-90">
                  <IconUsers size={14} />
                  <span>com {professional.name}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* E) Adicionar à agenda */}
        {gcalUrl && (
          <a
            href={gcalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-2xl py-3 text-sm font-semibold transition-transform active:scale-[0.98]"
            style={{
              background: C.surface,
              color: C.text,
              border: `1px solid ${C.border}`,
            }}
          >
            <IconCalendar size={16} />
            Adicionar à minha agenda
          </a>
        )}

        {/* B) PONTOS — brand-tinted */}
        {pointsEarned > 0 && (
          <div
            className="rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{
              background:
                'color-mix(in srgb, var(--brand-primary, #3B82F6) 12%, transparent)',
              border:
                '1px solid color-mix(in srgb, var(--brand-primary, #3B82F6) 28%, transparent)',
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white"
              style={{
                background:
                  'linear-gradient(135deg, var(--brand-primary, #3B82F6), var(--brand-secondary, #06B6D4))',
              }}
            >
              <IconSparkles size={18} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm" style={{ color: C.text }}>
                Você vai ganhar +{pointsEarned} pontos
              </p>
              <p className="text-xs" style={{ color: C.mute }}>
                Os pontos entram após o atendimento.
              </p>
            </div>
          </div>
        )}

        {/* C) INDIQUE UM AMIGO — WhatsApp share + copiar */}
        {myReferralLink && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
                style={{
                  background:
                    'linear-gradient(135deg, var(--brand-primary, #3B82F6), var(--brand-secondary, #06B6D4))',
                }}
              >
                <IconSparkles size={14} />
              </div>
              <p className="text-sm font-bold" style={{ color: C.text }}>
                Indique um amigo e ganhe pontos
              </p>
            </div>
            <p className="text-xs mb-3" style={{ color: C.mute }}>
              Quando um amigo agendar por esse link e o estabelecimento confirmar, você ganha pontos.
            </p>
            <div className="flex gap-2">
              {waShareUrl && (
                <a
                  href={waShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-transform active:scale-[0.98]"
                  style={{ background: '#25D366' }}
                >
                  <IconWhatsapp size={16} />
                  Enviar no WhatsApp
                </a>
              )}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(myReferralLink)
                  setReferralCopied(true)
                  setTimeout(() => setReferralCopied(false), 2000)
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-transform active:scale-[0.98]"
                style={{
                  background: C.surfaceHi,
                  color: C.text,
                  border: `1px solid ${C.border}`,
                }}
              >
                {referralCopied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                {referralCopied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        )}

        {/* D) REVIEW GOOGLE — brand card + GoogleGLogo */}
        {business.points_for_review > 0 && business.google_place_id && (
          <div
            className="rounded-2xl p-4"
            style={{
              background:
                'color-mix(in srgb, var(--brand-primary, #3B82F6) 10%, transparent)',
              border:
                '1px solid color-mix(in srgb, var(--brand-primary, #3B82F6) 24%, transparent)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#FFFFFF', border: `1px solid ${C.border}` }}
              >
                <GoogleGLogo size={14} />
              </span>
              <p className="text-sm font-bold" style={{ color: C.text }}>
                Avalie no Google e ganhe +{business.points_for_review} pontos
              </p>
            </div>
            <p className="text-xs mb-3" style={{ color: C.mute }}>
              Abra o Google, deixe sua avaliação e clique em &quot;Já avaliei&quot;. O estabelecimento confirma e seus pontos entram.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href={business.google_place_id}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setReviewOpened(true)}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-transform active:scale-[0.98]"
                style={{
                  background:
                    'linear-gradient(135deg, var(--brand-primary, #3B82F6), var(--brand-secondary, #06B6D4))',
                  boxShadow:
                    '0 8px 20px -8px color-mix(in srgb, var(--brand-primary, #3B82F6) 70%, transparent)',
                }}
              >
                <GoogleGLogo size={16} />
                Abrir Google
              </a>
              {reviewOpened && !reviewClaimMsg && (
                <>
                  <input
                    type="text"
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    placeholder="Qual nome você usou na avaliação?"
                    className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none"
                    style={{
                      background: C.input,
                      color: C.text,
                      border: `1px solid ${C.border}`,
                    }}
                  />
                  <button
                    disabled={reviewClaiming || !reviewName.trim()}
                    onClick={async () => {
                      setReviewClaiming(true)
                      setReviewClaimError(null)
                      try {
                        const res = await fetch('/api/claim-review', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            businessId: business.id,
                            phone: clientPhone.trim(),
                            googleReviewName: reviewName.trim(),
                          }),
                        })
                        const data = await res.json()
                        if (!res.ok) {
                          setReviewClaimError(data.error || 'Erro ao registrar pedido.')
                        } else {
                          setReviewClaimMsg(data.message || 'Pedido enviado!')
                        }
                      } catch {
                        setReviewClaimError('Erro ao registrar pedido. Tente novamente.')
                      } finally {
                        setReviewClaiming(false)
                      }
                    }}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-50"
                    style={{
                      background: C.surfaceHi,
                      color: C.text,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    {reviewClaiming ? 'Enviando...' : 'Já avaliei, quero meus pontos'}
                  </button>
                </>
              )}
              {reviewClaimMsg && (
                <p
                  className="text-xs rounded-xl px-3 py-2"
                  style={{
                    color: isDark ? '#86EFAC' : '#15803D',
                    background: isDark ? 'rgba(34,197,94,0.12)' : 'rgb(240,253,244)',
                    border: `1px solid ${isDark ? 'rgba(34,197,94,0.3)' : 'rgb(187,247,208)'}`,
                  }}
                >
                  {reviewClaimMsg}
                </p>
              )}
              {reviewClaimError && (
                <p
                  className="text-xs rounded-xl px-3 py-2"
                  style={{
                    color: isDark ? '#FCA5A5' : '#B91C1C',
                    background: isDark ? 'rgba(239,68,68,0.12)' : 'rgb(254,242,242)',
                    border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : 'rgb(254,202,202)'}`,
                  }}
                >
                  {reviewClaimError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Ações inferiores */}
        <div className="pt-2 space-y-2">
          <a
            href={`/${business.slug}/meus-pontos`}
            className="flex items-center justify-center gap-2 w-full rounded-2xl py-3 text-sm font-semibold transition-transform active:scale-[0.98]"
            style={{
              background:
                'linear-gradient(135deg, var(--brand-primary, #3B82F6), var(--brand-secondary, #06B6D4))',
              color: '#FFFFFF',
              boxShadow:
                '0 10px 22px -10px color-mix(in srgb, var(--brand-primary, #3B82F6) 70%, transparent)',
            }}
          >
            Ver meus pontos
            <IconArrowRight size={16} />
          </a>

          {cancelUrl && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full rounded-2xl py-2.5 text-xs font-medium transition-opacity hover:opacity-80"
              style={{ color: C.faded, background: 'transparent' }}
            >
              Preciso cancelar este agendamento
            </button>
          )}
        </div>

        {/* F) MODAL de confirmação de cancelamento */}
        {showCancelConfirm && cancelUrl && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={() => setShowCancelConfirm(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl p-5"
              style={{
                background: isDark ? '#0B1220' : '#FFFFFF',
                border: `1px solid ${C.border}`,
                boxShadow: '0 24px 50px -20px rgba(0,0,0,0.6)',
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isDark ? 'rgba(239,68,68,0.15)' : 'rgb(254,242,242)',
                    color: '#EF4444',
                  }}
                >
                  <IconClose size={20} />
                </div>
                <div>
                  <p className="font-bold text-base" style={{ color: C.text }}>
                    Cancelar este agendamento?
                  </p>
                  <p className="text-xs mt-1" style={{ color: C.mute }}>
                    O horário volta a ficar livre para outros clientes. Você pode agendar novamente depois.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-transform active:scale-[0.98]"
                  style={{
                    background: C.surfaceHi,
                    color: C.text,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  Voltar
                </button>
                <a
                  href={cancelUrl}
                  className="flex-1 text-center rounded-xl py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
                  style={{ background: '#EF4444' }}
                >
                  Sim, cancelar
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Banner explicando que o cliente veio do email da fila e o que vai acontecer
  const prefillProfName = prefill
    ? professionals.find((p) => p.id === prefill.professionalId)?.name
    : null
  const prefillDateLabel = prefill ? `${prefill.date.split('-')[2]}/${prefill.date.split('-')[1]}` : ''

  // Stepper visual + título dinâmico — só pra fluxo "vivo" (não 'done')
  const stepKeys: Step[] = []
  if (hasServices) stepKeys.push('service')
  if (hasMultipleProfessionals) stepKeys.push('professional')
  stepKeys.push('date', 'time', 'form')
  const stepLabels: Record<Step, string> = {
    service: 'Serviço',
    professional: 'Profissional',
    date: 'Dia',
    time: 'Horário',
    form: 'Dados',
    done: '',
  }
  const stepTitles: Record<Step, string> = {
    service: 'Escolha o serviço',
    professional: 'Escolha o profissional',
    date: 'Escolha o dia',
    time: 'Escolha o horário',
    form: 'Confirme seus dados',
    done: '',
  }
  const currentIdx = Math.max(0, stepKeys.indexOf(step))
  const showStepper = stepKeys.length > 1
  const showStickyBar = step === 'service' && selectedServices.length > 0

  return (
    <div className={`p-4 space-y-6 ${showStickyBar ? 'pb-32' : ''}`}>
      {/* Stepper + título dinâmico */}
      {showStepper && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            {stepKeys.map((k, i) => {
              const isActive = i === currentIdx
              const isDone = i < currentIdx
              return (
                <div key={k} className="flex-1 flex items-center gap-1.5">
                  <div
                    className="h-1.5 flex-1 rounded-full transition-all"
                    style={{
                      background: isDone || isActive
                        ? 'linear-gradient(90deg, var(--brand-primary, #3B82F6), var(--brand-secondary, #06B6D4))'
                        : C.border,
                    }}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: C.text }}>
              {stepTitles[step]}
            </h2>
            <span className="text-xs font-medium" style={{ color: C.mute }}>
              {currentIdx + 1} de {stepKeys.length} · {stepLabels[step]}
            </span>
          </div>
        </div>
      )}

      {/* Banner de cupom aplicado */}
      {coupon && (
        <div
          className="rounded-2xl px-4 py-3 text-sm flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.06))',
            border: '1px solid rgba(16,185,129,0.4)',
          }}
        >
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
            style={{ background: 'rgba(16,185,129,0.2)' }}
          >
            🎁
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold" style={{ color: '#10B981' }}>
              Cupom {coupon.code} aplicado
            </p>
            <p className="text-xs mt-0.5" style={{ color: C.mute }}>
              {coupon.discount_type === 'percent'
                ? `${coupon.discount_value}% off na sua próxima visita`
                : `R$ ${coupon.discount_value.toFixed(2).replace('.', ',')} de desconto na sua próxima visita`}
            </p>
          </div>
        </div>
      )}

      {/* Banner de fila — quando vem do email com prefill */}
      {prefill && (
        <div
          className="rounded-2xl px-4 py-3 text-sm"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.08))',
            border: '1px solid rgba(245,158,11,0.35)',
            color: '#F59E0B',
          }}
        >
          <p className="font-bold">🔔 Vamos garantir sua vaga das {prefill.time} ({prefillDateLabel}){prefillProfName ? ` com ${prefillProfName}` : ''}</p>
          <p className="text-xs mt-1 opacity-90">
            {hasServices && selectedServices.length === 0
              ? 'Escolha o serviço pra continuar — o resto já está pronto.'
              : 'Confirme abaixo. Seus dados já estão preenchidos.'}
          </p>
        </div>
      )}

      {/* ETAPA 0 — ESCOLHER SERVIÇOS (múltipla seleção) */}
      {hasServices && (
        <section>
          <p className="text-xs mb-3" style={{ color: C.mute }}>
            Selecione um ou mais serviços abaixo
          </p>
          <div className="space-y-2.5">
            {services.map((service) => {
              const isSelected = selectedServices.some((s) => s.id === service.id)
              return (
                <button
                  key={service.id}
                  onClick={() => handleToggleService(service)}
                  className="w-full px-4 py-3.5 rounded-2xl border text-left transition-all"
                  style={
                    isSelected
                      ? {
                          background: 'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
                          borderColor: 'transparent',
                          color: '#FFFFFF',
                          boxShadow: '0 8px 24px -8px rgba(59,130,246,0.4)',
                        }
                      : {
                          background: C.surface,
                          borderColor: C.border,
                          color: C.text,
                        }
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{
                          background: isSelected ? '#FFFFFF' : 'transparent',
                          borderColor: isSelected ? '#FFFFFF' : C.borderHi,
                        }}
                      >
                        {isSelected && <IconCheck size={12} color="var(--brand-primary, #111827)" strokeWidth={4} />}
                      </div>
                      <span className="font-semibold text-sm truncate">{service.name}</span>
                    </div>
                    {service.price !== null && (
                      <span
                        className="font-bold text-sm flex-shrink-0"
                        style={{ color: isSelected ? '#FFFFFF' : C.text }}
                      >
                        {formatPrice(service.price)}
                      </span>
                    )}
                  </div>
                  {service.description && (
                    <p
                      className="mt-1.5 text-xs leading-snug pl-8"
                      style={{ color: isSelected ? 'rgba(255,255,255,0.92)' : C.mute }}
                    >
                      {service.description}
                    </p>
                  )}
                  <div
                    className="mt-2 flex items-center gap-3 text-xs pl-8"
                    style={{ color: isSelected ? 'rgba(255,255,255,0.85)' : C.mute }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <IconClock size={12} color="currentColor" />
                      {formatDuration(service.duration_minutes)}
                    </span>
                    {service.points > 0 && (
                      <span
                        className="inline-flex items-center gap-1 font-semibold"
                        style={{ color: isSelected ? '#FFFFFF' : 'var(--brand-primary, #3B82F6)' }}
                      >
                        <IconSparkles size={12} color="currentColor" />
                        +{service.points} pts
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

        </section>
      )}

      {/* ETAPA 1 — ESCOLHER PROFISSIONAL (só se tiver mais de um) */}
      {hasMultipleProfessionals && (step === 'professional' || step === 'date' || step === 'time' || step === 'form') && (
        <section id="profissionais-list">
          {step !== 'professional' && (
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: C.mute }}>
              Profissional
            </h2>
          )}
          <div className="space-y-2">
            {professionals.map((prof) => {
              const isSelected = selectedProfessional?.id === prof.id
              return (
                <button
                  key={prof.id}
                  onClick={() => handleSelectProfessional(prof)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-colors"
                  style={
                    isSelected
                      ? {
                          background: 'var(--brand-primary, #111827)',
                          borderColor: 'var(--brand-primary, #111827)',
                          color: '#FFFFFF',
                        }
                      : {
                          background: C.surface,
                          borderColor: C.border,
                          color: C.text,
                        }
                  }
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 overflow-hidden"
                    style={
                      prof.photo_url
                        ? {
                            background: 'transparent',
                            boxShadow: isSelected
                              ? '0 0 0 2px rgba(255,255,255,0.6)'
                              : `0 0 0 2px ${C.borderHi}`,
                          }
                        : {
                            background:
                              'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
                            color: '#FFFFFF',
                            boxShadow: isSelected
                              ? '0 0 0 2px rgba(255,255,255,0.6)'
                              : 'none',
                          }
                    }
                  >
                    {prof.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={prof.photo_url}
                        alt={prof.name}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: 'center 20%' }}
                      />
                    ) : (
                      prof.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="font-medium text-sm">{prof.name}</span>
                  {isSelected && <span className="ml-auto text-xs opacity-70">selecionado</span>}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* ETAPA 2 — ESCOLHER DATA */}
      {(step === 'date' || step === 'time' || step === 'form') && (
        <section id="datas-list">
          {step !== 'date' && (
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: C.mute }}>
              Dia
            </h2>
          )}
          {availableDates.length === 0 ? (
            <div className="rounded-2xl p-4" style={{
              background: isDark ? 'rgba(245,158,11,0.10)' : 'rgb(255,251,235)',
              border: `1px solid ${isDark ? 'rgba(245,158,11,0.25)' : 'rgb(254,215,170)'}`,
            }}>
              <p className="text-sm font-semibold mb-1.5" style={{ color: '#D97706' }}>
                Sem horário disponível agora.
              </p>
              <p className="text-xs leading-relaxed" style={{ color: C.mute }}>
                Já passou do expediente de hoje, ou nenhum profissional tem horários
                cadastrados pra os próximos 14 dias. Tente entrar em contato direto
                pelo WhatsApp do estabelecimento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {availableDates.map((date) => {
                const isSelected = selectedDate && formatDate(date) === formatDate(selectedDate)
                return (
                  <button
                    key={formatDate(date)}
                    onClick={() => handleSelectDate(date)}
                    className="flex flex-col items-center py-3 rounded-xl border text-sm font-medium transition-colors"
                    style={
                      isSelected
                        ? {
                            background: 'var(--brand-primary, #111827)',
                            borderColor: 'var(--brand-primary, #111827)',
                            color: '#FFFFFF',
                          }
                        : {
                            background: C.surface,
                            borderColor: C.border,
                            color: C.text,
                          }
                    }
                  >
                    <span className="text-xs opacity-70">{DAYS[date.getDay()]}</span>
                    <span className="text-lg font-bold leading-tight">{date.getDate()}</span>
                    <span className="text-xs opacity-70">
                      {date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ETAPA 2 — ESCOLHER HORÁRIO */}
      {(step === 'time' || step === 'form') && selectedDate && (
        <section id="horarios-disponiveis">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: C.mute }}>
            Horários disponíveis —{' '}
            {DAYS_FULL[selectedDate.getDay()]}, {selectedDate.getDate()}/
            {selectedDate.getMonth() + 1}
          </h2>
          {loadingSlots ? (
            <p className="text-sm" style={{ color: C.faded }}>Carregando horários...</p>
          ) : slots.length === 0 ? (
            slotsEmptyReason === 'duration' ? (
              <div
                className="rounded-2xl p-4"
                style={{
                  background: isDark ? 'rgba(245,158,11,0.10)' : 'rgb(255,251,235)',
                  border: `1px solid ${isDark ? 'rgba(245,158,11,0.25)' : 'rgb(254,215,170)'}`,
                }}
              >
                <p className="text-sm font-semibold mb-1.5" style={{ color: '#D97706' }}>
                  Sem horário pra {formatDuration(totalDuration)} de serviço neste dia.
                </p>
                <p className="text-xs leading-relaxed" style={{ color: C.mute }}>
                  A soma dos serviços que você escolheu é maior do que cabe nos períodos disponíveis.
                </p>
                <p className="text-xs leading-relaxed mt-2" style={{ color: C.mute }}>
                  Tente <strong style={{ color: C.text }}>tirar 1 ou 2 serviços</strong> acima, ou <strong style={{ color: C.text }}>escolha outro dia</strong> com mais janela livre.
                </p>
              </div>
            ) : (
              <div
                className="rounded-2xl p-4"
                style={{
                  background: isDark ? 'rgba(148,163,184,0.10)' : 'rgb(248,250,252)',
                  border: `1px solid ${isDark ? 'rgba(148,163,184,0.25)' : 'rgb(226,232,240)'}`,
                }}
              >
                <p className="text-sm font-semibold mb-1.5" style={{ color: C.text }}>
                  Sem horários livres neste dia.
                </p>
                <p className="text-xs leading-relaxed" style={{ color: C.mute }}>
                  Os horários disponíveis já foram reservados. Tente <strong style={{ color: C.text }}>outro dia</strong> acima.
                </p>
              </div>
            )
          ) : (
            <>
            {waitlistDone && waitlistSlot && (
              <div
                className="mb-3 flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs"
                style={{
                  background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: '#F59E0B',
                }}
              >
                <span>
                  Você está na fila das <strong>{waitlistSlot}</strong> — se vagar, te avisamos por email. Pode agendar outro horário também: a fila continua valendo.
                </span>
                <button
                  onClick={() => {
                    setWaitlistSlot(null)
                    setWaitlistDone(false)
                  }}
                  className="text-xs font-semibold opacity-70 hover:opacity-100 transition-opacity"
                  aria-label="Fechar aviso"
                >
                  ✕
                </button>
              </div>
            )}
            {!waitlistDone && !waitlistSlot && slots.some((s) => !s.available) && (
              <div
                className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
                style={{
                  background: isDark ? 'rgba(148,163,184,0.10)' : 'rgb(248,250,252)',
                  border: `1px solid ${isDark ? 'rgba(148,163,184,0.25)' : 'rgb(226,232,240)'}`,
                  color: C.mute,
                }}
              >
                <span
                  className="inline-flex items-center justify-center text-[10px] font-bold rounded-md px-1.5 py-0.5 shrink-0"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.10)' : '#F1F5F9',
                    color: C.mute,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  fila
                </span>
                <span>
                  Se o horário que você quer estiver ocupado, é só entrar na <strong>fila</strong> — avisamos por email se abrir vaga.
                </span>
              </div>
            )}
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => {
                const isSelected = selectedTime === slot.time
                return (
                  <button
                    key={slot.time}
                    onClick={() => {
                      if (!slot.available) {
                        setWaitlistSlot(slot.time)
                        setWaitlistDone(false)
                        return
                      }
                      setSelectedTime(slot.time)
                      setWaitlistSlot(null)
                      setStep('form')
                    }}
                    className="py-3 rounded-xl border text-sm font-semibold transition-colors cursor-pointer"
                    style={
                      !slot.available
                        ? {
                            background: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC',
                            color: C.faded,
                            borderColor: C.border,
                          }
                        : isSelected
                        ? {
                            background: 'var(--brand-primary, #111827)',
                            color: '#FFFFFF',
                            borderColor: 'var(--brand-primary, #111827)',
                          }
                        : {
                            background: C.surface,
                            color: C.text,
                            borderColor: C.border,
                          }
                    }
                  >
                    {slot.time}
                    {!slot.available && <span className="block text-xs" style={{ color: C.faded }}>fila</span>}
                  </button>
                )
              })}
            </div>

            {/* Form de fila — só enquanto o cliente está preenchendo (ao confirmar, vira o banner acima) */}
            {waitlistSlot && !waitlistDone && selectedDate && (
              <div
                className="mt-4 rounded-2xl p-4 space-y-3"
                style={{
                  background: isDark ? 'rgba(251,191,36,0.08)' : 'rgb(255,251,235)',
                  border: `1px solid ${isDark ? 'rgba(251,191,36,0.28)' : 'rgb(254,215,170)'}`,
                }}
              >
                <div>
                  <p className="font-bold text-sm" style={{ color: isDark ? '#FCD34D' : '#92400E' }}>
                    Horário {waitlistSlot} ocupado
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: isDark ? '#FBBF24' : '#B45309' }}>
                    Quer entrar na fila? Avisamos se a vaga abrir.
                  </p>
                </div>
                {([
                  { val: waitlistName, set: setWaitlistName, type: 'text', ph: 'Seu nome' },
                  { val: waitlistPhone, set: setWaitlistPhone, type: 'tel', ph: 'WhatsApp / Telefone' },
                  { val: waitlistEmail, set: setWaitlistEmail, type: 'email', ph: 'Email (para notificação)' },
                ] as const).map((f, i) => (
                  <input
                    key={i}
                    type={f.type}
                    value={f.val}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder={f.ph}
                    className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                    style={{
                      background: isDark ? 'rgba(0,0,0,0.25)' : '#FFFFFF',
                      color: isDark ? '#F1F5F9' : '#0F172A',
                      border: `1px solid ${isDark ? 'rgba(251,191,36,0.28)' : 'rgb(254,215,170)'}`,
                    }}
                  />
                ))}
                <div className="flex gap-2">
                  <button
                    onClick={handleJoinWaitlist}
                    disabled={waitlistSubmitting || !waitlistName.trim() || !waitlistPhone.trim()}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
                  >
                    {waitlistSubmitting ? 'Entrando...' : 'Entrar na fila'}
                  </button>
                  <button
                    onClick={() => setWaitlistSlot(null)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      background: isDark ? 'rgba(0,0,0,0.25)' : '#FFFFFF',
                      color: isDark ? '#FCD34D' : '#B45309',
                      border: `1px solid ${isDark ? 'rgba(251,191,36,0.3)' : 'rgb(254,215,170)'}`,
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </section>
      )}

      {/* ETAPA 3 — DADOS DO CLIENTE */}
      {step === 'form' && selectedTime && (
        <section>
          {/* Banner: cliente já tem outro agendamento esse dia */}
          {showOtherApptAlert && prefill?.otherAppointment && !otherCancelled && (
            <div className="mb-3 rounded-2xl p-4 space-y-3" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
              <div>
                <p className="text-sm font-bold" style={{ color: '#92400E' }}>
                  Você já tem agendamento das {prefill.otherAppointment.start_time} nesse dia
                </p>
                <p className="text-xs mt-1" style={{ color: '#92400E' }}>
                  Quer cancelar o das {prefill.otherAppointment.start_time} pra ficar só com as {prefill.time}, ou manter os dois?
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={cancelingOther}
                  onClick={async () => {
                    if (!prefill?.otherAppointment) return
                    setCancelingOther(true)
                    try {
                      const res = await fetch(
                        `/api/appointment/action?id=${prefill.otherAppointment.id}&action=cancelled&token=${prefill.otherAppointment.cancel_token}`
                      )
                      if (res.ok) {
                        setOtherCancelled(true)
                        setShowOtherApptAlert(false)
                      }
                    } finally {
                      setCancelingOther(false)
                    }
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
                >
                  {cancelingOther ? 'Cancelando...' : `Trocar (cancela o das ${prefill.otherAppointment.start_time})`}
                </button>
                <button
                  onClick={() => setShowOtherApptAlert(false)}
                  className="px-4 bg-white border border-amber-200 text-amber-700 py-2.5 rounded-xl text-sm font-medium hover:bg-amber-50 transition-colors"
                >
                  Manter os dois
                </button>
              </div>
            </div>
          )}
          {otherCancelled && (
            <div className="mb-3 rounded-xl px-3 py-2 text-xs" style={{ background: '#D1FAE5', border: '1px solid #6EE7B7', color: '#065F46' }}>
              ✅ Outro agendamento cancelado. Continue confirmando o novo abaixo.
            </div>
          )}

          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: C.mute }}>
            Seus dados
          </h2>
          <div
            className="rounded-2xl p-4 space-y-4"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}
          >

            {/* Resumo do agendamento */}
            <div
              className="rounded-xl px-4 py-3 text-sm space-y-1"
              style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, color: C.body }}
            >
              {selectedServices.length > 0 && (
                <div className="space-y-0.5">
                  {selectedServices.map((s) => (
                    <div key={s.id} className="flex justify-between">
                      <span className="font-medium" style={{ color: C.text }}>{s.name}</span>
                      {s.price !== null && (
                        <span style={{ color: C.mute }}>{formatPrice(s.price)}</span>
                      )}
                    </div>
                  ))}
                  {hasPrice && selectedServices.length > 1 && (
                    <div className="flex justify-between pt-1 mt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                      <span className="font-semibold" style={{ color: C.text }}>Subtotal</span>
                      <span className="font-medium" style={{ color: C.text }}>{formatPrice(subtotal)}</span>
                    </div>
                  )}
                  {coupon && couponDiscount > 0 && (
                    <div className="flex justify-between" style={{ color: '#10B981' }}>
                      <span className="font-medium">Cupom {coupon.code}</span>
                      <span className="font-medium">− {formatPrice(couponDiscount)}</span>
                    </div>
                  )}
                  {hasPrice && (selectedServices.length > 1 || coupon) && (
                    <div className="flex justify-between pt-1 mt-1" style={{ borderTop: `1px solid ${C.border}` }}>
                      <span className="font-semibold" style={{ color: C.text }}>Total</span>
                      <span className="font-bold" style={{ color: C.text }}>{formatPrice(totalPrice)}</span>
                    </div>
                  )}
                </div>
              )}
              <p>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>{' '}
                {selectedDate?.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}{' '}
                às <strong style={{ color: C.text }}>{selectedTime}</strong>
              </p>
            </div>

            {/* Campo telefone — primeiro, pois dispara lookup de cliente */}
            <div>
              <label className="block text-sm mb-1 font-medium" style={{ color: C.body }}>
                WhatsApp / Telefone
              </label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => {
                  setClientPhone(e.target.value)
                  setReturningClient(null)
                }}
                onBlur={handlePhoneBlur}
                placeholder="(99) 99999-9999"
                className="w-full rounded-xl px-4 py-3 focus:outline-none text-sm"
                style={{
                  background: C.input,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                }}
              />
              {lookingUpClient && (
                <p className="text-xs mt-1" style={{ color: C.faded }}>Verificando cadastro...</p>
              )}
              {returningClient && (
                <p className="text-xs mt-1 font-medium" style={{ color: isDark ? '#34D399' : '#059669' }}>
                  Bem-vindo de volta, {returningClient.name}!
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm mb-1 font-medium" style={{ color: C.body }}>Seu nome</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full rounded-xl px-4 py-3 focus:outline-none text-sm"
                style={{
                  background: C.input,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1 font-medium" style={{ color: C.body }}>
                Email <span className="font-normal" style={{ color: C.faded }}>(opcional — para receber confirmação)</span>
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full rounded-xl px-4 py-3 focus:outline-none text-sm"
                style={{
                  background: C.input,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                }}
              />
            </div>

            {error && <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting || !clientName.trim() || !clientPhone.trim()}
              className="w-full bg-[var(--brand-primary,#111827)] text-white py-4 rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Agendando...' : 'Confirmar agendamento'}
            </button>
          </div>
        </section>
      )}

      {/* Sticky bar — totalizador + Continuar (passo de serviços) */}
      {showStickyBar && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl"
          style={{
            background: isDark ? 'rgba(5,7,19,0.92)' : 'rgba(255,255,255,0.92)',
            borderTop: `1px solid ${C.border}`,
            paddingBottom: 'env(safe-area-inset-bottom, 0)',
          }}
        >
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                {hasPrice && coupon && couponDiscount > 0 ? (
                  <>
                    <span
                      className="text-xs line-through"
                      style={{ color: C.faded }}
                    >
                      {formatPrice(subtotal)}
                    </span>
                    <span className="text-lg font-bold" style={{ color: '#10B981' }}>
                      {formatPrice(totalPrice)}
                    </span>
                  </>
                ) : (
                  hasPrice && (
                    <span className="text-lg font-bold" style={{ color: C.text }}>
                      {formatPrice(totalPrice)}
                    </span>
                  )
                )}
                {totalPoints > 0 && (
                  <span
                    className="text-xs font-semibold inline-flex items-center gap-0.5"
                    style={{ color: 'var(--brand-primary, #3B82F6)' }}
                  >
                    <IconSparkles size={10} color="currentColor" />
                    +{totalPoints} pts
                  </span>
                )}
              </div>
              <div className="text-xs flex items-center gap-2" style={{ color: C.mute }}>
                <span>{selectedServices.length} {selectedServices.length === 1 ? 'serviço' : 'serviços'}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <IconClock size={10} color="currentColor" />
                  {formatDuration(totalDuration)}
                </span>
                {coupon && couponDiscount > 0 && (
                  <>
                    <span>·</span>
                    <span className="font-bold" style={{ color: '#10B981' }}>
                      − {formatPrice(couponDiscount)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={handleProceedFromServices}
              className="flex-shrink-0 px-5 py-3 rounded-xl font-semibold text-sm text-white inline-flex items-center gap-1.5 transition-transform active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, var(--brand-primary, #3B82F6) 0%, var(--brand-secondary, #06B6D4) 100%)',
                boxShadow: '0 8px 20px -8px rgba(59,130,246,0.5)',
              }}
            >
              Continuar
              <IconArrowRight size={14} color="#FFFFFF" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
