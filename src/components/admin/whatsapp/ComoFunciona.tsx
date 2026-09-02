'use client'

/* ═══════════════════════════════════════════════════════════════
   COMO FUNCIONA — a seção que carrega a venda

   É o melhor bloco da landing da Trinks, e o que dá pra fazer melhor que
   eles. Lá: lista clicável à esquerda, mockup à direita, e — o detalhe que
   fecha — a AGENDA ao lado mostrando "Confirmado pelo cliente".

   Mostrar só a mensagem vende metade. Quem decide não é quem gosta do
   texto, é quem entende o que muda na tela dela depois. Por isso o selo
   aparece aqui: a mensagem sai, a cliente toca, e o agendamento muda de
   cara na agenda. Esse é o produto.

   ─── Nada de texto cravado ───────────────────────────────────
   A lista sai de `avisos`, que a rota de templates já devolve com rótulo,
   quando, porquê e a prévia — e a prévia agora usa o último atendimento
   real do negócio (01/09), então a barbearia mostra "Barba com Leandro" e
   não "Escova com Ana". Cravar quatro textos aqui divergiria na primeira
   mudança de template, e divergiria em silêncio.
   ═══════════════════════════════════════════════════════════════ */

import type { CSSProperties, ReactNode } from 'react'
import { useState } from 'react'
import type { Aviso } from './AvisoDetalhe'
import { WA } from './ui'
import TelaWhatsApp from './TelaWhatsApp'
import IPhone from './IPhone'

const entra = (ms: number) => ({ '--enter-delay': `${ms}ms` }) as CSSProperties

/* Um ícone por tipo. SVG e não emoji — emoji muda de desenho em cada
   sistema e é a coisa que mais entrega interface amadora. */
const ICONE: Record<string, ReactNode> = {
  confirmacao: (
    <>
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.4 12.2l2.6 2.6 4.6-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  sinal_pendente: (
    <>
      <rect x="3.2" y="6" width="17.6" height="12" rx="2.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.2 10.2h17.6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6.8 14.4h3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  lembrete_vespera: (
    <>
      <rect x="3.6" y="5" width="16.8" height="15" rx="2.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.6 9.6h16.8M8.4 3v4M15.6 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  lembrete_dia: (
    <>
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.4V12l3 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  aniversario: (
    <>
      <path d="M4.4 20.4v-6a2 2 0 012-2h11.2a2 2 0 012 2v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3.4 20.4h17.2M12 12.4V8.6M12 5.6a1.4 1.4 0 100-2 1.4 1.4 0 000 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  retorno: (
    <>
      <path d="M20 12a8 8 0 11-2.6-5.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 3.6V8h-4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
}

const PADRAO_ICONE = (
  <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.8" />
)

export default function ComoFunciona({
  avisos,
  remetente,
  numero,
  clienteExemplo,
}: {
  avisos: Aviso[]
  remetente: string
  numero: string
  /** Nome que aparece no cartão da agenda. Vem do último atendimento real. */
  clienteExemplo: string
}) {
  /* Só o que vai PRA CLIENTE. Os avisos `dono_*` são push pra própria dona
     e não têm o que fazer numa tela que explica o que a cliente recebe. */
  const daCliente = avisos.filter((a) => !a.tipo.startsWith('dono_'))
  const [aberto, setAberto] = useState(daCliente[0]?.tipo ?? 'confirmacao')
  const atual = daCliente.find((a) => a.tipo === aberto) ?? daCliente[0]

  if (!atual) return null

  /* O selo só faz sentido no que TEM botão — lembrete que só lembra não
     produz resposta, e mostrar a agenda mudando ali seria promessa falsa. */
  const mostraSelo = atual.temBotao

  return (
    <section id="como-funciona" className="secao-ancora pt-10">
      <h3
        className="admin-enter text-[24px] sm:text-[28px] leading-tight font-bold tracking-tight"
        style={{ ...entra(0), color: 'var(--admin-text)' }}
      >
        Como funciona
      </h3>
      <p
        className="admin-enter text-[15px] leading-relaxed mt-2 max-w-lg"
        style={{ ...entra(60), color: 'var(--admin-text-2)' }}
      >
        Você escolhe quais avisos quer ligar. O sistema manda na hora certa,
        sozinho, e o que a cliente responde volta pra sua agenda.
      </p>

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10 lg:items-start">
        {/* ═══ A LISTA ═══════════════════════════════════════════ */}
        <div className="flex flex-col gap-2">
          {daCliente.map((a, i) => {
            const ativo = a.tipo === aberto
            return (
              <button
                key={a.tipo}
                type="button"
                onClick={() => setAberto(a.tipo)}
                aria-expanded={ativo}
                className="admin-enter w-full text-left rounded-2xl px-4 py-3.5 flex items-start gap-3 transition-all"
                style={{
                  ...entra(100 + i * 50),
                  background: ativo ? WA.fundo : 'var(--admin-surface)',
                  border: `1px solid ${ativo ? WA.borda : 'var(--admin-border)'}`,
                }}
              >
                <span
                  className="flex-shrink-0 mt-[1px] inline-flex items-center justify-center rounded-xl"
                  style={{
                    width: 34,
                    height: 34,
                    background: ativo ? WA.forte : 'var(--admin-surface-hover)',
                    color: ativo ? '#fff' : 'var(--admin-text-mute)',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    {ICONE[a.tipo] ?? PADRAO_ICONE}
                  </svg>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[15px] font-bold"
                      style={{ color: ativo ? WA.forte : 'var(--admin-text)' }}
                    >
                      {a.rotulo}
                    </span>
                    {/* Marketing consome 7 em vez de 1. Esconder isso aqui e
                        só contar na fatura é o tipo de coisa que faz a dona
                        desconfiar do resto da tela. */}
                    {a.marketing && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(217,119,6,0.12)', color: 'var(--admin-warn)' }}
                      >
                        vale 7
                      </span>
                    )}
                  </span>
                  <span
                    className="block text-[12.5px] leading-relaxed mt-0.5"
                    style={{ color: 'var(--admin-text-2)' }}
                  >
                    {a.quando}
                  </span>
                  {ativo && a.porque && (
                    <span
                      className="block text-[12.5px] leading-relaxed mt-1.5"
                      style={{ color: 'var(--admin-text-mute)' }}
                    >
                      {a.porque}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>

        {/* ═══ O APARELHO E O QUE VOLTA ══════════════════════════ */}
        <div className="mt-8 lg:mt-0 flex flex-col items-center gap-4">
          <IPhone largura={244}>
            <TelaWhatsApp
              key={atual.tipo}
              remetente={remetente}
              numero={numero}
              texto={atual.previa}
              botoes={atual.temBotao ? ['Confirmar presença', 'Preciso remarcar'] : undefined}
            />
          </IPhone>

          {/* ── O QUE ACONTECE DEPOIS ─────────────────────────────
              A parte que a Trinks mostra e quase ninguém copia: não é a
              mensagem que ela compra, é o agendamento mudando de cara.
              Este cartão é o mesmo selo que a agenda ganhou na v146. */}
          {mostraSelo && (
            <div
              className="w-full max-w-[260px] rounded-2xl px-3.5 py-3"
              style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
            >
              <p
                className="text-[10.5px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--admin-text-faded)' }}
              >
                E na sua agenda
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="flex-shrink-0 rounded-full"
                  style={{ width: 3, height: 30, background: WA.forte }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="text-[13px] font-bold truncate"
                      style={{ color: 'var(--admin-text)' }}
                    >
                      {clienteExemplo}
                    </span>
                    <span
                      className="flex-shrink-0 inline-flex items-center justify-center rounded-full"
                      style={{ width: 14, height: 14, background: WA.forte, color: '#fff' }}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M4 12.5l5.5 5.5L20 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </span>
                  <span
                    className="block text-[11px] mt-0.5"
                    style={{ color: WA.forte }}
                  >
                    Ela confirmou pelo WhatsApp
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
