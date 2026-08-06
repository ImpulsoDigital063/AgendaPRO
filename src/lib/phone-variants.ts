/* Telefone é gravado em formatos diferentes conforme a porta de entrada:
   o link público grava como a cliente digitou — "(63) 99246-8302" — e o
   fluxo de avaliação grava só os dígitos, "63992468302".

   Como o casamento de cliente era `.eq('phone', ...)` exato, a MESMA pessoa
   virava duas fichas. Achado na auditoria 05/08: 11 pares no Olímpio, todos
   "Cliente (avaliação)" de um lado e o nome real do outro.

   Não é cosmético. Duas fichas = pontos divididos, histórico partido e —
   desde a v113 — crédito que existe numa ficha e some na outra: a cliente
   cancelou, ganhou crédito, e ao remarcar o sistema não acha.

   A saída sem migração de dados é procurar por TODOS os formatos plausíveis
   do mesmo número. Nada de regex no banco: uma lista curta e um `.in()`.

   Normalizar a coluna pra dígitos resolveria de vez, mas mexe em 3 tabelas
   com dado de cliente pagante — fica pra quando houver janela. */

/** Formatos em que o mesmo número pode estar gravado. Sempre inclui os dígitos. */
export function variacoesDeTelefone(raw: string): string[] {
  const digits = (raw || '').replace(/\D/g, '')
  if (digits.length < 10) return [(raw || '').trim()].filter(Boolean)

  // Fora o DDI 55 quando vier colado (55 + 11 dígitos = 13).
  const semDdi = digits.length === 13 && digits.startsWith('55') ? digits.slice(2) : digits
  const ddd = semDdi.slice(0, 2)
  const resto = semDdi.slice(2)
  const meio = resto.length === 9 ? resto.slice(0, 5) : resto.slice(0, 4)
  const fim = resto.length === 9 ? resto.slice(5) : resto.slice(4)

  const lista = [
    (raw || '').trim(),
    digits,
    semDdi,
    `(${ddd}) ${meio}-${fim}`,
    `(${ddd})${meio}-${fim}`,
    `${ddd} ${meio}-${fim}`,
    `${ddd}${meio}${fim}`,
    `+55${semDdi}`,
    `55${semDdi}`,
  ]
  return Array.from(new Set(lista.filter(Boolean)))
}
