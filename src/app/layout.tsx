import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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
  title: 'AgendaPRO — Sua agenda virou o turno da noite do seu negócio',
  description:
    'Agendamento online com fidelidade, lista de espera automática, indicação e reputação Google. Enquanto você vive, o AgendaPRO agenda, lembra, cobra e traz cliente de volta. 14 dias grátis.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AgendaPRO',
  },
  icons: {
    apple: '/icon-192.png',
    icon: '/icon-192.png',
  },
  openGraph: {
    title: 'AgendaPRO — Agenda inteligente pro seu negócio crescer sozinho',
    description: 'Fidelidade, lista de espera automática, indicação e reputação Google. 14 dias grátis, sem cartão.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${mono.variable} h-full antialiased`}
      style={{ fontFamily: 'var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
