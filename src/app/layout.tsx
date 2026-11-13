import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import CartFloatBar from '@/components/restaurant/CartFloatBar';
import PwaInstallPrompt from '@/components/common/PwaInstallPrompt';

const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DonDomi Valledupar | Comida y Domicilios',
  description:
    'Pide la mejor comida de tus restaurantes favoritos en Valledupar rápido, fresco y a la puerta de tu casa con tarifa fija de $7.000 COP.',
  manifest: '/manifest-client.json',
  icons: {
    icon: '/icons/icon-client-192.png',
    apple: '/icons/icon-client-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DonDomi',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#EAB308',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`h-full ${fontSans.variable}`}>
      <body className={`${fontSans.className} h-full antialiased text-slate-800 bg-slate-50 selection:bg-yellow-400 selection:text-slate-950 pb-8 font-sans`}>
        <AppProvider>
          {children}
          <CartFloatBar />
          <PwaInstallPrompt />
        </AppProvider>
      </body>
    </html>
  );
}
