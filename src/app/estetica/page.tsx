import SegmentLanding, { SegmentConfig } from '@/components/SegmentLanding'

const config: SegmentConfig = {
  segment: 'estetica',
  hero: {
    badge: '14 dias grátis — sem cartão de crédito',
    headline: 'Sua clínica com agendamento profissional',
    sub: 'Clientes agendam 24h pelo link, você gerencia a equipe pelo painel e ainda controla o faturamento de cada procedimento. Sem planilha, sem WhatsApp lotado.',
    pills: ['Múltiplos profissionais', 'Faturamento por procedimento', 'Agenda 24h online'],
  },
  stats: [
    { number: '24h', label: 'Clientes agendam procedimentos a qualquer hora' },
    { number: '-50%', label: 'Menos faltas com lembrete automático no dia anterior' },
    { number: '5min', label: 'Para configurar e começar a receber agendamentos' },
  ],
  features: [
    {
      icon: '🧴',
      title: 'Cada procedimento com duração e preço',
      desc: 'Limpeza de pele, drenagem, laser, massagem — cadastre cada serviço com duração exata. O sistema bloqueia o horário certo para cada procedimento.',
    },
    {
      icon: '👥',
      title: 'Agenda por profissional',
      desc: 'Cada esteticista com sua própria agenda e horários. O cliente escolhe com quem prefere ser atendido.',
    },
    {
      icon: '💰',
      title: 'Faturamento e comissão automáticos',
      desc: 'Relatório de receita por período e comissão de cada profissional calculados automaticamente. Fecha o mês sem planilha.',
    },
    {
      icon: '🔔',
      title: 'Lembrete automático D-1',
      desc: 'Com ticket médio alto, cada falta dói no caixa. O lembrete automático no dia anterior reduz em até 50% os cancelamentos de última hora.',
    },
    {
      icon: '📱',
      title: 'Painel completo no celular',
      desc: 'Veja a agenda do dia, confirme agendamentos e bloqueie horários de onde estiver. Sem depender de computador na recepção.',
    },
    {
      icon: '🔗',
      title: 'Agendamento pelo Instagram e Google',
      desc: 'Link na bio do Instagram e no Google Meu Negócio. Clientes que te encontram no Google já saem de lá com horário marcado.',
    },
  ],
  steps: [
    {
      n: '01',
      title: 'Cadastre a clínica e a equipe',
      desc: 'Procedimentos, duração, preços e profissionais. Tudo configurado em menos de 10 minutos.',
    },
    {
      n: '02',
      title: 'Ative o agendamento online',
      desc: 'Cole o link no Instagram e no Google. Clientes agendam direto, escolhendo procedimento, profissional e horário.',
    },
    {
      n: '03',
      title: 'Gerencie e acompanhe o financeiro',
      desc: 'Notificação a cada nova reserva. Relatório de faturamento e comissão de cada profissional na palma da mão.',
    },
  ],
  cta: {
    headline: 'Sua clínica no próximo nível',
    sub: 'Agenda online, equipe organizada e financeiro no controle. Configure em 5 minutos.',
  },
}

export default function EsteticaPage() {
  return <SegmentLanding config={config} />
}
