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
          className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl p-3.5 shadow-xl shadow-slate-900/30 flex items-center justify-between border border-slate-700/50 active:scale-[0.99] transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
              {cartCount}
            </div>
            <div className="text-left">
              <span className="text-[11px] text-slate-400 block uppercase font-bold tracking-wider leading-none">
                Ver Canasta · {cartRestaurantName}
              </span>
              <span className="text-sm font-extrabold text-white">
                {formatCOP(cartSubtotal)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-orange-400 group-hover:text-orange-300">
            <span>Ver pedido</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      <CartDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
