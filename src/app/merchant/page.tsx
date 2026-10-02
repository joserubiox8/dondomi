'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Store,
  ChefHat,
  Bell,
  Clock,
  CheckCircle2,
  ArrowLeft,
  DollarSign,
  PackageCheck,
  Eye,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';
import { OrderStatus } from '@/types';

export default function MerchantPage() {
  const { restaurants, orders, productsByRestaurant, updateOrderStatus } = useApp();
  const [selectedRestId, setSelectedRestId] = useState<string>('rest-1');

  const restaurant = restaurants.find((r) => r.id === selectedRestId) || restaurants[0] || {
    id: 'rest-1',
    name: 'Restaurante',
  };

  const products = productsByRestaurant[selectedRestId] || [];

  // Filtrar pedidos que pertenecen a este restaurante
  const restaurantOrders = orders.filter((o) => o.restaurantId === selectedRestId || o.restaurantName === restaurant.name);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 px-4 py-3 shadow-md border-b border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight">Portal Restaurante</span>
                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1.5 py-0.2 rounded-sm border border-amber-500/30">
                  Panel Aliado
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{restaurant.name} · Valledupar</p>
            </div>
          </div>

          {/* Selector de Restaurante para simulación */}
          <div className="flex items-center gap-2">
            <select
              value={selectedRestId}
              onChange={(e) => setSelectedRestId(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-700 focus:outline-none"
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-5">
        {/* Info card modelo de negocio fase 1 */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-900 shadow-2xs">
          <div>
            <span className="text-xs font-black uppercase text-emerald-700 block">
              Fase 1: Autogestión de Domicilios
            </span>
            <p className="text-xs text-emerald-800 mt-0.5">
              Tu restaurante recibe los pedidos digitales en esta pantalla y los despacha con tu propio domiciliario.
            </p>
          </div>
          <Link
            href={`/restaurant/${restaurant.id}`}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto shadow-xs whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ver mi menú público</span>
          </Link>
        </div>

        {/* Resumen de hoy */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Nuevos</span>
            <span className="text-xl font-black text-amber-600 mt-1 block">1</span>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">En Cocina</span>
            <span className="text-xl font-black text-blue-600 mt-1 block">1</span>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Despachados</span>
            <span className="text-xl font-black text-emerald-600 mt-1 block">1</span>
          </div>
        </div>

        {/* Tablero de Pedidos de Cocina */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-orange-600" />
              <h3 className="font-extrabold text-base text-slate-900">
                Cola de Pedidos en Vivo
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">Sonido de alerta activo 🔔</span>
          </div>

          <div className="space-y-3">
            {restaurantOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-base">{order.orderNumber}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-bold text-slate-600">
                      Cliente: {order.customerName} ({order.customerPhone})
                    </span>
                  </div>

                  <span className="text-sm font-black text-slate-900">
                    Total: {formatCOP(order.total)}
                  </span>
                </div>

                {/* Items para la cocina */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                  <span className="font-bold text-slate-700 block">Platos a preparar:</span>
                  {order.items.map((it) => (
                    <div key={it.id} className="flex justify-between font-medium text-slate-800">
                      <span>
                        • <strong className="text-orange-600">{it.quantity}x</strong> {it.productName}
                      </span>
                      <span>{formatCOP(it.subtotal)}</span>
                    </div>
                  ))}
                  {order.customerNotes && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 mt-1">
                      ⚠️ Nota del cliente: &quot;{order.customerNotes}&quot;
                    </p>
                  )}
                </div>

                {/* Ubicación de entrega */}
                <div className="text-xs text-slate-600 flex items-center justify-between">
                  <span>
                    📍 Entregar en:{' '}
                    <strong>
                      {order.deliveryAddress.street}, {order.deliveryAddress.neighborhood}
                    </strong>
                  </span>
                  <span className="text-slate-500 font-semibold">
                    Pago: <strong className="text-slate-800">{order.paymentMethod}</strong>
                  </span>
                </div>

                {/* Botones de cambio de estado para la cocina */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  {order.status === 'PENDING' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                      className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition"
                    >
                      Aceptar Pedido e Iniciar Cocina
                    </button>
                  )}

                  {order.status === 'PREPARING' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ON_THE_WAY')}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>Pedido Empacado · Despachar con mi domiciliario</span>
                    </button>
                  )}

                  {order.status === 'ON_THE_WAY' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Marcar como Entregado con Éxito</span>
                    </button>
                  )}

                  {order.status === 'DELIVERED' && (
                    <div className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-2 rounded-xl">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Completado y liquidado</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sección de disponibilidad de productos en el menú */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="font-extrabold text-sm text-slate-900">
                Disponibilidad de Platos ({products.length})
              </h4>
              <p className="text-[11px] text-slate-400">
                Marca platos como agotados si se te acaban los ingredientes en el turno.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {products.map((prod) => (
              <div key={prod.id} className="py-2.5 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-800 block">{prod.name}</span>
                  <span className="text-slate-400">{formatCOP(prod.price)}</span>
                </div>
                <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                  Disponible
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
