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

/** Dígitos sem DDI e com o 9 do celular garantido. "" quando não dá pra ler. */
export function telefoneCanonico(raw: string): string {
  let d = (raw || '').replace(/\D/g, '')
  if ((d.length === 13 || d.length === 12) && d.startsWith('55')) d = d.slice(2)
  // DDD + 8 dígitos começando em 6-9 é celular no formato antigo: falta o 9.
  // Fixo começa em 2-5 e fica como está.
  if (d.length === 10 && /^[6-9]/.test(d.slice(2))) d = d.slice(0, 2) + '9' + d.slice(2)
  return d
}

/** Formatos em que o mesmo número pode estar gravado. Sempre inclui os dígitos. */
export function variacoesDeTelefone(raw: string): string[] {
  const digits = (raw || '').replace(/\D/g, '')
  if (digits.length < 10) return [(raw || '').trim()].filter(Boolean)

  const canon = telefoneCanonico(raw) // 11 dígitos pra celular, 10 pra fixo
  const ddd = canon.slice(0, 2)
  const resto = canon.slice(2)

  /* Celular gravado com e sem o 9 (auditoria 05/08): "(63) 9274-3602" e
     "(63) 99274-3602" são o MESMO Olavo, com 90 e 50 pontos em fichas
     separadas. Quem digita o número antigo de cabeça esquece o 9 — e o
     sistema abria ficha nova. Por isso as duas grafias entram na busca. */
  const semNove = resto.length === 9 && resto.startsWith('9') ? resto.slice(1) : null

  const formatos = (ddd2: string, r: string) => {
    const meio = r.length === 9 ? r.slice(0, 5) : r.slice(0, 4)
    const fim = r.length === 9 ? r.slice(5) : r.slice(4)
    return [
      `${ddd2}${r}`,
      `(${ddd2}) ${meio}-${fim}`,
      `(${ddd2})${meio}-${fim}`,
      `${ddd2} ${meio}-${fim}`,
      `+55${ddd2}${r}`,
      `55${ddd2}${r}`,
    ]
  }

  const lista = [
    (raw || '').trim(),
    digits,
    ...formatos(ddd, resto),
    ...(semNove ? formatos(ddd, semNove) : []),
  ]
  return Array.from(new Set(lista.filter(Boolean)))
}
