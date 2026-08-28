'use client'

import {
  IconCalendar,
  IconCalendarSolid,
  IconUsers,
  IconUsersSolid,
  IconSearch,
  IconClock,
  IconWallet,
  IconWalletSolid,
  IconGift,
} from '@/components/ui/Icon'
import DockNav, { type DockTab } from '@/components/admin/DockNav'

type Props = {
  pendingAppointments?: number
  /** v133 · negócio passou a definição de horário pra recepção */
  podeEditarHorario?: boolean
  /** v144 · recepção que também atende: atalho pro financeiro DELA */
  tambemAtende?: boolean
}

export default function RecepcaoBottomNav({
  pendingAppointments = 0,
  podeEditarHorario = false,
  tambemAtende = false,
}: Props) {
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
      href: '/recepcao/cupons',
      label: 'Cupons',
      Icon: IconGift,
    },
    {
      href: '/recepcao/caixa',
      label: 'Caixa',
      Icon: IconWallet,
      IconSolid: IconWalletSolid,
    },
    {
      href: '/recepcao/consultas',
      label: 'Consultas',
      Icon: IconSearch,
    },
  ]

  // v133 · entra no fim e só pra quem tem a chave — dock dos outros negócios
  // continua com as mesmas 5 abas de sempre.
  if (podeEditarHorario) {
    tabs.push({ href: '/recepcao/horarios', label: 'Horários', Icon: IconClock })
  }

  // v144 · a própria comissão de quem acumula balcão e atendimento
  if (tambemAtende) {
    tabs.push({ href: '/profissional/financeiro', label: 'Meus ganhos', Icon: IconWallet })
  }

  return <DockNav tabs={tabs} />
}
