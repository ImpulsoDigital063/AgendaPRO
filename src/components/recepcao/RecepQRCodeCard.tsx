import { IconShare } from '@/components/ui/Icon'

/**
 * Card compacto com QR code do booking público do salão.
 * Imagem servida pela api.qrserver.com — sem dependência nova.
 */
export default function RecepQRCodeCard({ slug }: { slug: string }) {
  const url = `https://www.agendapro.net.br/${slug}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=200x200&margin=4`

  return (
    <div className="admin-card p-4">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3 inline-flex items-center gap-1.5" style={{ color: 'var(--admin-text-faded)' }}>
        <IconShare size={12} /> QR Code do salão
      </p>
      <div className="flex items-center gap-3">
        <img
          src={qrUrl}
          alt="QR Code de agendamento"
          width={88}
          height={88}
          className="rounded-lg flex-shrink-0"
          style={{ background: '#fff', padding: 4 }}
        />
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
