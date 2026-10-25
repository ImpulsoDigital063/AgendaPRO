'use client'

// Configurações → Negócio → Google Agenda (v175 · Ivna, 24/10/2026).
//
// Ida (v175): o que é marcado/remarcado/cancelado no AgendaPRO aparece no
// Google Agenda da dona, na hora. O texto deixa isso claro pra ela não mexer no
// Google achando que volta pro sistema.
//
// Só aparece pra dona de negócio liberado (a rota responde liberado:false pros
// outros e o cartão não renderiza nada).
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Status = {
  liberado: boolean
  conectado?: boolean
  email?: string | null
  professional_id?: string | null
  bloqueio_liberado?: boolean
  bloqueio_professional_id?: string | null
  bloqueios?: number
  erro?: string | null
  pendentes?: number
  profissionais?: { id: string; name: string }[]
}

const AVISO_DA_VOLTA: Record<string, string> = {
  ok: 'Pronto! Seus agendamentos já estão indo pro Google Agenda.',
  cancelado: 'Conexão cancelada na tela do Google. Nada mudou.',
  'sem-permissao': 'Faltou marcar a permissão da agenda na tela do Google. Tente de novo e deixe a caixinha marcada.',
  'sem-acesso': 'Só a dona da conta pode conectar o Google Agenda.',
  erro: 'Não deu pra conectar agora. Tente de novo em alguns minutos.',
}

export default function GoogleAgendaCard() {
  const params = useSearchParams()
  const volta = params.get('google')
  const [s, setS] = useState<Status | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(volta ? AVISO_DA_VOLTA[volta] ?? null : null)

  const carregar = useCallback(
    () =>
      fetch('/api/admin/google-agenda', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : { liberado: false }))
        .catch(() => ({ liberado: false }))
        .then((j: Status) => setS(j)),
    [],
  )

  useEffect(() => {
    void carregar()
  }, [carregar])

  if (!s?.liberado) return null

  async function trocarFiltro(valor: string) {
    setSalvando(true)
    setMsg(null)
    const r = await fetch('/api/admin/google-agenda', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ professional_id: valor || null }),
    })
    setSalvando(false)
    setMsg(r.ok ? 'Salvo. A agenda do Google já foi atualizada.' : 'Não deu pra salvar. Tente de novo.')
    carregar()
  }

  async function trocarBloqueio(valor: string) {
    setSalvando(true)
    setMsg(null)
    const r = await fetch('/api/admin/google-agenda', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bloqueio_professional_id: valor || null }),
    })
    setSalvando(false)
    setMsg(
      r.ok
        ? valor
          ? 'Ligado. Os compromissos do Google já estão bloqueando a agenda.'
          : 'Desligado. Os bloqueios que vinham do Google saíram da agenda.'
        : 'Não deu pra ler o Google agora. Tente de novo em alguns minutos.',
    )
    carregar()
  }

  async function desconectar() {
    setSalvando(true)
    setMsg(null)
    const r = await fetch('/api/admin/google-agenda', { method: 'DELETE' })
    setSalvando(false)
    setMsg(
      r.ok
        ? 'Desconectado. Os eventos que já estavam no Google continuam lá; os novos não vão mais.'
        : 'Não deu pra desconectar. Tente de novo.',
    )
    carregar()
  }

  const revogado = s.erro === 'acesso_revogado'

  return (
    <div className="admin-card p-4 mt-4">
      <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
        Google Agenda
      </p>
      {/* 25/10: o texto falava só da ida e o Eduardo não achou onde ligar a
          volta. As duas direções ficam escritas logo no topo. */}
      <ul className="text-xs mt-2 space-y-1.5 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
        <li>
          <strong style={{ color: 'var(--admin-text)' }}>Daqui pro Google:</strong> todo agendamento marcado, remarcado
          ou cancelado aqui aparece no seu Google Agenda na hora.
        </li>
        {s.bloqueio_liberado && (
          <li>
            <strong style={{ color: 'var(--admin-text)' }}>Do Google pra cá:</strong> compromisso que você marcar no
            Google (médico, viagem, reunião) fecha o horário no link de agendamento.
          </li>
        )}
      </ul>
      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
        Editar um agendamento direto no Google não muda o agendamento no AgendaPRO.
      </p>

      {!s.conectado || revogado ? (
        <>
          {revogado && (
            <p className="text-xs mt-3" style={{ color: 'var(--admin-warn)' }}>
              O acesso ao Google foi retirado. Conecte de novo pra voltar a enviar.
            </p>
          )}
          {/* rota de API que redireciona pro Google: navegação de página inteira, não Link */}
          <button
            type="button"
            onClick={() => window.location.assign('/api/google-agenda/conectar')}
            className="mt-3 rounded-lg px-3 py-2 text-xs font-bold text-white"
            style={{ background: 'var(--admin-accent)' }}
          >
            Conectar Google Agenda
          </button>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
            O Google pode mostrar o aviso &quot;app não verificado&quot;. É esperado enquanto a verificação do
            AgendaPRO no Google não sai: toque em &quot;Avançado&quot; e depois em &quot;Acessar AgendaPRO&quot;.
          </p>
        </>
      ) : (
        <>
          <p className="text-xs mt-3" style={{ color: 'var(--admin-text)' }}>
            Conectado{s.email ? ` como ${s.email}` : ''}.
          </p>
          {s.bloqueio_liberado && (
            /* Passo da volta em destaque enquanto ninguém foi escolhido: sem
               ele a volta fica desligada e nada avisa. Vem antes do filtro da
               ida porque responde a pergunta de base, de quem é a agenda. */
            <div
              className="mt-3 rounded-lg p-3"
              style={{
                border: `1px solid ${s.bloqueio_professional_id ? 'var(--admin-border)' : 'var(--admin-accent)'}`,
              }}
            >
              <label className="block text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
                De quem é essa agenda do Google?
                <select
                  className="mt-1.5 block w-full rounded-lg px-3 py-2 text-sm font-normal"
                  style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text)', background: 'transparent' }}
                  value={s.bloqueio_professional_id ?? ''}
                  disabled={salvando}
                  onChange={(e) => trocarBloqueio(e.target.value)}
                >
                  <option value="">{s.bloqueio_professional_id ? 'Ninguém (não bloquear horário)' : 'Escolha a profissional'}</option>
                  {(s.profissionais ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              {s.bloqueio_professional_id ? (
                <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--admin-text-mute)' }}>
                  {s.bloqueios === 1 ? '1 horário fechado' : `${s.bloqueios ?? 0} horários fechados`}{' '}pelo Google nos
                  próximos 60 dias. Compromissos marcados como &quot;Disponível&quot; no Google não fecham horário, e a
                  equipe vê só &quot;Ocupado (Google Agenda)&quot;, nunca o título.
                </p>
              ) : (
                <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--admin-accent)' }}>
                  Falta este passo: sem ele, o que você marca no Google não fecha horário no link.
                </p>
              )}
            </div>
          )}
          <label className="block text-xs mt-3" style={{ color: 'var(--admin-text-mute)' }}>
            Quais atendimentos vão pro seu Google
            <select
              className="mt-1 block w-full rounded-lg px-3 py-2 text-sm"
              style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text)', background: 'transparent' }}
              value={s.professional_id ?? ''}
              disabled={salvando}
              onChange={(e) => trocarFiltro(e.target.value)}
            >
              <option value="">Todos da clínica</option>
              {(s.profissionais ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  Só os de {p.name}
                </option>
              ))}
            </select>
          </label>
          {!!s.pendentes && (
            <p className="text-xs mt-2" style={{ color: 'var(--admin-warn)' }}>
              {s.pendentes} {s.pendentes === 1 ? 'agendamento ainda não foi' : 'agendamentos ainda não foram'} pro
              Google. O sistema tenta de novo sozinho.
            </p>
          )}
          <button
            type="button"
            onClick={desconectar}
            disabled={salvando}
            className="mt-3 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-60"
            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
          >
            Desconectar
          </button>
        </>
      )}

      {salvando && (
        <p className="text-xs mt-3" style={{ color: 'var(--admin-text-mute)' }}>
          Atualizando o Google...
        </p>
      )}
      {msg && !salvando && (
        <p className="text-xs mt-3" style={{ color: 'var(--admin-text)' }}>
          {msg}
        </p>
      )}
    </div>
  )
}
