'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bike, ChefHat, Clock, CheckCircle2, ChevronRight, X, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Order, OrderStatus } from '@/types';

export default function ActiveOrderBanner() {
  const { orders } = useApp();
  const [activeOrderNumber, setActiveOrderNumber] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dondomi_active_order');
      if (stored) {
        setActiveOrderNumber(stored);
      }
    }
  }, []);

  if (!activeOrderNumber || isDismissed) return null;

  // Buscar pedido
  const order = orders.find(
    (o) =>
      o.orderNumber.toLowerCase() === activeOrderNumber.toLowerCase() ||
      o.id === activeOrderNumber ||
      o.orderNumber.toLowerCase() === `dd-${activeOrderNumber}`.toLowerCase()
  );

  if (!order) return null;

  // Expiración por antigüedad: si fue creado hace más de 12 horas, limpiar memoria
  const orderAgeMs = Date.now() - new Date(order.createdAt).getTime();
  if (orderAgeMs > 12 * 3600 * 1000) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dondomi_active_order');
    }
    return null;
  }

  const isDelivered = order.status === 'DELIVERED';
  const isCancelled = order.status === 'CANCELLED';
  const isPending = order.status === 'PENDING';
  const isPreparing = order.status === 'PREPARING' || order.status === 'CONFIRMED';
  const isOnTheWay = order.status === 'ON_THE_WAY' || order.status === 'READY_FOR_PICKUP';

  // Si fue entregado hace más de 2 horas, auto-limpiar
  if (isDelivered && orderAgeMs > 2 * 3600 * 1000) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dondomi_active_order');
    }
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dondomi_active_order');
    }
  };

  // BANNER DE PEDIDO CANCELADO / NO CONFIRMADO A TIEMPO
  if (isCancelled) {
    return (
      <div className="animate-in slide-in-from-top-2 duration-300">
        <div className="rounded-3xl p-4 bg-slate-900 border border-red-500/40 text-white shadow-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 border border-red-500/30">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-red-950/80 text-red-300 px-2 py-0.5 rounded-full border border-red-800/40">
                  Pedido #{order.orderNumber}
                </span>
                <span className="text-xs text-slate-400 truncate">• {order.restaurantName}</span>
              </div>
              <h3 className="font-extrabold text-sm text-red-200 mt-0.5">
                Pedido cancelado automáticamente
              </h3>
              <p className="text-[11px] text-slate-400 leading-tight">
                El restaurante no confirmó a tiempo. No se realizó ningún cobro.
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition shadow-xs whitespace-nowrap"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return 'Recibido por el restaurante';
      case 'PREPARING':
      case 'CONFIRMED':
        return 'En preparación en cocina';
      case 'ON_THE_WAY':
      case 'READY_FOR_PICKUP':
        return '¡En camino a tu dirección!';
      case 'DELIVERED':
        return 'Entregado con éxito';
      default:
        return 'En proceso';
    }
  };

  return (
    <div className="animate-in slide-in-from-top-2 duration-300">
      <Link
        href={`/order/${order.orderNumber}`}
        className={`block rounded-3xl p-4 text-white shadow-lg transition transform hover:-translate-y-0.5 active:scale-[0.99] border ${
          isOnTheWay
            ? 'bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 border-orange-400 shadow-orange-500/25 ring-2 ring-orange-500/20'
            : isDelivered
            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 border-emerald-400 shadow-emerald-600/20'
            : 'bg-slate-900 border-slate-700 shadow-slate-900/30'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md ${
                isOnTheWay
                  ? 'bg-white text-orange-600'
                  : isDelivered
                  ? 'bg-white text-emerald-600'
                  : 'bg-orange-600 text-white'
              }`}
            >
              {isOnTheWay ? (
                <Bike className="w-6 h-6 animate-bounce" />
              ) : isPreparing ? (
                <ChefHat className="w-6 h-6 animate-pulse" />
              ) : isDelivered ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Clock className="w-6 h-6 animate-pulse" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-black/25 backdrop-blur-xs px-2 py-0.5 rounded-full">
                  Pedido #{order.orderNumber}
                </span>
                <span className="text-xs text-orange-200 truncate">
                  • {order.restaurantName}
                </span>
              </div>
              <h3 className="font-black text-sm sm:text-base text-white tracking-tight mt-0.5 truncate">
                {getStatusText(order.status)}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-xl shadow-xs hidden sm:inline-flex items-center gap-1">
              <span>Rastrear</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>

            <button
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white/80 hover:text-white transition"
              title="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}
