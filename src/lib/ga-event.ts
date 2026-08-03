/* ═══════════════════════════════════════════════════════════════
   EVENTOS DO GOOGLE ANALYTICS

   Sem isso o GA mede visita e para aí: sabe que 40 pessoas entraram na LP
   de salão, não sabe que 3 viraram cadastro. É a diferença entre "a página
   teve movimento" e "a página traz cliente" — e é o número que decide onde
   investir tempo e dinheiro.

   Dispara só se o gtag existir. Em dev, preview, painel e navegador com
   bloqueador, `window.gtag` é undefined e a função vira no-op silencioso:
   medição NUNCA pode quebrar o fluxo que ela observa. Um cadastro que falha
   porque o Analytics não carregou seria trocar receita por métrica.

   ⚠️ Nada de dado pessoal aqui. Nome, e-mail e telefone do dono não vão pro
   Google — só o fato de que o cadastro aconteceu, o nicho e o canal que a
   pessoa declarou. Enviar PII pro GA viola os termos do Google e a LGPD.
   ═══════════════════════════════════════════════════════════════ */

type GtagParams = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    gtag?: (comando: string, evento: string, params?: GtagParams) => void
  }
}

export function gaEvent(nome: string, params: GtagParams = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  try {
    window.gtag('event', nome, params)
  } catch {
    // Métrica nunca derruba fluxo. Se o gtag explodir, o cadastro segue.
  }
}

/** Cadastro concluído — o evento que vira conversão no GA4. */
export function gaCadastroConcluido(dados: { nicho?: string | null; canal?: string | null }) {
  gaEvent('sign_up', {
    method: 'formulario',
    nicho: dados.nicho || 'nao_informado',
    canal_declarado: dados.canal || 'nao_informado',
  })
}
