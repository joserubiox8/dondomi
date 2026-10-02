'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ChefHat,
  Bike,
  Package,
  MapPin,
  Phone,
  MessageCircle,
  AlertCircle,
  Home,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';
import { OrderStatus } from '@/types';

interface OrderTrackingViewProps {
  orderParam: string;
}

export default function OrderTrackingView({ orderParam }: OrderTrackingViewProps) {
  const { orders, restaurants } = useApp();

  // Buscar pedido por ID o por orderNumber (ej: "DD-1042")
  const order = orders.find(
    (o) =>
      o.id === orderParam ||
      o.orderNumber.toLowerCase() === orderParam.toLowerCase() ||
      o.orderNumber.toLowerCase() === `dd-${orderParam}`.toLowerCase()
  );

  const restaurant = restaurants.find(
    (r) => r.id === order?.restaurantId || r.name === order?.restaurantName
  );

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Pedido #{orderParam} no encontrado</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Verifica el número de orden o regresa a la página principal.
        </p>
        <Link
          href="/"
          className="mt-4 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition"
        >
          Volver a DonDomi
        </Link>
      </div>
    );
  }

  // Mapeo del estado actual
  const steps: { key: OrderStatus; title: string; desc: string; icon: any }[] = [
    {
      key: 'PENDING',
      title: 'Pedido Recibido',
      desc: 'El restaurante está revisando la comanda',
      icon: Clock,
    },
    {
      key: 'PREPARING',
      title: 'En Preparación',
      desc: 'Tu comida se está preparando en la cocina',
      icon: ChefHat,
    },
    {
      key: 'ON_THE_WAY',
      title: 'En Camino',
      desc: 'El domiciliario va en camino a tu dirección',
      icon: Bike,
    },
    {
      key: 'DELIVERED',
      title: 'Entregado con Éxito',
      desc: '¡Buen provecho! Gracias por pedir en DonDomi',
      icon: CheckCircle2,
    },
  ];

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'CONFIRMED':
      case 'PREPARING':
        return 1;
      case 'READY_FOR_PICKUP':
      case 'ON_THE_WAY':
        return 2;
      case 'DELIVERED':
        return 3;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(order.status);

  // Link de WhatsApp para consultar estado con el restaurante
  const cleanPhone = (restaurant?.phone || '3004567890').replace(/\D/g, '');
  const phoneWithCountry = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
  const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(
    `Hola ${order.restaurantName}, quisiera consultar sobre mi pedido #${order.orderNumber} a nombre de ${order.customerName}.`
  )}`;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="text-center truncate">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Seguimiento de Pedido
            </span>
            <span className="text-sm font-black text-slate-900">#{order.orderNumber}</span>
          </div>
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
          >
            <Home className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Banner de Estado Principal */}
        <div className="bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 rounded-3xl p-5 text-white shadow-lg shadow-orange-500/15 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{steps[currentStepIdx]?.title}</span>
          </div>
          <h2 className="text-xl font-black">
            {order.status === 'DELIVERED'
              ? '¡Pedido Entregado!'
              : `Tiempo estimado: ${order.estimatedDeliveryTime || '30-40 min'}`}
          </h2>
          <p className="text-xs text-orange-100">
            {steps[currentStepIdx]?.desc}
          </p>
        </div>

        {/* Línea de Tiempo / Stepper */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Progreso del Pedido
          </h3>

          <div className="space-y-4 relative pl-7 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {steps.map((st, idx) => {
              const isDone = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              const Icon = st.icon;

              return (
                <div key={st.key} className="relative flex items-start gap-3">
                  <div
                    className={`absolute -left-7 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                      isDone
                        ? isCurrent
                          ? 'bg-orange-600 text-white ring-4 ring-orange-100 scale-110'
                          : 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span
                      className={`text-xs font-bold block ${
                        isDone ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {st.title}
                    </span>
                    <span className="text-[11px] text-slate-500 block leading-tight">
                      {st.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contacto con el Restaurante */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Preparado por
            </span>
            <h4 className="text-sm font-extrabold text-slate-900">{order.restaurantName}</h4>
            <span className="text-[11px] text-slate-500 block">Valledupar, Cesar</span>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Chat WhatsApp</span>
          </a>
        </div>

        {/* Resumen del Pedido y Entrega */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3 text-xs">
          <h3 className="font-extrabold text-sm text-slate-900 pb-2 border-b border-slate-100">
            Detalle de la Entrega
          </h3>

          <div className="space-y-1.5 text-slate-600">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold text-slate-800 block">
                  {order.deliveryAddress.neighborhood}, {order.deliveryAddress.street}
                </span>
                {order.deliveryAddress.reference && (
                  <span className="text-[11px] text-slate-500 block">
                    Ref: {order.deliveryAddress.reference}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-1">
              <span>Cliente:</span>
              <span className="font-bold text-slate-800">
                {order.customerName} ({order.customerPhone})
              </span>
            </div>
            <div className="flex justify-between">
              <span>Método de pago:</span>
              <span className="font-bold text-orange-600">{order.paymentMethod}</span>
            </div>
          </div>

          {/* Platos pedidos */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <span className="font-bold text-slate-800 block">Platos:</span>
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <div>
                  <span>
                    <strong>{item.quantity}x</strong> {item.productName}
                  </span>
                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <span className="text-[10px] text-slate-400 block pl-3">
                      {item.selectedOptions.map((o) => o.itemName).join(', ')}
                    </span>
                  )}
                </div>
                <span className="font-semibold text-slate-800">{formatCOP(item.subtotal)}</span>
              </div>
            ))}
          </div>

          {/* Desglose total con Domicilio Fijo de 7.000 */}
          <div className="pt-2 border-t border-slate-100 space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCOP(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Domicilio (Tarifa fija Valledupar):</span>
              <span className="font-bold text-slate-900">{formatCOP(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tarifa de servicio DonDomi:</span>
              <span>{formatCOP(order.serviceFee)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
              <span>Total a pagar:</span>
              <span className="text-base text-orange-600">{formatCOP(order.total)}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
