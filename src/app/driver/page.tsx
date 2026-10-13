'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bike,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  Clock,
  ArrowLeft,
  DollarSign,
  AlertCircle,
  PackageCheck,
  ChevronRight,
  LogOut,
  Store,
  User,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';
import { Order } from '@/types';

export default function DriverPage() {
  const {
    currentUser,
    orders,
    restaurants,
    claimOrder,
    unclaimOrder,
    updateOrderStatus,
    logout,
    loginAsDriver,
    globalDeliveryFee,
  } = useApp();

  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState<boolean>(false);
  const [incidentReason, setIncidentReason] = useState<string>('Avería o pinchazo en la motocicleta');
  const [customIncidentReason, setCustomIncidentReason] = useState<string>('');
  const [isReleasing, setIsReleasing] = useState<boolean>(false);

  const defaultFee = globalDeliveryFee || 7000;
  const driverId = currentUser?.role === 'DOMICILIARIO' ? currentUser.id : 'drv-demo';
  const driverName = currentUser?.role === 'DOMICILIARIO' ? currentUser.name : 'Domiciliario DonDomi';

  // Pedidos activos asignados a este repartidor
  const activeOrder = orders.find(
    (o) => (o.driverId === driverId || o.driverName === driverName) && o.status === 'ON_THE_WAY'
  );

  // Pedidos disponibles para tomar carrera (en cocina o listos para recogida, sin repartidor asignado)
  const availableOrders = orders.filter(
    (o) =>
      (o.status === 'READY_FOR_PICKUP' || o.status === 'PREPARING' || o.status === 'PENDING') &&
      !o.driverId &&
      (!activeOrder || activeOrder.id !== o.id)
  );

  // Pedidos entregados por este repartidor hoy
  const deliveredOrders = orders.filter(
    (o) => (o.driverId === driverId || o.driverName === driverName) && o.status === 'DELIVERED'
  );

  const totalEarnings = deliveredOrders.reduce((acc, o) => acc + (o.deliveryFee || defaultFee), 0);

  // Sonido de alerta para carreras
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  const handleClaim = async (order: Order) => {
    playChime();
    setErrorNotice(null);
    const result = await claimOrder(order.id, driverName, currentUser?.phone || '3001234567');
    if (result.success) {
      setSuccessNotice(`¡Carrera #${order.orderNumber} aceptada! Dirígete al restaurante.`);
      setTimeout(() => setSuccessNotice(null), 4000);
    } else {
      setErrorNotice(result.error || 'Esta carrera ya fue tomada por otro domiciliario.');
      setTimeout(() => setErrorNotice(null), 5000);
    }
  };

  const handleConfirmRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    const finalReason =
      incidentReason === 'Otro percance'
        ? customIncidentReason.trim() || 'Incidencia de ruta no especificada'
        : incidentReason + (customIncidentReason.trim() ? ` (${customIncidentReason.trim()})` : '');

    setIsReleasing(true);
    try {
      await unclaimOrder(activeOrder.id, finalReason);
      setSuccessNotice(`Carrera #${activeOrder.orderNumber} liberada. El pedido volvió al radar para otros repartidores.`);
      setIsIncidentModalOpen(false);
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Error al liberar la carrera.');
      setTimeout(() => setErrorNotice(null), 5000);
    } finally {
      setIsReleasing(false);
    }
  };

  const handleDeliver = async (orderId: string) => {
    playChime();
    await updateOrderStatus(orderId, 'DELIVERED');
    setSuccessNotice(`¡Excelente! Entrega confirmada y liquidada.`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleQuickDemoLogin = async () => {
    await loginAsDriver('Javier Morales', '3001234567', '1234');
  };

  // Buscar teléfono del restaurante
  const getRestaurantPhone = (restId?: string, restName?: string) => {
    const r = restaurants.find((item) => item.id === restId || item.name === restName);
    return r?.phone || '3001234567';
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 px-4 py-3 shadow-md border-b border-slate-800">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight">Portal Domiciliario</span>
                <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-1.5 py-0.2 rounded-sm border border-blue-500/30">
                  Valledupar
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {driverName} {currentUser?.phone ? `· ${currentUser.phone}` : '· Moto'}
              </p>
            </div>
          </div>

          {/* Acciones de cabecera */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAvailable(!isAvailable)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                isAvailable
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-400 animate-ping' : 'bg-red-400'}`}
              ></span>
              <span>{isAvailable ? 'En Turno' : 'Pausado'}</span>
            </button>

            {currentUser && (
              <button
                onClick={logout}
                title="Cerrar turno"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Banner de aviso o login */}
        {currentUser?.role !== 'DOMICILIARIO' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-start justify-between gap-2.5 text-xs text-blue-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">Modo Demo / Vista Previa</p>
                <p className="text-[11px] text-blue-700">
                  Inicia sesión como repartidor para registrar carreras a tu nombre.
                </p>
              </div>
            </div>
            <button
              onClick={handleQuickDemoLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1.5 rounded-xl text-[11px] whitespace-nowrap shadow-xs"
            >
              Iniciar Turno
            </button>
          </div>
        )}

        {/* Notificación de éxito */}
        {successNotice && (
          <div className="bg-emerald-600 text-white p-3 rounded-2xl text-xs font-bold shadow-md animate-in slide-in-from-top-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Notificación de error / carrera ya tomada */}
        {errorNotice && (
          <div className="bg-red-600 text-white p-3 rounded-2xl text-xs font-bold shadow-md animate-in slide-in-from-top-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* Resumen de Métricas del Domiciliario */}
        <div className="grid grid-cols-3 gap-2 bg-white p-3.5 rounded-3xl border border-slate-200 shadow-2xs text-center">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Carreras Hoy</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">
              {deliveredOrders.length}
            </span>
          </div>
          <div className="border-x border-slate-100">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Ganancia</span>
            <span className="text-xl font-black text-emerald-600 mt-0.5 block">
              {formatCOP(totalEarnings)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Tarifa Domicilio</span>
            <span className="text-xl font-black text-orange-600 mt-0.5 block">
              {formatCOP(defaultFee)}
            </span>
          </div>
        </div>

        {/* SECCIÓN 1: CARRERA EN CURSO (SI TIENE PEDIDO ASIGNADO) */}
        {activeOrder && (
          <div className="bg-white rounded-3xl p-5 border-2 border-orange-500 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center animate-bounce">
                  <Bike className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Carrera Activa en Curso
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold">
                    Orden {activeOrder.orderNumber}
                  </p>
                </div>
              </div>

              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                +{formatCOP(activeOrder.deliveryFee || defaultFee)}
              </span>
            </div>

            {/* Aviso de Cobro al Cliente */}
            {activeOrder.paymentMethod === 'EFECTIVO' ? (
              <div className="bg-amber-500/10 border-2 border-amber-500 rounded-2xl p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 font-black text-sm">
                  $
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                    Instrucción de Cobro
                  </span>
                  <p className="text-sm font-black text-amber-950">
                    COBRAR EN EFECTIVO: {formatCOP(activeOrder.total)}
                  </p>
                  <p className="text-[11px] text-amber-900 mt-0.5 font-medium">
                    Recibe el dinero en efectivo del cliente antes de entregar los alimentos.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border-2 border-emerald-500 rounded-2xl p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black text-sm">
                  ✓
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                    Instrucción de Cobro
                  </span>
                  <p className="text-sm font-black text-emerald-950">
                    YA PAGADO DIGITAL ({activeOrder.paymentMethod}) — NO COBRAR
                  </p>
                  <p className="text-[11px] text-emerald-900 mt-0.5 font-medium">
                    El cliente ya pagó la orden completa en línea. Solo entrega la comida.
                  </p>
                </div>
              </div>
            )}

            {/* Ruta en Valledupar */}
            <div className="space-y-3 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {/* Punto A: Recogida */}
              <div className="relative">
                <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-orange-600 border-2 border-white shadow-xs"></span>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  1. Recoger en Restaurante
                </span>
                <p className="text-xs font-bold text-slate-900">{activeOrder.restaurantName}</p>
                <p className="text-[11px] text-slate-500">Valledupar, Cesar</p>
              </div>

              {/* Punto B: Entrega */}
              <div className="relative pt-1">
                <span className="absolute -left-6 top-2.5 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white shadow-xs"></span>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  2. Entregar al Cliente
                </span>
                <p className="text-xs font-bold text-slate-900">{activeOrder.customerName}</p>
                <p className="text-[11px] text-slate-600 font-medium">
                  {activeOrder.deliveryAddress.street}, {activeOrder.deliveryAddress.neighborhood}
                </p>
                {activeOrder.deliveryAddress.reference && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg mt-1 border border-amber-200 inline-block">
                    Ref: {activeOrder.deliveryAddress.reference}
                  </p>
                )}
              </div>
            </div>

            {/* Información del pedido */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Platos del pedido:</span>
                <span className="font-semibold text-slate-800">
                  {activeOrder.items.reduce((s, i) => s + i.quantity, 0)} unidades
                </span>
              </div>
            </div>

            {/* Botones de contacto y GPS */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${activeOrder.customerPhone || '3001234567'}`}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 transition"
              >
                <Phone className="w-3.5 h-3.5 text-slate-600" />
                <span>Llamar Cliente</span>
              </a>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  activeOrder.deliveryAddress.street +
                    ', ' +
                    activeOrder.deliveryAddress.neighborhood +
                    ', Valledupar'
                )}`}
                target="_blank"
                rel="noreferrer"
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 border border-blue-200 transition"
              >
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                <span>Ruta GPS</span>
              </a>
            </div>

            {/* Confirmar entrega o Liberar carrera */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleDeliver(activeOrder.id)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-emerald-600/25 transition text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Entrega Realizada</span>
              </button>

              <button
                type="button"
                onClick={() => setIsIncidentModalOpen(true)}
                className="w-full bg-white hover:bg-amber-50 text-amber-700 font-bold py-2.5 rounded-xl border border-amber-300 transition text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Reportar Incidencia / Liberar Carrera</span>
              </button>
            </div>
          </div>
        )}

        {/* SECCIÓN 2: CARRERAS DISPONIBLES EN VALLEDUPAR */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Bike className="w-4 h-4 text-orange-600" />
              <span>Carreras Disponibles ({availableOrders.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-semibold">
              Tarifa {formatCOP(defaultFee)}
            </span>
          </div>

          {availableOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center space-y-1.5">
              <Clock className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-xs">No hay carreras pendientes</p>
              <p className="text-[11px] text-slate-400">
                Cuando los restaurantes preparen nuevos pedidos, aparecerán aquí de inmediato.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3 hover:border-orange-300 transition"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-black text-slate-900">
                        {order.orderNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Restaurante: {order.restaurantName}
                      </span>
                    </div>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      +{formatCOP(order.deliveryFee || defaultFee)}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-start gap-1.5">
                      <Store className="w-3.5 h-3.5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Recoger:</strong> {order.restaurantName}
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Llevar a:</strong> {order.deliveryAddress.street},{' '}
                        {order.deliveryAddress.neighborhood}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      {order.paymentMethod === 'EFECTIVO' ? (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Cobrar Efectivo: {formatCOP(order.total)}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Pagado Digital ({order.paymentMethod})
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleClaim(order)}
                      className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow-md shadow-orange-500/20 transition flex items-center gap-1.5"
                    >
                      <Bike className="w-3.5 h-3.5" />
                      <span>Aceptar Carrera</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECCIÓN 3: HISTORIAL DE ENTREGAS COMPLETADAS HOY */}
        {deliveredOrders.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Entregas completadas hoy ({deliveredOrders.length})
            </h4>
            <div className="space-y-2">
              {deliveredOrders.map((o) => (
                <div
                  key={o.id}
                  className="bg-white p-3 rounded-2xl border border-slate-200 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold text-slate-900">{o.orderNumber}</span>
                      <span className="text-[11px] text-slate-400 block">
                        {o.deliveryAddress.neighborhood} · {o.restaurantName}
                      </span>
                    </div>
                  </div>
                  <span className="font-extrabold text-emerald-600">
                    +{formatCOP(o.deliveryFee || defaultFee)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Reportar Incidencia / Liberar Carrera */}
        {isIncidentModalOpen && activeOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
                  <h3 className="font-black text-sm text-slate-900">
                    Liberar Carrera #{activeOrder.orderNumber}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsIncidentModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Al liberar la carrera, el pedido volverá a quedar disponible de inmediato para que otro domiciliario lo recoja. Selecciona el motivo del percance:
              </p>

              <form onSubmit={handleConfirmRelease} className="space-y-3">
                <div className="space-y-2">
                  {[
                    'Avería o pinchazo en la motocicleta',
                    'Emergencia médica o personal en la vía',
                    'Lluvia torrencial / Vía intransitable',
                    'Accidente de tránsito',
                    'Otro percance',
                  ].map((r) => (
                    <label
                      key={r}
                      className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-xs font-bold cursor-pointer transition ${
                        incidentReason === r
                          ? 'border-amber-500 bg-amber-50 text-amber-950'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="incidentReasonOption"
                        value={r}
                        checked={incidentReason === r}
                        onChange={() => setIncidentReason(r)}
                        className="accent-amber-600"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>

                {incidentReason === 'Otro percance' && (
                  <textarea
                    rows={2}
                    required
                    value={customIncidentReason}
                    onChange={(e) => setCustomIncidentReason(e.target.value)}
                    placeholder="Describe brevemente el percance..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                )}

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isReleasing}
                    onClick={() => setIsIncidentModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Conservar carrera
                  </button>
                  <button
                    type="submit"
                    disabled={isReleasing}
                    className="px-4 py-2 rounded-xl text-xs font-extrabold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20"
                  >
                    {isReleasing ? 'Liberando...' : 'Confirmar y Liberar'}
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
