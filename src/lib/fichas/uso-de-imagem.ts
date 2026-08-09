import type { NicheFicha } from './types'

/**
 * TERMO DE CONSENTIMENTO PARA USO DE IMAGEM.
 *
 * Transcrito literalmente do kit de uma clínica de estética em uso real
 * (08/08/2026). Base legal citada no próprio documento: Lei 13.709/2018 (LGPD)
 * e art. 20 do Código Civil.
 *
 * ESTA FICHA NÃO É DE CLÍNICA — é de qualquer negócio que publique foto de
 * cliente. Salão que posta antes/depois, barbearia que filma corte, studio de
 * cílios que usa o olho da cliente no feed: todos estão usando imagem de
 * terceiro em material publicitário, e nenhum deles costuma ter autorização
 * escrita. Por isso `segments` fica vazio: aparece pra todo mundo.
 *
 * O histórico clínico já tem um "autorizo divulgação de fotos" no meio das
 * perguntas de saúde. Aquilo serve pro registro clínico; isto aqui é o termo
 * separado, que é o que se apresenta quando alguém reclama de uma publicação.
 */
export const USO_DE_IMAGEM_FICHA: NicheFicha = {
  slug: 'uso-de-imagem',
  name: 'Termo de Uso de Imagem',
  sections: [
    {
      kind: 'fields',
      title: 'Identificação',
      fields: [
        { name: 'autorizante_nome', label: 'Nome do autorizante (cliente)', type: 'text' },
        { name: 'autorizante_cpf', label: 'CPF do autorizante', type: 'text' },
        { name: 'autorizada_nome', label: 'Profissional / estabelecimento autorizado', type: 'text' },
        { name: 'autorizada_documento', label: 'CNPJ / CPF do autorizado', type: 'text' },
      ],
    },
    {
      kind: 'term',
      title: 'Termo de consentimento para uso de imagem',
      text:
        'Pelo presente instrumento particular, o(a) cliente acima identificado(a), doravante ' +
        '"AUTORIZANTE", autoriza de forma livre, informada e inequívoca, nos termos da Lei nº ' +
        '13.709/2018 (Lei Geral de Proteção de Dados Pessoais - LGPD) e do artigo 20 do Código ' +
        'Civil Brasileiro, a captação, uso e veiculação de sua imagem, voz e nome pelo(a) ' +
        'profissional acima identificado(a), doravante denominada "AUTORIZADA".\n\n' +
        'CLÁUSULA PRIMEIRA - OBJETO\n' +
        'O presente termo tem por objeto a autorização do uso da imagem, nome e voz do ' +
        'AUTORIZANTE em materiais publicitários, institucionais e promocionais da AUTORIZADA, ' +
        'abrangendo os seguintes meios:\n' +
        'Fotografias, vídeos e áudios;\n' +
        'Materiais impressos e digitais (folders, panfletos, banners, sites, redes sociais, ' +
        'e-mails marketing, etc.);\n' +
        'Veiculações em televisão, rádio, internet e mídias sociais;\n' +
        'Campanhas publicitárias, institucionais e promocionais;\n' +
        'Outros meios de comunicação que a AUTORIZADA julgar pertinentes.\n\n' +
        'CLÁUSULA SEGUNDA - PRAZO DE UTILIZAÇÃO\n' +
        'A presente autorização é concedida por prazo indeterminado, podendo ser revogada a ' +
        'qualquer momento mediante solicitação formal do AUTORIZANTE.\n\n' +
        'CLÁUSULA TERCEIRA - RESPONSABILIDADES\n' +
        'A AUTORIZADA compromete-se a utilizar a imagem do AUTORIZANTE de forma ética e ' +
        'respeitosa, sem deturpações ou usos indevidos.\n' +
        'O AUTORIZANTE declara estar ciente de que não poderá reivindicar qualquer direito sobre ' +
        'os materiais produzidos pela AUTORIZADA após a cessão de sua imagem.\n\n' +
        'CLÁUSULA QUARTA - REVOGAÇÃO\n' +
        'A qualquer momento, o AUTORIZANTE poderá revogar esta autorização mediante solicitação ' +
        'por escrito enviada à AUTORIZADA. Neste caso, a AUTORIZADA compromete-se a cessar o uso ' +
        'da imagem nos novos materiais, porém, sem obrigação de retirar aqueles já divulgados ' +
        'até a data da solicitação.\n\n' +
        'CLÁUSULA QUINTA - FORO\n' +
        'Fica eleito o foro da Comarca do estabelecimento para dirimir quaisquer dúvidas ou ' +
        'controvérsias oriundas do presente instrumento, com renúncia expressa a qualquer outro, ' +
        'por mais privilegiado que seja.\n\n' +
        'Por estarem assim justos e acordados, assinam o presente termo.',
      consents: [
        {
          name: 'autoriza_uso_imagem',
          label: 'Autorizo o uso da minha imagem, voz e nome nos termos acima',
          required: true,
        },
        {
          name: 'ciente_revogacao',
          label: 'Estou ciente de que posso revogar esta autorização a qualquer momento',
          required: true,
        },
      ],
    },
    {
      /* Recortes de uso ficam FORA do termo, como aceites separados. Cliente que
         topa foto de resultado mas não topa aparecer o rosto é a regra, não a
         exceção — e um termo tudo-ou-nada faz ela recusar por inteiro. */
      kind: 'term',
      title: 'Limites que o cliente escolhe',
      text:
        'Marque abaixo o que está autorizado. O que não for marcado não pode ser publicado, ' +
        'ainda que o termo acima tenha sido aceito.',
      consents: [
        { name: 'permite_rosto', label: 'Pode aparecer meu rosto' },
        { name: 'permite_nome', label: 'Pode citar meu nome' },
        { name: 'permite_redes', label: 'Pode publicar em redes sociais' },
        { name: 'permite_anuncio', label: 'Pode usar em anúncio pago' },
        { name: 'permite_antes_depois', label: 'Pode usar em antes e depois' },
      ],
    },
    { kind: 'signature', name: 'assinatura_paciente', label: 'Assinatura do cliente' },
  ],
}
