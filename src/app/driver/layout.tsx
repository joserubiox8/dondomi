import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'DonDomi Flota - Domiciliarios | Radar & Billetera',
  description:
    'Aplicación de radar de carreras, rutas de recogida/entrega y billetera de turno para domiciliarios de DonDomi en Valledupar.',
  manifest: '/manifest-driver.json',
  icons: {
    icon: '/icons/icon-driver-192.png',
    apple: '/icons/icon-driver-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DonDomi Flota',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#16A34A',
};

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
