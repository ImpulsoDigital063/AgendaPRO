'use client'

import { useEffect, useState } from 'react'
import { IconCheck, IconWhatsapp } from '@/components/ui/Icon'
import { mandarFichaPraCliente } from '@/lib/fichas/mandar-cliente'

/**
 * "Mandar a ficha pra ela preencher?" em 1 toque (v159, pedido do Eduardo
 * 14/10). Aparece logo depois de cadastrar a cliente e na tela de sucesso do
 * agendamento — sem precisar abrir Fichas.
 *
 * Só mostra quando o negócio ligou "Oferecer pra cliente nova" em Fichas
 * Modelo, a cliente ainda não respondeu e não tem link esperando resposta. Em
 * qualquer outro caso não desenha nada: quem não usa ficha não vê diferença.
 */
export default function OferecerFicha({
  customerId,
  temTelefone,
  onde,
  onPronto,
}: {
  customerId: string
  temTelefone: boolean
  /** Qual atalho é este (v160) — a dona liga cada lugar em Fichas Modelo. */
  onde: 'cadastro' | 'agendamento'
  /** Avisa o pai se há (true) ou não (false) o que oferecer, depois de carregar. */
  onPronto?: (temOferta: boolean) => void
}) {
  const [oferta, setOferta] = useState<{ slug: string; name: string }[] | null>(null)
  const [enviando, setEnviando] = useState<string | null>(null)
  const [enviada, setEnviada] = useState<string | null>(null)
  const [semTelefone, setSemTelefone] = useState<string | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let vivo = true
    fetch(`/api/admin/customers/${customerId}/ficha-convite?onde=${onde}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!vivo) return
        const lista = (j?.oferecer ?? []) as { slug: string; name: string }[]
        const esperando = ((j?.convites ?? []) as unknown[]).length > 0
        const final = esperando ? [] : lista
        setOferta(final)
        onPronto?.(final.length > 0)
      })
      .catch(() => { if (vivo) { setOferta([]); onPronto?.(false) } })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  if (!oferta || oferta.length === 0) return null

  async function mandar(slug: string, nome: string) {
    setErro(false)
    setEnviando(slug)
    const r = await mandarFichaPraCliente(customerId, slug, { temTelefone })
    setEnviando(null)
    if (!r.ok) { setErro(true); return }
    if (r.semTelefone) setSemTelefone(r.semTelefone)
    setEnviada(nome)
  }

  return (
    <div
      className="rounded-2xl p-4 space-y-3 text-left"
      style={{
        background: 'color-mix(in srgb, var(--admin-accent) 8%, var(--admin-surface))',
        border: '1px solid color-mix(in srgb, var(--admin-accent) 28%, transparent)',
      }}
    >
      {enviada ? (
        <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--admin-text)' }}>
          <span style={{ color: 'var(--admin-accent)' }}><IconCheck size={18} /></span>
          <div className="min-w-0">
            <p className="font-semibold">{enviada} enviada pra preencher.</p>
            {semTelefone ? (
              <p className="text-xs mt-1" style={{ color: 'var(--admin-text-mute)' }}>
                Sem telefone no cadastro. O link foi copiado, cole na conversa:
                <span className="block mt-1 break-all font-mono">{semTelefone}</span>
              </p>
            ) : (
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>Você recebe um aviso quando terminar.</p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>Mandar a ficha pra preencher?</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-mute)' }}>
              Responde e assina pelo celular antes de chegar.
            </p>
          </div>
          <div className="grid gap-2">
            {oferta.map((f) => (
              <button
                key={f.slug}
                type="button"
                onClick={() => mandar(f.slug, f.name)}
                disabled={enviando !== null}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
                style={{ background: '#25D366', color: '#fff' }}
              >
                <IconWhatsapp size={16} />
                {enviando === f.slug ? 'Gerando link…' : oferta.length > 1 ? f.name : 'Mandar pelo WhatsApp'}
              </button>
            ))}
          </div>
          {erro && <p className="text-xs" style={{ color: 'var(--admin-danger,#EF4444)' }}>Não foi possível gerar o link. Tente de novo.</p>}
        </>
      )}
    </div>
  )
}
