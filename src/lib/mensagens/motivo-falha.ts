/* ═══════════════════════════════════════════════════════════════
   POR QUE O AVISO NÃO CHEGOU — em português de dona de salão

   Eduardo, 29/09/2026: "tem que haver um sistema que notifica quando não é
   entregue". O motivo cru da Meta ("Message undeliverable") não diz o que
   fazer. Aqui cada falha vira UMA frase e UM caminho:

     · culpa do NÚMERO da cliente → a dona resolve (confere o telefone)
       e é ela quem recebe o push;
     · culpa NOSSA (conta Meta, template, pagamento) → a dona não pode
       fazer nada; quem recebe o alerta é o Eduardo (Telegram).

   Códigos: https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
   ═══════════════════════════════════════════════════════════════ */

export type ExplicacaoFalha = {
  /** Frase curta pra tela e pro push. */
  texto: string
  /** O que a dona faz. Null quando não é com ela. */
  acao: string | null
  /** true = problema do AgendaPRO/Meta, não do número da cliente. */
  culpaNossa: boolean
}

const DO_NUMERO: Record<string, ExplicacaoFalha> = {
  // Número sem WhatsApp, desativado, ou que não recebe mensagem de empresa
  '131026': {
    texto: 'Esse número não tem WhatsApp ou não recebe mensagens de empresas.',
    acao: 'Confira o telefone da cliente (DDD e o 9 na frente).',
    culpaNossa: false,
  },
  // Limite da Meta de mensagens de empresas pra mesma pessoa
  '131049': {
    texto: 'O WhatsApp segurou a mensagem pra não mandar demais pra essa pessoa.',
    acao: 'Não precisa fazer nada. Se for importante, avise a cliente pelo seu WhatsApp.',
    culpaNossa: false,
  },
  // Destinatário bloqueou / pediu pra não receber
  '131050': {
    texto: 'A cliente pediu pra não receber mensagens de empresas.',
    acao: 'Fale com ela pelo seu WhatsApp, se precisar.',
    culpaNossa: false,
  },
}

/** Motivos que nem chegam na Meta (gravados pelo nosso motor no envio). */
const DO_ENVIO: Record<string, ExplicacaoFalha> = {
  sem_canal: {
    texto: 'A cliente está sem telefone cadastrado.',
    acao: 'Cadastre o telefone na ficha dela.',
    culpaNossa: false,
  },
  telefone_invalido: {
    texto: 'O telefone da cliente está incompleto ou errado.',
    acao: 'Corrija o telefone na ficha dela (DDD e o 9 na frente).',
    culpaNossa: false,
  },
}

export function explicarFalha(codigo: string | null | undefined): ExplicacaoFalha {
  const c = (codigo ?? '').trim()
  if (c && DO_NUMERO[c]) return DO_NUMERO[c]
  if (c && DO_ENVIO[c]) return DO_ENVIO[c]
  return {
    texto: 'O aviso não saiu por um problema no envio, do nosso lado. Já estamos vendo.',
    acao: null,
    culpaNossa: true,
  }
}

/** Erro gravado pelo motor na hora do envio que é "não saiu" pra dona ver. */
export const ERROS_DE_ENVIO_VISIVEIS = Object.keys(DO_ENVIO)
