'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, ShoppingBag, Megaphone } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';

export default function Header() {
  const {
    cartCount,
    cartSubtotal,
    globalDeliveryFee,
    globalAnnouncement,
  } = useApp();

  return (
    <header className="sticky top-0 z-40 w-full max-w-full overflow-hidden bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
      {/* Banner de Comunicado Global de Plataforma (si está activo) */}
      {globalAnnouncement && (
        <div className="w-full bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 text-white px-3 py-1.5 text-center text-[11px] font-bold flex items-center justify-center gap-1.5">
          <Megaphone className="w-3.5 h-3.5 flex-shrink-0 animate-bounce" />
          <span className="truncate">{globalAnnouncement}</span>
        </div>
      )}

      {/* Main header row: Máximo protagonismo al Logo y enlace inteligente a /login */}
      <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 py-3 flex items-center justify-between gap-3 min-w-0">
        {/* Brand Logo con mayor escala visual y acceso inteligente oculto a /login */}
        <Link
          href="/login"
          className="flex items-center gap-2.5 sm:gap-3 group flex-shrink-0 min-w-0 cursor-pointer"
          title="DonDomi Valledupar - Acceso de Operaciones"
        >
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-orange-600 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 transition transform flex-shrink-0">
            <span className="text-white font-black text-xl sm:text-2xl tracking-tighter drop-shadow-xs">
              DD
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none">
                Don<span className="text-orange-600">Domi</span>
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400 mt-1 leading-none">
              Valledupar
            </p>
          </div>
        </Link>

        {/* City and flat delivery badge */}
        <div className="hidden sm:flex flex-1 max-w-xs items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-full px-3.5 py-1.5 min-w-0 mx-2">
          <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <div className="truncate">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
              Valledupar, Cesar
            </span>
            <span className="text-xs font-bold text-slate-800 truncate block">
              Domicilio plano {formatCOP(globalDeliveryFee || 7000)}
            </span>
          </div>
        </div>

        {/* Right side actions: Resumen de canasta activa (si tiene productos) */}
        <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
          {cartCount > 0 && (
            <div className="bg-orange-600 text-white rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-md shadow-orange-500/30 text-xs font-bold animate-in fade-in flex-shrink-0">
              <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{cartCount}</span>
              <span className="hidden sm:inline">· {formatCOP(cartSubtotal)}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
