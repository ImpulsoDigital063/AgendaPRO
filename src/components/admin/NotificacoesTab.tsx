'use client'

// Configurações → Notificações (06/08).
//
// Por que existe: até aqui a ÚNICA porta pra ligar notificação era uma faixa
// que se escondia sozinha — já ativo, dispensado, permissão negada. Quando ela
// sumia, acabava: não havia lugar nenhum pra ver o estado nem pra religar, e o
// dono concluía que "o sistema não avisa" (caso Olímpio, 179 de 181
// agendamentos por link público e nenhum aparelho registrado).
//
// Aqui o estado é lido dos DOIS lados (permissão do aparelho + row no banco) e
// dá pra provar na hora com o botão de teste.
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { registerPush, pushDeviceState, type PushDeviceState } from '@/lib/push'

type Device = { endpoint: string; user_agent: string | null; created_at: string }

function apelidoDoDevice(ua: string | null): string {
  if (!ua) return 'Aparelho'
  if (/iphone/i.test(ua)) return 'iPhone'
  if (/ipad/i.test(ua)) return 'iPad'
  if (/android/i.test(ua)) return 'Android'
  if (/windows/i.test(ua)) return 'Computador (Windows)'
  if (/macintosh|mac os/i.test(ua)) return 'Computador (Mac)'
  return 'Aparelho'
}

export default function NotificacoesTab() {
  const [estado, setEstado] = useState<PushDeviceState | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setEstado(await pushDeviceState())
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data } = await sb
      .from('push_subscriptions')
      .select('endpoint, user_agent, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setDevices((data as Device[]) ?? [])
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  async function ativar() {
    setBusy(true); setMsg(null)
    const res = await registerPush()
    setBusy(false)
    if (res === 'granted') setMsg('Pronto — este aparelho vai ser avisado.')
    else if (res === 'denied') setMsg('Você bloqueou as notificações neste aparelho. Libere nos ajustes dele e volte aqui.')
    else if (res === 'unsupported') setMsg('Este aparelho não suporta notificação.')
    else setMsg('Não deu pra ativar agora. Tente de novo.')
    await carregar()
  }

  async function testar() {
    setBusy(true); setMsg(null)
    try {
      const r = await fetch('/api/push/test', { method: 'POST' })
      const j = await r.json()
      if (j.sem_device) setMsg('Nenhum aparelho registrado ainda. Ative aqui neste primeiro.')
      else if (j.enviados > 0) setMsg(`Mandei em ${j.enviados} aparelho(s). Se não chegou, a notificação está bloqueada nos ajustes do aparelho.`)
      else setMsg('Não consegui entregar em nenhum aparelho. Ative de novo aqui.')
    } catch {
      setMsg('Falha ao mandar o teste.')
    }
    setBusy(false)
    await carregar()
  }

  const podeAtivar = estado === 'desligado'
  const texto: Record<PushDeviceState, string> = {
    ativo: 'Este aparelho está recebendo. Você é avisado quando entra agendamento novo — e quando o sistema ganha melhoria.',
    desligado: 'Este aparelho ainda não recebe notificação. Ative pra ser avisado de agendamento novo sem precisar abrir o app.',
    bloqueado: 'As notificações estão bloqueadas nos ajustes deste aparelho. O sistema não consegue reativar por conta própria: libere em Ajustes → Notificações → AgendaPRO e volte aqui.',
    'ios-sem-app': 'No iPhone a notificação só funciona com o app instalado. No Safari, toque em Compartilhar → "Adicionar à Tela de Início", abra o app por lá e ative aqui.',
    'sem-suporte': 'Este navegador não suporta notificação. Tente pelo celular.',
  }

  return (
    <div className="space-y-4">
      <div className="admin-card p-4">
        <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          Notificação no celular
        </p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
          {estado ? texto[estado] : 'Verificando este aparelho…'}
        </p>

        <div className="flex flex-wrap gap-2 mt-3">
          {podeAtivar && (
            <button
              type="button"
              onClick={ativar}
              disabled={busy}
              className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
              style={{ background: 'var(--admin-accent)' }}
            >
              {busy ? 'Ativando…' : 'Ativar neste aparelho'}
            </button>
          )}
          <button
            type="button"
            onClick={testar}
            disabled={busy}
            className="rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-60"
            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
          >
            Enviar notificação de teste
          </button>
        </div>

        {msg && (
          <p className="text-xs mt-3" style={{ color: 'var(--admin-text)' }}>{msg}</p>
        )}
      </div>

      <div className="admin-card p-4">
        <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          Aparelhos que recebem ({devices.length})
        </p>
        {devices.length === 0 ? (
          <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
            Nenhum ainda. Enquanto não tiver aparelho aqui, o aviso só chega por email.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {devices.map((d) => (
              <li key={d.endpoint} className="flex items-center justify-between gap-2 text-xs">
                <span style={{ color: 'var(--admin-text)' }}>{apelidoDoDevice(d.user_agent)}</span>
                <span style={{ color: 'var(--admin-text-mute)' }}>
                  desde {new Date(d.created_at).toLocaleDateString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
