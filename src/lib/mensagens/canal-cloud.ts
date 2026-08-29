/* ═══════════════════════════════════════════════════════════════
   CANAL WHATSAPP — CLOUD API OFICIAL DA META

   Substitui a W-API. O motivo está provado, não suposto: em 21/08 a W-API
   NÃO entregou pra quem nunca tinha mandado mensagem pro número (5 envios,
   os 5 aceitos com messageId, os 5 gravados "enviado"). Em 28/08 a Cloud
   API entregou pra MESMA destinatária, mesmo aparelho, sem conversa prévia.
   Ver reference_whatsapp_janela_conversa_iniciada.

   ─── A DIFERENÇA QUE MUDA O DESENHO ───────────────────────────
   A W-API mandava texto livre a qualquer hora. Aqui não:

   · FORA da janela de 24h → só TEMPLATE aprovado pela Meta, com variáveis
     posicionais. É o caso de todo lembrete: a cliente não escreveu pra nós.
   · DENTRO da janela (24h desde a última mensagem DELA) → texto livre, e
     de graça.

   Por isso este arquivo expõe DUAS portas, não uma. Quem chama precisa
   saber em qual dos dois mundos está — não dá pra esconder isso atrás de
   um `enviarTexto` só, porque o texto livre fora da janela é recusado pela
   Meta e o lembrete simplesmente não sai.

   ─── O QUE MELHORA DE VERDADE ─────────────────────────────────
   A Meta manda webhook de status: sent → delivered → read, e failed com
   motivo. Ou seja, "entregue" deixa de ser fé e vira dado. Era o buraco
   que nos custou uma semana (λ.prova-na-fonte): `status: enviado` no
   message_log significava "o provedor aceitou", nunca "chegou".
   ═══════════════════════════════════════════════════════════════ */

const BASE = process.env.WHATSAPP_BASE_URL || 'https://graph.facebook.com/v21.0'

export type CredencialCloud = {
  phoneNumberId: string
  token: string
}

/** Número do sistema. Vazio até o número de produção existir (Etapa 2). */
export function credencialDoSistema(): CredencialCloud | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_TOKEN
  if (!phoneNumberId || !token) return null
  return { phoneNumberId, token }
}

/* Mesma normalização da W-API: dígitos com DDI 55. Medido em 21/08, os dois
   formatos entregam (com e sem o nono dígito) — o WhatsApp resolve sozinho. */
export function normalizarTelefone(tel: string): string | null {
  const d = (tel || '').replace(/\D/g, '')
  if (d.length < 10) return null
  return d.startsWith('55') ? d : `55${d}`
}

export type ResultadoEnvio = {
  ok: boolean
  providerId?: string
  erro?: string
}

async function postar(
  cred: CredencialCloud,
  corpo: Record<string, unknown>,
): Promise<ResultadoEnvio> {
  try {
    const res = await fetch(`${BASE}/${cred.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cred.token}`,
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...corpo }),
    })
    const texto = await res.text()
    if (!res.ok) {
      /* O erro da Meta vem estruturado e o código importa pro diagnóstico:
         131047 = fora da janela (mandou texto livre quando precisava de
         template), 132001 = template não existe nesse idioma, 190 = token
         morto. Guardar o código evita repetir a caçada da W-API, em que
         todo erro virava "falhou" e a camada real ficava escondida. */
      let erro = `HTTP ${res.status} ${texto.slice(0, 200)}`
      try {
        const j = JSON.parse(texto)
        const e = j?.error
        if (e) erro = `${e.code}/${e.error_subcode ?? '-'} ${e.message}`.slice(0, 200)
      } catch {}
      return { ok: false, erro }
    }
    let providerId: string | undefined
    try {
      providerId = JSON.parse(texto)?.messages?.[0]?.id ?? undefined
    } catch {}
    return { ok: true, providerId }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) }
  }
}

export type EnvioTemplate = {
  /** Nome exato do template aprovado. Ex: agendapro_lembrete_vespera */
  nome: string
  /** Código do idioma do template aprovado. Ex: pt_BR */
  idioma: string
  /** Variáveis {{1}}, {{2}}... NA ORDEM do texto aprovado. */
  params: string[]
  /**
   * Payload de cada botão de resposta rápida, na ordem em que estão no
   * template. É o que volta no webhook quando a cliente toca — sem isso a
   * gente recebe "Confirmar presença" e não sabe de QUAL agendamento.
   */
  payloadsBotoes?: string[]
}

/**
 * Envio fora da janela — o caso de todo lembrete.
 *
 * Só sai template aprovado. Se o texto do template mudar, tem que aprovar
 * de novo: a dona não escreve mais livremente, escolhe entre versões
 * prontas. Isso é limitação da plataforma, não decisão nossa.
 */
export async function enviarTemplate(
  cred: CredencialCloud,
  telefone: string,
  t: EnvioTemplate,
): Promise<ResultadoEnvio> {
  const fone = normalizarTelefone(telefone)
  if (!fone) return { ok: false, erro: 'telefone_invalido' }

  const components: Record<string, unknown>[] = []
  if (t.params.length) {
    components.push({
      type: 'body',
      parameters: t.params.map((text) => ({ type: 'text', text })),
    })
  }
  /* Cada botão vira um componente próprio, indexado. A Meta recusa o array
     inteiro num componente só. */
  for (const [i, payload] of (t.payloadsBotoes ?? []).entries()) {
    components.push({
      type: 'button',
      sub_type: 'quick_reply',
      index: String(i),
      parameters: [{ type: 'payload', payload }],
    })
  }

  return postar(cred, {
    to: fone,
    type: 'template',
    template: {
      name: t.nome,
      language: { code: t.idioma },
      ...(components.length ? { components } : {}),
    },
  })
}

/**
 * Texto livre — SÓ dentro da janela de 24h desde a última mensagem dela.
 *
 * Serve pra resposta automática e pra atendimento, não pra lembrete. Fora
 * da janela a Meta devolve 131047 e nada é entregue. E é de graça: mensagem
 * dentro da janela não entra na fatura.
 */
export async function enviarTexto(
  cred: CredencialCloud,
  telefone: string,
  texto: string,
): Promise<ResultadoEnvio> {
  const fone = normalizarTelefone(telefone)
  if (!fone) return { ok: false, erro: 'telefone_invalido' }
  return postar(cred, {
    to: fone,
    type: 'text',
    text: { preview_url: false, body: texto },
  })
}
