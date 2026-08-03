import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: 'swap',
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  // metadataBase (29/07/2026): sem ela o Next emite og:image em caminho
  // relativo, e WhatsApp/Telegram nao resolvem — a previa cai pro favicon.
  // A imagem em si vem de src/app/opengraph-image.tsx (convencao de arquivo).
  metadataBase: new URL('https://agendapro.net.br'),
  title: 'AgendaPRO — Sua agenda virou o turno da noite do seu negócio',
  description:
    'Agendamento online com fidelidade, lista de espera automática, indicação e reputação Google. Enquanto você vive, o AgendaPRO agenda, lembra, cobra e traz cliente de volta. A partir de R$67/mês com garantia de 7 dias.',
  // Next gera o manifest em /manifest.webmanifest (src/app/manifest.ts).
  // Antes apontava pra /manifest.json (404) — iOS caía pra modo bookmark
  // em vez de PWA standalone com splash. Fix descoberto durante onboarding
  // Olímpio (11/05/2026) quando ele tentou Add to Home Screen no Safari.
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AgendaPRO',
    // Splash screens iOS — geradas dinamicamente em /splash via next/og.
    // Cobre as resolucoes principais dos iPhones modernos (95%+ dos
    // dispositivos). iOS escolhe a media query que casa com o device e
    // exibe a imagem em fullscreen durante o load do PWA — substitui a
    // tela branca padrao por uma splash com identidade AgendaPRO.
    startupImage: [
      // iPhone 14/15 Pro Max
      { url: '/splash?w=1290&h=2796', media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)' },
      // iPhone 14 Plus, 13/12 Pro Max
      { url: '/splash?w=1284&h=2778', media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)' },
      // iPhone 14/15 Pro
      { url: '/splash?w=1179&h=2556', media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)' },
      // iPhone 14/13/12 (regular)
      { url: '/splash?w=1170&h=2532', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)' },
      // iPhone X/XS/11 Pro/13 mini
      { url: '/splash?w=1125&h=2436', media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)' },
      // iPhone XR/11
      { url: '/splash?w=828&h=1792', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)' },
      // iPhone 8 Plus
      { url: '/splash?w=1242&h=2208', media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)' },
      // iPhone SE 2/3, 8
      { url: '/splash?w=750&h=1334', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)' },
    ],
  },
  icons: {
    apple: '/icon-192.png',
    icon: [
      { url: '/agendapro-icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'AgendaPRO — Agenda inteligente pro seu negócio crescer sozinho',
    description: 'Fidelidade, lista de espera automática, indicação e reputação Google. A partir de R$67/mês. Garantia de 7 dias.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#3B82F6',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Preconnect ao Supabase economiza ~150-300ms de TLS handshake na
  // primeira query do server component. dns-prefetch pro Asaas é barato e
  // ajuda checkout abrir mais rápido.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${mono.variable} h-full antialiased`}
      style={{
        fontFamily: 'var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        // Background escuro durante load — elimina o flash branco que
        // o iOS/Android mostra entre o tap no icone e a primeira pintura
        // do React. Mesma cor do --admin-bg-deep e do background_color
        // do manifest, pra ter continuidade visual da splash ate o app
        background: '#030510',
      }}
    >
      <head>
        {supabaseUrl && (
          <link rel="preconnect" href={supabaseUrl} crossOrigin="anonymous" />
        )}
        <link rel="dns-prefetch" href="https://api.asaas.com" />
      </head>
      <body className="min-h-full flex flex-col" style={{ background: '#030510' }}>
        <RegisterSW />
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
