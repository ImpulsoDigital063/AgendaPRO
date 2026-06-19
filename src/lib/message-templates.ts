/**
 * Modelos de mensagem de WhatsApp (envio MANUAL via wa.me).
 *
 * Z-API fica dormindo até 10 pagantes · por ora o dono dispara na mão pelo
 * botão "Confirmar"/"Lembrete" (abre o WhatsApp com o texto pronto).
 *
 * Os modelos podem ser editados em Configurações > Mensagens (colunas
 * whatsapp_confirmation_template / whatsapp_reminder_template em businesses).
 * NULL no banco = usa o padrão daqui.
 */

export type MessageKind = 'confirmation' | 'reminder'

export type TemplateVars = {
  cliente: string
  servico: string
  data: string // DD/MM/AAAA
  hora: string // HH:MM
  negocio: string
  profissional: string
}

/** Variáveis disponíveis pro editor (chip clicável + legenda). */
export const TEMPLATE_VARIABLES: { token: string; label: string }[] = [
  { token: '{cliente}', label: 'Nome do cliente' },
  { token: '{servico}', label: 'Serviço(s)' },
  { token: '{data}', label: 'Data (DD/MM/AAAA)' },
  { token: '{hora}', label: 'Horário (HH:MM)' },
  { token: '{negocio}', label: 'Nome do negócio' },
  { token: '{profissional}', label: 'Profissional' },
]

export const DEFAULT_CONFIRMATION_TEMPLATE =
  'Oi {cliente}! Confirmando seu atendimento de {servico} no dia {data} às {hora}. Qualquer coisa, é só me chamar!'

export const DEFAULT_REMINDER_TEMPLATE =
  'Oi {cliente}! Passando pra lembrar do seu horário de {servico} no dia {data} às {hora}. Te espero!'

export function defaultTemplate(kind: MessageKind): string {
  return kind === 'confirmation'
    ? DEFAULT_CONFIRMATION_TEMPLATE
    : DEFAULT_REMINDER_TEMPLATE
}

/**
 * Substitui as variáveis no modelo. Token desconhecido é deixado como está
 * (não quebra). Vazio vira string vazia.
 */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{(cliente|servico|data|hora|negocio|profissional)\}/g, (_m, key: keyof TemplateVars) => {
    return vars[key] ?? ''
  })
}
