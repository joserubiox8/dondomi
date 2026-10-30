import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'DonDomi Aliados - Restaurantes | Panel KDS & Carta',
  description:
    'Panel operativo de comandas en tiempo real (KDS), gestión de carta y cierre de caja para restaurantes aliados de DonDomi en Valledupar.',
  manifest: '/manifest-merchant.json',
  icons: {
    icon: '/icons/icon-merchant-192.png',
    apple: '/icons/icon-merchant-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DonDomi Aliados',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0F172A',
};

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
