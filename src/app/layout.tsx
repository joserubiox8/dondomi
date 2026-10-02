import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import LocationModal from '@/components/common/LocationModal';
import CartFloatBar from '@/components/restaurant/CartFloatBar';
import BottomNav from '@/components/common/BottomNav';

const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DonDomi | Comida y Domicilios en Valledupar',
  description:
    'Pide la mejor comida de tus restaurantes favoritos en Valledupar rápido, fresco y a la puerta de tu casa.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ff4726',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`h-full ${fontSans.variable}`}>
      <body className={`${fontSans.className} h-full antialiased text-slate-800 bg-slate-50 selection:bg-orange-500 selection:text-white pb-20 sm:pb-8 font-sans`}>
        <AppProvider>
          {children}
          <LocationModal />
          <CartFloatBar />
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  );
}
