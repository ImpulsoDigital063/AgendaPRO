import SegmentLanding, { SegmentConfig } from '@/components/SegmentLanding'

const config: SegmentConfig = {
  segment: 'salao',
  hero: {
    badge: '14 dias grátis — sem cartão de crédito',
    headline: 'Gerencie o salão inteiro pelo celular',
    sub: 'Cada profissional com sua agenda, clientes agendando 24h pelo link e relatório de comissão automático no final do mês. Sem planilha, sem confusão.',
    pills: ['Múltiplos profissionais', 'Comissão automática', 'Cliente agenda pelo Instagram'],
  },
  stats: [
    { number: '24h', label: 'Clientes agendam a qualquer hora, sem te chamar no WhatsApp' },
    { number: '-50%', label: 'Menos faltas com lembrete automático no dia anterior' },
    { number: '5min', label: 'Para cadastrar o salão e começar a receber agendamentos' },
  ],
  features: [
    {
      icon: '👥',
      title: 'Agenda individual por profissional',
      desc: 'Cabelereiro, manicure, maquiador — cada um com seus próprios horários. O cliente escolhe com quem quer ser atendido.',
    },
    {
      icon: '💰',
      title: 'Comissão calculada automaticamente',
      desc: 'Sem planilha no final do mês. O sistema já mostra o quanto cada profissional fez e a comissão de cada um.',
    },
    {
      icon: '🔔',
      title: 'Lembrete automático D-1',
      desc: 'Email automático no dia anterior para o cliente não esquecer. Reduz em até 50% as faltas sem aviso.',
    },
    {
      icon: '📱',
      title: 'Painel completo no celular',
      desc: 'Veja toda a agenda do dia, confirme agendamentos e bloqueie horários de onde estiver — sem abrir computador.',
    },
    {
      icon: '🔗',
      title: 'Agendamento pelo Instagram e Google',
      desc: 'Link na bio do Instagram, Google Meu Negócio ou WhatsApp. Cliente acessa, escolhe serviço e profissional e confirma — sem te chamar.',
    },
    {
      icon: '⏸️',
      title: 'Bloqueio de agenda por profissional',
      desc: 'Profissional de folga ou feriado? Bloqueia o dia dela em um clique. Nenhum cliente agenda nesse intervalo.',
    },
  ],
  steps: [
    {
      n: '01',
      title: 'Cadastre o salão e a equipe',
      desc: 'Nome, serviços, profissionais e horários de cada um. Pronto em menos de 10 minutos.',
    },
    {
      n: '02',
      title: 'Compartilhe o link nas redes',
      desc: 'Bio do Instagram, Google Meu Negócio, status do WhatsApp. Clientes agendam direto, escolhendo profissional e serviço.',
    },
    {
      n: '03',
      title: 'Gerencie e feche o mês sem stress',
      desc: 'Agenda do dia na palma da mão. Relatório de faturamento e comissão de cada profissional com um clique.',
    },
  ],
  cta: {
    headline: 'Seu salão organizado, sua equipe satisfeita',
    sub: 'Agenda online, comissão automática e menos falta de cliente. Configure em 5 minutos.',
  },
}

export default function SalaoPage() {
  return <SegmentLanding config={config} />
}
