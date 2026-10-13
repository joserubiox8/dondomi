'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChefHat,
  Bell,
  Clock,
  CheckCircle2,
  ArrowLeft,
  PackageCheck,
  Eye,
  Printer,
  Volume2,
  VolumeX,
  X,
  AlertCircle,
  MapPin,
  Phone,
  Bike,
  Plus,
  Edit2,
  Trash2,
  Save,
  DollarSign,
  TrendingUp,
  Settings,
  UtensilsCrossed,
  Power,
  LogOut,
  Calendar,
  Check,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';
import { playOrderAlertSound } from '@/lib/sound';
import { Order, OrderStatus, Product, Restaurant } from '@/types';

type MerchantTab = 'KDS' | 'MENU' | 'HORARIOS' | 'VENTAS';

export default function MerchantPage() {
  const router = useRouter();
  const {
    restaurants,
    orders,
    productsByRestaurant,
    updateOrderStatus,
    toggleProductAvailability,
    addProduct,
    updateProduct,
    deleteProduct,
    updateRestaurant,
    toggleRestaurantStatus,
    currentUser,
    logout,
  } = useApp();

  const [activeTab, setActiveTab] = useState<MerchantTab>('KDS');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const prevPendingCountRef = useRef<number>(0);

  // Modal para ticket térmico de comanda
  const [ticketOrder, setTicketOrder] = useState<Order | null>(null);

  // Modales de plato (Crear / Editar)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodPrice, setProdPrice] = useState<number>(0);
  const [prodCategory, setProdCategory] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodIsPopular, setProdIsPopular] = useState(false);

  // Notificación flotante de éxito
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 3500);
  };

  // Determinar el restaurante del usuario activo
  const currentRestaurantId =
    currentUser?.role === 'RESTAURANTE' && currentUser.restaurantId
      ? currentUser.restaurantId
      : restaurants[0]?.id || 'rest-1';

  const restaurant =
    restaurants.find((r) => r.id === currentRestaurantId) ||
    restaurants[0] || {
      id: 'rest-1',
      name: 'Restaurante',
      neighborhood: 'Valledupar',
      isOpen: true,
      phone: '300 000 0000',
      address: 'Valledupar, Cesar',
      openingHours: '11:00 AM - 10:00 PM',
      acceptsCash: true,
      acceptsNequi: true,
      acceptsBreb: true,
      acceptsDaviplata: true,
    };

  // Formulario de edición de restaurante/horarios
  const [restHours, setRestHours] = useState(restaurant.openingHours || '11:00 AM - 10:00 PM');
  const [restPhone, setRestPhone] = useState(restaurant.phone || '');
  const [restAddress, setRestAddress] = useState(restaurant.address || '');
  const [acceptsCash, setAcceptsCash] = useState(restaurant.acceptsCash !== false);
  const [acceptsNequi, setAcceptsNequi] = useState(restaurant.acceptsNequi !== false);
  const [acceptsBreb, setAcceptsBreb] = useState(restaurant.acceptsBreb !== false);
  const [acceptsDaviplata, setAcceptsDaviplata] = useState(restaurant.acceptsDaviplata !== false);

  useEffect(() => {
    if (restaurant) {
      setRestHours(restaurant.openingHours || '11:00 AM - 10:00 PM');
      setRestPhone(restaurant.phone || '');
      setRestAddress(restaurant.address || '');
      setAcceptsCash(restaurant.acceptsCash !== false);
      setAcceptsNequi(restaurant.acceptsNequi !== false);
      setAcceptsBreb(restaurant.acceptsBreb !== false);
      setAcceptsDaviplata(restaurant.acceptsDaviplata !== false);
    }
  }, [restaurant]);

  const products = productsByRestaurant[restaurant.id] || [];

  // Pedidos que pertenecen a este restaurante
  const restaurantOrders = orders.filter(
    (o) => o.restaurantId === restaurant.id || o.restaurantName === restaurant.name
  );

  const pendingOrders = restaurantOrders.filter((o) => o.status === 'PENDING');
  const preparingOrders = restaurantOrders.filter((o) => o.status === 'PREPARING');
  const readyOrDispatchedOrders = restaurantOrders.filter(
    (o) => o.status === 'READY_FOR_PICKUP' || o.status === 'ON_THE_WAY'
  );
  const deliveredOrders = restaurantOrders.filter((o) => o.status === 'DELIVERED');

  // Alerta sonora en tiempo real cuando llega un nuevo pedido PENDING
  useEffect(() => {
    const currentPendingCount = pendingOrders.length;
    if (audioEnabled && currentPendingCount > prevPendingCountRef.current) {
      playOrderAlertSound();
    }
    prevPendingCountRef.current = currentPendingCount;
  }, [pendingOrders.length, audioEnabled]);

  const handleTestAudio = () => {
    setAudioEnabled(true);
    playOrderAlertSound();
    showNotice('🔊 Timbre de cocina probado con éxito');
  };

  const handlePrintTicket = (order: Order) => {
    setTicketOrder(order);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Toggle rápido maestro de Abierto/Cerrado
  const handleToggleOpenClose = async () => {
    await toggleRestaurantStatus(restaurant.id);
    showNotice(
      restaurant.isOpen
        ? '🔴 Cocina pausada temporalmente'
        : '🟢 Cocina abierta para pedidos en DonDomi'
    );
  };

  // Guardar configuración de restaurante
  const handleSaveRestaurantSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Restaurant = {
      ...restaurant,
      openingHours: restHours,
      phone: restPhone,
      address: restAddress,
      acceptsCash,
      acceptsNequi,
      acceptsBreb,
      acceptsDaviplata,
    };
    await updateRestaurant(updated);
    showNotice('✅ Configuración y horarios guardados correctamente');
  };

  // Manejo de Modal de Platos
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDescription('');
    setProdPrice(18000);
    setProdCategory('Platos Fuertes');
    setProdImageUrl('');
    setProdIsPopular(false);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdDescription(prod.description);
    setProdPrice(prod.price);
    setProdCategory(prod.categoryName);
    setProdImageUrl(prod.imageUrl || '');
    setProdIsPopular(prod.isPopular || false);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodCategory.trim() || prodPrice <= 0) {
      alert('Completa los campos obligatorios del plato.');
      return;
    }

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        name: prodName.trim(),
        description: prodDescription.trim(),
        price: Number(prodPrice),
        categoryName: prodCategory.trim(),
        imageUrl: prodImageUrl.trim() || undefined,
        isPopular: prodIsPopular,
      };
      await updateProduct(restaurant.id, updated);
      showNotice(`✅ Plato "${updated.name}" actualizado`);
    } else {
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        restaurantId: restaurant.id,
        name: prodName.trim(),
        description: prodDescription.trim(),
        price: Number(prodPrice),
        categoryName: prodCategory.trim(),
        imageUrl: prodImageUrl.trim() || undefined,
        isAvailable: true,
        isPopular: prodIsPopular,
      };
      await addProduct(restaurant.id, newProd);
      showNotice(`🎉 Plato "${newProd.name}" creado en la carta`);
    }

    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = async (prodId: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el plato "${name}" de tu carta?`)) {
      await deleteProduct(restaurant.id, prodId);
      showNotice(`🗑️ Plato eliminado de la carta`);
    }
  };

  // Métricas financieras del restaurante
  const totalSalesDelivered = deliveredOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalOrdersCount = restaurantOrders.length;
  const avgTicket = deliveredOrders.length > 0 ? totalSalesDelivered / deliveredOrders.length : 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20 selection:bg-orange-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 px-4 py-3 shadow-md border-b border-slate-800">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition flex-shrink-0"
              title="Ir a vista cliente"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight truncate text-white">
                  {restaurant.name}
                </span>
                <span className="bg-orange-600/30 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-500/30 flex-shrink-0">
                  Panel Aliado
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {restaurant.neighborhood} · Valledupar
              </p>
            </div>
          </div>

          {/* Estado de Apertura y Salir */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleToggleOpenClose}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                restaurant.isOpen
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
              title="Cambiar estado de apertura de la cocina"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  restaurant.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                }`}
              ></span>
              <span className="hidden sm:inline">
                {restaurant.isOpen ? 'Cocina Abierta' : 'Cocina Cerrada'}
              </span>
              <span className="sm:hidden">{restaurant.isOpen ? 'Abierto' : 'Cerrado'}</span>
            </button>

            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              title="Cerrar turno y salir"
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Notificación flotante */}
      {noticeMessage && (
        <div className="fixed top-16 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold border border-slate-700 animate-in slide-in-from-top-2 flex items-center gap-2">
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-4 gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('KDS')}
            className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
              activeTab === 'KDS'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Comandas ({pendingOrders.length + preparingOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('MENU')}
            className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
              activeTab === 'MENU'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Mi Carta ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('HORARIOS')}
            className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
              activeTab === 'HORARIOS'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Horarios & Operación</span>
          </button>

          <button
            onClick={() => setActiveTab('VENTAS')}
            className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
              activeTab === 'VENTAS'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Cierre de Caja</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* PESTAÑA 1: COMANDAS EN VIVO (KDS) */}
        {/* ============================================================== */}
        {activeTab === 'KDS' && (
          <div className="space-y-4">
            {/* Control Bar: Audio & Timbre */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950 shadow-2xs">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 block">
                  Recepción de Pedidos en Tiempo Real
                </span>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Los pedidos entran directamente a cocina. Al preparar, puedes despachar con tu propio domiciliario o solicitar un Domiciliario DonDomi ($7.000 COP fijo).
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                <button
                  onClick={handleTestAudio}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Probar Timbre</span>
                </button>

                <Link
                  href={`/restaurant/${restaurant.id}`}
                  target="_blank"
                  className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Carta Pública</span>
                </Link>
              </div>
            </div>

            {/* Métricas de Comanda */}
            <div className="grid grid-cols-4 gap-2.5">
              <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200 shadow-2xs text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Nuevos</span>
                <span className="text-xl sm:text-2xl font-black text-amber-600 mt-1 block">
                  {pendingOrders.length}
                </span>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200 shadow-2xs text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">En Cocina</span>
                <span className="text-xl sm:text-2xl font-black text-blue-600 mt-1 block">
                  {preparingOrders.length}
                </span>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200 shadow-2xs text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">En Ruta / Listos</span>
                <span className="text-xl sm:text-2xl font-black text-indigo-600 mt-1 block">
                  {readyOrDispatchedOrders.length}
                </span>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200 shadow-2xs text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Entregados</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 block">
                  {deliveredOrders.length}
                </span>
              </div>
            </div>

            {/* Listado de Pedidos Activos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-orange-600" />
                  <span>Pedidos Activos en Cocina ({pendingOrders.length + preparingOrders.length + readyOrDispatchedOrders.length})</span>
                </h3>
              </div>

              {restaurantOrders.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700 text-sm">No hay pedidos registrados hoy</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Cuando un cliente ordene en DonDomi, sonará el timbre de cocina y aparecerá aquí inmediatamente.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {restaurantOrders.map((order) => {
                    const isNew = order.status === 'PENDING';
                    const isPreparing = order.status === 'PREPARING';
                    const isReady = order.status === 'READY_FOR_PICKUP';
                    const isOnTheWay = order.status === 'ON_THE_WAY';
                    const isDelivered = order.status === 'DELIVERED';
                    const isCancelled = order.status === 'CANCELLED';

                    return (
                      <div
                        key={order.id}
                        className={`bg-white rounded-3xl p-4 sm:p-5 border transition shadow-xs space-y-3 ${
                          isNew
                            ? 'border-orange-400 ring-2 ring-orange-500/20 bg-orange-50/20'
                            : isCancelled
                            ? 'border-red-200 bg-red-50/10 opacity-75'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-base">{order.orderNumber}</span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-bold text-slate-700">
                              Cliente: {order.customerName}
                            </span>
                            <a
                              href={`tel:${order.customerPhone}`}
                              className="text-xs text-blue-600 hover:underline font-bold"
                            >
                              ({order.customerPhone})
                            </a>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900">
                              Total: {formatCOP(order.total)}
                            </span>

                            <button
                              onClick={() => handlePrintTicket(order)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
                              title="Imprimir comanda térmica POS"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                              <span className="hidden sm:inline">Comanda POS</span>
                            </button>
                          </div>
                        </div>

                        {/* Platos a preparar */}
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                          <span className="font-bold text-slate-700 block">Platos a preparar:</span>
                          {order.items.map((it) => (
                            <div key={it.id} className="font-medium text-slate-800">
                              <div className="flex justify-between">
                                <span>
                                  • <strong className="text-orange-600 font-extrabold">{it.quantity}x</strong>{' '}
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
                            <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200 mt-1">
                              ⚠️ Nota del cliente: &quot;{order.customerNotes}&quot;
                            </p>
                          )}
                        </div>

                        {/* Entrega y Forma de pago */}
                        <div className="text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                          <span>
                            📍 Dirección:{' '}
                            <strong>
                              {order.deliveryAddress.street}, {order.deliveryAddress.neighborhood}
                            </strong>
                            {order.deliveryAddress.reference && ` (${order.deliveryAddress.reference})`}
                          </span>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                order.paymentMethod === 'EFECTIVO'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              Pago: {order.paymentMethod}
                            </span>
                            <span className="font-bold text-slate-700">
                              Domicilio: {formatCOP(order.deliveryFee)}
                            </span>
                          </div>
                        </div>

                        {/* Botones de cambio de estado en cocina */}
                        <div className="pt-1 flex flex-wrap items-center gap-2">
                          {isNew && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                              className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black py-2.5 px-4 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2"
                            >
                              <ChefHat className="w-4 h-4" />
                              <span>Aceptar Pedido e Iniciar Cocina</span>
                            </button>
                          )}

                          {isPreparing && (
                            <div className="flex-1 flex flex-wrap gap-2">
                              <button
                                onClick={() => updateOrderStatus(order.id, 'READY_FOR_PICKUP')}
                                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                              >
                                <PackageCheck className="w-4 h-4" />
                                <span>Empacado · Solicitar DonDomi</span>
                              </button>
                              <button
                                onClick={() => updateOrderStatus(order.id, 'ON_THE_WAY')}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                              >
                                <Bike className="w-4 h-4" />
                                <span>Despachar con Domiciliario Propio</span>
                              </button>
                            </div>
                          )}

                          {isReady && (
                            <div className="flex-1 flex flex-wrap items-center justify-between gap-2 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                              <div className="text-xs text-amber-900">
                                <span className="font-bold block">Listo para entrega</span>
                                <span className="text-[11px] text-amber-700">
                                  {order.driverName
                                    ? `Repartidor asignado: ${order.driverName}`
                                    : 'Visible en el radar de domiciliarios DonDomi'}
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

                          {isOnTheWay && (
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
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Confirmar Entrega</span>
                              </button>
                            </div>
                          )}

                          {isDelivered && (
                            <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Entregado y liquidado con éxito</span>
                            </div>
                          )}

                          {isCancelled && (
                            <div className="text-xs font-bold text-red-700 flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-xl border border-red-200">
                              <AlertCircle className="w-4 h-4 text-red-500" />
                              <span>Pedido cancelado</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 2: GESTIÓN DE MENÚ Y CARTA */}
        {/* ============================================================== */}
        {activeTab === 'MENU' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Carta de {restaurant.name} ({products.length} platos)
                </h3>
                <p className="text-xs text-slate-500">
                  Administra los platos, precios y disponibilidad en tiempo real.
                </p>
              </div>

              <button
                onClick={handleOpenAddProduct}
                className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold px-3.5 py-2 rounded-2xl text-xs transition flex items-center gap-1.5 shadow-md shadow-orange-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Nuevo Plato</span>
              </button>
            </div>

            {products.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
                <UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">Tu carta está vacía</p>
                <p className="text-xs text-slate-400">
                  Agrega tu primer plato para que los clientes en Valledupar puedan pedir.
                </p>
                <button
                  onClick={handleOpenAddProduct}
                  className="bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs"
                >
                  Crear Plato Ahora
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {products.map((prod) => (
                  <div
                    key={prod.id}
                    className={`bg-white rounded-3xl p-4 border transition shadow-xs flex flex-col justify-between gap-3 ${
                      prod.isAvailable ? 'border-slate-200' : 'border-red-200 bg-red-50/20 opacity-80'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                            {prod.categoryName}
                          </span>
                          <h4 className="font-extrabold text-slate-900 text-sm mt-1">
                            {prod.name}
                          </h4>
                        </div>
                        <span className="text-sm font-black text-slate-900">
                          {formatCOP(prod.price)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {prod.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      {/* Switch Agotado Hoy */}
                      <button
                        onClick={() => toggleProductAvailability(restaurant.id, prod.id)}
                        className={`px-2.5 py-1 rounded-xl font-bold text-[11px] transition flex items-center gap-1 ${
                          prod.isAvailable
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                        title="Cambiar disponibilidad del plato"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            prod.isAvailable ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                        ></span>
                        <span>{prod.isAvailable ? 'Disponible' : 'Agotado hoy'}</span>
                      </button>

                      {/* Botones Editar y Borrar */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditProduct(prod)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Editar plato"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition"
                          title="Eliminar plato"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 3: HORARIOS Y OPERACIÓN */}
        {/* ============================================================== */}
        {activeTab === 'HORARIOS' && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Horarios y Configuración Operativa
              </h3>
              <p className="text-xs text-slate-500">
                Configura cómo y cuándo los clientes pueden pedir a tu restaurante.
              </p>
            </div>

            <form onSubmit={handleSaveRestaurantSettings} className="space-y-4">
              {/* Horario de Atención */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Horario de Atención (Visible en la App)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={restHours}
                    onChange={(e) => setRestHours(e.target.value)}
                    placeholder="Ej: 11:00 AM - 10:30 PM"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Teléfono / WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Celular / WhatsApp de Contacto
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={restPhone}
                    onChange={(e) => setRestPhone(e.target.value)}
                    placeholder="Ej: 300 456 7890"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Dirección en Valledupar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dirección del Local
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={restAddress}
                    onChange={(e) => setRestAddress(e.target.value)}
                    placeholder="Ej: Carrera 9 # 12-40, Centro"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Formas de Pago Aceptadas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Formas de Pago que Recibe tu Restaurante
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={acceptsCash}
                      onChange={(e) => setAcceptsCash(e.target.checked)}
                      className="accent-orange-600 rounded"
                    />
                    <span>Efectivo</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={acceptsNequi}
                      onChange={(e) => setAcceptsNequi(e.target.checked)}
                      className="accent-orange-600 rounded"
                    />
                    <span>Nequi</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={acceptsBreb}
                      onChange={(e) => setAcceptsBreb(e.target.checked)}
                      className="accent-orange-600 rounded"
                    />
                    <span>Llave Bre-B</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={acceptsDaviplata}
                      onChange={(e) => setAcceptsDaviplata(e.target.checked)}
                      className="accent-orange-600 rounded"
                    />
                    <span>Daviplata</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-5 py-3 rounded-2xl text-xs transition flex items-center gap-2 shadow-md"
              >
                <Save className="w-4 h-4 text-orange-400" />
                <span>Guardar Cambios Operativos</span>
              </button>
            </form>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 4: CIERRE DE CAJA Y MÉTRICAS */}
        {/* ============================================================== */}
        {activeTab === 'VENTAS' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Ventas Entregadas Hoy
                </span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block">
                  {formatCOP(totalSalesDelivered)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Subtotal de platos vendidos</span>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Pedidos Atendidos
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {deliveredOrders.length} / {totalOrdersCount}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {deliveredOrders.length} completados con éxito
                </span>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Ticket Promedio
                </span>
                <span className="text-2xl font-black text-orange-600 mt-1 block">
                  {formatCOP(avgTicket)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Por pedido entregado</span>
              </div>
            </div>

            {/* Historial de Ventas */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
              <h4 className="font-extrabold text-sm text-slate-900">
                Historial de Pedidos ({restaurantOrders.length})
              </h4>

              {restaurantOrders.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No hay pedidos registrados.</p>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {restaurantOrders.map((o) => (
                    <div key={o.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-black text-slate-900">{o.orderNumber}</span>
                        <span className="text-slate-400 mx-1.5">•</span>
                        <span className="text-slate-600 font-medium">{o.customerName}</span>
                        <span className="text-[10px] text-slate-400 block">{o.paymentMethod}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900 block">{formatCOP(o.total)}</span>
                        <span
                          className={`text-[10px] font-bold ${
                            o.status === 'DELIVERED'
                              ? 'text-emerald-600'
                              : o.status === 'CANCELLED'
                              ? 'text-red-500'
                              : 'text-amber-600'
                          }`}
                        >
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL CREAR / EDITAR PLATO */}
      {/* ============================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900">
                {editingProduct ? 'Editar Plato' : 'Agregar Nuevo Plato a la Carta'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Plato</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Ej: Salchipapa Monumental Valledupar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoría en tu Menú</label>
                <input
                  type="text"
                  required
                  value={prodCategory}
                  onChange={(e) => setProdCategory(e.target.value)}
                  placeholder="Ej: Salchipapas, Hamburguesas, Bebidas"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Precio ($ COP)</label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={500}
                  value={prodPrice}
                  onChange={(e) => setProdPrice(Number(e.target.value))}
                  placeholder="25000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción / Ingredientes</label>
                <textarea
                  rows={2}
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  placeholder="Papas a la francesa crocantes, salchicha premium, queso costeño y salsas de la casa."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">URL de Foto (Opcional)</label>
                <input
                  type="url"
                  value={prodImageUrl}
                  onChange={(e) => setProdImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={prodIsPopular}
                  onChange={(e) => setProdIsPopular(e.target.checked)}
                  className="accent-orange-600 rounded"
                />
                <span>Marcar como Plato Más Vendido / Destacado</span>
              </label>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md"
                >
                  Guardar Plato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DIÁLOGO IMPRESIÓN COMANDA TÉRMICA POS (58mm/80mm) */}
      {/* ============================================================== */}
      {ticketOrder && (
        <div id="print-ticket" className="hidden print:block fixed inset-0 bg-white p-4 font-mono text-black text-xs leading-tight">
          <div className="text-center pb-2 border-b border-black">
            <h2 className="text-base font-black">*** DON DOMI ***</h2>
            <p className="font-bold">{ticketOrder.restaurantName}</p>
            <p className="text-[10px]">Valledupar, Cesar</p>
            <p className="font-bold mt-1">ORDEN: #{ticketOrder.orderNumber}</p>
            <p className="text-[10px]">{new Date().toLocaleString('es-CO')}</p>
          </div>

          <div className="py-2 border-b border-black space-y-1">
            <p><strong>CLIENTE:</strong> {ticketOrder.customerName}</p>
            <p><strong>TEL:</strong> {ticketOrder.customerPhone}</p>
            <p><strong>DIR:</strong> {ticketOrder.deliveryAddress.street}, {ticketOrder.deliveryAddress.neighborhood}</p>
            {ticketOrder.deliveryAddress.reference && (
              <p><strong>REF:</strong> {ticketOrder.deliveryAddress.reference}</p>
            )}
          </div>

          <div className="py-2 border-b border-black space-y-1">
            <p className="font-bold">ITEMS A PREPARAR:</p>
            {ticketOrder.items.map((it) => (
              <div key={it.id} className="flex justify-between">
                <span>{it.quantity}x {it.productName}</span>
                <span>{formatCOP(it.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="py-2 border-b border-black space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCOP(ticketOrder.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Domicilio:</span>
              <span>{formatCOP(ticketOrder.deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-black text-sm pt-1 border-t border-black">
              <span>TOTAL A COBRAR:</span>
              <span>{formatCOP(ticketOrder.total)}</span>
            </div>
            <p className="pt-1"><strong>PAGO:</strong> {ticketOrder.paymentMethod}</p>
          </div>

          <div className="text-center pt-2 text-[10px]">
            <p>*** www.dondomi.com ***</p>
            <p>Valledupar, Cesar, Colombia</p>
          </div>
        </div>
      )}
    </div>
  );
}
