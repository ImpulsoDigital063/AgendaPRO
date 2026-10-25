import type { NicheFicha } from './types'

/**
 * REMOÇÃO A LASER · exclusiva da Ivna Loyola Beauty Clinic (25/10/2026).
 *
 * O laser dela é de remoção: micropigmentação (sobrancelha, labial) e
 * tatuagem, com avaliação antes. Por isso a ficha registra o PIGMENTO que vai
 * sair (cor, idade, quem aplicou) e os parâmetros de cada disparo, que são o
 * que ela compara de uma sessão pra outra.
 *
 * Uma ficha por sessão: a remoção leva várias, e o número da sessão com os
 * parâmetros usados é o histórico que mostra a evolução. Não repete o
 * Histórico Clínico (ver toxina-botulinica.ts).
 */
export const IVNA_REMOCAO_LASER_FICHA: NicheFicha = {
  slug: 'ivna-remocao-laser',
  name: 'Remoção a Laser · Micropigmentação e Tatuagem',
  businessSlugs: ['ivna-loyola-beauty-clinic'],
  sections: [
    {
      kind: 'health',
      title: 'Contraindicações específicas',
      detailLabel: 'Detalhe os itens marcados',
      items: [
        'Gestante ou amamentando',
        'Pele bronzeada ou exposição ao sol nos últimos 15 dias',
        'Uso de autobronzeador na área',
        'Uso de isotretinoína (Roacutan) nos últimos 6 meses',
        'Medicamento fotossensibilizante (antibiótico, anti-inflamatório, ácidos)',
        'Tendência a queloide ou cicatrização difícil',
        'Vitiligo ou manchas na pele',
        'Herpes ativo ou lesão na área',
        'Epilepsia',
        'Câncer de pele ou lesão suspeita na área',
        'Diabetes descompensada',
        'Uso de anticoagulante',
      ],
    },
    {
      kind: 'fields',
      title: 'Pigmento a remover',
      fields: [
        {
          name: 'tipo',
          label: 'O que vai ser removido',
          type: 'select',
          options: ['Micropigmentação de sobrancelha', 'Micropigmentação labial', 'Micropigmentação de olhos', 'Tatuagem'],
        },
        { name: 'local', label: 'Local / região', type: 'text' },
        { name: 'cores', label: 'Cores do pigmento', type: 'text' },
        { name: 'tempo', label: 'Há quanto tempo foi feito', type: 'text' },
        { name: 'quem_aplicou', label: 'Quem aplicou', type: 'select', options: ['Profissional', 'Amador / caseiro', 'Não sabe'] },
        { name: 'remocoes_anteriores', label: 'Remoções anteriores (onde, quantas)', type: 'text' },
        { name: 'fototipo', label: 'Fototipo (Fitzpatrick)', type: 'select', options: ['I', 'II', 'III', 'IV', 'V', 'VI'] },
      ],
    },
    {
      kind: 'fields',
      title: 'Parâmetros da sessão',
      fields: [
        { name: 'sessao_numero', label: 'Sessão nº', type: 'text' },
        { name: 'equipamento', label: 'Equipamento', type: 'text' },
        { name: 'comprimento_onda', label: 'Comprimento de onda', type: 'select', options: ['1064 nm', '532 nm', '1064 + 532 nm', 'Outro'] },
        { name: 'fluencia', label: 'Fluência / energia', type: 'text' },
        { name: 'spot', label: 'Ponteira / spot', type: 'text' },
        { name: 'frequencia', label: 'Frequência (Hz)', type: 'text' },
        { name: 'disparos', label: 'Nº de disparos', type: 'text' },
        {
          name: 'reacao',
          label: 'Reação imediata',
          type: 'select',
          options: ['Branqueamento (frosting)', 'Vermelhidão leve', 'Inchaço', 'Sangramento pontual', 'Sem reação visível'],
        },
      ],
    },
    {
      kind: 'mapping',
      title: 'Área tratada',
      drawName: 'area_tratada',
      background: 'rosto',
      params: [
        { name: 'clareamento', label: 'Clareamento desde a última sessão', type: 'select', options: ['Primeira sessão', 'Pouco', 'Moderado', 'Bastante', 'Quase total'] },
        { name: 'proxima_sessao', label: 'Próxima sessão prevista para', type: 'text' },
      ],
    },
    {
      kind: 'fields',
      title: 'Observações do atendimento',
      fields: [
        { name: 'observacoes', label: 'Intercorrências, conduta e observações', type: 'textarea' },
      ],
    },
    {
      kind: 'term',
      title: 'Termo de consentimento livre e esclarecido',
      text:
        'A remoção a laser fragmenta o pigmento da micropigmentação ou da tatuagem em ' +
        'partículas menores, que o próprio organismo elimina aos poucos. Por isso o clareamento ' +
        'acontece nas semanas seguintes a cada sessão, e não na hora.\n\n' +
        'Fui informada de que:\n' +
        '• São necessárias várias sessões, com intervalo entre elas definido pela profissional. ' +
        'O número de sessões depende da cor, da quantidade e da profundidade do pigmento, de ' +
        'quem aplicou e da resposta do meu organismo.\n' +
        '• Não é possível garantir a remoção total. Algumas cores (verde, azul claro, amarelo, ' +
        'branco e tons de pele) respondem pouco ao laser.\n' +
        '• Pigmentos com óxido de ferro ou branco, comuns em micropigmentação, podem escurecer ' +
        'ou mudar de cor no primeiro disparo. A profissional faz um teste antes quando há esse ' +
        'risco.\n' +
        '• Depois da sessão pode haver ardência, vermelhidão, inchaço, pequenas bolhas, ' +
        'crostas e sangramento pontual, que melhoram nos dias seguintes.\n' +
        '• Existe risco de mancha mais clara ou mais escura na pele (hipo ou ' +
        'hiperpigmentação), de mudança de textura e, raramente, de cicatriz. O risco aumenta ' +
        'com sol, pele bronzeada e quando os cuidados não são seguidos.\n' +
        '• Na sobrancelha, os pelos podem clarear ou cair temporariamente.\n\n' +
        'TERMO DE CONSENTIMENTO:\n' +
        'Declaro que respondi com verdade às perguntas sobre a minha saúde, que não estou ' +
        'bronzeada nem usei os medicamentos marcados como contraindicação sem avisar, e que fui ' +
        'esclarecida sobre o procedimento, os riscos e o resultado esperado, com tempo para ' +
        'tirar todas as dúvidas. Autorizo a realização desta sessão e me comprometo a seguir as ' +
        'orientações de cuidado. Posso desistir a qualquer momento antes do início.\n\n' +
        'A profissional DECLARA que explicou o propósito, os benefícios, os riscos e as ' +
        'alternativas do procedimento, e que a cliente teve tempo para esclarecer as dúvidas.',
      consents: [
        { name: 'ciente_riscos', label: 'Fui esclarecida sobre o procedimento, os riscos e o resultado', required: true },
        { name: 'ciente_sessoes', label: 'Entendi que são várias sessões e que a remoção total não é garantida', required: true },
        { name: 'autoriza_procedimento', label: 'Autorizo a realização desta sessão', required: true },
      ],
    },
    {
      kind: 'term',
      title: 'Cuidados depois da sessão',
      text:
        'NAS PRIMEIRAS 48 HORAS\n' +
        'Faça compressas frias (gelo envolvido em pano limpo) se arder ou inchar.\n' +
        'Lave só com água e sabonete neutro, sem esfregar.\n' +
        'Passe a pomada indicada pela profissional.\n' +
        'Evite academia, sauna, piscina e mar.\n\n' +
        'ATÉ CICATRIZAR\n' +
        'Não coce, não estoure bolhas e não arranque as crostas.\n' +
        'Não use maquiagem, ácidos ou esfoliantes na área.\n' +
        'Não exponha a área ao sol. Use protetor solar e, no rosto, boné ou chapéu.\n\n' +
        'ENTRE AS SESSÕES\n' +
        'Mantenha o protetor solar todos os dias e não se bronzeie.\n' +
        'Beber bastante água ajuda o organismo a eliminar o pigmento.\n' +
        'Respeite a data da próxima sessão marcada pela profissional: antes do prazo a pele ' +
        'ainda não se recuperou.\n\n' +
        'Em caso de dor forte, secreção, febre ou qualquer reação fora do comum, entre em ' +
        'contato com a clínica imediatamente.',
      consents: [
        { name: 'recebeu_orientacoes', label: 'Recebi e compreendi os cuidados depois da sessão', required: true },
      ],
    },
    { kind: 'signature', name: 'assinatura_cliente', label: 'Assinatura da cliente' },
  ],
}
