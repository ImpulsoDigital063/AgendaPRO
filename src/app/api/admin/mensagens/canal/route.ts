/* ═══════════════════════════════════════════════════════════════
   SAÚDE DO CANAL — o que a dona vê no card do painel

   Na W-API a pergunta era "a sessão caiu?", e o /instance/status mentia:
   respondia connected com a sessão morta. Só o /instance/device dizia a
   verdade. Isso ACABOU — na Cloud API não existe sessão, não existe QR, não
   existe instância pra reconectar. O número é registrado e fica.

   A pergunta certa agora é outra, e tem três respostas possíveis:
   · o número existe e está verificado?
   · qual a QUALIDADE dele? (GREEN / YELLOW / RED)
   · quanto ele pode mandar? (a faixa de volume)

   `quality_rating` é o que substitui "conectado" como sinal de alarme. Ele
   cai quando as pessoas bloqueiam ou denunciam, e RED significa que a Meta
   está prestes a restringir o número — o aviso que a gente quer ver ANTES
   dos lembretes pararem, não depois.
   ═══════════════════════════════════════════════════════════════ */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveBusinessIdOperacao } from '@/lib/api-business-access'
import { credencialDoSistema } from '@/lib/mensagens/canal-cloud'
import { consumoDoMes, resumoEmPortugues, type Consumo } from '@/lib/mensagens/franquia'
import { todayBR } from '@/lib/date-br'

export const runtime = 'nodejs'

type Estado = {
  configurado: boolean
  no_ar: boolean
  numero: string | null
  detalhe: string
  /** GREEN | YELLOW | RED | UNKNOWN — só existe na Cloud API. */
  qualidade?: string | null
  /* Consumo do pacote no mês. Vem junto de propósito: é a mesma tela e a
     mesma pergunta da dona — "está funcionando e quanto já usei?". Duas
     rotas pra isso seriam dois carregamentos e dois jeitos de falhar. */
  consumo?: Consumo & { resumo: string }
  /* Clientes com horário marcado que NÃO vão receber aviso porque o
     cadastro está sem telefone ou com telefone incompleto. */
  semTelefone?: { quantos: number; nomes: string[] }
}

export async function GET() {
  const supabase = await createClient()
  const businessId = await resolveBusinessIdOperacao(supabase)
  if (!businessId) return NextResponse.json({ error: 'sem_acesso' }, { status: 403 })

  /* Lido antes do fetch na Meta: o consumo vem do NOSSO banco e não pode
     ficar refém do tempo de resposta deles. */
  const c = await consumoDoMes(supabase, businessId).catch(() => null)
  const consumo = c ? { ...c, resumo: resumoEmPortugues(c) } : undefined

  /* QUEM NÃO VAI RECEBER, E POR QUÊ.
     ─────────────────────────────────────────────────────────────
     Medido na base em 29/08: 8% dos agendamentos do mês (36 de 456) estão
     sem telefone ou com telefone incompleto. Não é problema do canal — é
     cadastro, e existe desde antes. Mas passa a doer agora: até ontem "não
     recebeu" era normal; a partir do momento em que a dona PAGA por aviso,
     vira reclamação.

     Só os FUTUROS: passado não tem conserto, futuro ela ainda arruma. */
  const { data: futuros } = await supabase
    .from('appointments')
    .select('client_name, client_phone')
    .eq('business_id', businessId)
    .gte('appointment_date', todayBR())
    .in('status', ['pending', 'confirmed'])
    .limit(300)
  const ruins = ((futuros ?? []) as { client_name: string | null; client_phone: string | null }[])
    .filter((a) => {
      const d = String(a.client_phone ?? '').replace(/\D/g, '').replace(/^55/, '')
      return d.length < 10
    })
  const semTelefone = ruins.length
    ? { quantos: ruins.length, nomes: [...new Set(ruins.map((a) => a.client_name ?? 'sem nome'))].slice(0, 5) }
    : undefined

  const cred = credencialDoSistema()
  if (!cred) {
    return NextResponse.json<Estado>({
      configurado: false,
      no_ar: false,
      numero: null,
      detalhe: 'O envio automático ainda não está liberado para este negócio.',
      consumo,
      semTelefone,
    })
  }

  /* Timeout curto: a tela não pode ficar pendurada esperando a Meta — foi
     assim que o diagnóstico travou no dia do incidente. */
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)

  const BASE = process.env.WHATSAPP_BASE_URL || 'https://graph.facebook.com/v21.0'
  try {
    const res = await fetch(
      `${BASE}/${cred.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`,
      { headers: { Authorization: `Bearer ${cred.token}` }, signal: ctrl.signal, cache: 'no-store' },
    )

    if (!res.ok) {
      /* 190 = token morto. Na W-API isso virava "desconectado" e a dona ia
         procurar QR que não existe mais; aqui é problema NOSSO, não dela. */
      return NextResponse.json<Estado>({
        configurado: true,
        no_ar: false,
        numero: null,
        detalhe:
          res.status === 401 || res.status === 403
            ? 'O canal está com problema de acesso. Já estamos vendo isso — os avisos param até resolver.'
            : `O canal não respondeu (erro ${res.status}). Os avisos podem não estar saindo.`,
        consumo,
        semTelefone,
      })
    }

    const j = await res.json()
    const numero: string | null =
      typeof j?.display_phone_number === 'string' ? j.display_phone_number : null
    const qualidade: string | null = j?.quality_rating ?? null
    const verificado = j?.code_verification_status === 'VERIFIED'

    /* RED e YELLOW não impedem o envio hoje, mas são o aviso que antecede a
       restrição. Falar disso pra dona em português, não em cor de API. */
    const detalhe = !numero
      ? 'Número ainda não registrado.'
      : qualidade === 'RED'
        ? 'Muita gente bloqueou os avisos. O envio pode ser limitado a qualquer momento — vale rever quem está recebendo.'
        : qualidade === 'YELLOW'
          ? 'Alguns clientes bloquearam os avisos. Ainda está enviando, mas de olho.'
          : verificado
            ? 'Enviando normalmente.'
            : 'Registrado, mas ainda em verificação.'

    return NextResponse.json<Estado>({
      configurado: true,
      no_ar: !!numero && qualidade !== 'RED',
      numero,
      detalhe,
      qualidade,
      consumo,
      semTelefone,
    })
  } catch {
    return NextResponse.json<Estado>({
      configurado: true,
      no_ar: false,
      numero: null,
      detalhe: 'Não deu para falar com o canal agora. Tente de novo em alguns minutos.',
      consumo,
      semTelefone,
    })
  } finally {
    clearTimeout(t)
  }
}
