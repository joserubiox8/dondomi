'use client';

import React, { useEffect, useState } from 'react';
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
  Loader2,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';
import { Order, OrderStatus } from '@/types';
import { supabase } from '@/lib/supabase';

interface OrderTrackingViewProps {
  orderParam: string;
}

export default function OrderTrackingView({ orderParam }: OrderTrackingViewProps) {
  const { orders, restaurants, cancelOrderByCustomer, updateOrderStatus } = useApp();
  const [supabaseOrder, setSupabaseOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('Me equivoqué de plato o dirección');
  const [customCancelReason, setCustomCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Buscar pedido en AppContext por ID o por orderNumber (ej: "DD-1042")
  const contextOrder = orders.find(
    (o) =>
      o.id === orderParam ||
      o.orderNumber.toLowerCase() === orderParam.toLowerCase() ||
      o.orderNumber.toLowerCase() === `dd-${orderParam}`.toLowerCase()
  );

  const order = contextOrder || supabaseOrder;

  // Consulta directa a Supabase en caso de acceso por URL directa o refresh
  useEffect(() => {
    if (contextOrder) {
      setLoading(false);
      return;
    }

    async function fetchFromSupabase() {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .or(`id.eq.${orderParam},order_number.ilike.%${orderParam}%`)
          .maybeSingle();

        if (!error && data) {
          let cancellationReason: string | undefined;
          let cancelledBy: 'CLIENTE' | 'RESTAURANTE' | 'SISTEMA' | 'ADMINISTRADOR' | undefined;
          let incidentReason: string | undefined;
          let cleanNotes = data.customer_notes;

          if (cleanNotes) {
            const cancelMatch = cleanNotes.match(/\[Cancelado por (CLIENTE|RESTAURANTE|SISTEMA|ADMINISTRADOR): (.*?)\]/);
            if (cancelMatch) {
              cancelledBy = cancelMatch[1] as any;
              cancellationReason = cancelMatch[2];
              cleanNotes = cleanNotes.replace(cancelMatch[0], '').trim();
            }
            const incidentMatch = cleanNotes.match(/\[Incidencia Repartidor: (.*?)\]/);
            if (incidentMatch) {
              incidentReason = incidentMatch[1];
              cleanNotes = cleanNotes.replace(incidentMatch[0], '').trim();
            }
          }

          setSupabaseOrder({
            id: data.id,
            orderNumber: data.order_number,
            customerId: data.customer_name,
            customerName: data.customer_name,
            customerPhone: data.customer_phone,
            restaurantId: data.restaurant_id || '',
            restaurantName: data.restaurant_name,
            driverId: data.driver_id,
            driverName: data.driver_name,
            status: data.status,
            items: data.items || [],
            subtotal: Number(data.subtotal),
            deliveryFee: Number(data.delivery_fee),
            serviceFee: Number(data.service_fee || 0),
            total: Number(data.total),
            paymentMethod: data.payment_method,
            paymentStatus: data.payment_status,
            deliveryAddress: data.delivery_address,
            customerNotes: cleanNotes,
            cancellationReason,
            cancelledBy,
            incidentReason,
            estimatedDeliveryTime: data.estimated_delivery_time,
            createdAt: data.created_at,
          });
        }
      } catch (e) {
        console.error('Error cargando pedido desde Supabase:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchFromSupabase();
  }, [orderParam, contextOrder]);

  const restaurant = restaurants.find(
    (r) => r.id === order?.restaurantId || r.name === order?.restaurantName
  );

  useEffect(() => {
    if (order && typeof window !== 'undefined') {
      localStorage.setItem('dondomi_active_order', order.orderNumber);
    }
  }, [order]);

  // Temporizador de cancelación de 15 minutos (SLA)
  useEffect(() => {
    if (!order || order.status !== 'PENDING') return;

    const checkSla = () => {
      const createdTime = new Date(order.createdAt).getTime();
      const elapsedMs = Date.now() - createdTime;
      const maxMs = 15 * 60 * 1000;

      if (elapsedMs >= maxMs) {
        updateOrderStatus(
          order.id,
          'CANCELLED',
          'Cancelación automática por tiempo de espera excedido (15 min)',
          'SISTEMA'
        );
      }
    };

    checkSla();
    const interval = setInterval(checkSla, 15000);
    return () => clearInterval(interval);
  }, [order, updateOrderStatus]);

  const handleConfirmCustomerCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    const finalReason =
      cancelReason === 'Otro motivo'
        ? customCancelReason.trim() || 'Cancelado por el cliente'
        : cancelReason + (customCancelReason.trim() ? ` (${customCancelReason.trim()})` : '');

    setIsCancelling(true);
    try {
      await cancelOrderByCustomer(order.id, finalReason);
      setIsCancelModalOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Error al cancelar el pedido.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 text-orange-600 animate-spin mb-3" />
        <h2 className="text-base font-bold text-slate-800">Cargando estado del pedido...</h2>
        <p className="text-xs text-slate-400 mt-1">Conectando con la cocina en Valledupar</p>
      </div>
    );
  }

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
        {order.status === 'CANCELLED' ? (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 rounded-3xl p-6 text-white shadow-lg text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-red-200">
              <AlertCircle className="w-3.5 h-3.5 text-red-300" />
              <span>
                Pedido Cancelado {order.cancelledBy ? `por ${order.cancelledBy}` : ''}
              </span>
            </div>
            <h2 className="text-xl font-black">
              {order.cancelledBy === 'RESTAURANTE'
                ? 'El restaurante rechazó el pedido'
                : order.cancelledBy === 'CLIENTE'
                ? 'Cancelaste este pedido'
                : order.cancelledBy === 'SISTEMA'
                ? 'Tiempo de espera agotado (15 min)'
                : 'Pedido no procesado'}
            </h2>
            <p className="text-xs text-red-100 max-w-xs mx-auto">
              {order.cancellationReason
                ? `Motivo: "${order.cancellationReason}"`
                : order.cancelledBy === 'SISTEMA'
                ? 'El restaurante no confirmó el pedido dentro de los 15 minutos reglamentarios. No se realizó ningún cobro.'
                : 'El pedido fue cancelado y no generará ningún cobro.'}
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-block bg-white text-slate-900 font-extrabold text-xs px-5 py-2.5 rounded-2xl shadow-md hover:bg-slate-100 transition"
              >
                Elegir otro restaurante
              </Link>
            </div>
          </div>
        ) : (
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
        )}

        {/* Cancelación voluntaria del cliente mientras esté PENDING */}
        {order.status === 'PENDING' && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-start gap-2.5 text-amber-900">
              <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0 animate-pulse" />
              <div>
                <span className="font-extrabold block">Revisión en cocina</span>
                <span className="text-[11px] text-amber-700">
                  Si cometiste un error o deseas cancelar, puedes hacerlo mientras la cocina no inicie la preparación.
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="w-full sm:w-auto bg-white hover:bg-red-50 text-red-600 border border-red-200 font-extrabold px-3.5 py-2 rounded-xl text-xs transition whitespace-nowrap shadow-xs"
            >
              Cancelar pedido
            </button>
          </div>
        )}

        {/* Línea de Tiempo / Stepper (solo si no está cancelado) */}
        {order.status !== 'CANCELLED' && (
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
        )}

        {/* Repartidor Asignado en Ruta */}
        {order.driverName && (
          <div className="bg-blue-50 border border-blue-200 rounded-3xl p-4 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Bike className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                  Domiciliario Asignado
                </span>
                <h4 className="font-extrabold text-slate-900 text-sm">{order.driverName}</h4>
                <span className="text-[11px] text-slate-500">Repartidor DonDomi Valledupar</span>
              </div>
            </div>
            <div className="bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-xl text-[11px]">
              En camino
            </div>
          </div>
        )}

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
            {order.serviceFee > 0 && (
              <div className="flex justify-between">
                <span>Tarifa de servicio DonDomi:</span>
                <span>{formatCOP(order.serviceFee)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
              <span>Total a pagar:</span>
              <span className="text-base text-orange-600">{formatCOP(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Modal de Cancelación por parte del Cliente */}
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <h3 className="font-black text-sm text-slate-900">
                    ¿Cancelar tu pedido?
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Esta acción cancelará tu pedido en <strong>{order.restaurantName}</strong>. Selecciona el motivo:
              </p>

              <form onSubmit={handleConfirmCustomerCancel} className="space-y-3">
                <div className="space-y-2">
                  {[
                    'Me equivoqué de plato o dirección',
                    'Demora en la confirmación del restaurante',
                    'Cambié de opinión / Ya no deseo ordenar',
                    'Otro motivo',
                  ].map((r) => (
                    <label
                      key={r}
                      className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-xs font-bold cursor-pointer transition ${
                        cancelReason === r
                          ? 'border-red-500 bg-red-50 text-red-900'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="customerCancelReason"
                        value={r}
                        checked={cancelReason === r}
                        onChange={() => setCancelReason(r)}
                        className="accent-red-600"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>

                {cancelReason === 'Otro motivo' && (
                  <textarea
                    rows={2}
                    required
                    value={customCancelReason}
                    onChange={(e) => setCustomCancelReason(e.target.value)}
                    placeholder="Describe brevemente el motivo..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                )}

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => setIsCancelModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Mantener pedido
                  </button>
                  <button
                    type="submit"
                    disabled={isCancelling}
                    className="px-4 py-2 rounded-xl text-xs font-extrabold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/20"
                  >
                    {isCancelling ? 'Cancelando...' : 'Confirmar Cancelación'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
