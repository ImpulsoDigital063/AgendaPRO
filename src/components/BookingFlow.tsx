'use client'

import { useState, useCallback } from 'react'
import { Business, Professional, WorkingHours, TimeSlot, Service, Client } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function generateSlots(
  start: string,
  end: string,
  duration: number,
  bookedTimes: string[]
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const [startH, startM] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)

  let current = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  while (current + duration <= endMinutes) {
    const h = Math.floor(current / 60).toString().padStart(2, '0')
    const m = (current % 60).toString().padStart(2, '0')
    const time = `${h}:${m}`
    slots.push({ time, available: !bookedTimes.includes(time) })
    current += duration
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
}: {
  business: Business
  professionals: Professional[]
  workingHours: WorkingHours[]
  services: Service[]
}) {
  const hasServices = services.length > 0
  const hasMultipleProfessionals = professionals.length > 1

  const [step, setStep] = useState<Step>(hasServices ? 'service' : hasMultipleProfessionals ? 'professional' : 'date')
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [selectedProfessional, setSelectedProfessional] = useState<Professional>(professionals[0])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Dados do cliente
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [returningClient, setReturningClient] = useState<Client | null>(null)
  const [lookingUpClient, setLookingUpClient] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Profissional ativo selecionado
  const professional = selectedProfessional

  // Totais calculados dos serviços selecionados
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0)
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price ?? 0), 0)
  const hasPrice = selectedServices.some((s) => s.price !== null)

  function getSlotDuration(date: Date): number {
    if (totalDuration > 0) return totalDuration
    const wh = workingHours.find(
      (w) => w.professional_id === professional?.id && w.day_of_week === date.getDay()
    )
    return wh?.slot_duration || 40
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
    setStep(hasMultipleProfessionals ? 'professional' : 'date')
  }

  function handleSelectProfessional(prof: Professional) {
    setSelectedProfessional(prof)
    setSelectedDate(null)
    setSelectedTime(null)
    setSlots([])
    setStep('date')
  }

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
      .select('start_time')
      .eq('professional_id', professional.id)
      .eq('appointment_date', formatDate(date))
      .in('status', ['pending', 'confirmed'])

    const bookedTimes = (existing || []).map((a) => a.start_time.slice(0, 5))
    const duration = getSlotDuration(date)
    const generated = generateSlots(wh.start_time, wh.end_time, duration, bookedTimes)

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
      .select('*')
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

  async function handleSubmit() {
    if (!selectedDate || !selectedTime || !clientName.trim() || !clientPhone.trim()) return
    setSubmitting(true)
    setError(null)

    const duration = getSlotDuration(selectedDate)
    const [h, m] = selectedTime.split(':').map(Number)
    const endMinutes = h * 60 + m + duration
    const endH = Math.floor(endMinutes / 60).toString().padStart(2, '0')
    const endM = (endMinutes % 60).toString().padStart(2, '0')
    const endTime = `${endH}:${endM}`

    const supabase = createClient()

    // 1. Criar ou recuperar cliente
    let clientId: string | null = returningClient?.id ?? null

    if (!clientId) {
      const { data: existing } = await supabase
        .from('clients')
        .select('id')
        .eq('phone', clientPhone.trim())
        .maybeSingle()

      if (existing) {
        clientId = existing.id
        // Atualiza nome e email se mudou
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

    // 2. Criar agendamento
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
        status: 'pending',
      })
      .select('id')
      .single()

    if (apptErr || !appointment) {
      setError('Erro ao agendar. Tente novamente.')
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

    // 4. Notificar profissional
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: appointment.id }),
    }).catch(() => {})

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
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Horário reservado!</h2>
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
        <p className="text-gray-500 text-sm max-w-xs">
          Aguarde a confirmação do {business.name}. Você receberá uma mensagem em breve.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">

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
                      ? 'bg-gray-900 border-gray-900 text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'border-white bg-white' : 'border-gray-300'
                    }`}>
                      {isSelected && <span className="text-gray-900 text-xs font-bold">✓</span>}
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
              className="mt-3 w-full bg-gray-900 text-white py-4 rounded-xl font-semibold text-base hover:bg-gray-800 transition-colors"
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
                      ? 'bg-gray-900 border-gray-900 text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isSelected ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {prof.name.charAt(0).toUpperCase()}
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
                        ? 'bg-gray-900 text-white border-gray-900'
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
        <section>
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
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => {
                const isSelected = selectedTime === slot.time
                return (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => {
                      setSelectedTime(slot.time)
                      setStep('form')
                    }}
                    className={`py-3 rounded-xl border text-sm font-semibold transition-colors ${
                      !slot.available
                        ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'
                        : isSelected
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {slot.time}
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ETAPA 3 — DADOS DO CLIENTE */}
      {step === 'form' && selectedTime && (
        <section>
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
                📅{' '}
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
              className="w-full bg-gray-900 text-white py-4 rounded-xl font-semibold text-base hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Agendando...' : 'Confirmar agendamento'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
