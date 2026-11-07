'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  ShoppingBag,
  Clock,
  X,
  RotateCcw,
  Megaphone,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';

export default function Header() {
  const router = useRouter();
  const {
    cartCount,
    cartSubtotal,
    currentUser,
    globalDeliveryFee,
    globalAnnouncement,
    orders,
    reorderItems,
  } = useApp();

  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [deviceOrderNums, setDeviceOrderNums] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const list = new Set<string>();

        const storedHistory = localStorage.getItem('dondomi_my_order_ids_v1');
        if (storedHistory) {
          const parsed = JSON.parse(storedHistory);
          if (Array.isArray(parsed)) {
            parsed.forEach((id) => {
              if (typeof id === 'string' && id.trim()) list.add(id.trim());
            });
          }
        }

        const storedActive = localStorage.getItem('dondomi_active_orders');
        if (storedActive) {
          const parsed = JSON.parse(storedActive);
          if (Array.isArray(parsed)) {
            parsed.forEach((id) => {
              if (typeof id === 'string' && id.trim()) list.add(id.trim());
            });
          }
        }

        const singleActive = localStorage.getItem('dondomi_active_order');
        if (singleActive && singleActive.trim()) {
          list.add(singleActive.trim());
        }

        setDeviceOrderNums(Array.from(list));
      } catch {
        setDeviceOrderNums([]);
      }
    }
  }, [isMyOrdersOpen, orders]);

  // NOTA DE SEGURIDAD / PRIVACIDAD:
  // Este filtro restringe la vista de "Mis Pedidos" únicamente a los identificadores de pedido
  // creados desde este dispositivo (sin emparejar por teléfono compartido y sin ningún fallback
  // que exponga pedidos globales).
  // LIMITACIÓN CONOCIDA: localStorage es editable en el navegador del cliente y no constituye
  // aislamiento criptográfico. La protección definitiva de datos requiere autenticación de
  // clientes y políticas RLS (Row-Level Security) en Supabase sobre la tabla `orders`.
  const sessionOrders = useMemo(() => {
    if (deviceOrderNums.length === 0) return [];

    return orders.filter((o) =>
      deviceOrderNums.some(
        (num) =>
          o.orderNumber.toLowerCase() === num.toLowerCase() ||
          o.id === num ||
          o.orderNumber.toLowerCase() === `dd-${num}`.toLowerCase()
      )
    );
  }, [orders, deviceOrderNums]);

  const activeSessionOrdersCount = useMemo(() => {
    return sessionOrders.filter(
      (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
    ).length;
  }, [sessionOrders]);

  const badgeCount =
    activeSessionOrdersCount > 0 ? activeSessionOrdersCount : sessionOrders.length;

  const displayedOrders = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return sessionOrders;
    return sessionOrders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerPhone.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        o.restaurantName.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q)
    );
  }, [sessionOrders, searchFilter]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full max-w-full overflow-hidden bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        {/* Banner de Comunicado Global de Plataforma (si está activo) */}
        {globalAnnouncement && (
          <div className="w-full bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 text-white px-3 py-1.5 text-center text-[11px] font-bold flex items-center justify-center gap-1.5">
            <Megaphone className="w-3.5 h-3.5 flex-shrink-0 animate-bounce" />
            <span className="truncate">{globalAnnouncement}</span>
          </div>
        )}

        {/* Main header row: 100% responsive y enfocado exclusivamente en el cliente */}
        <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 min-w-0">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-orange-600 via-red-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition transform flex-shrink-0">
              <span className="text-white font-black text-lg sm:text-xl tracking-tighter">DD</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center">
                <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 leading-none">
                  Don<span className="text-orange-600">Domi</span>
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5 leading-none">
                Valledupar
              </p>
            </div>
          </Link>

          {/* City and flat delivery badge (visible on tablet and desktop) */}
          <div className="hidden md:flex flex-1 max-w-xs items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-full px-3 py-1.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <div className="truncate">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                Valledupar, Cesar
              </span>
              <span className="text-xs font-bold text-slate-800 truncate block">
                Domicilio fijo {formatCOP(globalDeliveryFee || 7000)}
              </span>
            </div>
          </div>

          {/* Right side actions: Únicamente Mis Pedidos y Resumen de Canasta */}
          <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => setIsMyOrdersOpen(true)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex-shrink-0"
              title="Consultar mis pedidos"
            >
              <Clock className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
              <span className="whitespace-nowrap">Mis Pedidos</span>
              {badgeCount > 0 && (
                <span
                  className={`text-white text-[10px] font-black px-1.5 py-0.2 rounded-full leading-tight ${
                    activeSessionOrdersCount > 0 ? 'bg-orange-600 animate-pulse' : 'bg-slate-700'
                  }`}
                >
                  {badgeCount}
                </span>
              )}
            </button>

            {/* Quick Cart / Order summary badge */}
            {cartCount > 0 && (
              <div className="bg-orange-600 text-white rounded-full px-2.5 sm:px-3 py-1.5 flex items-center gap-1 shadow-md shadow-orange-500/30 text-xs font-bold animate-in fade-in flex-shrink-0">
                <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{cartCount}</span>
                <span className="hidden sm:inline">· {formatCOP(cartSubtotal)}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal de Historial y Seguimiento de Pedidos ("Mis Pedidos") */}
      {isMyOrdersOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col animate-in slide-in-from-bottom">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    Mis Pedidos ({displayedOrders.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sigue tus pedidos activos en tiempo real o vuelve a pedir
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMyOrdersOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filtrar por #DD, celular o restaurante..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {displayedOrders.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-sm font-bold text-slate-700">No encontramos pedidos registrados</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Cuando realices un pedido en Valledupar aparecerá aquí inmediatamente con su estado en vivo.
                  </p>
                </div>
              ) : (
                displayedOrders.map((o) => {
                  const isActive = o.status !== 'DELIVERED' && o.status !== 'CANCELLED';

                  return (
                    <div
                      key={o.id}
                      className={`rounded-2xl p-3.5 border shadow-2xs space-y-2.5 text-xs ${
                        isActive
                          ? 'bg-orange-50/30 border-orange-300 ring-1 ring-orange-500/20'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-slate-900 text-sm">
                              #{o.orderNumber}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-bold text-slate-800">{o.restaurantName}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 block">
                            {new Date(o.createdAt).toLocaleString('es-CO', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ${
                            o.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-orange-600 text-white'
                          }`}
                        >
                          {o.status === 'PENDING'
                            ? 'En espera'
                            : o.status === 'PREPARING'
                            ? 'En cocina'
                            : o.status === 'READY_FOR_PICKUP'
                            ? 'Empacado / Listo'
                            : o.status === 'ON_THE_WAY'
                            ? '🛵 En camino'
                            : o.status === 'DELIVERED'
                            ? 'Entregado'
                            : 'Cancelado'}
                        </span>
                      </div>

                      <div className="text-slate-600 space-y-0.5">
                        {o.items.map((it) => (
                          <div key={it.id} className="flex justify-between gap-2">
                            <span className="truncate">
                              <strong>{it.quantity}x</strong> {it.productName}
                            </span>
                            <span className="flex-shrink-0">{formatCOP(it.subtotal)}</span>
                          </div>
                        ))}
                        <div className="pt-1 flex justify-between font-black text-slate-900">
                          <span>Total (incl. domicilio):</span>
                          <span className="text-orange-600">{formatCOP(o.total)}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <Link
                          href={`/order/${o.orderNumber}`}
                          onClick={() => setIsMyOrdersOpen(false)}
                          className="flex-1 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1 transition"
                        >
                          <span>{isActive ? 'Rastrear' : 'Ver detalles'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            reorderItems(o);
                            setIsMyOrdersOpen(false);
                            router.push(`/restaurant/${o.restaurantId || 'rest-1'}`);
                          }}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
                          <span>Volver a pedir</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
