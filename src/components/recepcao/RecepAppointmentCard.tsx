'use client'

// Wrapper sobre AppointmentCard (admin) reusando toda a logica de ações
// existente. Quando uma ação for chamada, ela bate em /api/admin/* que
// hoje exige owner — TODO: adaptar APIs pra aceitar recepcionista
// (verificar professionals.is_receptionist=true em vez de owner_id).
import AppointmentCard from '@/components/AppointmentCard'

type Props = {
  appointment: Parameters<typeof AppointmentCard>[0]['appointment']
  businessId: string
  showDate?: boolean
}

export default function RecepAppointmentCard({ appointment, showDate }: Props) {
  return <AppointmentCard appointment={appointment} showDate={showDate} />
}
