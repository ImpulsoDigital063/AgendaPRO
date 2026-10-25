import type { NicheFicha } from './types'

/**
 * MICROPIGMENTAÇÃO · exclusiva da Ivna Loyola Beauty Clinic (25/10/2026).
 *
 * Micropigmentação é o carro-chefe dela (sobrancelhas, labial e o Combo Diva)
 * e o pacote genérico de clínica não tinha ficha pra isso. Exclusiva por
 * `businessSlugs` porque o prazo do retoque e a forma de registrar pigmento
 * são dela: se outra clínica pedir, o caminho é levar pra uma ficha base.
 *
 * Mesmas decisões do pacote de clínica (ver toxina-botulinica.ts): não repete
 * o Histórico Clínico, pigmento com lote e validade (rastreabilidade) e o
 * pós-cuidado carrega o prazo do retoque, 30 a 60 dias, o mesmo do serviço
 * "Retorno micropigmentação" cadastrado por ela.
 */
export const IVNA_MICROPIGMENTACAO_FICHA: NicheFicha = {
  slug: 'ivna-micropigmentacao',
  name: 'Micropigmentação · Sobrancelhas e Lábios',
  businessSlugs: ['ivna-loyola-beauty-clinic'],
  sections: [
    {
      kind: 'health',
      title: 'Contraindicações específicas',
      detailLabel: 'Detalhe os itens marcados',
      items: [
        'Gestante ou amamentando',
        'Uso de isotretinoína (Roacutan) nos últimos 6 meses',
        'Uso de anticoagulante ou ácido acetilsalicílico',
        'Diabetes descompensada',
        'Tendência a queloide ou cicatrização difícil',
        'Herpes labial (já teve alguma vez)',
        'Lesão, irritação ou infecção na área',
        'Quimioterapia ou radioterapia em andamento',
        'Alergia a pigmento, anestésico tópico ou metais',
        'Procedimento na área nos últimos 30 dias (ácido, peeling, laser, toxina)',
        'Micropigmentação anterior na área',
        'Uso de ácidos ou clareadores na área',
      ],
    },
    {
      kind: 'fields',
      title: 'Procedimento',
      fields: [
        {
          name: 'area',
          label: 'Área',
          type: 'select',
          options: ['Sobrancelhas', 'Lábios', 'Sobrancelhas e lábios (Combo Diva)', 'Retoque'],
        },
        {
          name: 'tecnica',
          label: 'Técnica',
          type: 'select',
          options: ['Fio a fio', 'Shadow / esfumado', 'Híbrida (fio a fio + esfumado)', 'Labial · revitalização', 'Labial · efeito batom', 'Labial · contorno'],
        },
        { name: 'sessao', label: 'Sessão', type: 'select', options: ['1ª sessão', 'Retoque (30 a 60 dias)', 'Manutenção anual'] },
        { name: 'cor_escolhida', label: 'Cor escolhida com a cliente', type: 'text' },
      ],
    },
    {
      kind: 'fields',
      title: 'Pigmento e material',
      fields: [
        { name: 'pigmento_marca', label: 'Pigmento / marca', type: 'text' },
        { name: 'pigmento_cor', label: 'Cor / mistura', type: 'text' },
        { name: 'pigmento_lote', label: 'Nº do lote', type: 'text' },
        { name: 'pigmento_validade', label: 'Validade', type: 'text' },
        { name: 'agulha', label: 'Agulha / cartucho', type: 'text' },
        { name: 'anestesico', label: 'Anestésico tópico usado', type: 'text' },
      ],
    },
    {
      kind: 'mapping',
      title: 'Desenho aprovado',
      drawName: 'desenho_aprovado',
      background: 'rosto',
      params: [
        { name: 'formato', label: 'Formato / arco combinado', type: 'text' },
        { name: 'medidas', label: 'Medidas e pontos de referência', type: 'text' },
        { name: 'assimetrias', label: 'Assimetrias observadas', type: 'text' },
      ],
    },
    {
      kind: 'fields',
      title: 'Observações do atendimento',
      fields: [
        { name: 'observacoes', label: 'Retenção, intercorrências e observações', type: 'textarea' },
      ],
    },
    {
      kind: 'term',
      title: 'Termo de consentimento livre e esclarecido',
      text:
        'A micropigmentação é a implantação de pigmento na camada superficial da pele com ' +
        'agulha descartável, para desenhar, preencher ou corrigir sobrancelhas e lábios. O ' +
        'resultado é semipermanente: clareia com o tempo, conforme o tipo de pele, a exposição ' +
        'ao sol, os produtos usados no rosto e o organismo de cada pessoa.\n\n' +
        'Fui informada de que:\n' +
        '• Logo após o procedimento a cor fica mais escura e o contorno mais marcado. Durante a ' +
        'cicatrização a pele descama e a cor clareia, podendo parecer falhada por alguns dias. ' +
        'A cor definitiva aparece depois da cicatrização completa.\n' +
        '• Pode haver vermelhidão, inchaço e sensibilidade nos primeiros dias. Nos lábios, o ' +
        'inchaço costuma ser maior nas primeiras 48 horas.\n' +
        '• A retenção do pigmento varia de pessoa pra pessoa. Por isso existe o retoque, feito ' +
        'entre 30 e 60 dias depois da primeira sessão, para corrigir falhas e ajustar a cor.\n' +
        '• Quem já teve herpes labial pode ter uma crise depois da micropigmentação labial. ' +
        'Nesse caso, a orientação é procurar o médico para a prevenção antes do procedimento.\n' +
        '• Não é possível garantir um resultado idêntico ao de outra pessoa ou de uma foto: o ' +
        'resultado depende da pele, da cicatrização e dos cuidados depois do procedimento.\n\n' +
        'TERMO DE CONSENTIMENTO:\n' +
        'Aprovei o desenho e a cor antes do início do procedimento. Declaro que respondi com ' +
        'verdade às perguntas sobre a minha saúde e que fui esclarecida sobre o procedimento, ' +
        'os cuidados, os riscos e o resultado esperado, com tempo para tirar todas as dúvidas. ' +
        'Autorizo a realização do procedimento e me comprometo a seguir as orientações de ' +
        'cuidado. Posso desistir a qualquer momento antes do início do procedimento.\n\n' +
        'A profissional DECLARA que explicou o propósito, os benefícios, os riscos e as ' +
        'alternativas do procedimento, e que a cliente teve tempo para esclarecer as dúvidas.',
      consents: [
        { name: 'aprovou_desenho', label: 'Aprovei o desenho e a cor', required: true },
        { name: 'ciente_riscos', label: 'Fui esclarecida sobre o procedimento, os riscos e o resultado', required: true },
        { name: 'autoriza_procedimento', label: 'Autorizo a realização do procedimento', required: true },
      ],
    },
    {
      kind: 'term',
      title: 'Cuidados depois da micropigmentação',
      text:
        'NOS PRIMEIROS 7 DIAS\n' +
        'Lave a área só com água e sabonete neutro, sem esfregar, e seque com toques leves.\n' +
        'Passe a pomada indicada em camada fina, com cotonete limpo, nas vezes orientadas.\n' +
        'Não coce, não arranque as casquinhas e não esfolie a área.\n' +
        'Não use maquiagem, ácidos, cremes clareadores ou produtos com álcool na área.\n' +
        'Evite piscina, mar, sauna e banho muito quente.\n' +
        'Evite sol direto. Use boné ou chapéu ao sair.\n\n' +
        'NOS LÁBIOS\n' +
        'Beba líquidos com canudo nos primeiros dias.\n' +
        'Evite alimentos muito quentes, ácidos ou apimentados.\n' +
        'Não beije nem morda os lábios até a cicatrização.\n\n' +
        'DEPOIS DA CICATRIZAÇÃO\n' +
        'Use protetor solar na área todos os dias para a cor durar mais.\n' +
        'Ácidos, peeling e laser no rosto só com orientação, porque clareiam o pigmento.\n\n' +
        'RETOQUE\n' +
        'O retoque deve ser feito entre 30 e 60 dias depois desta sessão. É nele que a ' +
        'profissional corrige falhas e ajusta a cor. A clínica avisa quando chegar a hora.\n\n' +
        'Em caso de dor forte, secreção, febre ou qualquer reação fora do comum, entre em ' +
        'contato com a clínica imediatamente.',
      consents: [
        { name: 'recebeu_orientacoes', label: 'Recebi e compreendi os cuidados depois do procedimento', required: true },
      ],
    },
    { kind: 'signature', name: 'assinatura_cliente', label: 'Assinatura da cliente' },
  ],
}
