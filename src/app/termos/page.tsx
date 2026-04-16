import Link from 'next/link'

export const metadata = {
  title: 'Termos de Uso — AgendaPRO',
}

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">

        <div className="mb-8">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">← Voltar</Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Termos de Uso</h1>
        <p className="text-xs text-gray-400 mb-8">Última atualização: abril de 2026</p>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">1. Aceitação dos termos</h2>
            <p>
              Ao utilizar a plataforma <strong>AgendaPRO</strong>, você concorda com estes Termos de Uso.
              Caso não concorde com alguma cláusula, não utilize o serviço.
              A AgendaPRO é operada pela <strong>Impulso Digital</strong> (Eduardo Barros Chaves, CNPJ 64.585.949/0001-83).
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">2. O que é a AgendaPRO</h2>
            <p>
              A AgendaPRO é uma plataforma de agendamento online que conecta clientes a estabelecimentos
              de serviços (barbearias, salões, clínicas de estética e outros). A plataforma oferece:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Agendamento de horários online</li>
              <li>Programa de pontos e fidelidade</li>
              <li>Lista de espera automática</li>
              <li>Sistema de indicação entre clientes</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">3. Responsabilidades do usuário</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Fornecer informações verdadeiras no momento do agendamento</li>
              <li>Comparecer ao horário agendado ou cancelar com antecedência</li>
              <li>Não utilizar a plataforma para fins ilícitos ou fraudulentos</li>
              <li>Manter seu e-mail atualizado para receber confirmações e lembretes</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">4. Responsabilidades dos estabelecimentos</h2>
            <p>
              Os estabelecimentos que utilizam a AgendaPRO são os únicos responsáveis pela prestação do
              serviço contratado, pelos preços praticados, pela qualidade do atendimento e pelo cumprimento
              das obrigações trabalhistas e fiscais aplicáveis.
            </p>
            <p className="mt-2">
              A Impulso Digital atua apenas como plataforma tecnológica de intermediação, não sendo parte
              na relação de consumo entre cliente e estabelecimento.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">5. Programa de fidelidade e pontos</h2>
            <p>
              Os pontos acumulados no programa de fidelidade são definidos e gerenciados pelo estabelecimento,
              não pela Impulso Digital. Os pontos não têm valor monetário, não são transferíveis entre
              estabelecimentos e podem ser alterados ou encerrados pelo estabelecimento a qualquer momento,
              sem direito a indenização.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">6. Cancelamentos</h2>
            <p>
              A política de cancelamento é definida por cada estabelecimento. A AgendaPRO apenas processa
              a solicitação de cancelamento e notifica as partes envolvidas. Eventuais cobranças por
              cancelamentos tardios são de responsabilidade exclusiva do estabelecimento.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">7. Disponibilidade do serviço</h2>
            <p>
              A AgendaPRO se esforça para manter a plataforma disponível 24 horas por dia, 7 dias por semana.
              No entanto, não garantimos disponibilidade ininterrupta. Manutenções programadas serão
              comunicadas com antecedência sempre que possível.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">8. Propriedade intelectual</h2>
            <p>
              Todo o conteúdo da plataforma AgendaPRO — incluindo código, design, marca e textos —
              é de propriedade exclusiva da Impulso Digital e protegido pela legislação de propriedade
              intelectual. É vedada a reprodução ou uso sem autorização prévia por escrito.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">9. Limitação de responsabilidade</h2>
            <p>
              A Impulso Digital não se responsabiliza por danos indiretos, lucros cessantes ou prejuízos
              decorrentes do uso ou impossibilidade de uso da plataforma, falhas na prestação do serviço
              pelo estabelecimento ou informações incorretas fornecidas pelo usuário.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">10. Alterações nos termos</h2>
            <p>
              Estes termos podem ser atualizados a qualquer momento. A continuidade do uso da plataforma
              após a publicação de alterações implica aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">11. Lei aplicável e foro</h2>
            <p>
              Estes Termos são regidos pelas leis brasileiras. Para dirimir quaisquer controvérsias,
              fica eleito o foro da Comarca de Palmas — TO, com renúncia expressa a qualquer outro,
              por mais privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">12. Contato</h2>
            <p>
              Dúvidas sobre estes termos: <strong>contato@impulsodigital063.com</strong>
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
