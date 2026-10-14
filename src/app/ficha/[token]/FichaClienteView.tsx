'use client'

import { useState } from 'react'
import FichaDedicada, { type FichaValues } from '@/components/admin/clientes/FichaDedicada'
import { NICHE_FICHAS } from '@/lib/fichas/registry'

type Props = {
  token: string
  estado: 'ok' | 'invalido' | 'usado' | 'expirado'
  dados: { slug: string; primeiroNome: string; negocio: string; logo: string | null; cor: string | null } | null
}

/* A ficha usa os tokens visuais do painel (var(--admin-*)), definidos em
   [data-admin-theme]. Aqui eles valem só dentro deste wrapper, com a cor da
   marca do negócio no lugar do azul padrão. */
export default function FichaClienteView({ token, estado, dados }: Props) {
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviada, setEnviada] = useState(false)
  const ficha = dados ? NICHE_FICHAS[dados.slug] : null

  async function enviar(values: FichaValues) {
    setSaving(true)
    setErro(null)
    try {
      const res = await fetch(`/api/ficha-convite/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      })
      const j = await res.json().catch(() => null)
      if (res.ok && j?.ok) { setEnviada(true); window.scrollTo({ top: 0 }); return }
      if (j?.error === 'ja_enviada') { setEnviada(true); return }
      if (j?.error === 'falta_assinar') setErro(`Falta preencher: ${(j.falta as string[]).join(' · ')}`)
      else if (j?.error === 'link_expirado') setErro('Este link expirou. Peça um novo pra clínica.')
      else setErro('Não foi possível enviar agora. Confira sua internet e tente de novo.')
    } catch {
      setErro('Não foi possível enviar agora. Confira sua internet e tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  const aviso = (titulo: string, texto: string) => (
    <div className="max-w-md mx-auto px-6 py-16 text-center">
      <p className="text-lg font-bold" style={{ color: '#0F172A' }}>{titulo}</p>
      <p className="text-sm mt-2" style={{ color: '#64748B' }}>{texto}</p>
    </div>
  )

  return (
    <main
      data-admin-theme
      className="min-h-screen"
      style={{ background: '#F6F8FA', ...(dados?.cor ? ({ '--admin-accent': dados.cor } as React.CSSProperties) : {}) }}
    >
      {estado === 'invalido' && aviso('Link inválido', 'Confira se o link chegou inteiro ou peça um novo pra clínica.')}
      {estado === 'expirado' && aviso('Este link expirou', 'Peça um novo pra clínica pelo WhatsApp.')}
      {estado === 'usado' && aviso('Ficha já enviada', 'Essa ficha já foi preenchida e assinada. Obrigada!')}

      {estado === 'ok' && dados && ficha && (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          <header className="text-center space-y-3">
            {dados.logo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={dados.logo} alt={dados.negocio} className="mx-auto max-h-20 max-w-[70%] object-contain" />
              : <p className="text-lg font-bold" style={{ color: '#0F172A' }}>{dados.negocio}</p>}
            {!enviada && (
              <p className="text-sm" style={{ color: '#475569' }}>
                {dados.primeiroNome ? `Olá, ${dados.primeiroNome}! ` : 'Olá! '}
                Preencha sua ficha antes do atendimento. No final, assine com o dedo na tela e toque em <strong>Assinar e enviar</strong>.
              </p>
            )}
          </header>

          {enviada ? (
            aviso('Ficha enviada!', `Obrigada${dados.primeiroNome ? `, ${dados.primeiroNome}` : ''}. ${dados.negocio || 'A clínica'} já recebeu suas respostas.`)
          ) : (
            <div className="rounded-2xl p-4 sm:p-6" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
              <FichaDedicada
                ficha={ficha}
                customer={null}
                cliente
                saving={saving}
                onSave={(values) => enviar(values)}
                onCancel={() => {}}
              />
              {erro && <p className="text-sm mt-3 px-3 py-2 rounded-lg" style={{ color: '#B91C1C', background: 'rgba(239,68,68,.08)' }}>{erro}</p>}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
