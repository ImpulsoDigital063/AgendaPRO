'use client'

import {
  IconCalendar,
  IconCalendarSolid,
  IconClock,
  IconWallet,
  IconWalletSolid,
  IconSettings,
  IconSettingsSolid,
} from '@/components/ui/Icon'
import DockNav, { type DockTab } from '@/components/admin/DockNav'

type Props = {
  employmentType?: 'commissioned' | 'employed'
  pendingAppointments?: number
}

export default function ProfissionalBottomNav({
  employmentType = 'commissioned',
  pendingAppointments = 0,
}: Props) {
  const ALL_TABS: DockTab[] = [
    {
      href: '/profissional',
      label: 'Agenda',
      Icon: IconCalendar,
      IconSolid: IconCalendarSolid,
      badge: pendingAppointments,
    },
    { href: '/profissional/horarios', label: 'Horários', Icon: IconClock },
    {
      href: '/profissional/financeiro',
      label: 'Financeiro',
      Icon: IconWallet,
      IconSolid: IconWalletSolid,
    },
    {
      href: '/profissional/conta',
      label: 'Conta',
      Icon: IconSettings,
      IconSolid: IconSettingsSolid,
    },
  ]

  const tabs =
    employmentType === 'employed'
      ? ALL_TABS.filter(
          (t) => t.href !== '/profissional/horarios' && t.href !== '/profissional/financeiro'
        )
      : ALL_TABS

  return <DockNav tabs={tabs} />
}
