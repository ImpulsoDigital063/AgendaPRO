/**
 * Disparo de alerta operacional via Telegram.
 *
 * Por quê Telegram: instantâneo no celular, grátis, sem serviço pago.
 * Lê TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID do env (setar na Vercel + .env.local).
 *
 * Uso: const r = await sendAlert('🔴 Olímpio Barbearia sem agendamentos hoje')
 * Não lança — retorna {ok} pra não derrubar o cron por causa do canal de aviso.
 */
export async function sendAlert(text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN/CHAT_ID não configurados' }
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, error: `telegram ${res.status} ${body.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
