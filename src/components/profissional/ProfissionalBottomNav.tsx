'use client'

import {
  IconCalendar,
  IconCalendarSolid,
  IconClock,
  IconUsers,
  IconWallet,
  IconWalletSolid,
  IconSettings,
  IconSettingsSolid,
} from '@/components/ui/Icon'
import DockNav, { type DockTab } from '@/components/admin/DockNav'

type Props = {
  employmentType?: 'commissioned' | 'employed'
  pendingAppointments?: number
  /** v131 · false = negócio reservou a definição de horário pra dona e recepção */
  podeEditarHorario?: boolean
  /** v144 · false = sem grade de agenda (só financeiro e conta) */
  veAgenda?: boolean
  /** v144 · true = também opera o balcão · ganha atalho pra /recepcao */
  operaRecepcao?: boolean
}

export default function ProfissionalBottomNav({
  employmentType = 'commissioned',
  pendingAppointments = 0,
  podeEditarHorario = true,
  veAgenda = true,
  operaRecepcao = false,
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

  const semHorario = ALL_TABS.filter((t) => t.href !== '/profissional/horarios')

  // v131 · negócio que reservou o horário pra dona/recepção não mostra a aba.
  // Default `true` → base inteira segue como sempre.
  const base = podeEditarHorario ? ALL_TABS : semHorario

  const semAgenda = base.filter((t) => t.href !== '/profissional')
  const comRecepcao = operaRecepcao
    ? [...(veAgenda ? base : semAgenda), { href: '/recepcao', label: 'Recepção', Icon: IconUsers }]
    : veAgenda ? base : semAgenda

  const tabs =
    employmentType === 'employed'
      ? comRecepcao.filter(
          (t) => t.href !== '/profissional/horarios' && t.href !== '/profissional/financeiro'
        )
      : comRecepcao

  return <DockNav tabs={tabs} />
}
