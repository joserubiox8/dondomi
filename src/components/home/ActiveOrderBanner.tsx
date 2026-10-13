'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bike, ChefHat, Clock, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Order, OrderStatus } from '@/types';

export default function ActiveOrderBanner() {
  const { orders } = useApp();
  const [activeOrderNumbers, setActiveOrderNumbers] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let list: string[] = [];
      try {
        const stored = localStorage.getItem('dondomi_active_orders');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) list = parsed;
        }
      } catch {}

      const single = localStorage.getItem('dondomi_active_order');
      if (single && !list.includes(single)) {
        list.push(single);
      }

      setActiveOrderNumbers(list);
    }
  }, []);

  if (activeOrderNumbers.length === 0) return null;

  // Filtrar pedidos encontrados en el estado global
  const activeOrders = orders.filter((o) =>
    activeOrderNumbers.some(
      (num) =>
        o.orderNumber.toLowerCase() === num.toLowerCase() ||
        o.id === num ||
        o.orderNumber.toLowerCase() === `dd-${num}`.toLowerCase()
    )
  );

  // Filtrar por vigencia (pedidos activos no expiran; pedidos entregados se retiran tras 3 horas)
  const validOrders = activeOrders.filter((order) => {
    const orderAgeMs = Date.now() - new Date(order.createdAt).getTime();
    if (order.status === 'DELIVERED' && orderAgeMs > 3 * 3600 * 1000) return false;
    if (order.status === 'CANCELLED' && orderAgeMs > 6 * 3600 * 1000) return false;
    return true;
  });

  if (validOrders.length === 0) return null;

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
      case 'CANCELLED':
        return 'Pedido cancelado';
      default:
        return 'En proceso';
    }
  };

  const handleAcknowledgeCancelled = (orderNumber: string) => {
    const updated = activeOrderNumbers.filter((n) => n.toLowerCase() !== orderNumber.toLowerCase());
    setActiveOrderNumbers(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dondomi_active_orders', JSON.stringify(updated));
    }
  };

  return (
    <div className="space-y-2.5 animate-in slide-in-from-top-2 duration-300">
      {validOrders.length > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Tus pedidos en curso ({validOrders.length})
          </span>
          <span className="text-[10px] text-orange-600 font-bold">En vivo</span>
        </div>
      )}

      {validOrders.map((order) => {
        const isCancelled = order.status === 'CANCELLED';
        const isDelivered = order.status === 'DELIVERED';
        const isPreparing = order.status === 'PREPARING' || order.status === 'CONFIRMED';
        const isOnTheWay = order.status === 'ON_THE_WAY' || order.status === 'READY_FOR_PICKUP';

        if (isCancelled) {
          return (
            <div
              key={order.id}
              className="rounded-3xl p-4 bg-slate-900 border border-red-500/40 text-white shadow-lg flex items-center justify-between gap-3"
            >
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
                    Pedido cancelado
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {order.cancellationReason || 'No fue posible completar la orden.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAcknowledgeCancelled(order.orderNumber)}
                className="flex-shrink-0 bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition shadow-xs whitespace-nowrap cursor-pointer"
              >
                Entendido
              </button>
            </div>
          );
        }

        return (
          <Link
            key={order.id}
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
                    <span className="text-xs text-orange-200 truncate font-semibold">
                      • {order.restaurantName}
                    </span>
                  </div>
                  <h3 className="font-black text-sm sm:text-base text-white tracking-tight mt-0.5 truncate">
                    {getStatusText(order.status)}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs font-black bg-white text-slate-900 px-3.5 py-1.5 rounded-xl shadow-xs inline-flex items-center gap-1">
                  <span>Rastrear</span>
                  <ChevronRight className="w-3.5 h-3.5 text-orange-600 stroke-[3]" />
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
