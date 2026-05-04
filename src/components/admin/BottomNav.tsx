'use client'

import {
  IconCalendar,
  IconCalendarSolid,
  IconUser,
  IconUserSolid,
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
  /** True quando o admin também atende clientes (tem registro em
   *  professionals.role='owner'). Habilita a aba "Eu" entre Agenda e
   *  Clientes pra ver agenda/financeiro pessoal isolado do estabelecimento. */
  showOwnerTab?: boolean
}

export default function BottomNav({
  pendingAppointments = 0,
  pendingClaims = 0,
  showOwnerTab = false,
}: Props) {
  const tabs: DockTab[] = [
    {
      href: '/admin',
      label: 'Agenda',
      Icon: IconCalendar,
      IconSolid: IconCalendarSolid,
      badge: pendingAppointments,
    },
    ...(showOwnerTab
      ? [
          {
            href: '/admin/eu',
            label: 'Eu',
            Icon: IconUser,
            IconSolid: IconUserSolid,
          } as DockTab,
        ]
      : []),
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
