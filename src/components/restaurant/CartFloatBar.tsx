'use client';

import React, { useState } from 'react';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';
import CartDrawer from './CartDrawer';

export default function CartFloatBar() {
  const { cartCount, cartSubtotal, cartRestaurantName } = useApp();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (cartCount === 0 && !isDrawerOpen) return null;

  return (
    <>
      {cartCount > 0 && (
        <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 z-40 max-w-lg mx-auto animate-in slide-in-from-bottom duration-300">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="w-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-slate-950 rounded-3xl p-3.5 sm:p-4 shadow-2xl shadow-yellow-950/30 flex items-center justify-between border-2 border-yellow-200/60 active:scale-[0.98] transition cursor-pointer group ring-4 ring-yellow-400/30"
          >
            {/* Lado izquierdo: Contador y Restaurante */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-slate-950 text-yellow-400 flex items-center justify-center font-black text-sm shadow-md flex-shrink-0 border border-slate-900">
                <ShoppingBag className="w-4 h-4 mr-1 text-yellow-400" />
                <span className="text-yellow-400 font-black">{cartCount}</span>
              </div>
              <div className="text-left min-w-0">
                <span className="text-sm sm:text-base font-black text-slate-950 block leading-tight tracking-tight">
                  Ver Canasta
                </span>
                <p className="text-xs font-bold text-slate-800 truncate max-w-[150px] sm:max-w-[220px] mt-0.5">
                  {cartCount} {cartCount === 1 ? 'plato' : 'platos'} · {cartRestaurantName}
                </p>
              </div>
            </div>

            {/* Lado derecho: Valor total en pastilla oscura contrastante */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="bg-slate-950 text-yellow-400 font-black text-xs sm:text-sm px-3.5 py-2 rounded-2xl shadow-md flex items-center gap-1.5 transition group-hover:scale-102 border border-slate-900">
                <span className="font-black tracking-tight text-yellow-400">{formatCOP(cartSubtotal)}</span>
                <ChevronRight className="w-4 h-4 text-yellow-400 stroke-[3]" />
              </div>
            </div>
          </button>
        </div>
      )}

      <CartDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
