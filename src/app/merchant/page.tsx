'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ChefHat,
  Bell,
  Clock,
  CheckCircle2,
  ArrowLeft,
  PackageCheck,
  Eye,
  Printer,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  X,
  KeyRound,
  AlertCircle,
  MapPin,
  Phone,
  FileText,
  Bike,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';
import { playOrderAlertSound } from '@/lib/sound';
import { Order, OrderStatus } from '@/types';

export default function MerchantPage() {
  const {
    restaurants,
    orders,
    productsByRestaurant,
    updateOrderStatus,
    toggleProductAvailability,
    currentUser,
    logout,
  } = useApp();

  const [selectedRestId, setSelectedRestId] = useState<string>(
    currentUser?.role === 'RESTAURANTE' && currentUser.restaurantId
      ? currentUser.restaurantId
      : 'rest-1'
  );

  // Autenticación por PIN de 4 dígitos
  const [authenticatedRestId, setAuthenticatedRestId] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Audio de cocina
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const prevPendingCountRef = useRef<number>(0);

  // Modal para ticket térmico de comanda
  const [ticketOrder, setTicketOrder] = useState<Order | null>(null);

  // Sincronizar restaurante según usuario logueado
  useEffect(() => {
    if (currentUser?.role === 'RESTAURANTE' && currentUser.restaurantId) {
      setSelectedRestId(currentUser.restaurantId);
      setAuthenticatedRestId(currentUser.restaurantId);
    } else if (currentUser?.role === 'ADMINISTRADOR') {
      setAuthenticatedRestId(selectedRestId);
    }
  }, [currentUser, selectedRestId]);

  const restaurant =
    restaurants.find((r) => r.id === selectedRestId) ||
    restaurants[0] || {
      id: 'rest-1',
      name: 'Restaurante',
      pin: '1234',
    };

  const products = productsByRestaurant[selectedRestId] || [];

  // Pedidos que pertenecen a este restaurante
  const restaurantOrders = orders.filter(
    (o) => o.restaurantId === selectedRestId || o.restaurantName === restaurant.name
  );

  const pendingOrders = restaurantOrders.filter((o) => o.status === 'PENDING');
  const preparingOrders = restaurantOrders.filter((o) => o.status === 'PREPARING');
  const dispatchedOrders = restaurantOrders.filter(
    (o) => o.status === 'READY_FOR_PICKUP' || o.status === 'ON_THE_WAY' || o.status === 'DELIVERED'
  );

  // Revisar si ya está autenticado en sessionStorage para este restaurante
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (currentUser?.role === 'ADMINISTRADOR' || (currentUser?.role === 'RESTAURANTE' && currentUser.restaurantId === selectedRestId)) {
        setAuthenticatedRestId(selectedRestId);
        return;
      }
      const isAuth = sessionStorage.getItem(`merchant_auth_${selectedRestId}`);
      if (isAuth === 'true') {
        setAuthenticatedRestId(selectedRestId);
      } else {
        setAuthenticatedRestId(null);
      }
      setPinInput('');
      setPinError(null);
    }
  }, [selectedRestId, currentUser]);

  // Alerta sonora en tiempo real cuando llega un nuevo pedido PENDING
  useEffect(() => {
    const currentPendingCount = pendingOrders.length;
    if (audioEnabled && currentPendingCount > prevPendingCountRef.current) {
      playOrderAlertSound();
    }
    prevPendingCountRef.current = currentPendingCount;
  }, [pendingOrders.length, audioEnabled]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expectedPin = restaurant.pin || '1234';

    if (pinInput.trim() === expectedPin) {
      setAuthenticatedRestId(selectedRestId);
      setPinError(null);
      setPinInput('');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`merchant_auth_${selectedRestId}`, 'true');
      }
      // Habilitar audio con la interacción del usuario
      setAudioEnabled(true);
      playOrderAlertSound();
    } else {
      setPinError('PIN incorrecto. (El PIN por defecto es 1234)');
    }
  };

  const handleLockScreen = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(`merchant_auth_${selectedRestId}`);
    }
    if (currentUser?.role === 'RESTAURANTE') {
      logout();
    }
    setAuthenticatedRestId(null);
    setPinInput('');
  };

  const handleTestAudio = () => {
    setAudioEnabled(true);
    playOrderAlertSound();
  };

  const handlePrintTicket = (order: Order) => {
    setTicketOrder(order);
    // Esperar un momento a que el modal cargue y luego lanzar diálogo de impresión
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const isUnlocked =
    authenticatedRestId === selectedRestId ||
    currentUser?.role === 'ADMINISTRADOR' ||
    (currentUser?.role === 'RESTAURANTE' && currentUser.restaurantId === selectedRestId);

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
                <span className="font-extrabold text-sm tracking-tight">Portal Cocina</span>
                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1.5 py-0.2 rounded-sm border border-amber-500/30">
                  Panel Aliado
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{restaurant.name} · Valledupar</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector de Restaurante */}
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

            {/* Botón de bloqueo rápido si está desbloqueado */}
            {isUnlocked && (
              <button
                onClick={handleLockScreen}
                title="Bloquear pantalla de cocina"
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-xl border border-slate-700 transition"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* PANTALLA DE BLOQUEO POR PIN */}
      {!isUnlocked ? (
        <main className="max-w-md mx-auto px-4 py-12">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 mx-auto flex items-center justify-center shadow-inner">
              <KeyRound className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full">
                Acceso de Seguridad
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2">
                Cocina: {restaurant.name}
              </h2>
              <p className="text-xs text-slate-500">
                Ingresa el PIN de 4 dígitos configurado para este restaurante.
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  placeholder="PIN (Ej: 1234)"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(null);
                  }}
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono font-black py-3 px-4 bg-slate-50 border-2 border-slate-200 focus:border-orange-500 focus:bg-white rounded-2xl outline-none transition"
                />
                {pinError && (
                  <p className="text-xs text-red-600 font-bold mt-2 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{pinError}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-lg shadow-orange-600/25 transition text-sm flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                <span>Desbloquear y Entrar a Cocina</span>
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
              💡 PIN predeterminado: <strong className="text-slate-600 font-mono">1234</strong>{' '}
              · Puedes cambiarlo en el Panel de Administrador.
            </div>
          </div>
        </main>
      ) : (
        /* PANTALLA PRINCIPAL DE COCINA DESBLOQUEADA */
        <main className="max-w-4xl mx-auto px-4 py-4 space-y-5">
          {/* Banner de bienvenida y control de alerta sonora */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-900 shadow-2xs">
            <div className="space-y-0.5">
              <span className="text-xs font-black uppercase text-emerald-700 block">
                Fase 1: Autogestión de Domicilios en Valledupar
              </span>
              <p className="text-xs text-emerald-800">
                Recibe pedidos digitales en tiempo real y despacha con tu propio domiciliario. Tarifa fija $7.000 COP.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* Botón para probar timbre de cocina */}
              <button
                onClick={handleTestAudio}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                title="Probar sonido de notificación"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Probar Timbre</span>
              </button>

              <Link
                href={`/restaurant/${restaurant.id}`}
                className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs whitespace-nowrap"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Ver Menú</span>
              </Link>
            </div>
          </div>

          {/* Resumen de pedidos */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Nuevos</span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">
                {pendingOrders.length}
              </span>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">En Cocina</span>
              <span className="text-2xl font-black text-blue-600 mt-1 block">
                {preparingOrders.length}
              </span>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Despachados</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {dispatchedOrders.length}
              </span>
            </div>
          </div>

          {/* Tablero de Pedidos de Cocina */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-orange-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Cola de Pedidos en Vivo ({restaurantOrders.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Timbre de cocina activo</span>
              </span>
            </div>

            {restaurantOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
                <p className="font-bold text-slate-700 text-sm">No hay pedidos registrados aún</p>
                <p className="text-xs text-slate-400">
                  Los nuevos pedidos que los clientes hagan por DonDomi aparecerán aquí automáticamente y sonará el timbre.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {restaurantOrders.map((order) => {
                  const isNew = order.status === 'PENDING';
                  return (
                    <div
                      key={order.id}
                      className={`bg-white rounded-3xl p-4 sm:p-5 border transition shadow-xs space-y-3 ${
                        isNew
                          ? 'border-orange-300 ring-2 ring-orange-500/20 bg-orange-50/10'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-base">{order.orderNumber}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs font-bold text-slate-700">
                            Cliente: {order.customerName} ({order.customerPhone})
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-slate-900">
                            Total: {formatCOP(order.total)}
                          </span>

                          {/* Botón Imprimir Comanda POS */}
                          <button
                            onClick={() => handlePrintTicket(order)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
                            title="Imprimir comanda para impresora térmica"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>Imprimir Comanda</span>
                          </button>
                        </div>
                      </div>

                      {/* Items para la cocina */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                        <span className="font-bold text-slate-700 block">Platos a preparar:</span>
                        {order.items.map((it) => (
                          <div key={it.id} className="font-medium text-slate-800">
                            <div className="flex justify-between">
                              <span>
                                • <strong className="text-orange-600">{it.quantity}x</strong>{' '}
                                {it.productName}
                              </span>
                              <span>{formatCOP(it.subtotal)}</span>
                            </div>
                            {it.selectedOptions && it.selectedOptions.length > 0 && (
                              <p className="text-[11px] text-slate-500 pl-4">
                                + {it.selectedOptions.map((o) => o.itemName).join(', ')}
                              </p>
                            )}
                          </div>
                        ))}

                        {order.customerNotes && (
                          <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 mt-1">
                            ⚠️ Nota especial del cliente: &quot;{order.customerNotes}&quot;
                          </p>
                        )}
                      </div>

                      {/* Ubicación de entrega y pago */}
                      <div className="text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                        <span>
                          📍 Entregar en:{' '}
                          <strong>
                            {order.deliveryAddress.street}, {order.deliveryAddress.neighborhood}
                          </strong>
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500 font-semibold">
                            Domicilio: <strong className="text-slate-800">{formatCOP(order.deliveryFee)}</strong>
                          </span>
                          <span className="text-slate-500 font-semibold">
                            Pago: <strong className="text-slate-800">{order.paymentMethod}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Botones de cambio de estado para la cocina */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition shadow-md"
                          >
                            🔔 Aceptar Pedido e Iniciar Cocina
                          </button>
                        )}

                        {order.status === 'PREPARING' && (
                          <div className="flex-1 flex flex-wrap gap-2">
                            <button
                              onClick={() => updateOrderStatus(order.id, 'READY_FOR_PICKUP')}
                              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                            >
                              <PackageCheck className="w-4 h-4" />
                              <span>Empacado · Solicitar Repartidor</span>
                            </button>
                            <button
                              onClick={() => updateOrderStatus(order.id, 'ON_THE_WAY')}
                              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                            >
                              <Bike className="w-4 h-4" />
                              <span>Despachar con Domiciliario Propio</span>
                            </button>
                          </div>
                        )}

                        {order.status === 'READY_FOR_PICKUP' && (
                          <div className="flex-1 flex flex-wrap items-center justify-between gap-2 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                            <div className="text-xs text-amber-900">
                              <span className="font-bold block">Empacado y listo</span>
                              <span className="text-[11px] text-amber-700">
                                {order.driverName
                                  ? `Repartidor asignado: ${order.driverName}`
                                  : 'Visible para domiciliarios en la red DonDomi'}
                              </span>
                            </div>
                            <button
                              onClick={() => updateOrderStatus(order.id, 'ON_THE_WAY')}
                              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition"
                            >
                              Marcar en camino
                            </button>
                          </div>
                        )}

                        {order.status === 'ON_THE_WAY' && (
                          <div className="flex-1 flex flex-wrap items-center justify-between gap-2 bg-blue-50 border border-blue-200 p-2.5 rounded-xl">
                            <div className="text-xs text-blue-900">
                              <span className="font-bold block">En camino al cliente</span>
                              {order.driverName && (
                                <span className="text-[11px] text-blue-700 block">
                                  Repartidor: {order.driverName}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Confirmar Entrega</span>
                            </button>
                          </div>
                        )}

                        {order.status === 'DELIVERED' && (
                          <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Completado y liquidado con éxito</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sección de disponibilidad de platos en el menú */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">
                  Disponibilidad de Platos del Menú ({products.length})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Desactiva platos si se te agotan los ingredientes en el turno para que los clientes no los pidan.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {products.map((prod) => {
                const isAvailable = prod.isAvailable !== false;
                return (
                  <div key={prod.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <span className={`font-bold block ${isAvailable ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                        {prod.name}
                      </span>
                      <span className="text-slate-400">{formatCOP(prod.price)}</span>
                    </div>

                    <button
                      onClick={() => toggleProductAvailability(selectedRestId, prod.id)}
                      className={`text-xs font-bold px-3 py-1 rounded-full transition ${
                        isAvailable
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {isAvailable ? '✓ Disponible' : '✕ Agotado'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      )}

      {/* MODAL / VISTA DE IMPRESIÓN DE COMANDA POS (58mm / 80mm) */}
      {ticketOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="font-bold text-slate-900 text-xs">Comanda POS - Vista de Impresión</span>
              <button
                onClick={() => setTicketOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Vista del Ticket Térmico */}
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              <div
                id="thermal-pos-ticket"
                className="bg-white p-4 border border-dashed border-slate-300 font-mono text-[12px] leading-tight text-black space-y-2"
              >
                <div className="text-center space-y-0.5">
                  <p className="font-black text-sm uppercase">DONDOMI VALLEDUPAR</p>
                  <p className="font-bold text-xs">{restaurant.name}</p>
                  <p className="text-[10px]">Tel: {restaurant.phone}</p>
                  <p className="text-[10px]">--------------------------------</p>
                </div>

                <div className="space-y-0.5">
                  <p className="font-black text-base">ORDEN: #{ticketOrder.orderNumber}</p>
                  <p className="text-[10px]">Fecha: {new Date().toLocaleDateString('es-CO')} {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-[11px]"><strong>Cliente:</strong> {ticketOrder.customerName}</p>
                  <p className="text-[11px]"><strong>Tel:</strong> {ticketOrder.customerPhone}</p>
                  <p className="text-[11px]">
                    <strong>Dirección:</strong> {ticketOrder.deliveryAddress.street}, {ticketOrder.deliveryAddress.neighborhood}
                  </p>
                  <p className="text-[10px]">--------------------------------</p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-[11px]">PLATOS:</p>
                  {ticketOrder.items.map((it, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between">
                        <span>{it.quantity}x {it.productName}</span>
                        <span>{formatCOP(it.subtotal)}</span>
                      </div>
                      {it.selectedOptions && it.selectedOptions.length > 0 && (
                        <p className="text-[10px] pl-3">
                          + {it.selectedOptions.map((o) => o.itemName).join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                  {ticketOrder.customerNotes && (
                    <p className="text-[10px] pt-1">
                      <strong>NOTA:</strong> &quot;{ticketOrder.customerNotes}&quot;
                    </p>
                  )}
                  <p className="text-[10px]">--------------------------------</p>
                </div>

                <div className="space-y-0.5 text-right">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCOP(ticketOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Domicilio:</span>
                    <span>{formatCOP(ticketOrder.deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm pt-1 border-t border-black">
                    <span>TOTAL:</span>
                    <span>{formatCOP(ticketOrder.total)}</span>
                  </div>
                  <p className="text-[11px] pt-1 text-left">
                    <strong>PAGO:</strong> {ticketOrder.paymentMethod}
                  </p>
                </div>

                <div className="text-center pt-2 text-[10px]">
                  <p>*** GRACIAS POR SU COMPRA ***</p>
                  <p>DonDomi - Tu comida en minutos</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket Ahora</span>
              </button>
              <button
                onClick={() => setTicketOrder(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-2.5 rounded-xl text-xs transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos para impresión térmica */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-pos-ticket,
          #thermal-pos-ticket * {
            visibility: visible;
          }
          #thermal-pos-ticket {
            position: fixed;
            left: 0;
            top: 0;
            width: 76mm;
            margin: 0;
            padding: 8px;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
