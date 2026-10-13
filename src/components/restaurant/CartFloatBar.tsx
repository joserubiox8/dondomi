'use client';

import React, { useState } from 'react';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';
import CartDrawer from './CartDrawer';

export default function CartFloatBar() {
  const { cartCount, cartSubtotal, cartRestaurantName } = useApp();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (cartCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 z-40 max-w-lg mx-auto animate-in slide-in-from-bottom duration-300">
        <button
          onClick={() => setIsDrawerOpen(true)}
          style={{ backgroundColor: '#ea580c' }}
          className="w-full bg-gradient-to-r from-orange-600 via-orange-600 to-red-600 text-white rounded-3xl p-3.5 sm:p-4 shadow-2xl shadow-orange-950/40 flex items-center justify-between border-2 border-white/20 active:scale-[0.98] transition cursor-pointer group ring-4 ring-orange-500/20"
        >
          {/* Lado izquierdo: Contador y Restaurante */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center font-black text-sm shadow-inner flex-shrink-0 border border-white/30">
              <ShoppingBag className="w-4 h-4 mr-1 text-white" />
              <span className="text-white font-black">{cartCount}</span>
            </div>
            <div className="text-left min-w-0">
              <span
                style={{ color: '#ffffff' }}
                className="text-sm sm:text-base font-black text-white block leading-tight tracking-tight drop-shadow-xs"
              >
                Ver Canasta
              </span>
              <p
                style={{ color: '#ffedd5' }}
                className="text-xs font-bold text-orange-100 truncate max-w-[150px] sm:max-w-[220px] mt-0.5 drop-shadow-2xs"
              >
                {cartCount} {cartCount === 1 ? 'plato' : 'platos'} · {cartRestaurantName}
              </p>
            </div>
          </div>

          {/* Lado derecho: Valor total en pastilla blanca pura de ultra contraste */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              style={{ backgroundColor: '#ffffff', color: '#ea580c' }}
              className="bg-white text-orange-600 font-black text-xs sm:text-sm px-3.5 py-2 rounded-2xl shadow-md flex items-center gap-1.5 transition group-hover:scale-102"
            >
              <span className="font-black tracking-tight">{formatCOP(cartSubtotal)}</span>
              <ChevronRight className="w-4 h-4 text-orange-600 stroke-[3]" />
            </div>
          </div>
        </button>
      </div>

      <CartDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
