/* ═══════════════════════════════════════════════════════════════
   CANAL WHATSAPP (W-API)

   ⚠️ ENDPOINTS A CONFIRMAR NO PAINEL/DOC DA W-API.
   A documentação deles é interativa (renderizada por JS) e não deu pra ler
   de fora, e endpoint chutado é o tipo de erro que só aparece quando a
   mensagem não chega. Por isso TODO o formato do request vive neste
   arquivo, isolado: quando a conta existir, é aqui — e só aqui — que se
   ajusta. Nada do motor depende desses detalhes.

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
  return chamar(cred, 'message/send-button-list', {
    phone: fone,
    message: texto,
    buttonList: { buttons: botoes.map((b) => ({ id: b.id, label: b.texto })) },
  })
}
