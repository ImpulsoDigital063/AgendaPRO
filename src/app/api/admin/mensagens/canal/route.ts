/* ═══════════════════════════════════════════════════════════════
   ESTADO DO CANAL DE WHATSAPP, PRA TELA DA DONA

   Em 21/08 o canal ficou 6 dias fora do ar e ninguém soube: a assinatura
   da instância venceu, os envios passaram a falhar com 403, e a única
   pista estava numa coluna de erro do message_log que ninguém abre.

   Pior: durante o conserto, `connected: true` MENTIU — a API respondia
   conectado com a sessão morta, aceitando mensagem e não entregando. Quem
   sabia a verdade era o /instance/device, que devolve o número pareado.
   Por isso esta rota olha os dois e só diz "no ar" quando o device
   responde com número.

   Não fica no GET das regras de propósito: aquele é o que desenha a tela,
   e uma chamada externa lenta ali deixaria a página inteira esperando o
   provedor. Aqui a tela pede em paralelo e preenche quando chegar.
   ═══════════════════════════════════════════════════════════════ */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { credencialDoSistema } from '@/lib/mensagens/canal-whatsapp'

export const runtime = 'nodejs'

type Estado = {
  configurado: boolean
  no_ar: boolean
  numero: string | null
  detalhe: string
}

export async function GET() {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  const cred = credencialDoSistema()
  if (!cred) {
    return NextResponse.json<Estado>({
      configurado: false,
      no_ar: false,
      numero: null,
      detalhe: 'O envio automático ainda não está liberado para este negócio.',
    })
  }

  /* Timeout curto: a tela não pode ficar pendurada esperando o provedor —
     foi exatamente assim que o diagnóstico travou no dia do incidente. */
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)

  try {
    const res = await fetch(
      `https://api.w-api.app/v1/instance/device?instanceId=${cred.instanceId}`,
      { headers: { Authorization: `Bearer ${cred.token}` }, signal: ctrl.signal, cache: 'no-store' },
    )

    if (!res.ok) {
      return NextResponse.json<Estado>({
        configurado: true,
        no_ar: false,
        numero: null,
        detalhe:
          res.status === 401
            ? 'O WhatsApp foi desconectado. Os avisos param até reconectar.'
            : `O canal não respondeu (erro ${res.status}). Os avisos podem não estar saindo.`,
      })
    }

    const j = await res.json()
    const numero = typeof j?.connectedPhone === 'string' ? j.connectedPhone : null

    return NextResponse.json<Estado>({
      configurado: true,
      no_ar: !!numero,
      numero,
      detalhe: numero ? 'Enviando normalmente.' : 'Conectado, mas sem número pareado.',
    })
  } catch {
    return NextResponse.json<Estado>({
      configurado: true,
      no_ar: false,
      numero: null,
      detalhe: 'Não deu para falar com o canal agora. Tente de novo em alguns minutos.',
    })
  } finally {
    clearTimeout(t)
  }
}
