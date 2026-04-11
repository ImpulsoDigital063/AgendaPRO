import SegmentLanding, { SegmentConfig } from '@/components/SegmentLanding'

const config: SegmentConfig = {
  segment: 'barbearia',
  hero: {
    badge: '14 dias grátis — sem cartão de crédito',
    headline: 'Sua barbearia cheia sem depender do WhatsApp',
    sub: 'Chega de ficar respondendo mensagem para marcar horário. Cole o link na bio do Instagram e os clientes agendam sozinhos — 24 horas por dia, inclusive de madrugada.',
    pills: ['Sem app para o cliente', 'Cada barbeiro com sua agenda', 'Lembrete automático anti-falta'],
  },
  stats: [
    { number: '24h', label: 'Clientes agendam a qualquer hora, mesmo fora do expediente' },
    { number: '-50%', label: 'Menos faltas com lembrete automático no dia anterior' },
    { number: '5min', label: 'Para configurar e começar a receber agendamentos' },
  ],
  features: [
    {
      icon: '✂️',
      title: 'Cada barbeiro com sua própria agenda',
      desc: 'O cliente escolhe o barbeiro preferido na hora de agendar. Cada um tem seus próprios horários e dias de folga.',
    },
    {
      icon: '📱',
      title: 'Gerencie tudo pelo celular',
      desc: 'Confirme, cancele ou bloqueie horários de onde estiver. Sem precisar abrir computador — funciona direto no celular.',
    },
    {
      icon: '🔔',
      title: 'Lembrete automático no dia anterior',
      desc: 'O sistema manda email pro cliente lembrando do horário. Menos cliente que some sem avisar, mais cadeira ocupada.',
    },
    {
      icon: '⏸️',
      title: 'Bloqueio rápido da agenda',
      desc: 'Vai viajar, feriado ou folga? Pause a agenda com um clique. Nenhum cliente agenda nesse período.',
    },
    {
      icon: '💰',
      title: 'Comissão de cada barbeiro automática',
      desc: 'O relatório financeiro calcula automaticamente a comissão por profissional. Sem planilha, sem discussão no fechamento.',
    },
    {
      icon: '🔗',
      title: 'Link para Instagram e Google',
      desc: 'Cole o link na bio do Instagram e no Google Meu Negócio. Clientes novos chegam pelo Google e já agendam na hora.',
    },
  ],
  steps: [
    {
      n: '01',
      title: 'Cadastre a barbearia',
      desc: 'Nome, endereço, serviços (corte, barba, combo...) e horários de cada barbeiro. Pronto em 5 minutos.',
    },
    {
      n: '02',
      title: 'Cole o link onde seus clientes estão',
      desc: 'Bio do Instagram, Google Meu Negócio, status do WhatsApp. O cliente clica e já escolhe barbeiro, serviço e horário.',
    },
    {
      n: '03',
      title: 'Receba e gerencie os agendamentos',
      desc: 'Notificação a cada nova reserva. Confirme ou cancele pelo painel. Relatório de comissão pronto no final do mês.',
    },
  ],
  cta: {
    headline: 'Sua barbearia agenda sozinha enquanto você trabalha',
    sub: 'Configure em 5 minutos, cole o link no Instagram e comece a receber agendamentos hoje mesmo.',
  },
}

export default function BarbeiariaPage() {
  return <SegmentLanding config={config} />
}
