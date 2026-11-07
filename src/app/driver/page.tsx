'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Bike,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  Clock,
  ArrowLeft,
  AlertCircle,
  PackageCheck,
  LogOut,
  Store,
  X,
  MessageCircle,
  Wallet,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';
import {
  calculateDriverSettlement,
  filterOrdersByPeriod,
  isOwnFleetOrder,
} from '@/lib/pricing';
import { Order } from '@/types';

export default function DriverPage() {
  const {
    currentUser,
    orders,
    restaurants,
    drivers,
    claimOrder,
    confirmOrderPickup,
    unclaimOrder,
    updateOrderStatus,
    toggleDriverAvailability,
    logout,
    loginAsDriver,
    globalDeliveryFee,
  } = useApp();

  const [loginIdentity, setLoginIdentity] = useState<string>('');
  const [loginPass, setLoginPass] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const isDriverAuthenticated = currentUser?.role === 'DOMICILIARIO';

  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await loginAsDriver(loginIdentity, loginPass);
      if (!res.success) {
        setLoginError(res.error || 'Credenciales de domiciliario inválidas.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const [walletPeriod, setWalletPeriod] = useState<'TODAY' | 'ALL'>('TODAY');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState<boolean>(false);
  const [incidentReason, setIncidentReason] = useState<string>('Avería o pinchazo en la motocicleta');
  const [customIncidentReason, setCustomIncidentReason] = useState<string>('');
  const [isReleasing, setIsReleasing] = useState<boolean>(false);

  const defaultFee = globalDeliveryFee || 7000;
  const driverId = currentUser?.role === 'DOMICILIARIO' ? currentUser.id : 'drv-1';
  const driverName = currentUser?.role === 'DOMICILIARIO' ? currentUser.name : 'Javier Morales';

  const driverRecord = useMemo(
    () =>
      drivers.find(
        (d) =>
          d.id === driverId ||
          d.name.toLowerCase() === driverName.toLowerCase() ||
          (currentUser?.email && d.email.toLowerCase() === currentUser.email.toLowerCase())
      ),
    [drivers, driverId, driverName, currentUser]
  );

  const isAccountActive = driverRecord ? driverRecord.isActive !== false : true;
  const isAvailable = driverRecord ? driverRecord.isAvailable !== false : true;

  // Pedido activo asignado a este repartidor (en recogida PREPARING/READY_FOR_PICKUP o en ruta ON_THE_WAY)
  const activeOrder = useMemo(
    () =>
      orders.find(
        (o) =>
          (o.driverId === driverId || o.driverName === driverName) &&
          (o.status === 'ON_THE_WAY' || o.status === 'READY_FOR_PICKUP' || o.status === 'PREPARING')
      ),
    [orders, driverId, driverName]
  );

  // Pedidos disponibles en el radar: solo los que la cocina YA aceptó (PREPARING o READY_FOR_PICKUP),
  // que no tengan domiciliario asignado y que no sean de flota propia del restaurante.
  const availableOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          (o.status === 'READY_FOR_PICKUP' || o.status === 'PREPARING') &&
          !o.driverId &&
          !isOwnFleetOrder(o) &&
          (!activeOrder || activeOrder.id !== o.id)
      ),
    [orders, activeOrder]
  );

  // Pedidos entregados por este repartidor
  const allDriverDeliveredOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          (o.driverId === driverId || o.driverName === driverName) &&
          o.status === 'DELIVERED' &&
          !isOwnFleetOrder(o)
      ),
    [orders, driverId, driverName]
  );

  const filteredDeliveredOrders = useMemo(
    () => filterOrdersByPeriod(allDriverDeliveredOrders, walletPeriod),
    [allDriverDeliveredOrders, walletPeriod]
  );

  const settlement = useMemo(
    () => calculateDriverSettlement(filteredDeliveredOrders, defaultFee),
    [filteredDeliveredOrders, defaultFee]
  );

  // Sonido de alerta para carreras
  const playChime = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

  const handleToggleTurn = async () => {
    setErrorNotice(null);
    if (!driverRecord) return;
    if (isAvailable && activeOrder) {
      setErrorNotice(
        `No puedes pausar tu turno mientras tienes la carrera #${activeOrder.orderNumber} activa. Entrégala o libérala primero.`
      );
      return;
    }
    const res = await toggleDriverAvailability(driverRecord.id);
    if (!res.ok) {
      setErrorNotice(
        res.error || 'No se pudo actualizar tu estado de turno en Supabase.'
      );
    }
  };

  const handleClaim = async (order: Order) => {
    setErrorNotice(null);
    if (!isAccountActive) {
      setErrorNotice('Tu cuenta de domiciliario se encuentra suspendida temporalmente por administración.');
      return;
    }
    if (!isAvailable) {
      setErrorNotice('Debes cambiar tu estado a "En Turno" en la parte superior para aceptar carreras.');
      return;
    }
    if (activeOrder) {
      setErrorNotice(`Ya tienes la carrera #${activeOrder.orderNumber} en curso. Entrégala antes de tomar otra.`);
      return;
    }

    playChime();
    const result = await claimOrder(order.id, driverName, currentUser?.phone || '3001234567');
    if (result.success) {
      setSuccessNotice(
        `¡Carrera #${order.orderNumber} asignada a ti! Dirígete a ${order.restaurantName} para recoger el paquete.`
      );
      setTimeout(() => setSuccessNotice(null), 4000);
    } else {
      setErrorNotice(result.error || 'Esta carrera ya fue tomada por otro domiciliario.');
      setTimeout(() => setErrorNotice(null), 5000);
    }
  };

  const handleConfirmPickup = async (orderId: string, orderNumber: string) => {
    setErrorNotice(null);
    const ok = await confirmOrderPickup(orderId);
    if (!ok) {
      setErrorNotice('No se pudo confirmar la recogida en Supabase. Verifica tu conexión.');
      return;
    }
    playChime();
    setSuccessNotice(`📦 Recogida de #${orderNumber} confirmada. ¡En camino hacia el cliente!`);
    setTimeout(() => setSuccessNotice(null), 4000);
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
      const ok = await unclaimOrder(activeOrder.id, finalReason);
      if (!ok) {
        setErrorNotice('No se pudo liberar la carrera en Supabase. Intenta nuevamente.');
        return;
      }
      setSuccessNotice(
        `Carrera #${activeOrder.orderNumber} liberada. El pedido volvió al radar para otros repartidores.`
      );
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
    setErrorNotice(null);
    const ok = await updateOrderStatus(orderId, 'DELIVERED');
    if (!ok) {
      setErrorNotice('No se pudo registrar la entrega en Supabase. Verifica tu conexión.');
      return;
    }
    playChime();
    setSuccessNotice(`¡Excelente! Entrega confirmada y sumada a tu billetera.`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Buscar información completa del restaurante para el Punto A de recogida
  const getRestaurantDetails = (restId?: string, restName?: string) => {
    const r = restaurants.find((item) => item.id === restId || item.name === restName);
    return {
      address: r?.address || 'Centro, Valledupar',
      neighborhood: r?.neighborhood || 'Valledupar',
      phone: (r?.phone || '3004567890').replace(/\D/g, ''),
    };
  };

  const activeRestDetails = activeOrder
    ? getRestaurantDetails(activeOrder.restaurantId, activeOrder.restaurantName)
    : null;

  if (!isDriverAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6 selection:bg-emerald-500 selection:text-white">
        <header className="max-w-md w-full mx-auto flex items-center justify-between py-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>Ir a la tienda</span>
          </Link>
          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            DonDomi Flota
          </span>
        </header>

        <main className="max-w-md w-full mx-auto my-auto py-4">
          <div className="bg-slate-800/95 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-emerald-600/30">
                <Bike className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-black text-white">DonDomi Flota</h1>
              <p className="text-xs text-slate-400">
                Ingresa con tus credenciales individuales asignadas por DonDomi
              </p>
            </div>

            {loginError && (
              <div className="p-3 bg-red-950/70 border border-red-500/40 rounded-2xl text-xs font-bold text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleDriverLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Correo, Celular (10 dígitos) o Código de Domiciliario
                </label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={loginIdentity}
                  onChange={(e) => setLoginIdentity(e.target.value)}
                  placeholder="Ej: 3001234567 o correo@dondomi.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Contraseña Personal
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-emerald-600/25 transition text-sm cursor-pointer"
              >
                {isLoggingIn ? 'Verificando credenciales...' : 'Iniciar Turno de Reparto'}
              </button>
            </form>
          </div>
        </main>

        <footer className="text-center text-[11px] text-slate-500 py-2">
          DonDomi Flota · Valledupar
        </footer>
      </div>
    );
  }

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
                {driverName} {driverRecord?.plate ? `· ${driverRecord.plate}` : '· Moto'}
              </p>
            </div>
          </div>

          {/* Acciones de cabecera */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleTurn}
              disabled={!isAccountActive}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                !isAccountActive
                  ? 'bg-red-900/50 text-red-300 border border-red-700'
                  : isAvailable
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  !isAccountActive
                    ? 'bg-red-500'
                    : isAvailable
                    ? 'bg-emerald-400 animate-ping'
                    : 'bg-amber-400'
                }`}
              ></span>
              <span>
                {!isAccountActive ? 'Suspendido' : isAvailable ? 'En Turno' : 'Pausado'}
              </span>
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
        {/* Banner de aviso si cuenta suspendida */}
        {!isAccountActive && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 text-xs text-red-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-black">Cuenta Suspendida por Administración</p>
              <p className="text-[11px] text-red-700 mt-0.5">
                Comunícate con la Torre de Control de DonDomi en Valledupar para reactivar tu perfil.
              </p>
            </div>
          </div>
        )}

        {/* Notificación de éxito */}
        {successNotice && (
          <div className="bg-emerald-600 text-white p-3 rounded-2xl text-xs font-bold shadow-md animate-in slide-in-from-top-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Notificación de error */}
        {errorNotice && (
          <div className="bg-red-600 text-white p-3 rounded-2xl text-xs font-bold shadow-md animate-in slide-in-from-top-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* Billetera y Resumen Financiero del Domiciliario */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-black text-slate-900">Mi Billetera & Efectivo</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setWalletPeriod('TODAY')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  walletPeriod === 'TODAY' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setWalletPeriod('ALL')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  walletPeriod === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Histórico
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Entregas</span>
              <span className="text-lg font-black text-slate-900 mt-0.5 block">
                {settlement.completedDeliveries}
              </span>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-2xl border border-emerald-100">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                Mi Ganancia
              </span>
              <span className="text-lg font-black text-emerald-600 mt-0.5 block">
                {formatCOP(settlement.driverDeliveryEarnings)}
              </span>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-2xl border border-amber-100">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">
                Efectivo Recibido
              </span>
              <span className="text-lg font-black text-amber-700 mt-0.5 block">
                {formatCOP(settlement.totalCashCollectedFromCustomers)}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
            <div className="text-slate-600">
              <span>Comida en efectivo (entregar al local):</span>
              <strong className="block text-slate-900 font-black">
                {formatCOP(settlement.cashFoodToHandOverToRestaurants)}
              </strong>
            </div>
            <div className="text-right text-slate-600">
              <span>Domicilios digitales a mi favor:</span>
              <strong className="block text-blue-600 font-black">
                {formatCOP(settlement.digitalDeliveryFeesOwedToDriver)}
              </strong>
            </div>
          </div>
        </div>

        {/* SECCIÓN 1: CARRERA EN CURSO (SI TIENE PEDIDO ASIGNADO) */}
        {activeOrder && activeRestDetails && (
          <div className="bg-white rounded-3xl p-5 border-2 border-orange-500 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center animate-bounce">
                  <Bike className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {activeOrder.status === 'ON_THE_WAY'
                      ? 'En Ruta hacia el Cliente'
                      : 'Paso 1: Recoger en Restaurante'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold">
                    Orden #{activeOrder.orderNumber} ·{' '}
                    {activeOrder.status === 'PREPARING'
                      ? 'Preparándose en cocina'
                      : activeOrder.status === 'READY_FOR_PICKUP'
                      ? '¡Listo empacado para recoger!'
                      : 'En camino al destino'}
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
                    Instrucción de Cobro en Efectivo
                  </span>
                  <p className="text-sm font-black text-amber-950">
                    COBRAR AL CLIENTE: {formatCOP(activeOrder.total)}
                  </p>
                  <p className="text-[11px] text-amber-900 mt-0.5 font-medium">
                    Comida: {formatCOP(activeOrder.subtotal)} + Tu domicilio:{' '}
                    {formatCOP(activeOrder.deliveryFee || defaultFee)}.
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
                    PAGO POR TRANSFERENCIA ({activeOrder.paymentMethod}) — NO COBRAR AL CLIENTE
                  </p>
                  <p className="text-[11px] text-emerald-900 mt-0.5 font-medium">
                    El cliente transfiere a la cuenta del restaurante. Tu domicilio de{' '}
                    <strong>{formatCOP(activeOrder.deliveryFee || defaultFee)}</strong> queda a tu favor en la liquidación del restaurante.
                  </p>
                </div>
              </div>
            )}

            {/* Ruta en Valledupar con Dirección Exacta en Punto A y Punto B */}
            <div className="space-y-3.5 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {/* Punto A: Recogida en Restaurante */}
              <div className="relative space-y-1.5">
                <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-orange-600 border-2 border-white shadow-xs"></span>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  1. Recoger en Restaurante
                </span>
                <p className="text-xs font-black text-slate-900">{activeOrder.restaurantName}</p>
                <p className="text-[11px] text-slate-600 font-medium">
                  📍 {activeRestDetails.address} · {activeRestDetails.neighborhood}
                </p>
                <div className="flex items-center gap-2 pt-0.5">
                  <a
                    href={`tel:${activeRestDetails.phone}`}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Llamar Local</span>
                  </a>
                  <a
                    href={`https://wa.me/57${activeRestDetails.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>WhatsApp Local</span>
                  </a>
                </div>
              </div>

              {/* Punto B: Entrega al Cliente */}
              <div className="relative pt-1 space-y-1">
                <span className="absolute -left-6 top-2.5 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white shadow-xs"></span>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  2. Entregar al Cliente
                </span>
                <p className="text-xs font-black text-slate-900">
                  {activeOrder.customerName} ({activeOrder.customerPhone})
                </p>
                <p className="text-[11px] text-slate-600 font-medium">
                  📍 {activeOrder.deliveryAddress.street}, {activeOrder.deliveryAddress.neighborhood}
                </p>
                {activeOrder.deliveryAddress.reference && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg mt-1 border border-amber-200 inline-block">
                    Ref: {activeOrder.deliveryAddress.reference}
                  </p>
                )}
              </div>
            </div>

            {/* Detalle de ítems del paquete */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-700">
                <span>Contenido del paquete:</span>
                <span>
                  {activeOrder.items.reduce((s, i) => s + i.quantity, 0)} unidades
                </span>
              </div>
              {activeOrder.items.map((it) => (
                <p key={it.id} className="text-[11px] text-slate-600">
                  • <strong>{it.quantity}x</strong> {it.productName}
                </p>
              ))}
            </div>

            {/* Botones de contacto y GPS al Cliente */}
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
                <span>Ruta GPS Cliente</span>
              </a>
            </div>

            {/* Paso 1 (Confirmar Recogida) o Paso 2 (Confirmar Entrega) + Liberar carrera */}
            <div className="space-y-2 pt-1">
              {activeOrder.status !== 'ON_THE_WAY' ? (
                <button
                  type="button"
                  onClick={() => handleConfirmPickup(activeOrder.id, activeOrder.orderNumber)}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-orange-600/25 transition text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Ya Recogí el Pedido · Iniciar Ruta</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDeliver(activeOrder.id)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-emerald-600/25 transition text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Entrega Realizada</span>
                </button>
              )}

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
              <span>Radar de Carreras Disponibles ({availableOrders.length})</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-semibold">
              Tarifa {formatCOP(defaultFee)}
            </span>
          </div>

          {availableOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center space-y-1.5">
              <Clock className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-xs">No hay carreras listas por tomar</p>
              <p className="text-[11px] text-slate-400">
                Cuando las cocinas acepten o empaquen nuevos pedidos, aparecerán aquí en tiempo real.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableOrders.map((order) => {
                const restInfo = getRestaurantDetails(order.restaurantId, order.restaurantName);
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3 hover:border-orange-300 transition"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">
                          #{order.orderNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            order.status === 'READY_FOR_PICKUP'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {order.status === 'READY_FOR_PICKUP' ? '📦 Listo para recoger' : '🍳 En preparación'}
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
                          <strong>Recoger:</strong> {order.restaurantName} ({restInfo.address},{' '}
                          {restInfo.neighborhood})
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
                            Transferencia ({order.paymentMethod})
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={!!activeOrder || !isAvailable || !isAccountActive}
                        onClick={() => handleClaim(order)}
                        className={`font-extrabold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 ${
                          !!activeOrder || !isAvailable || !isAccountActive
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-500/20 cursor-pointer'
                        }`}
                      >
                        <Bike className="w-3.5 h-3.5" />
                        <span>Aceptar Carrera</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECCIÓN 3: HISTORIAL DE ENTREGAS COMPLETADAS */}
        {filteredDeliveredOrders.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Entregas completadas ({walletPeriod === 'TODAY' ? 'Hoy' : 'Histórico'}:{' '}
              {filteredDeliveredOrders.length})
            </h4>
            <div className="space-y-2">
              {filteredDeliveredOrders.map((o) => (
                <div
                  key={o.id}
                  className="bg-white p-3 rounded-2xl border border-slate-200 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900">#{o.orderNumber}</span>
                      <span className="text-[11px] text-slate-400 block">
                        {o.deliveryAddress.neighborhood} · {o.restaurantName} ({o.paymentMethod})
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-emerald-600 block">
                      +{formatCOP(o.deliveryFee || defaultFee)}
                    </span>
                    {o.paymentMethod === 'EFECTIVO' && (
                      <span className="text-[10px] text-amber-700 font-semibold">
                        Recaudado: {formatCOP(o.total)}
                      </span>
                    )}
                  </div>
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
                    'Demora excesiva en restaurante',
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
