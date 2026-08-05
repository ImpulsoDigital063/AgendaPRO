'use client'

/* ═══════════════════════════════════════════════════════════════
   SINAL VIA PIX — o passo que trava o horário

   Wanessa Silva (05/08/2026), que descreveu o fluxo e já usa igual na
   academia dela: "quando o cliente realiza o agendamento, antes de
   confirmar deveria aparecer o QR code do Pix da empresa, aí o cliente
   após o pagamento tem seu agendamento confirmado".

   O motivo, dito por ela: "os dois maiores gargalos são as faltas".

   DECISÕES DESTA TELA, todas pensadas pra cliente final no celular:

   · O copia-e-cola vem PRIMEIRO e o QR depois. No celular — que é onde
     quase todo agendamento acontece — a pessoa não consegue escanear o
     próprio QR: ela copia e abre o banco. O QR serve pra quem marcou
     pelo computador.

   · O horário aparece como RESERVADO, não confirmado. É a verdade: ele
     está segurado esperando o pagamento. Dizer "confirmado" aqui e
     depois o salão não achar o PIX vira briga.

   · Tem botão de mandar o comprovante no WhatsApp do salão. A confirmação
     é manual (o dono olha o banco), então o caminho mais rápido pra
     destravar é a própria cliente avisar.

   · Não existe "já paguei" que confirme sozinho. Botão que a cliente
     aperta pra dizer que pagou é convite pra horário reservado sem
     dinheiro — e o problema que estamos resolvendo é justamente esse.
   ═══════════════════════════════════════════════════════════════ */

import { useState } from 'react'
import QRCode from 'react-qr-code'

export default function SinalPix({
  valor,
  copiaECola,
  nomeNegocio,
  telefoneNegocio,
  resumo,
  cor,
}: {
  valor: number
  copiaECola: string
  nomeNegocio: string
  telefoneNegocio?: string | null
  /** Ex: "Limpeza de pele · 12/08 às 14:00" — pra mensagem do comprovante. */
  resumo: string
  cor: string
}) {
  const [copiado, setCopiado] = useState(false)
  const [verQR, setVerQR] = useState(false)

  const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  async function copiar() {
    try {
      await navigator.clipboard.writeText(copiaECola)
    } catch {
      // Safari antigo em contexto sem permissão: seleciona pra cópia manual.
      const el = document.createElement('textarea')
      el.value = copiaECola
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  const zap = telefoneNegocio?.replace(/\D/g, '')
  const linkComprovante = zap
    ? `https://wa.me/${zap.startsWith('55') ? zap : '55' + zap}?text=${encodeURIComponent(
        `Oi! Acabei de pagar o sinal de ${brl(valor)} do meu horário (${resumo}). Segue o comprovante:`,
      )}`
    : null

  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${cor}44` }}>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: cor }}>
        Falta pagar o sinal
      </p>
      <p className="text-sm mb-1 opacity-80">
        Seu horário está <strong>reservado</strong>. Ele é confirmado assim que {nomeNegocio} receber o PIX.
      </p>
      <p className="text-3xl font-black tabular-nums my-3">{brl(valor)}</p>

      <button
        onClick={copiar}
        className="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
        style={{ background: copiado ? '#10B981' : cor, color: '#fff' }}
      >
        {copiado ? 'Código copiado ✓' : 'Copiar código PIX'}
      </button>
      <p className="text-[11px] mt-2 opacity-60">
        Copie, abra o app do seu banco e escolha <b>PIX copia e cola</b>.
      </p>

      <button
        onClick={() => setVerQR((v) => !v)}
        className="mt-3 text-xs underline opacity-70"
      >
        {verQR ? 'Esconder QR Code' : 'Prefiro escanear o QR Code'}
      </button>

      {verQR && (
        <div className="mt-3 flex justify-center rounded-xl p-4" style={{ background: '#fff' }}>
          <QRCode value={copiaECola} size={180} />
        </div>
      )}

      {linkComprovante && (
        <a
          href={linkComprovante}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block w-full py-3 rounded-xl font-semibold text-sm text-center"
          style={{ background: 'rgba(34,197,94,0.14)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}
        >
          Já paguei — mandar comprovante
        </a>
      )}
    </div>
  )
}
