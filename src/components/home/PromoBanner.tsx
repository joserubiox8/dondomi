'use client';

import React from 'react';
import { Sparkles, Clock, MapPin, Bike } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function PromoBanner() {
  const { currentNeighborhood } = useApp();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 p-5 text-white shadow-lg shadow-orange-500/15">
      {/* Decorative background shapes */}
      <div className="absolute -right-6 -bottom-10 w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
      <div className="absolute right-12 top-2 text-7xl opacity-20 pointer-events-none select-none">
        🍗
      </div>

      <div className="relative z-10 space-y-2 max-w-[280px]">
        <div className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>¡Lo mejor de Valledupar!</span>
        </div>

        <h3 className="text-xl font-extrabold leading-tight">
          Pide tus platos favoritos sin filas ni demoras
        </h3>

        <p className="text-xs text-orange-100 font-medium">
          Cobertura directa en <span className="underline font-bold text-white">{currentNeighborhood}</span> y toda la ciudad.
        </p>

        <div className="pt-1 flex items-center gap-3 text-[11px] text-amber-200 font-medium">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> 20-45 min
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Bike className="w-3 h-3" /> Domicilio seguro
          </span>
        </div>
      </div>
    </div>
  );
}
