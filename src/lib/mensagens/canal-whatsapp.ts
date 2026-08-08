/* ═══════════════════════════════════════════════════════════════
   CANAL WHATSAPP (W-API)

   FORMATO CONFIRMADO EM PRODUÇÃO (07/08), disparando de verdade:
     POST https://api.w-api.app/v1/message/send-text?instanceId=<id>
     Authorization: Bearer <token da instância>
     { phone: "55DDDNUMERO", message: "..." }
     → 200 { messageId, insertedId }

   O caminho dos BOTÕES (`message/send-button-list`) existe e pede
   `buttonId` + `buttonText.displayText`, mas recusou as variações
   testadas — falta o exemplo da doc. Enquanto isso, o envio com botão cai
   pra texto puro sozinho (ver enviarComBotoes): lembrete sem botão ainda
   lembra; lembrete que não sai não serve pra nada.

   O que já está decidido e não muda:
   · a credencial vem do BANCO, não do .env — Fase 2 é cada negócio com a
     sua instância, e isso já nasce suportado (businesses.wapp_*);
   · sem credencial = no-op silencioso que devolve `false`. Quem chama
     cai no email. Nunca derruba o fluxo do agendamento.
   ═══════════════════════════════════════════════════════════════ */

const BASE = process.env.WAPI_BASE_URL || 'https://api.w-api.app/v1'

export type CredencialWapp = {
  instanceId: string
  token: string
}

/** Instância do sistema (Fase 1). Vazio até o chip existir. */
export function credencialDoSistema(): CredencialWapp | null {
  const instanceId = process.env.WAPI_INSTANCE_ID
  const token = process.env.WAPI_TOKEN
  if (!instanceId || !token) return null
  return { instanceId, token }
}

/** Telefone só com dígitos e DDI 55 — é o formato que a API espera. */
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

async function chamar(
  cred: CredencialWapp,
  caminho: string,
  corpo: Record<string, unknown>,
): Promise<ResultadoEnvio> {
  try {
    const res = await fetch(`${BASE}/${caminho}?instanceId=${cred.instanceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cred.token}`,
      },
      body: JSON.stringify(corpo),
    })
    const texto = await res.text()
    if (!res.ok) return { ok: false, erro: `HTTP ${res.status} ${texto.slice(0, 200)}` }
    let providerId: string | undefined
    try {
      const j = JSON.parse(texto)
      providerId = j?.messageId ?? j?.id ?? undefined
    } catch {}
    return { ok: true, providerId }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) }
  }
}

export async function enviarTexto(
  cred: CredencialWapp,
  telefone: string,
  texto: string,
): Promise<ResultadoEnvio> {
  const fone = normalizarTelefone(telefone)
  if (!fone) return { ok: false, erro: 'telefone_invalido' }
  return chamar(cred, 'message/send-text', { phone: fone, message: texto })
}

export async function enviarComBotoes(
  cred: CredencialWapp,
  telefone: string,
  texto: string,
  botoes: { id: string; texto: string }[],
): Promise<ResultadoEnvio> {
  const fone = normalizarTelefone(telefone)
  if (!fone) return { ok: false, erro: 'telefone_invalido' }

  const r = await chamar(cred, 'message/send-button-list', {
    phone: fone,
    message: texto,
    buttons: botoes.map((b) => ({
      buttonId: b.id,
      buttonText: { displayText: b.texto },
      type: 1,
    })),
  })
  if (r.ok) return r

  /* Botão falhou → manda o texto puro. O botão é ganho (a cliente confirma
     num toque e a agenda atualiza sozinha), não requisito: um lembrete sem
     botão continua lembrando, e um lembrete que não sai não serve pra nada.
     Sem isso, qualquer mudança no formato deles derrubaria TODOS os
     lembretes de uma vez. */
  const semBotao = await enviarTexto(cred, telefone, texto)
  return semBotao.ok
    ? { ...semBotao, erro: `botao_falhou_caiu_pra_texto: ${r.erro ?? ''}`.slice(0, 200) }
    : r
}
