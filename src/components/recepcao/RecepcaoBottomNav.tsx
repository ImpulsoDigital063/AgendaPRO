'use client'

import {
  IconCalendar,
  IconCalendarSolid,
  IconUsers,
  IconUsersSolid,
  IconSearch,
} from '@/components/ui/Icon'
import DockNav, { type DockTab } from '@/components/admin/DockNav'

type Props = {
  pendingAppointments?: number
}

export default function RecepcaoBottomNav({ pendingAppointments = 0 }: Props) {
  const tabs: DockTab[] = [
    {
      href: '/recepcao',
      label: 'Agenda',
      Icon: IconCalendar,
      IconSolid: IconCalendarSolid,
      badge: pendingAppointments,
    },
    {
      href: '/recepcao/clientes',
      label: 'Clientes',
      Icon: IconUsers,
      IconSolid: IconUsersSolid,
    },
    {
      href: '/recepcao/consultas',
      label: 'Consultas',
      Icon: IconSearch,
    },
  ]

  return <DockNav tabs={tabs} />
}
