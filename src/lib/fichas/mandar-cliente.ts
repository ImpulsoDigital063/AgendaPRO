/**
 * Manda a ficha pra cliente preencher (v157/v159) — lado do navegador.
 *
 * Fonte única dos três lugares que mandam: aba Fichas da cliente, cadastro
 * da cliente e tela de sucesso do agendamento. O servidor devolve o link do
 * WhatsApp já montado (texto da dona + telefone com 55).
 *
 * A aba do WhatsApp é aberta NO TOQUE, antes do fetch: aberta depois do
 * await, o Safari do iPhone/iPad bloqueia como pop-up.
 */
export async function mandarFichaPraCliente(
  customerId: string,
  nicheSlug: string,
  opts: { temTelefone: boolean },
): Promise<{ ok: true; semTelefone?: string } | { ok: false }> {
  const aba = opts.temTelefone ? window.open('', '_blank') : null
  try {
    const r = await fetch(`/api/admin/customers/${customerId}/ficha-convite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nicheSlug }),
    })
    const j = await r.json().catch(() => null)
    if (!r.ok || !j?.url) { aba?.close(); return { ok: false } }
    if (j.whatsapp) {
      if (aba) aba.location.href = j.whatsapp
      else window.location.href = j.whatsapp
      return { ok: true }
    }
    aba?.close()
    navigator.clipboard?.writeText(j.url).catch(() => {})
    return { ok: true, semTelefone: j.url as string }
  } catch {
    aba?.close()
    return { ok: false }
  }
}
