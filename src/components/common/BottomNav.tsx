'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, ShoppingBag, LayoutGrid, Store, Bike, Shield } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { cartCount } = useApp();

  const isHome = pathname === '/';
  const isAdmin = pathname.startsWith('/admin');
  const isDriver = pathname.startsWith('/driver');
  const isMerchant = pathname.startsWith('/merchant');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] sm:hidden">
      <div className="grid grid-cols-4 h-16 max-w-md mx-auto items-center px-2">
        {/* 1. Inicio */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-1 transition ${
            isHome ? 'text-orange-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Home className={`w-5 h-5 ${isHome ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[11px] mt-1">Inicio</span>
        </Link>

        {/* 2. Restaurante Portal */}
        <Link
          href="/merchant"
          className={`flex flex-col items-center justify-center py-1 transition ${
            isMerchant ? 'text-orange-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Store className={`w-5 h-5 ${isMerchant ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[11px] mt-1">Restaurante</span>
        </Link>

        {/* 3. Domiciliarios */}
        <Link
          href="/driver"
          className={`flex flex-col items-center justify-center py-1 transition ${
            isDriver ? 'text-orange-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Bike className={`w-5 h-5 ${isDriver ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[11px] mt-1">Domiciliario</span>
        </Link>

        {/* 4. Panel Admin */}
        <Link
          href="/admin"
          className={`flex flex-col items-center justify-center py-1 transition ${
            isAdmin ? 'text-orange-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Shield className={`w-5 h-5 ${isAdmin ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[11px] mt-1">Admin</span>
        </Link>
      </div>
    </nav>
  );
}
