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
          className="w-full bg-slate-950 hover:bg-black text-white rounded-3xl p-3.5 sm:p-4 shadow-2xl shadow-black/60 flex items-center justify-between border-2 border-orange-500 active:scale-[0.98] transition cursor-pointer group"
        >
          {/* Lado izquierdo: Contador y Restaurante */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black text-sm shadow-md flex-shrink-0">
              <ShoppingBag className="w-4 h-4 mr-0.5" />
              <span>{cartCount}</span>
            </div>
            <div className="text-left min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 block leading-tight">
                Ver Canasta
              </span>
              <p className="text-xs sm:text-sm font-bold text-white truncate max-w-[150px] sm:max-w-[210px]">
                {cartRestaurantName}
              </p>
            </div>
          </div>

          {/* Lado derecho: Valor total con alto contraste */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="bg-white text-slate-950 font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-2xl shadow-md flex items-center gap-1.5 group-hover:bg-orange-50 transition">
              <span>{formatCOP(cartSubtotal)}</span>
              <ChevronRight className="w-4 h-4 text-orange-600 stroke-[3]" />
            </div>
          </div>
        </button>
      </div>

      <CartDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
