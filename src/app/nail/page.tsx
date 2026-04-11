import SegmentLanding, { SegmentConfig } from '@/components/SegmentLanding'

const config: SegmentConfig = {
  segment: 'nail',
  hero: {
    badge: '14 dias grátis — sem cartão de crédito',
    headline: 'Agenda lotada sem ficar no WhatsApp o dia todo',
    sub: 'Você trabalha com as mãos — não dá para ficar respondendo mensagem para confirmar horário. Configure o link uma vez e as clientes agendam sozinhas, a qualquer hora.',
    pills: ['Sem app para a cliente', 'Você escolhe seus horários', 'Lembrete automático anti-falta'],
  },
  stats: [
    { number: '24h', label: 'Clientes agendam enquanto você está atendendo' },
    { number: '-50%', label: 'Menos faltas com lembrete automático no dia anterior' },
    { number: '5min', label: 'Para configurar e já ter a agenda funcionando' },
  ],
  features: [
    {
      icon: '💅',
      title: 'Você define seus horários e serviços',
      desc: 'Gel, fibra, esmaltação, manutenção — cadastre cada serviço com duração e preço. Só aparecem os horários que você definiu.',
    },
    {
      icon: '🚫',
      title: 'Sem app para a cliente',
      desc: 'A cliente acessa pelo link no celular, sem baixar nada. Escolhe o serviço e o horário em menos de 1 minuto.',
    },
    {
      icon: '🔔',
      title: 'Lembrete automático no dia anterior',
      desc: 'Email automático para a cliente na véspera. Menos sumida sem avisar, menos horário vago na sua agenda.',
    },
    {
      icon: '⏸️',
      title: 'Bloqueie dias e horários com um clique',
      desc: 'Precisou sair mais cedo ou tirar o dia? Bloqueia no painel e nenhuma cliente consegue agendar nesse intervalo.',
    },
    {
      icon: '🔗',
      title: 'Link direto na bio do Instagram',
      desc: 'Cole o link na bio e escreva "Agende pelo link 👇". Seguidoras viram clientes sem precisar te mandar mensagem.',
    },
    {
      icon: '📱',
      title: 'Tudo no celular, onde estiver',
      desc: 'Veja sua agenda do dia, confirme ou cancele horários. Funciona como um app — sem precisar de computador.',
    },
  ],
  steps: [
    {
      n: '01',
      title: 'Cadastre seus serviços e horários',
      desc: 'Liste os serviços que você faz, a duração de cada um e os horários disponíveis. Pronto em 5 minutos.',
    },
    {
      n: '02',
      title: 'Cole o link no Instagram',
      desc: 'Você recebe um link — agendapro.com.br/seu-nome — para colocar na bio. Seguidoras agendam sem te chamar.',
    },
    {
      n: '03',
      title: 'Atenda sem interrupção',
      desc: 'Notificação a cada novo agendamento. Confirme com um clique. Foque no atendimento — a agenda cuida de si mesma.',
    },
  ],
  cta: {
    headline: 'Sua agenda no piloto automático',
    sub: 'Foque no atendimento. Deixa o sistema cuidar dos agendamentos.',
  },
}

export default function NailPage() {
  return <SegmentLanding config={config} />
}
