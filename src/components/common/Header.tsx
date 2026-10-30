'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  ShoppingBag,
  LogIn,
  LogOut,
  Shield,
  Store,
  Bike,
  Clock,
  X,
  RotateCcw,
  Megaphone,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';

export default function Header() {
  const router = useRouter();
  const {
    cartCount,
    cartSubtotal,
    currentUser,
    logout,
    globalDeliveryFee,
    globalAnnouncement,
    orders,
    reorderItems,
  } = useApp();

  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [deviceOrderNums, setDeviceOrderNums] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const profile = localStorage.getItem('dondomi_customer_profile_v1');
        if (profile) {
          const parsed = JSON.parse(profile);
          if (parsed.customerPhone) {
            setLookupPhone(String(parsed.customerPhone).replace(/\D/g, '').slice(0, 10));
          }
        }
        const storedActive = localStorage.getItem('dondomi_active_orders');
        if (storedActive) {
          const parsed = JSON.parse(storedActive);
          if (Array.isArray(parsed)) setDeviceOrderNums(parsed);
        }
      } catch {}
    }
  }, [isMyOrdersOpen, orders.length]);

  const customerOrders = useMemo(() => {
    const cleanLookup = lookupPhone.replace(/\D/g, '');
    return orders.filter((o) => {
      if (deviceOrderNums.includes(o.orderNumber)) return true;
      if (cleanLookup.length === 10 && o.customerPhone.replace(/\D/g, '') === cleanLookup) {
        return true;
      }
      return false;
    });
  }, [orders, deviceOrderNums, lookupPhone]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        {/* Banner de Comunicado Global de Plataforma (si está activo) */}
        {globalAnnouncement && (
          <div className="bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 text-white px-4 py-1.5 text-center text-[11px] font-bold flex items-center justify-center gap-1.5">
            <Megaphone className="w-3.5 h-3.5 flex-shrink-0 animate-bounce" />
            <span>{globalAnnouncement}</span>
          </div>
        )}

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

          {/* City and flat delivery badge (visible on tablet and desktop) */}
          <div className="hidden sm:flex flex-1 max-w-xs items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-full px-3 py-1.5 min-w-0">
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

          {/* Right side actions: Mis Pedidos, Cart & Ingresar/Session */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsMyOrdersOpen(true)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer"
              title="Consultar mi historial de pedidos"
            >
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              <span>Mis Pedidos</span>
              {customerOrders.length > 0 && (
                <span className="bg-orange-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {customerOrders.length}
                </span>
              )}
            </button>

            {/* Quick Cart / Order summary button */}
            {cartCount > 0 && (
              <div className="bg-orange-600 text-white rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-md shadow-orange-500/30 text-xs font-bold animate-in fade-in">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{cartCount}</span>
                <span className="hidden md:inline">· {formatCOP(cartSubtotal)}</span>
              </div>
            )}

            {/* Botón Ingresar / Sesión de Usuario */}
            {!currentUser ? (
              <Link
                href="/login"
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-full text-xs font-extrabold shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5 active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5 text-orange-400" />
                <span>Ingresar</span>
              </Link>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-full pl-2.5 pr-1 py-1">
                <Link
                  href={
                    currentUser.role === 'ADMINISTRADOR'
                      ? '/admin'
                      : currentUser.role === 'RESTAURANTE'
                      ? '/merchant'
                      : currentUser.role === 'DOMICILIARIO'
                      ? '/driver'
                      : '/'
                  }
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-orange-600 transition truncate max-w-[120px] sm:max-w-[160px]"
                  title="Ir a mi panel de control"
                >
                  {currentUser.role === 'ADMINISTRADOR' && (
                    <Shield className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                  )}
                  {currentUser.role === 'RESTAURANTE' && (
                    <Store className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                  )}
                  {currentUser.role === 'DOMICILIARIO' && (
                    <Bike className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  )}
                  <span className="truncate">{currentUser.name.split(' ')[0]}</span>
                </Link>
                <button
                  onClick={logout}
                  title="Cerrar sesión"
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal de Historial de Pedidos del Cliente ("Mis Pedidos") */}
      {isMyOrdersOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col animate-in slide-in-from-bottom">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Mis Pedidos en DonDomi</h3>
                  <p className="text-[11px] text-slate-500">Consulta el estado o repite tu comida favorita</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMyOrdersOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                Buscar pedidos por tu celular (10 dígitos):
              </label>
              <input
                type="tel"
                maxLength={10}
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Ej: 3001234567"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {customerOrders.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-sm font-bold text-slate-700">No encontramos pedidos asociados</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Ingresa el número celular de 10 dígitos con el que hiciste tu pedido en Valledupar.
                  </p>
                </div>
              ) : (
                customerOrders.map((o) => (
                  <div
                    key={o.id}
                    className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-900 text-sm">#{o.orderNumber}</span>
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
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          o.status === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : o.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {o.status === 'PENDING'
                          ? 'En espera'
                          : o.status === 'PREPARING'
                          ? 'En cocina'
                          : o.status === 'READY_FOR_PICKUP'
                          ? 'Listo'
                          : o.status === 'ON_THE_WAY'
                          ? 'En camino'
                          : o.status === 'DELIVERED'
                          ? 'Entregado'
                          : 'Cancelado'}
                      </span>
                    </div>

                    <div className="text-slate-600 space-y-0.5">
                      {o.items.map((it) => (
                        <div key={it.id} className="flex justify-between">
                          <span>
                            <strong>{it.quantity}x</strong> {it.productName}
                          </span>
                          <span>{formatCOP(it.subtotal)}</span>
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
                        <span>Ver seguimiento</span>
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
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
