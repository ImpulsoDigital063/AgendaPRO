import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidade — AgendaPRO',
}

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">

        <div className="mb-8">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">← Voltar</Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Política de Privacidade</h1>
        <p className="text-xs text-gray-400 mb-8">Última atualização: abril de 2026</p>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">1. Quem somos</h2>
            <p>
              A <strong>AgendaPRO</strong> é um serviço de agendamento online operado pela <strong>Impulso Digital</strong>,
              empresa individual de Eduardo Barros Chaves, inscrita no CNPJ <strong>64.585.949/0001-83</strong>, com sede em Palmas — TO.
              Esta Política descreve como coletamos, usamos e protegemos seus dados pessoais, em conformidade com a
              Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">2. Dados que coletamos</h2>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Nome completo</strong> — para identificação no agendamento</li>
              <li><strong>Número de WhatsApp</strong> — para identificação e contato pelo estabelecimento</li>
              <li><strong>E-mail</strong> — para confirmações, lembretes e notificações do agendamento</li>
              <li><strong>Data e horário agendado</strong> — registro do serviço contratado</li>
              <li><strong>Código de indicação</strong> (quando aplicável) — rastreamento do programa de fidelidade</li>
            </ul>
            <p className="mt-2">Não coletamos dados de pagamento. Transações financeiras são processadas diretamente entre você e o estabelecimento.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">3. Como usamos seus dados</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Confirmar e gerenciar seus agendamentos</li>
              <li>Enviar lembretes e notificações relacionadas ao serviço</li>
              <li>Registrar pontos no programa de fidelidade do estabelecimento</li>
              <li>Notificar sobre vagas em lista de espera (quando cadastrado)</li>
              <li>Cumprir obrigações legais quando exigido</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">4. Base legal (LGPD)</h2>
            <p>
              O tratamento dos seus dados se baseia no <strong>Art. 7º, inciso V da LGPD</strong> — execução de contrato
              ou procedimentos preliminares a pedido do titular — e no <strong>legítimo interesse</strong> do estabelecimento
              em manter comunicação sobre os serviços contratados.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">5. Compartilhamento de dados</h2>
            <p>Seus dados são compartilhados apenas com:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li><strong>Estabelecimento contratado</strong> — para gestão interna dos agendamentos</li>
              <li><strong>Supabase</strong> — banco de dados seguro (infraestrutura em nuvem)</li>
              <li><strong>Resend</strong> — serviço de envio de e-mails transacionais</li>
              <li><strong>Vercel</strong> — hospedagem da plataforma</li>
            </ul>
            <p className="mt-2">Não vendemos, alugamos ou comercializamos seus dados com terceiros.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">6. Seus direitos como titular</h2>
            <p>Conforme a LGPD (Art. 18), você tem direito a:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Confirmar a existência de tratamento dos seus dados</li>
              <li>Acessar seus dados</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar a exclusão dos seus dados</li>
              <li>Revogar consentimento</li>
            </ul>
            <p className="mt-2">
              Para exercer qualquer direito, entre em contato: <strong>contato@impulsodigital063.com</strong>
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">7. Retenção dos dados</h2>
            <p>
              Seus dados são mantidos enquanto houver relação ativa com o estabelecimento ou pelo prazo mínimo exigido
              pela legislação aplicável. Após solicitação de exclusão, os dados são removidos em até 30 dias úteis,
              salvo obrigação legal de retenção.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">8. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia em trânsito
              (HTTPS), controle de acesso restrito e uso de fornecedores com certificações de segurança reconhecidas.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">9. Contato e DPO</h2>
            <p>
              Responsável pelo tratamento de dados: <strong>Eduardo Barros Chaves — Impulso Digital</strong><br />
              E-mail: <strong>contato@impulsodigital063.com</strong><br />
              Cidade: Palmas — TO
            </p>
          </section>

        </div>

        <p className="text-center text-gray-300 text-xs mt-8 pb-4">
          AgendaPRO · Impulso Digital
        </p>
      </div>
    </main>
  )
}
