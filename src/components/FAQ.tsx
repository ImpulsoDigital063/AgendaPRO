'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: 'Meu cliente precisa baixar algum aplicativo?',
    a: 'Não. O cliente acessa pelo link direto no celular — abre no navegador, escolhe o horário e confirma. Sem cadastro, sem download, sem atrito. É exatamente por isso que a taxa de agendamento é alta.',
  },
  {
    q: 'É difícil de configurar?',
    a: 'Não precisa de técnico nem de conhecimento de tecnologia. Você preenche o nome do negócio, adiciona os serviços e horários, e em menos de 5 minutos já tem uma página pronta para compartilhar. A maioria dos clientes configura tudo no primeiro acesso.',
  },
  {
    q: 'Como meus clientes vão encontrar a página de agendamento?',
    a: 'Você recebe um link personalizado — agendapro.com.br/seu-negocio — e cola onde quiser: bio do Instagram, Google Meu Negócio, status do WhatsApp ou manda direto nas conversas. O cliente clica e já agenda, sem precisar te chamar.',
  },
  {
    q: 'Como funciona o lembrete automático?',
    a: 'No dia anterior ao agendamento, o sistema manda um email para o cliente lembrando do horário marcado. Isso reduz em até 50% os casos de cliente que esquece e não aparece. Automático, sem você precisar fazer nada.',
  },
  {
    q: 'Posso bloquear minha agenda em dias específicos?',
    a: 'Sim. Precisou sair mais cedo, feriado, folga ou viagem? Você bloqueia o dia ou o período diretamente pelo painel no celular. Nenhum cliente consegue agendar nesse intervalo enquanto o bloqueio estiver ativo.',
  },
  {
    q: 'E se eu quiser cadastrar um agendamento manualmente?',
    a: 'Também funciona. Se o cliente te pediu pelo WhatsApp ou pessoalmente, você mesmo cadastra pelo painel em segundos. Não precisa depender só do autoatendimento.',
  },
  {
    q: 'Funciona para qualquer tipo de serviço?',
    a: 'Sim. Barbearia, salão de beleza, nail designer, clínica estética, psicólogo, personal trainer, dentista — qualquer negócio que trabalha com hora marcada. Você cadastra os serviços que oferece e o sistema se adapta.',
  },
  {
    q: 'Tenho mais de um profissional. Funciona?',
    a: 'Sim. No plano Equipe, cada profissional tem sua própria agenda e horários independentes. O cliente escolhe com quem quer ser atendido na hora de agendar. E você acompanha o relatório de comissão de cada um pelo painel.',
  },
  {
    q: 'O que acontece quando os 14 dias de teste acabam?',
    a: 'Você recebe um aviso dentro do sistema antes do prazo. Para continuar, basta escolher um plano. Se não contratar, o acesso ao painel é pausado — mas nenhum dado é apagado. É só retomar quando quiser.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, sem multa e sem burocracia. Não existe fidelidade nem contrato anual obrigatório. Se decidir cancelar, é só falar com a gente pelo WhatsApp.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="px-6 py-20 bg-white">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-3">FAQ</p>
          <h2 className="text-2xl font-bold text-gray-900">Perguntas frequentes</h2>
          <p className="text-gray-400 text-sm mt-2">Tudo que você precisa saber antes de começar.</p>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="border border-gray-100 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900 text-sm pr-4">{faq.q}</span>
                <span className={`flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-200 flex items-center justify-center transition-transform ${open === i ? 'rotate-45 border-gray-900 bg-gray-900' : ''}`}>
                  <svg className={`w-2.5 h-2.5 ${open === i ? 'text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </span>
              </button>

              {open === i && (
                <div className="px-5 pb-5">
                  <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA no final do FAQ */}
        <div className="mt-10 text-center">
          <p className="text-gray-400 text-sm mb-4">Ficou alguma dúvida?</p>
          <a
            href="https://wa.me/5563984031275?text=Ol%C3%A1!%20Tenho%20uma%20d%C3%BAvida%20sobre%20o%20AgendaPRO."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-green-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Falar no WhatsApp
          </a>
        </div>
      </div>
    </section>
  )
}
