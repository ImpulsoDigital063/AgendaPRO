'use client'

/* Quem fala primeiro na home do painel.
   ───────────────────────────────────────────────────────────────────
   A faixa de "ativar notificação" e o card de novidade moram na mesma tela.
   Empilhados, os dois ocupavam quase metade da primeira dobra no celular
   antes da agenda aparecer (visto no painel do Olímpio, 06/08) — e dois
   pedidos ao mesmo tempo é o jeito mais rápido de não conseguir nenhum.

   Regra: a notificação tem prioridade. Ela é operação (a dona perde
   agendamento sem saber); a novidade é convite, pode esperar a próxima vez
   que ela abrir o painel.

   Um evento em vez de estado compartilhado porque a faixa decide o que
   mostrar de forma ASSÍNCRONA (consulta o banco antes). Quem escuta guarda
   o último valor pra quem chegar depois do anúncio não ficar no escuro. */

const EVENTO = 'ap:aviso-push'

let ultimo: boolean | null = null

export function anunciarFaixaPush(visivel: boolean) {
  ultimo = visivel
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: visivel }))
  }
}

/**
 * Chama de volta com true/false quando a faixa decidir. Se ela já decidiu,
 * responde na hora. Devolve a função de limpeza.
 */
export function ouvirFaixaPush(cb: (visivel: boolean) => void): () => void {
  if (ultimo !== null) cb(ultimo)
  const handler = (e: Event) => cb((e as CustomEvent).detail === true)
  window.addEventListener(EVENTO, handler)
  return () => window.removeEventListener(EVENTO, handler)
}
