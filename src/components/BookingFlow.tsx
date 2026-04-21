'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Business, Professional, WorkingHours, TimeSlot, Service, Client } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

type Prefill = {
  name: string
  phone: string
  email: string
  date: string
  time: string
  professionalId: string
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

/**
 * Gera os slots de um dia.
 * - `step`: granularidade configurada no dia (ex: 15min) — "régua" dos horários mostrados.
 * - `serviceDuration`: tempo total do agendamento (soma dos serviços escolhidos).
 * - `booked`: agendamentos já existentes no dia, com seu inicio e duração real,
 *   pra checar sobreposição (não só igualdade).
 * Um slot é `available` se cabe inteiro dentro do expediente E não sobrepõe nenhum outro.
 */
function generateSlots(
  start: string,
  end: string,
  step: number,
  serviceDuration: number,
  booked: { start: number; end: number }[],
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const startMin = toMinutes(start)
  const endMin = toMinutes(end)
  const dur = Math.max(1, serviceDuration)

  for (let current = startMin; current + dur <= endMin; current += step) {
    const slotStart = current
    const slotEnd = current + dur
    const conflicts = booked.some((b) => slotStart < b.end && slotEnd > b.start)
    slots.push({ time: fromMinutes(current), available: !conflicts })
  }

  return slots
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

type Step = 'service' | 'professional' | 'date' | 'time' | 'form' | 'done'

export default function BookingFlow({
  business,
  professionals,
  workingHours,
  services,
  referralCode,
  prefill,
}: {
  business: Business
  professionals: Professional[]
  workingHours: WorkingHours[]
  services: Service[]
  referralCode?: string
  prefill?: Prefill
}) {
  const hasServices = services.length > 0
  const hasMultipleProfessionals = professionals.length > 1

  // Profissional inicial: se prefill bater com algum, usa; senão primeiro.
  const initialProf =
    (prefill && professionals.find((p) => p.id === prefill.professionalId)) || professionals[0]

  const [step, setStep] = useState<Step>(hasServices ? 'service' : hasMultipleProfessionals ? 'professional' : 'date')
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [selectedProfessional, setSelectedProfessional] = useState<Professional>(initialProf)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

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
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price ?? 0), 0)
  const hasPrice = selectedServices.some((s) => s.price !== null)

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

  // Gera os próximos 14 dias disponíveis
  const today = new Date()
  const availableDates: Date[] = []
  for (let i = 0; i < 14; i++) {
    const d = addDays(today, i + 1)
    const dayOfWeek = d.getDay()
    const hasHours = workingHours.some(
      (wh) => wh.professional_id === professional?.id && wh.day_of_week === dayOfWeek
    )
    if (hasHours) availableDates.push(d)
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
      return
    }
    setStep(hasMultipleProfessionals ? 'professional' : 'date')
  }

  function handleSelectProfessional(prof: Professional) {
    setSelectedProfessional(prof)
    setSelectedDate(null)
    setSelectedTime(null)
    setSlots([])
    setStep('date')
  }

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
    const wh = workingHours.find(
      (w) => w.professional_id === professional?.id && w.day_of_week === dayOfWeek
    )

    if (!wh) {
      setSlots([])
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
    const generated = generateSlots(wh.start_time, wh.end_time, step, serviceDuration, booked)

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
    })

    setWaitlistSubmitting(false)
    setWaitlistDone(true)
  }

  async function handleSubmit() {
    if (!selectedDate || !selectedTime || !clientName.trim() || !clientPhone.trim()) return
    setSubmitting(true)
    setError(null)

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
        setMyReferralLink(`${window.location.origin}/${business.slug}/agendar?ref=${newCustomer.referral_code}`)
      }
    } else {
      // Cliente existente — busca o referral_code dele
      const { data: existingFull } = await supabase
        .from('customers')
        .select('referral_code')
        .eq('id', customerId)
        .single()
      if (existingFull?.referral_code) {
        setMyReferralLink(`${window.location.origin}/${business.slug}/agendar?ref=${existingFull.referral_code}`)
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
      <div className="p-6 text-center text-gray-500">
        Nenhum profissional disponível no momento.
      </div>
    )
  }

  // TELA: AGENDAMENTO CONFIRMADO
  if (step === 'done') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="mb-4"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Agendamento confirmado!</h2>
        {selectedServices.length > 0 && (
          <div className="mb-2">
            {selectedServices.map((s) => (
              <p key={s.id} className="text-gray-700 font-medium">{s.name}</p>
            ))}
            {hasPrice && (
              <p className="text-gray-900 font-bold mt-1">{formatPrice(totalPrice)}</p>
            )}
          </div>
        )}
        <p className="text-gray-500 mb-1">
          {selectedDate &&
            selectedDate.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
        </p>
        <p className="text-gray-700 font-semibold text-lg mb-4">{selectedTime}</p>
        {pointsEarned > 0 && (
          <div className="mt-4 mb-2 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400 flex-shrink-0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <div className="text-left">
              <p className="text-amber-800 font-bold text-sm">Você vai ganhar +{pointsEarned} pontos</p>
              <p className="text-amber-600 text-xs">Os pontos entram após o atendimento.</p>
            </div>
          </div>
        )}
        <p className="text-gray-500 text-sm max-w-xs mt-2">
          Enviamos um email de confirmação. Te esperamos no horário marcado!
        </p>

        {myReferralLink && (
          <div className="mt-5 w-full max-w-sm bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left">
            <p className="text-sm font-bold text-gray-900 mb-1">Indique um amigo e ganhe pontos!</p>
            <p className="text-xs text-gray-500 mb-3">
              Quando um amigo agendar por esse link e o estabelecimento confirmar, você ganha pontos.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={myReferralLink}
                className="flex-1 text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:outline-none truncate"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(myReferralLink)
                  setReferralCopied(true)
                  setTimeout(() => setReferralCopied(false), 2000)
                }}
                className="px-3 py-2 bg-[var(--brand-primary,#111827)] text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                {referralCopied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        )}

        <a
          href={`/${business.slug}/meus-pontos`}
          className="mt-4 text-sm font-medium text-gray-500 underline underline-offset-2 hover:text-gray-700 transition-colors"
        >
          Ver meus pontos
        </a>

        {cancelUrl && (
          <a
            href={cancelUrl}
            className="mt-2 text-xs text-gray-400 underline underline-offset-2 hover:text-red-500 transition-colors"
          >
            Preciso cancelar
          </a>
        )}
      </div>
    )
  }

  // Banner explicando que o cliente veio do email da fila e o que vai acontecer
  const prefillProfName = prefill
    ? professionals.find((p) => p.id === prefill.professionalId)?.name
    : null
  const prefillDateLabel = prefill ? `${prefill.date.split('-')[2]}/${prefill.date.split('-')[1]}` : ''

  return (
    <div className="p-4 space-y-6">

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
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Quais serviços?
          </h2>
          <div className="space-y-2">
            {services.map((service) => {
              const isSelected = selectedServices.some((s) => s.id === service.id)
              return (
                <button
                  key={service.id}
                  onClick={() => handleToggleService(service)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-colors ${
                    isSelected
                      ? 'bg-[var(--brand-primary,#111827)] border-[var(--brand-primary,#111827)] text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'border-white bg-white' : 'border-gray-300'
                    }`}>
                      {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span className="font-medium text-sm">{service.name}</span>
                  </div>
                  <div className={`text-right text-xs ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                    {service.price !== null && (
                      <span className="font-semibold text-sm block">{formatPrice(service.price)}</span>
                    )}
                    <span>{formatDuration(service.duration_minutes)}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Resumo dos serviços selecionados */}
          {selectedServices.length > 0 && (
            <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{selectedServices.length}</span>{' '}
                {selectedServices.length === 1 ? 'serviço' : 'serviços'} —{' '}
                {formatDuration(totalDuration)}
              </div>
              {hasPrice && (
                <span className="font-bold text-gray-900 text-base">{formatPrice(totalPrice)}</span>
              )}
            </div>
          )}

          {selectedServices.length > 0 && step === 'service' && (
            <button
              onClick={handleProceedFromServices}
              className="mt-3 w-full bg-[var(--brand-primary,#111827)] text-white py-4 rounded-xl font-semibold text-base hover:opacity-90 transition-opacity"
            >
              {hasMultipleProfessionals ? 'Escolher profissional →' : 'Escolher horário →'}
            </button>
          )}
        </section>
      )}

      {/* ETAPA 1 — ESCOLHER PROFISSIONAL (só se tiver mais de um) */}
      {hasMultipleProfessionals && (step === 'professional' || step === 'date' || step === 'time' || step === 'form') && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Escolha o profissional
          </h2>
          <div className="space-y-2">
            {professionals.map((prof) => {
              const isSelected = selectedProfessional?.id === prof.id
              return (
                <button
                  key={prof.id}
                  onClick={() => handleSelectProfessional(prof)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-colors ${
                    isSelected
                      ? 'bg-[var(--brand-primary,#111827)] border-[var(--brand-primary,#111827)] text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden ${
                    isSelected ? 'bg-white text-gray-900 ring-2 ring-white/60' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {prof.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prof.photo_url} alt={prof.name} className="w-full h-full object-cover" />
                    ) : (
                      prof.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="font-medium text-sm">{prof.name}</span>
                  {isSelected && <span className="ml-auto text-xs opacity-60">selecionado</span>}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* ETAPA 2 — ESCOLHER DATA */}
      {(step === 'date' || step === 'time' || step === 'form') && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Escolha o dia
          </h2>
          {availableDates.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhuma data disponível nos próximos 14 dias.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {availableDates.map((date) => {
                const isSelected = selectedDate && formatDate(date) === formatDate(selectedDate)
                return (
                  <button
                    key={formatDate(date)}
                    onClick={() => handleSelectDate(date)}
                    className={`flex flex-col items-center py-3 rounded-xl border text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-[var(--brand-primary,#111827)] text-white border-[var(--brand-primary,#111827)]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                    }`}
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
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Horários disponíveis —{' '}
            {DAYS_FULL[selectedDate.getDay()]}, {selectedDate.getDate()}/
            {selectedDate.getMonth() + 1}
          </h2>
          {loadingSlots ? (
            <p className="text-gray-400 text-sm">Carregando horários...</p>
          ) : slots.length === 0 ? (
            <p className="text-gray-400 text-sm">Sem horários disponíveis neste dia.</p>
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
                  background: 'rgba(148,163,184,0.10)',
                  border: '1px solid rgba(148,163,184,0.25)',
                  color: '#64748B',
                }}
              >
                <span
                  className="inline-flex items-center justify-center text-[10px] font-bold rounded-md px-1.5 py-0.5 shrink-0"
                  style={{ background: '#F1F5F9', color: '#94A3B8', border: '1px solid #E2E8F0' }}
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
                    className={`py-3 rounded-xl border text-sm font-semibold transition-colors ${
                      !slot.available
                        ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-pointer hover:border-gray-300'
                        : isSelected
                        ? 'bg-[var(--brand-primary,#111827)] text-white border-[var(--brand-primary,#111827)]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {slot.time}
                    {!slot.available && <span className="block text-xs text-gray-300">fila</span>}
                  </button>
                )
              })}
            </div>

            {/* Form de fila — só enquanto o cliente está preenchendo (ao confirmar, vira o banner acima) */}
            {waitlistSlot && !waitlistDone && selectedDate && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                <div>
                  <p className="text-amber-800 font-bold text-sm">
                    Horário {waitlistSlot} ocupado
                  </p>
                  <p className="text-amber-600 text-xs mt-0.5">
                    Quer entrar na fila? Avisamos se a vaga abrir.
                  </p>
                </div>
                <input
                  type="text"
                  value={waitlistName}
                  onChange={(e) => setWaitlistName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400"
                />
                <input
                  type="tel"
                  value={waitlistPhone}
                  onChange={(e) => setWaitlistPhone(e.target.value)}
                  placeholder="WhatsApp / Telefone"
                  className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400"
                />
                <input
                  type="email"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="Email (para notificação)"
                  className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-amber-400"
                />
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
                    className="px-4 bg-white border border-amber-200 text-amber-700 py-2.5 rounded-xl text-sm font-medium hover:bg-amber-50 transition-colors"
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

          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Seus dados
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">

            {/* Resumo do agendamento */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600 space-y-1">
              {selectedServices.length > 0 && (
                <div className="space-y-0.5">
                  {selectedServices.map((s) => (
                    <div key={s.id} className="flex justify-between">
                      <span className="font-medium text-gray-900">{s.name}</span>
                      {s.price !== null && (
                        <span className="text-gray-500">{formatPrice(s.price)}</span>
                      )}
                    </div>
                  ))}
                  {hasPrice && selectedServices.length > 1 && (
                    <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-bold text-gray-900">{formatPrice(totalPrice)}</span>
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
                às <strong>{selectedTime}</strong>
              </p>
            </div>

            {/* Campo telefone — primeiro, pois dispara lookup de cliente */}
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-medium">
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
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 text-sm"
              />
              {lookingUpClient && (
                <p className="text-xs text-gray-400 mt-1">Verificando cadastro...</p>
              )}
              {returningClient && (
                <p className="text-xs text-emerald-600 mt-1 font-medium">
                  Bem-vindo de volta, {returningClient.name}!
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1 font-medium">Seu nome</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1 font-medium">
                Email <span className="text-gray-400 font-normal">(opcional — para receber confirmação)</span>
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 text-sm"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

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
    </div>
  )
}
