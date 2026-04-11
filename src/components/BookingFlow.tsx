'use client'

import { useState } from 'react'
import { Business, Professional, WorkingHours, TimeSlot, Service } from '@/lib/types'
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

type Step = 'service' | 'date' | 'time' | 'form' | 'done'

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

  const [step, setStep] = useState<Step>(hasServices ? 'service' : 'date')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Para V1 (Plano Solo), usa o primeiro profissional ativo
  const professional = professionals[0]

  // Duração efetiva: do serviço se selecionado, senão do working_hours
  function getSlotDuration(date: Date): number {
    if (selectedService) return selectedService.duration_minutes
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

  function handleSelectService(service: Service) {
    setSelectedService(service)
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
    const duration = selectedService ? selectedService.duration_minutes : wh.slot_duration
    const generated = generateSlots(wh.start_time, wh.end_time, duration, bookedTimes)

    setSlots(generated)
    setLoadingSlots(false)
    setStep('time')
  }

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
    const { error: err } = await supabase.from('appointments').insert({
      business_id: business.id,
      professional_id: professional.id,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      client_email: clientEmail.trim() || null,
      appointment_date: formatDate(selectedDate),
      start_time: selectedTime,
      end_time: endTime,
      status: 'pending',
      service_id: selectedService?.id ?? null,
      service_name: selectedService?.name ?? null,
    })

    if (err) {
      setError('Erro ao agendar. Tente novamente.')
      setSubmitting(false)
      return
    }

    // Busca o ID do agendamento recém criado e notifica o barbeiro
    const { data: created } = await supabase
      .from('appointments')
      .select('id')
      .eq('professional_id', professional.id)
      .eq('appointment_date', formatDate(selectedDate))
      .eq('start_time', selectedTime)
      .eq('client_phone', clientPhone.trim())
      .single()

    if (created?.id) {
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: created.id }),
      }).catch(() => {})
    }

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
        {selectedService && (
          <p className="text-gray-700 font-medium mb-1">{selectedService.name}</p>
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

      {/* ETAPA 0 — ESCOLHER SERVIÇO */}
      {hasServices && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Qual serviço?
          </h2>
          <div className="space-y-2">
            {services.map((service) => {
              const isSelected = selectedService?.id === service.id
              return (
                <button
                  key={service.id}
                  onClick={() => handleSelectService(service)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-colors ${
                    isSelected
                      ? 'bg-gray-900 border-gray-900 text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <span className="font-medium text-sm">{service.name}</span>
                  <div className={`text-right text-xs ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                    {formatPrice(service.price) && (
                      <span className="font-semibold text-sm block">{formatPrice(service.price)}</span>
                    )}
                    <span>{formatDuration(service.duration_minutes)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* ETAPA 1 — ESCOLHER DATA */}
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
              {selectedService && (
                <p className="font-medium text-gray-900">{selectedService.name}</p>
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
                WhatsApp / Telefone
              </label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(99) 99999-9999"
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
