import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'DonDomi Admin - Torre de Control | Valledupar',
  description:
    'Torre de control central de pedidos, restaurantes afiliados, flota de domiciliarios y liquidaciones financieras de DonDomi.',
  manifest: '/manifest-admin.json',
  icons: {
    icon: '/icons/icon-admin-192.png',
    apple: '/icons/icon-admin-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DonDomi Admin',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#4F46E5',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
