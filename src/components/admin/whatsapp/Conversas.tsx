'use client'

/* ═══════════════════════════════════════════════════════════════
   A CONVERSA, COMO NO WHATSAPP

   Eduardo, 22/09/2026: "simula a tela do whatsapp, assim as clientes vão
   entender só de bater o olho".

   Antes esta área era relatório: "Cobrança do sinal · entregue · 09/19
   16:14". Verdadeiro e ilegível — a dona precisava traduzir cada linha.
   Aqui ela vê o que saiu, o que a cliente respondeu e os tiquinhos que ela
   já sabe ler do WhatsApp dela.

   Decisões:

   · TIQUINHO EM SVG, nunca emoji: emoji muda de desenho em cada aparelho e
     o cinza/azul é justamente a informação.
   · UMA LEGENDA, uma vez só, no topo. Explicar em toda bolha vira ruído.
   · O QUE NÃO CHEGOU não recebe tiquinho: recebe aviso vermelho com a
     palavra "não chegou". Tiquinho vermelho ninguém entende.
   · O botão joga pro WhatsApp DELA. Nada de responder por aqui — isso
     viraria uma segunda caixa de entrada, que é o que o Eduardo vetou em
     28/08.
   ═══════════════════════════════════════════════════════════════ */

import { WA } from './ui'
import { IconWhatsapp } from '@/components/ui/Icon'

export type ItemConversa = {
  id: string
  de: 'negocio' | 'cliente'
  texto: string
  rotulo?: string
  situacao?: 'lida' | 'entregue' | 'enviada' | 'falhou' | 'processando'
  quando: string
}

export type Conversa = {
  telefone: string
  cliente: string | null
  appointmentId: string | null
  itens: ItemConversa[]
}

/** 556392920080 → (63) 99292-0080 */
function bonito(bruto: string): string {
  const d = (bruto || '').replace(/\D/g, '')
  const s = d.startsWith('55') ? d.slice(2) : d
  if (s.length < 10) return bruto
  return `(${s.slice(0, 2)}) ${s.slice(2, s.length - 4)}-${s.slice(-4)}`
}

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function diaLegivel(iso: string): string {
  const d = new Date(iso)
  const dia = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`
  const hoje = new Date()
  if (dia(d) === dia(hoje)) return 'hoje'
  if (dia(d) === dia(new Date(hoje.getTime() - 864e5))) return 'ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/** Os dois tiquinhos do WhatsApp. Um só = saiu; dois = chegou; azul = leu. */
function Tiques({ dois, azul }: { dois: boolean; azul: boolean }) {
  const cor = azul ? '#1d9bf0' : 'rgba(15,23,42,0.45)'
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
      <path d={dois ? 'M1 6.5 4 9.5 10 2.5' : 'M4 6.5 7 9.5 13 2.5'} stroke={cor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {dois && <path d="M7 6.5 10 9.5 16 2.5" stroke={cor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  )
}

function Selo({ situacao }: { situacao: ItemConversa['situacao'] }) {
  if (situacao === 'falhou') {
    return (
      <span className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--admin-danger)' }}>
        não chegou
      </span>
    )
  }
  if (situacao === 'processando') {
    return (
      <span className="text-[10.5px]" style={{ color: 'var(--admin-text-faded)' }}>
        saindo
      </span>
    )
  }
  return <Tiques dois={situacao === 'entregue' || situacao === 'lida'} azul={situacao === 'lida'} />
}

export default function Conversas({ conversas }: { conversas: Conversa[] }) {
  if (conversas.length === 0) return null

  return (
    <div className="mt-1">
      {/* Legenda · uma vez, no topo */}
      <div
        className="flex items-center flex-wrap gap-x-4 gap-y-1 px-3 py-2 mb-2 rounded-xl text-[11.5px]"
        style={{ background: 'var(--admin-input-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text-mute)' }}
      >
        <span className="inline-flex items-center gap-1.5">
          <Tiques dois={false} azul={false} /> saiu
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Tiques dois azul={false} /> chegou no celular
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Tiques dois azul /> a cliente leu
        </span>
      </div>

      <div className="space-y-2.5">
        {conversas.map((c) => {
          const ultimo = c.itens[c.itens.length - 1]
          const falhou = c.itens.some((i) => i.situacao === 'falhou')
          const digitos = (c.telefone || '').replace(/\D/g, '')
          return (
            <div
              key={c.telefone || c.itens[0].id}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
            >
              {/* Cabeçalho da conversa */}
              <div
                className="flex items-center gap-2 px-3.5 py-2.5"
                style={{ borderBottom: '1px solid var(--admin-divider)' }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold truncate" style={{ color: 'var(--admin-text)' }}>
                    {c.cliente ?? bonito(c.telefone)}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--admin-text-faded)' }}>
                    {c.cliente ? `${bonito(c.telefone)} · ` : ''}
                    {diaLegivel(ultimo.quando)} {hora(ultimo.quando)}
                  </p>
                </div>
                {digitos && (
                  <a
                    href={`https://wa.me/${digitos.startsWith('55') ? digitos : '55' + digitos}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold flex-shrink-0"
                    style={{ background: WA.fundo, color: WA.forte, border: `1px solid ${WA.borda}` }}
                  >
                    <IconWhatsapp size={13} /> Responder
                  </a>
                )}
              </div>

              {/* Os balões */}
              <div className="px-3 py-3 space-y-2" style={{ background: 'var(--admin-bg)' }}>
                {c.itens.map((i) =>
                  i.de === 'negocio' ? (
                    <div key={i.id} className="flex justify-end">
                      <div className="max-w-[86%]">
                        <div
                          className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line"
                          style={{
                            background: 'rgba(37,211,102,0.12)',
                            border: '1px solid rgba(37,211,102,0.22)',
                            borderBottomRightRadius: 6,
                            color: 'var(--admin-text)',
                          }}
                        >
                          {i.texto}
                        </div>
                        <div className="flex items-center justify-end gap-1.5 mt-1 pr-1">
                          {i.rotulo && (
                            <span className="text-[10.5px]" style={{ color: 'var(--admin-text-faded)' }}>
                              {i.rotulo}
                            </span>
                          )}
                          <span className="text-[10.5px]" style={{ color: 'var(--admin-text-faded)' }}>
                            {hora(i.quando)}
                          </span>
                          <Selo situacao={i.situacao} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={i.id} className="flex justify-start">
                      <div className="max-w-[86%]">
                        <div
                          className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line"
                          style={{
                            background: 'var(--admin-surface)',
                            border: '1px solid var(--admin-border)',
                            borderBottomLeftRadius: 6,
                            color: 'var(--admin-text)',
                          }}
                        >
                          {i.texto}
                        </div>
                        <p className="text-[10.5px] mt-1 pl-1" style={{ color: 'var(--admin-text-faded)' }}>
                          resposta da cliente · {hora(i.quando)}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>

              {falhou && (
                <p
                  className="px-3.5 py-2 text-[11.5px]"
                  style={{ background: 'rgba(220,38,38,0.06)', color: 'var(--admin-danger)' }}
                >
                  Um aviso não chegou nessa cliente. Vale confirmar por telefone.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
