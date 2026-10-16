/* ═══════════════════════════════════════════════════════════════
   QUANTAS VEZES O BOTÃO "CONFIRMAR PRESENÇA" VAI (v162 · 16/10/2026)

   Eduardo: "acho que botão confirmar deve ir na primeira msg, mas não nas
   outras, e isso deve virar decisão do dono... se sim quantas vezes".

   Antes ele ia nos três avisos (confirmação, véspera, dia) e continuava indo
   depois de a pessoa já ter tocado. Pedir de novo o que ela acabou de
   responder é o que faz a mensagem parecer robô descuidado.

   Sem botão, o motor troca o template pelo gêmeo sem botões
   (`DefTemplate.semBotao`). Não basta omitir o payload: o botão é parte do
   template aprovado e aparece na tela dela do mesmo jeito — era o defeito do
   `com_botao` da v127.
   ═══════════════════════════════════════════════════════════════ */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TipoMensagem } from './tipos'

export type ModoBotao = 'nao' | 'primeira' | 'ate_confirmar' | 'sempre'

export const MODOS_BOTAO: ModoBotao[] = ['nao', 'primeira', 'ate_confirmar', 'sempre']

/** Os avisos que PODEM levar "Confirmar presença". O sinal tem os botões
 *  dele (Pagar / Já paguei) e não entra nesta conta. */
export const AVISOS_COM_CONFIRMAR: TipoMensagem[] = ['confirmacao', 'lembrete_vespera', 'lembrete_dia']

export function ehModoBotao(v: unknown): v is ModoBotao {
  return typeof v === 'string' && (MODOS_BOTAO as string[]).includes(v)
}

/**
 * A regra em si, sem banco — pra dar pra ler de uma vez só.
 *
 * `jaPediu` = já saiu, pra este horário, um aviso anterior COM o botão.
 * "Primeira" é a primeira que foi com botão, não a confirmação: quem desliga
 * a confirmação e deixa só a véspera quer o botão na véspera.
 */
export function levaBotao(modo: ModoBotao, s: { jaConfirmou: boolean; jaPediu: boolean }): boolean {
  switch (modo) {
    case 'nao':
      return false
    case 'sempre':
      return true
    case 'ate_confirmar':
      return !s.jaConfirmou
    case 'primeira':
      return !s.jaConfirmou && !s.jaPediu
  }
}

/**
 * Decide no envio. Só lê o banco quando o modo precisa: 'nao' e 'sempre'
 * não dependem do horário.
 *
 * `confirmado_em` e não `status`: o status 'confirmed' também é posto pela
 * dona no painel, então ele não diz se a PESSOA respondeu. `confirmado_em`
 * é gravado pelo toque no botão (v146).
 */
export async function decidirBotao(
  db: SupabaseClient,
  p: { businessId: string; tipo: TipoMensagem; appointmentId?: string | null; chave: string },
): Promise<boolean> {
  if (!AVISOS_COM_CONFIRMAR.includes(p.tipo)) return true

  const { data: neg } = await db
    .from('businesses')
    .select('botao_confirmar')
    .eq('id', p.businessId)
    .maybeSingle()
  /* Sem leitura (coluna ainda não migrada, erro de rede) = comportamento de
     antes. Errar pra "manda o botão" é o que já acontecia; errar pra "tira"
     seria mudar o aviso dela sem ela pedir. */
  const modo: ModoBotao = ehModoBotao((neg as { botao_confirmar?: unknown } | null)?.botao_confirmar)
    ? ((neg as { botao_confirmar: ModoBotao }).botao_confirmar)
    : 'sempre'

  if (modo === 'nao' || modo === 'sempre') return levaBotao(modo, { jaConfirmou: false, jaPediu: false })
  if (!p.appointmentId) return levaBotao(modo, { jaConfirmou: false, jaPediu: false })

  const [{ data: appt }, { count }] = await Promise.all([
    db.from('appointments').select('confirmado_em').eq('id', p.appointmentId).maybeSingle(),
    /* Aviso anterior que SAIU com botão. `com_botao` é gravado no log no
       envio (v162); a própria chave fica de fora porque a linha dela já
       existe em 'processando' a esta altura. */
    db
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('appointment_id', p.appointmentId)
      .in('tipo', AVISOS_COM_CONFIRMAR)
      .eq('com_botao', true)
      .neq('chave', p.chave),
  ])

  return levaBotao(modo, {
    jaConfirmou: !!(appt as { confirmado_em?: string | null } | null)?.confirmado_em,
    jaPediu: (count ?? 0) > 0,
  })
}
