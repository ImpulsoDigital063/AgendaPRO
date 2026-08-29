import QRCode from 'react-qr-code'
import { IconShare } from '@/components/ui/Icon'

/**
 * Card compacto com QR code do booking público do salão.
 *
 * 28/08 · o QR vinha da api.qrserver.com e NUNCA aparecia: a CSP do projeto
 * libera imagem só de 'self', data:, blob: e Supabase, então o navegador
 * bloqueava a imagem externa e sobrava o texto alternativo na tela. Agora é
 * gerado localmente com react-qr-code, que já estava no projeto — sem
 * dependência de terceiro, sem CSP, e funciona mesmo com a internet do salão
 * oscilando.
 */
export default function RecepQRCodeCard({ slug }: { slug: string }) {
  const url = `https://www.agendapro.net.br/${slug}`

  return (
    <div className="admin-card p-4">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3 inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text-faded)' }}>
        <IconShare size={12} /> QR Code do salão
      </p>
      <div className="flex items-center gap-3">
        <div
          className="rounded-lg flex-shrink-0"
          style={{ background: '#fff', padding: 6, lineHeight: 0 }}
        >
          <QRCode value={url} size={88} level="M" />
        </div>
        <div className="min-w-0">
          <p className="text-xs leading-tight" style={{ color: 'var(--admin-text-2)' }}>
            Cliente escaneia e cai direto na página de agendamento do salão.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold inline-flex items-center gap-1 mt-2"
            style={{ color: 'var(--admin-accent)' }}
          >
            Abrir link público
          </a>
        </div>
      </div>
    </div>
  )
}
