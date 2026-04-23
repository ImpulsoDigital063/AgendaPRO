'use client'

import {
  IconCalendar,
  IconCalendarSolid,
  IconUsers,
  IconUsersSolid,
  IconWallet,
  IconWalletSolid,
  IconSettings,
  IconSettingsSolid,
} from '@/components/ui/Icon'
import DockNav, { type DockTab } from './DockNav'

type Props = {
  pendingAppointments?: number
  pendingClaims?: number
}

export default function BottomNav({ pendingAppointments = 0, pendingClaims = 0 }: Props) {
  const tabs: DockTab[] = [
    {
      href: '/admin',
      label: 'Agenda',
      Icon: IconCalendar,
      IconSolid: IconCalendarSolid,
      badge: pendingAppointments,
    },
    {
      href: '/admin/clientes',
      label: 'Clientes',
      Icon: IconUsers,
      IconSolid: IconUsersSolid,
      badge: pendingClaims,
    },
    {
      href: '/admin/financeiro',
      label: 'Financeiro',
      Icon: IconWallet,
      IconSolid: IconWalletSolid,
    },
    {
      href: '/admin/configuracoes',
      label: 'Config',
      Icon: IconSettings,
      IconSolid: IconSettingsSolid,
    },
  ]

  return <DockNav tabs={tabs} />
}
