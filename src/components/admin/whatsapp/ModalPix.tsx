'use client'

/* ═══════════════════════════════════════════════════════════════
   O PIX EM MODAL — porque cobrança gerada não pode passar despercebida

   O que aconteceu em 31/08: o Eduardo clicou em "Contratar" no card de
   preço, no fim da página. A cobrança foi criada certinho, mas o PIX
   renderizava lá em CIMA, fora da rolagem dele. Nada mudou onde ele estava
   olhando, então ele clicou de novo. E de novo. Terminou com QUATRO PIX de
   R$ 23,90 abertos no Asaas.

   A primeira correção foi mostrar o PIX dentro do próprio card. Ele apontou
   que ainda não resolve: continua dependendo de onde a pessoa está na
   rolagem. Modal não depende de nada — cobre a tela inteira, e é o padrão
   que qualquer pessoa já viu em checkout.

   A defesa de verdade contra cobrança duplicada mora no SERVIDOR (a rota
   reaproveita um PIX pendente idêntico em vez de criar outro). Esta tela
   resolve a outra metade: a pessoa VER que a cobrança saiu.

   Fechar não cancela nada. A cobrança continua de pé, e clicar em Contratar
   de novo traz o mesmo PIX de volta.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react'
import { IconClose } from '@/components/ui/Icon'
import { WA } from './ui'

export type PixAberto = {
  valor: number
  unidades: number
  dias: number
  copiaECola: string | null
  qrBase64: string | null
  reaproveitada: boolean
  /** Pagina de pagamento do Asaas. E o caminho que nao depende de
   *  area de transferencia nem de camera. */
  link: string | null
}

const reais = (n: number) => 'R$ ' + n.toFixed(2).replace('.', ',')

export default function ModalPix({
  pix,
  onFechar,
  onPago,
}: {
  pix: PixAberto
  onFechar: () => void
  /** Chamado quando o pagamento e' confirmado no banco. */
  onPago: () => void
}) {
  const [pago, setPago] = useState(false)
  /* null = ainda nao tentou · true = copiou · false = a copia FALHOU */
  const [copiou, setCopiou] = useState<boolean | null>(null)
  const campoCodigo = useRef<HTMLTextAreaElement>(null)

  /* ── ESPERA O DINHEIRO CAIR ──────────────────────────────────
     Em 01/09 o Eduardo pagou e a tela nao mudou nem avisou nada. O pacote
     estava ativo no banco em segundos (o webhook do Asaas fez o trabalho),
     mas o painel busca os dados UMA vez ao abrir e fica parado. Com PIX isso
     e' falha de desenho: o dinheiro entra segundos depois, e ninguem volta
     pra tela pra descobrir.

     Mesmo padrao que o checkout da mensalidade ja usava (5s, silencioso, e
     para sozinho quando confirma). */
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch('/api/admin/mensagens/pacotes', { cache: 'no-store' })
        if (!r.ok) return
        const j = await r.json()
        if (j?.atual) {
          setPago(true)
          clearInterval(t)
          /* 1,8s pra ela LER a confirmacao antes da tela trocar. Fechar na
             hora daria a sensacao de que nada aconteceu, que e exatamente o
             problema que isso conserta. */
          setTimeout(onPago, 1800)
        }
      } catch {
        /* silencioso — a proxima rodada tenta de novo */
      }
    }, 5000)
    return () => clearInterval(t)
  }, [onPago])

  /* Trava a rolagem do fundo enquanto o modal está aberto — senão o dedo
     rola a página atrás e a pessoa perde o QR de vista de novo. */
  useEffect(() => {
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = antes
    }
  }, [])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])

  /* A versao anterior fazia `void navigator.clipboard.writeText(...)` e
     mostrava "Código copiado" SEM checar nada. Quando a API falha — e no iOS
     ela falha em PWA, em contexto nao-seguro e quando o gesto se perde — o
     botao mentia, e o que ia pro banco era o que ja estava na area de
     transferencia. Foi isso que fez o Eduardo levar erro em dois bancos com
     um codigo que o Asaas gerou correto (CRC conferido na fonte).

     Agora: tenta a API, cai pro seletor + execCommand se ela nao existir, e
     so diz que copiou se copiou. Falhando, a tela mostra o codigo pra
     selecionar na mao. */
  async function copiar() {
    const codigo = pix.copiaECola ?? ''
    if (!codigo) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(codigo)
        setCopiou(true)
      } else {
        throw new Error('sem clipboard api')
      }
    } catch {
      const el = campoCodigo.current
      let ok = false
      if (el) {
        el.focus()
        el.select()
        el.setSelectionRange(0, codigo.length)
        try {
          ok = document.execCommand('copy')
        } catch {
          ok = false
        }
      }
      setCopiou(ok)
    }
    setTimeout(() => setCopiou(null), 4000)
  }

  return (
    <div
      /* z-[100]: acima do cabeçalho grudado (z-20) e de qualquer drawer.
         Modal que aparece ATRÁS de outra coisa é o mesmo que não aparecer. */
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pagamento por PIX"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onFechar}
        className="absolute inset-0 w-full h-full"
        style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)' }}
      />

      {/* No celular sobe do rodapé e ocupa a largura toda; no `sm:` vira card
          centralizado. É o formato que o polegar alcança. */}
      <div
        className="relative w-full sm:max-w-[380px] rounded-t-3xl sm:rounded-3xl px-5 pt-5 pb-7 sm:pb-6"
        style={{
          background: 'var(--admin-surface-hi)',
          border: '1px solid var(--admin-border)',
          boxShadow: '0 -20px 60px -20px rgba(15,23,42,0.4)',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        {pago ? (
          <div className="py-6 text-center">
            <span
              className="inline-flex items-center justify-center rounded-full mb-3"
              style={{ width: 64, height: 64, background: WA.fundo, color: WA.forte }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 12.5l5.5 5.5L20 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <p className="text-[19px] font-bold" style={{ color: 'var(--admin-text)' }}>
              Pagamento confirmado
            </p>
            <p className="text-[14px] mt-1.5 leading-relaxed" style={{ color: 'var(--admin-text-2)' }}>
              {pix.unidades} mensagens liberadas. A confirmação e o lembrete da véspera já estão
              ligados — sua cliente começa a receber no próximo agendamento.
            </p>
          </div>
        ) : (
        <>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-bold leading-tight" style={{ color: 'var(--admin-text)' }}>
              {pix.reaproveitada ? 'Você já tem esse PIX aberto' : 'Pague para ativar'}
            </p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--admin-text-2)' }}>
              {reais(pix.valor)} · {pix.unidades} mensagens
              {pix.dias > 0 && <> por {pix.dias} dias</>}
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="flex-shrink-0 w-9 h-9 rounded-full inline-flex items-center justify-center"
            style={{ background: 'var(--admin-surface)', color: 'var(--admin-text-2)' }}
          >
            <IconClose size={16} />
          </button>
        </div>

        {pix.qrBase64 ? (
          <div
            className="mt-4 rounded-2xl p-3 flex items-center justify-center"
            style={{ background: '#fff', border: `1px solid ${WA.borda}` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${pix.qrBase64}`}
              alt="QR Code do PIX"
              className="w-full max-w-[240px] h-auto"
            />
          </div>
        ) : (
          <p className="text-[13px] mt-4" style={{ color: 'var(--admin-text-mute)' }}>
            O QR Code não veio agora, mas o código copia e cola abaixo funciona igual.
          </p>
        )}

        {pix.copiaECola && (
          <>
            <button
              type="button"
              onClick={() => void copiar()}
              className="w-full mt-4 py-3.5 rounded-xl text-[15px] font-bold transition-transform hover:-translate-y-0.5"
              style={{ background: WA.gradiente, color: '#fff', boxShadow: WA.sombra }}
            >
              {copiou === true ? 'Código copiado' : 'Copiar código PIX'}
            </button>

            {/* O codigo SEMPRE visivel e selecionavel. Copia automatica falha
                em celular mais do que se admite; selecionar na mao nunca
                falha. `readOnly` e nao `disabled` porque campo desabilitado
                nao deixa selecionar. */}
            <textarea
              ref={campoCodigo}
              readOnly
              value={pix.copiaECola}
              onFocus={(e) => e.currentTarget.select()}
              rows={3}
              className="w-full mt-2 rounded-xl px-3 py-2 text-[11px] leading-snug"
              style={{
                background: 'var(--admin-surface)',
                border: '1px solid var(--admin-border)',
                color: 'var(--admin-text-2)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                wordBreak: 'break-all',
                resize: 'none',
              }}
            />
            <p className="text-[11px] mt-1 text-center" style={{ color: 'var(--admin-text-faded)' }}>
              {copiou === false
                ? 'Não consegui copiar por aqui — toque no código acima, segure e copie.'
                : 'Se o banco recusar o código colado, toque no código acima e copie na mão.'}
            </p>
          </>
        )}

        {pix.link && (
          <a
            href={pix.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full mt-3 py-3 rounded-xl text-[14px] font-semibold text-center"
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text-2)',
            }}
          >
            Abrir a página de pagamento
          </a>
        )}

        <p
          className="text-[12px] leading-relaxed mt-3 text-center"
          style={{ color: 'var(--admin-text-mute)' }}
        >
          Esta tela reconhece o pagamento sozinha, em alguns segundos. Pode fechar: a cobrança
          continua de pé e os avisos ligam do mesmo jeito.
        </p>
        </>
        )}
      </div>
    </div>
  )
}
