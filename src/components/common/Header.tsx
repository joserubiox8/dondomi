'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, ChevronDown, ShoppingBag, Shield, Bike, Store } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';

export default function Header() {
  const {
    currentNeighborhood,
    setIsLocationModalOpen,
    cartCount,
    cartSubtotal,
    activeRole,
    setActiveRole,
  } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">

      {/* Main header row */}
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 via-red-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition transform">
            <span className="text-white font-black text-xl tracking-tighter">DD</span>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-xl font-black tracking-tight text-slate-900">
                Don<span className="text-orange-600">Domi</span>
              </span>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 -mt-1">
              Valledupar
            </p>
          </div>
        </Link>

        {/* City and flat delivery badge */}
        <div className="flex-1 max-w-xs flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-full px-3 py-1.5 min-w-0">
          <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <div className="truncate">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
              Valledupar, Cesar
            </span>
            <span className="text-xs font-bold text-slate-800 truncate block">
              Domicilio fijo $7.000 COP
            </span>
          </div>
        </div>

        {/* Quick Cart / Order summary button */}
        {cartCount > 0 && (
          <div className="flex-shrink-0">
            <div className="bg-orange-600 text-white rounded-full px-3 py-1.5 flex items-center gap-2 shadow-md shadow-orange-500/30 text-xs font-bold animate-in fade-in">
              <ShoppingBag className="w-4 h-4" />
              <span>{cartCount}</span>
              <span className="hidden sm:inline">· {formatCOP(cartSubtotal)}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
