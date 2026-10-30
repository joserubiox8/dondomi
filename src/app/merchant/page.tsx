'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  ArrowLeft,
  PackageCheck,
  Eye,
  Printer,
  Volume2,
  X,
  AlertCircle,
  MapPin,
  Phone,
  Bike,
  Plus,
  Edit2,
  Trash2,
  Save,
  TrendingUp,
  Settings,
  UtensilsCrossed,
  LogOut,
  Check,
  Search,
  Wallet,
  Sliders,
  Star,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';
import {
  filterOrdersByPeriod,
  calculateRestaurantSettlement,
  SettlementPeriod,
} from '@/lib/pricing';
import { playOrderAlertSound } from '@/lib/sound';
import {
  Order,
  Product,
  ProductOptionGroup,
  ProductOptionItem,
  Restaurant,
} from '@/types';

type MerchantTab = 'KDS' | 'MENU' | 'HORARIOS' | 'VENTAS';
type KdsFilter = 'ACTIVOS' | 'NUEVOS' | 'EN_COCINA' | 'EN_RUTA' | 'ENTREGADOS' | 'CANCELADOS';

export default function MerchantPage() {
  const {
    restaurants,
    orders,
    productsByRestaurant,
    updateOrderStatus,
    dispatchWithOwnDriver,
    confirmOrderPayment,
    rejectOrder,
    toggleProductAvailability,
    addProduct,
    updateProduct,
    deleteProduct,
    updateRestaurant,
    toggleRestaurantStatus,
    currentUser,
    loginWithEmail,
    loginAsRestaurant,
    logout,
  } = useApp();

  // Estado para control de acceso interno en /merchant
  const [loginRestId, setLoginRestId] = useState<string>('');
  const [loginPin, setLoginPin] = useState<string>('');
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginMode, setLoginMode] = useState<'PIN' | 'EMAIL'>('PIN');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const isMerchantAuthenticated = currentUser?.role === 'RESTAURANTE';

  const handleMerchantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      if (loginMode === 'EMAIL') {
        const res = await loginWithEmail(loginEmail, loginPin);
        if (!res.success || res.role !== 'RESTAURANTE') {
          setLoginError(res.error || 'Credenciales de restaurante inválidas.');
        }
      } else {
        const targetId = loginRestId || restaurants[0]?.id || 'rest-1';
        const res = await loginAsRestaurant(targetId, loginPin);
        if (!res.success) {
          setLoginError(res.error || 'PIN de cocina incorrecto.');
        }
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const [activeTab, setActiveTab] = useState<MerchantTab>('KDS');
  const [kdsFilter, setKdsFilter] = useState<KdsFilter>('ACTIVOS');
  const [kdsSearch, setKdsSearch] = useState<string>('');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const prevPendingCountRef = useRef<number>(0);

  // Modal para ticket térmico de comanda o cierre de caja
  const [ticketOrder, setTicketOrder] = useState<Order | null>(null);
  const [printingSettlement, setPrintingSettlement] = useState<boolean>(false);

  // Modal para rechazar pedido
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Sin existencias / Ingredientes agotados');
  const [customRejectReason, setCustomRejectReason] = useState<string>('');
  const [isSubmittingReject, setIsSubmittingReject] = useState<boolean>(false);

  // Filtros en Mi Carta
  const [menuCategoryFilter, setMenuCategoryFilter] = useState<string>('TODAS');
  const [menuSearch, setMenuSearch] = useState<string>('');

  // Modales de plato (Crear / Editar con Opciones/Adiciones)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodPrice, setProdPrice] = useState<number>(0);
  const [prodOriginalPrice, setProdOriginalPrice] = useState<number>(0);
  const [prodPrepTime, setProdPrepTime] = useState<number>(20);
  const [prodCategory, setProdCategory] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodIsPopular, setProdIsPopular] = useState(false);
  const [prodOptions, setProdOptions] = useState<ProductOptionGroup[]>([]);
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);

  // Periodo para Cierre de Caja y Liquidaciones
  const [salesPeriod, setSalesPeriod] = useState<SettlementPeriod>('TODAY');

  // Notificación flotante de éxito
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 3500);
  };

  const handleOpenRejectModal = (order: Order) => {
    setRejectingOrder(order);
    setRejectReason('Sin existencias / Ingredientes agotados');
    setCustomRejectReason('');
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingOrder) return;
    const finalReason =
      rejectReason === 'Otro motivo'
        ? customRejectReason.trim() || 'Sin motivo especificado'
        : rejectReason + (customRejectReason.trim() ? ` (${customRejectReason.trim()})` : '');

    setIsSubmittingReject(true);
    try {
      await rejectOrder(rejectingOrder.id, finalReason);
      showNotice(`❌ Pedido ${rejectingOrder.orderNumber} rechazado`);
      setRejectingOrder(null);
    } catch (err: any) {
      showNotice(`❌ ${err?.message || 'Error al rechazar el pedido'}`);
    } finally {
      setIsSubmittingReject(false);
    }
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
      slug: 'restaurante',
      description: 'Restaurante afiliado en Valledupar',
      logoUrl: '',
      bannerUrl: '',
      rating: 5.0,
      reviewsCount: 1,
      tags: ['Local'],
      neighborhood: 'Valledupar',
      isOpen: true,
      phone: '3000000000',
      address: 'Valledupar, Cesar',
      openingHours: '11:00 AM - 10:00 PM',
      estimatedTimeMin: 25,
      estimatedTimeMax: 40,
      deliveryFeeBase: 7000,
      minOrderAmount: 15000,
      commissionRate: 0,
      acceptsCash: true,
      acceptsNequi: true,
      acceptsBreb: true,
      acceptsDaviplata: true,
    };

  // Formulario de edición de restaurante/horarios/cuentas de transferencia
  const [restHours, setRestHours] = useState(restaurant.openingHours || '11:00 AM - 10:00 PM');
  const [restPhone, setRestPhone] = useState(restaurant.phone || '');
  const [restAddress, setRestAddress] = useState(restaurant.address || '');
  const [restNeighborhood, setRestNeighborhood] = useState(restaurant.neighborhood || '');
  const [restDescription, setRestDescription] = useState(restaurant.description || '');
  const [restMinOrder, setRestMinOrder] = useState<number>(restaurant.minOrderAmount || 15000);
  const [restTimeMin, setRestTimeMin] = useState<number>(restaurant.estimatedTimeMin || 25);
  const [restTimeMax, setRestTimeMax] = useState<number>(restaurant.estimatedTimeMax || 40);
  const [acceptsCash, setAcceptsCash] = useState(restaurant.acceptsCash !== false);
  const [acceptsNequi, setAcceptsNequi] = useState(restaurant.acceptsNequi !== false);
  const [acceptsBreb, setAcceptsBreb] = useState(restaurant.acceptsBreb !== false);
  const [acceptsDaviplata, setAcceptsDaviplata] = useState(restaurant.acceptsDaviplata !== false);
  const [nequiNumber, setNequiNumber] = useState(restaurant.nequiNumber || '');
  const [daviplataNumber, setDaviplataNumber] = useState(restaurant.daviplataNumber || '');
  const [brebKey, setBrebKey] = useState(restaurant.brebKey || '');
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant) {
      setRestHours(restaurant.openingHours || '11:00 AM - 10:00 PM');
      setRestPhone(restaurant.phone || '');
      setRestAddress(restaurant.address || '');
      setRestNeighborhood(restaurant.neighborhood || '');
      setRestDescription(restaurant.description || '');
      setRestMinOrder(restaurant.minOrderAmount || 15000);
      setRestTimeMin(restaurant.estimatedTimeMin || 25);
      setRestTimeMax(restaurant.estimatedTimeMax || 40);
      setAcceptsCash(restaurant.acceptsCash !== false);
      setAcceptsNequi(restaurant.acceptsNequi !== false);
      setAcceptsBreb(restaurant.acceptsBreb !== false);
      setAcceptsDaviplata(restaurant.acceptsDaviplata !== false);
      setNequiNumber(restaurant.nequiNumber || '');
      setDaviplataNumber(restaurant.daviplataNumber || '');
      setBrebKey(restaurant.brebKey || '');
    }
  }, [restaurant]);

  const products = productsByRestaurant[restaurant.id] || [];
  const menuCategories = Array.from(new Set(products.map((p) => p.categoryName).filter(Boolean)));

  const filteredMenuProducts = products.filter((p) => {
    const matchesCat = menuCategoryFilter === 'TODAS' || p.categoryName === menuCategoryFilter;
    const q = menuSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

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
  const cancelledOrders = restaurantOrders.filter((o) => o.status === 'CANCELLED');

  const filteredKdsOrders = restaurantOrders.filter((o) => {
    const matchesTab =
      kdsFilter === 'ACTIVOS'
        ? o.status === 'PENDING' ||
          o.status === 'PREPARING' ||
          o.status === 'READY_FOR_PICKUP' ||
          o.status === 'ON_THE_WAY'
        : kdsFilter === 'NUEVOS'
        ? o.status === 'PENDING'
        : kdsFilter === 'EN_COCINA'
        ? o.status === 'PREPARING'
        : kdsFilter === 'EN_RUTA'
        ? o.status === 'READY_FOR_PICKUP' || o.status === 'ON_THE_WAY'
        : kdsFilter === 'ENTREGADOS'
        ? o.status === 'DELIVERED'
        : o.status === 'CANCELLED';

    const q = kdsSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q);

    return matchesTab && matchesSearch;
  });

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
    setPrintingSettlement(false);
    setTicketOrder(order);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handlePrintSettlement = () => {
    setTicketOrder(null);
    setPrintingSettlement(true);
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
    setSettingsError(null);

    const cleanPhone = restPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setSettingsError('El número de celular / WhatsApp debe tener exactamente 10 dígitos numéricos.');
      return;
    }

    if (!acceptsCash && !acceptsNequi && !acceptsBreb && !acceptsDaviplata) {
      setSettingsError('Debes habilitar al menos un método de pago para recibir pedidos.');
      return;
    }

    const updated: Restaurant = {
      ...restaurant,
      openingHours: restHours.trim(),
      phone: cleanPhone,
      address: restAddress.trim(),
      neighborhood: restNeighborhood.trim() || restaurant.neighborhood,
      description: restDescription.trim() || restaurant.description,
      minOrderAmount: Math.max(0, Number(restMinOrder) || 0),
      estimatedTimeMin: Math.max(5, Number(restTimeMin) || 25),
      estimatedTimeMax: Math.max(Number(restTimeMin) || 25, Number(restTimeMax) || 40),
      acceptsCash,
      acceptsNequi,
      acceptsBreb,
      acceptsDaviplata,
      nequiNumber: nequiNumber.trim() || undefined,
      daviplataNumber: daviplataNumber.trim() || undefined,
      brebKey: brebKey.trim() || undefined,
    };
    await updateRestaurant(updated);
    showNotice('✅ Configuración, horarios y cuentas guardadas correctamente');
  };

  // Manejo de Modal de Platos y Grupos de Opciones
  const handleOpenAddProduct = () => {
    setProductFormError(null);
    setEditingProduct(null);
    setProdName('');
    setProdDescription('');
    setProdPrice(18000);
    setProdOriginalPrice(0);
    setProdPrepTime(20);
    setProdCategory(menuCategories[0] || 'Platos Fuertes');
    setProdImageUrl('');
    setProdIsPopular(false);
    setProdOptions([]);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setProductFormError(null);
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdDescription(prod.description);
    setProdPrice(prod.price);
    setProdOriginalPrice(prod.originalPrice || 0);
    setProdPrepTime(prod.preparationTimeMin || 20);
    setProdCategory(prod.categoryName);
    setProdImageUrl(prod.imageUrl || '');
    setProdIsPopular(prod.isPopular || false);
    setProdOptions(
      prod.options
        ? prod.options.map((grp) => ({
            ...grp,
            items: grp.items.map((it) => ({ ...it })),
          }))
        : []
    );
    setIsProductModalOpen(true);
  };

  const handleAddOptionGroup = () => {
    const newGroup: ProductOptionGroup = {
      id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: 'Adiciones o Acompañamiento',
      required: false,
      minSelect: 0,
      maxSelect: 3,
      items: [
        {
          id: `opt-${Date.now()}-1`,
          name: 'Porción extra',
          additionalPrice: 4000,
        },
      ],
    };
    setProdOptions((prev) => [...prev, newGroup]);
  };

  const handleRemoveOptionGroup = (groupId: string) => {
    setProdOptions((prev) => prev.filter((g) => g.id !== groupId));
  };

  const handleUpdateOptionGroup = (
    groupId: string,
    patch: Partial<ProductOptionGroup>
  ) => {
    setProdOptions((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...patch } : g))
    );
  };

  const handleAddOptionItem = (groupId: string) => {
    const newItem: ProductOptionItem = {
      id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: '',
      additionalPrice: 0,
    };
    setProdOptions((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, items: [...g.items, newItem] } : g
      )
    );
  };

  const handleRemoveOptionItem = (groupId: string, itemId: string) => {
    setProdOptions((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, items: g.items.filter((i) => i.id !== itemId) }
          : g
      )
    );
  };

  const handleUpdateOptionItem = (
    groupId: string,
    itemId: string,
    patch: Partial<ProductOptionItem>
  ) => {
    setProdOptions((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              items: g.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
            }
          : g
      )
    );
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormError(null);
    if (!prodName.trim() || !prodCategory.trim() || prodPrice <= 0) {
      setProductFormError('Completa los campos obligatorios del plato (Nombre, Categoría y Precio válido).');
      return;
    }

    // Limpiar grupos de opciones vacíos
    const sanitizedOptions: ProductOptionGroup[] = prodOptions
      .map((grp) => ({
        ...grp,
        name: grp.name.trim() || 'Opciones',
        minSelect: grp.required ? 1 : 0,
        maxSelect: grp.required ? 1 : Math.max(1, grp.items.length),
        items: grp.items
          .filter((it) => it.name.trim().length > 0)
          .map((it) => ({
            ...it,
            name: it.name.trim(),
            additionalPrice: Math.max(0, Number(it.additionalPrice) || 0),
          })),
      }))
      .filter((grp) => grp.items.length > 0);

    const cleanOriginalPrice =
      Number(prodOriginalPrice) > Number(prodPrice) ? Number(prodOriginalPrice) : undefined;

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        name: prodName.trim(),
        description: prodDescription.trim(),
        price: Number(prodPrice),
        originalPrice: cleanOriginalPrice,
        preparationTimeMin: Number(prodPrepTime) || 20,
        categoryName: prodCategory.trim(),
        imageUrl: prodImageUrl.trim() || undefined,
        isPopular: prodIsPopular,
        options: sanitizedOptions.length > 0 ? sanitizedOptions : undefined,
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
        originalPrice: cleanOriginalPrice,
        preparationTimeMin: Number(prodPrepTime) || 20,
        categoryName: prodCategory.trim(),
        imageUrl: prodImageUrl.trim() || undefined,
        isAvailable: true,
        isPopular: prodIsPopular,
        options: sanitizedOptions.length > 0 ? sanitizedOptions : undefined,
      };
      await addProduct(restaurant.id, newProd);
      showNotice(`🎉 Plato "${newProd.name}" creado en la carta`);
    }

    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = (prodId: string, name: string) => {
    setProductToDelete({ id: prodId, name });
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    await deleteProduct(restaurant.id, productToDelete.id);
    showNotice(`🗑️ Plato "${productToDelete.name}" eliminado de la carta`);
    setProductToDelete(null);
  };

  // Liquidación financiera del restaurante según periodo seleccionado
  const periodOrders = filterOrdersByPeriod(restaurantOrders, salesPeriod);
  const settlement = calculateRestaurantSettlement(periodOrders, restaurant.commissionRate || 0);

  if (!isMerchantAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6 selection:bg-amber-500 selection:text-slate-950">
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
          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full">
            DonDomi Aliados
          </span>
        </header>

        <main className="max-w-md w-full mx-auto my-auto py-4">
          <div className="bg-slate-800/95 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center shadow-inner">
                <ChefHat className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-black text-white">DonDomi Aliados</h1>
              <p className="text-xs text-slate-400">
                Acceso exclusivo para restaurantes y cocinas afiliadas en Valledupar
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('PIN');
                  setLoginError(null);
                }}
                className={`py-2 rounded-xl transition cursor-pointer ${
                  loginMode === 'PIN' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'
                }`}
              >
                Por Restaurante + PIN
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode('EMAIL');
                  setLoginError(null);
                }}
                className={`py-2 rounded-xl transition cursor-pointer ${
                  loginMode === 'EMAIL' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400'
                }`}
              >
                Por Correo + Clave
              </button>
            </div>

            {loginError && (
              <div className="p-3 bg-red-950/70 border border-red-500/40 rounded-2xl text-xs font-bold text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleMerchantLogin} className="space-y-4">
              {loginMode === 'PIN' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Selecciona tu Restaurante
                  </label>
                  <select
                    value={loginRestId || restaurants[0]?.id || 'rest-1'}
                    onChange={(e) => setLoginRestId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-3 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {restaurants
                      .filter((r) => (r.accountStatus || 'ACTIVE') !== 'ARCHIVED')
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.neighborhood})
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Correo del Restaurante
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="elvalle@dondomi.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {loginMode === 'PIN' ? 'PIN de Cocina' : 'Contraseña / PIN'}
                </label>
                <input
                  type="password"
                  required
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  placeholder={loginMode === 'PIN' ? 'PIN (ej: 1234)' : 'Contraseña'}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-3 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-2xl shadow-lg transition text-sm cursor-pointer"
              >
                {isLoggingIn ? 'Abriendo cocina...' : 'Entrar al Panel Aliado'}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-700/60 text-center text-[11px] text-slate-400">
              💡 PIN de prueba predeterminado: <strong className="text-amber-400 font-mono">1234</strong>
            </div>
          </div>
        </main>

        <footer className="text-center text-[11px] text-slate-500 py-2">
          DonDomi Aliados · Valledupar
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20 selection:bg-orange-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 px-4 py-3 shadow-md border-b border-slate-800 print:hidden">
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
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
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
              onClick={() => logout()}
              title="Cerrar turno y bloquear cocina"
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Notificación flotante */}
      {noticeMessage && (
        <div className="fixed top-16 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold border border-slate-700 animate-in slide-in-from-top-2 flex items-center gap-2 print:hidden">
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4 print:hidden">
        {/* Navigation Tabs */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-4 gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('KDS')}
            className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
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
            className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
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
            className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'HORARIOS'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Operación & Pagos</span>
          </button>

          <button
            onClick={() => setActiveTab('VENTAS')}
            className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'VENTAS'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Cierre & Liquidación</span>
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
                  Los pedidos entran directamente a cocina. Al empacar, puedes solicitar un Domiciliario DonDomi ($7.000 COP fijo) o despachar con tu propio domiciliario.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                <button
                  onClick={handleTestAudio}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs whitespace-nowrap cursor-pointer"
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

            {/* Métricas de Comanda & Filtros Rápidos */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <button
                onClick={() => setKdsFilter('ACTIVOS')}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                  kdsFilter === 'ACTIVOS'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-[10px] font-bold uppercase opacity-75 block">En Curso</span>
                <span className="text-lg font-black mt-0.5 block">
                  {pendingOrders.length + preparingOrders.length + readyOrDispatchedOrders.length}
                </span>
              </button>

              <button
                onClick={() => setKdsFilter('NUEVOS')}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                  kdsFilter === 'NUEVOS'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white border-slate-200 text-amber-600 hover:bg-amber-50/40'
                }`}
              >
                <span className="text-[10px] font-bold uppercase opacity-75 block">Nuevos</span>
                <span className="text-lg font-black mt-0.5 block">{pendingOrders.length}</span>
              </button>

              <button
                onClick={() => setKdsFilter('EN_COCINA')}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                  kdsFilter === 'EN_COCINA'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white border-slate-200 text-blue-600 hover:bg-blue-50/40'
                }`}
              >
                <span className="text-[10px] font-bold uppercase opacity-75 block">En Cocina</span>
                <span className="text-lg font-black mt-0.5 block">{preparingOrders.length}</span>
              </button>

              <button
                onClick={() => setKdsFilter('EN_RUTA')}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                  kdsFilter === 'EN_RUTA'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50/40'
                }`}
              >
                <span className="text-[10px] font-bold uppercase opacity-75 block">Listos / Ruta</span>
                <span className="text-lg font-black mt-0.5 block">{readyOrDispatchedOrders.length}</span>
              </button>

              <button
                onClick={() => setKdsFilter('ENTREGADOS')}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                  kdsFilter === 'ENTREGADOS'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-50/40'
                }`}
              >
                <span className="text-[10px] font-bold uppercase opacity-75 block">Entregados</span>
                <span className="text-lg font-black mt-0.5 block">{deliveredOrders.length}</span>
              </button>

              <button
                onClick={() => setKdsFilter('CANCELADOS')}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                  kdsFilter === 'CANCELADOS'
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-white border-slate-200 text-red-600 hover:bg-red-50/40'
                }`}
              >
                <span className="text-[10px] font-bold uppercase opacity-75 block">Cancelados</span>
                <span className="text-lg font-black mt-0.5 block">{cancelledOrders.length}</span>
              </button>
            </div>

            {/* Buscador de Comandas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-orange-600" />
                <span>
                  {kdsFilter === 'ACTIVOS' && 'Pedidos Activos en Cocina y Despacho'}
                  {kdsFilter === 'NUEVOS' && 'Pedidos Nuevos por Confirmar'}
                  {kdsFilter === 'EN_COCINA' && 'Pedidos en Preparación'}
                  {kdsFilter === 'EN_RUTA' && 'Pedidos Empacados o En Ruta'}
                  {kdsFilter === 'ENTREGADOS' && 'Historial de Pedidos Entregados'}
                  {kdsFilter === 'CANCELADOS' && 'Pedidos Rechazados o Cancelados'} ({filteredKdsOrders.length})
                </span>
              </h3>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={kdsSearch}
                  onChange={(e) => setKdsSearch(e.target.value)}
                  placeholder="Buscar #DD, cliente o celular..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Listado de Pedidos Filtrados */}
            <div className="space-y-3">
              {filteredKdsOrders.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700 text-sm">
                    No hay pedidos en esta bandeja ({kdsFilter})
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Cuando un cliente ordene en DonDomi, sonará el timbre de cocina y aparecerá aquí inmediatamente.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredKdsOrders.map((order) => {
                    const isNew = order.status === 'PENDING';
                    const isPreparing = order.status === 'PREPARING';
                    const isReady = order.status === 'READY_FOR_PICKUP';
                    const isOnTheWay = order.status === 'ON_THE_WAY';
                    const isDelivered = order.status === 'DELIVERED';
                    const isCancelled = order.status === 'CANCELLED';
                    const isDigitalTransfer = order.paymentMethod !== 'EFECTIVO';

                    return (
                      <div
                        key={order.id}
                        className={`bg-white rounded-3xl p-4 sm:p-5 border transition shadow-xs space-y-3 ${
                          isNew
                            ? 'border-orange-400 ring-2 ring-orange-500/20 bg-orange-50/20'
                            : isCancelled
                            ? 'border-red-200 bg-red-50/10 opacity-80'
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
                            <a
                              href={`https://wa.me/57${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `Hola ${order.customerName}, te escribimos de ${restaurant.name} sobre tu pedido ${order.orderNumber} en DonDomi.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg font-bold hover:bg-emerald-100"
                            >
                              WhatsApp
                            </a>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900">
                              Total: {formatCOP(order.total)}
                            </span>

                            <button
                              onClick={() => handlePrintTicket(order)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
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
                              {it.notes && (
                                <p className="text-[11px] text-amber-700 pl-4 italic">
                                  Nota plato: &quot;{it.notes}&quot;
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

                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                order.paymentMethod === 'EFECTIVO'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              Pago: {order.paymentMethod}
                            </span>

                            {isDigitalTransfer && (
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1 ${
                                  order.paymentStatus === 'COMPLETED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-900'
                                }`}
                              >
                                {order.paymentStatus === 'COMPLETED'
                                  ? '✓ Transferencia Verificada'
                                  : '⏳ Transferencia por Verificar'}
                              </span>
                            )}

                            {isDigitalTransfer && order.paymentStatus !== 'COMPLETED' && !isCancelled && (
                              <button
                                onClick={async () => {
                                  await confirmOrderPayment(order.id);
                                  showNotice(`✅ Pago de ${order.orderNumber} marcado como verificado`);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Confirmar Pago Recibido</span>
                              </button>
                            )}

                            <span className="font-bold text-slate-700">
                              Comida: {formatCOP(order.subtotal)} · Domicilio: {formatCOP(order.deliveryFee)}
                            </span>
                          </div>
                        </div>

                        {/* Botones de cambio de estado en cocina */}
                        <div className="pt-1 flex flex-wrap items-center gap-2">
                          {isNew && (
                            <div className="flex-1 flex flex-wrap gap-2">
                              <button
                                onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black py-2.5 px-4 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <ChefHat className="w-4 h-4" />
                                <span>Aceptar Pedido e Iniciar Cocina</span>
                              </button>
                              <button
                                onClick={() => handleOpenRejectModal(order)}
                                className="bg-red-50 hover:bg-red-100 text-red-700 font-extrabold py-2.5 px-3 rounded-xl text-xs transition border border-red-200 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <X className="w-4 h-4 text-red-600" />
                                <span>Rechazar</span>
                              </button>
                            </div>
                          )}

                          {isPreparing && (
                            <div className="flex-1 flex flex-wrap gap-2">
                              <button
                                onClick={() => updateOrderStatus(order.id, 'READY_FOR_PICKUP')}
                                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                              >
                                <PackageCheck className="w-4 h-4" />
                                <span>
                                  {order.driverName
                                    ? `Empacado · Avisar a ${order.driverName}`
                                    : 'Empacado · Solicitar Repartidor DonDomi'}
                                </span>
                              </button>
                              <button
                                onClick={async () => {
                                  await dispatchWithOwnDriver(order.id);
                                  showNotice(`🛵 Pedido ${order.orderNumber} despachado con domiciliario propio`);
                                }}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                              >
                                <Bike className="w-4 h-4" />
                                <span>Despachar con Domiciliario Propio</span>
                              </button>
                            </div>
                          )}

                          {isReady && (
                            <div className="flex-1 flex flex-wrap items-center justify-between gap-2 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                              <div className="text-xs text-amber-900">
                                <span className="font-bold block">Listo para recogida en mostrador</span>
                                <span className="text-[11px] text-amber-700">
                                  {order.driverName
                                    ? `Repartidor DonDomi asignado: ${order.driverName} (en camino al restaurante)`
                                    : 'Visible en el radar de domiciliarios DonDomi'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {!order.driverId && (
                                  <button
                                    onClick={async () => {
                                      await dispatchWithOwnDriver(order.id);
                                      showNotice(`🛵 Pedido ${order.orderNumber} despachado con domiciliario propio`);
                                    }}
                                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer"
                                  >
                                    Llevar con Domi Propio
                                  </button>
                                )}
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'ON_THE_WAY')}
                                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer"
                                >
                                  Entregado al Repartidor
                                </button>
                              </div>
                            </div>
                          )}

                          {isOnTheWay && (
                            <div className="flex-1 flex flex-wrap items-center justify-between gap-2 bg-blue-50 border border-blue-200 p-2.5 rounded-xl">
                              <div className="text-xs text-blue-900">
                                <span className="font-bold block">
                                  En camino al cliente ({order.deliveryFleet === 'PROPIO' ? 'Flota Propia' : 'Flota DonDomi'})
                                </span>
                                {order.driverName && (
                                  <span className="text-[11px] text-blue-700 block">
                                    Repartidor: {order.driverName}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Confirmar Entrega</span>
                              </button>
                            </div>
                          )}

                          {isDelivered && (
                            <div className="w-full flex flex-wrap items-center justify-between gap-2 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 text-xs">
                              <div className="font-bold text-emerald-700 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>
                                  Entregado ({order.deliveryFleet === 'PROPIO' ? 'Flota Propia' : `Repartidor: ${order.driverName || 'DonDomi'}`})
                                </span>
                              </div>
                              {order.rating && (
                                <div className="flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                                  <span>{order.rating}★</span>
                                  {order.reviewComment && (
                                    <span className="text-slate-600 font-normal ml-1">
                                      &quot;{order.reviewComment}&quot;
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {isCancelled && (
                            <div className="w-full text-xs bg-red-50 p-3 rounded-2xl border border-red-200 space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-red-700">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span>
                                  Pedido Cancelado {order.cancelledBy ? `por ${order.cancelledBy}` : ''}
                                </span>
                              </div>
                              {order.cancellationReason && (
                                <p className="text-[11px] text-red-600 pl-5">
                                  Motivo: &quot;{order.cancellationReason}&quot;
                                </p>
                              )}
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
        {/* PESTAÑA 2: GESTIÓN DE MENÚ, CATEGORÍAS Y ADICIONES */}
        {/* ============================================================== */}
        {activeTab === 'MENU' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Carta de {restaurant.name} ({products.length} platos)
                </h3>
                <p className="text-xs text-slate-500">
                  Administra tus platos, precios, grupos de opciones/adiciones y disponibilidad en tiempo real.
                </p>
              </div>

              <button
                onClick={handleOpenAddProduct}
                className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold px-3.5 py-2 rounded-2xl text-xs transition flex items-center gap-1.5 shadow-md shadow-orange-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Nuevo Plato</span>
              </button>
            </div>

            {/* Filtros por categoría de carta y buscador */}
            {products.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setMenuCategoryFilter('TODAS')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      menuCategoryFilter === 'TODAS'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Todas ({products.length})
                  </button>
                  {menuCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setMenuCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        menuCategoryFilter === cat
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat} ({products.filter((p) => p.categoryName === cat).length})
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="Buscar plato..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}

            {filteredMenuProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
                <UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">
                  {products.length === 0 ? 'Tu carta está vacía' : 'No hay platos con ese filtro'}
                </p>
                <p className="text-xs text-slate-400">
                  Agrega tus platos y configura acompañamientos o adiciones para tus clientes en Valledupar.
                </p>
                <button
                  onClick={handleOpenAddProduct}
                  className="bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Crear Plato Ahora
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredMenuProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className={`bg-white rounded-3xl p-4 border transition shadow-xs flex flex-col justify-between gap-3 ${
                      prod.isAvailable ? 'border-slate-200' : 'border-red-200 bg-red-50/20 opacity-80'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                              {prod.categoryName}
                            </span>
                            {prod.isPopular && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                🔥 Más vendido
                              </span>
                            )}
                            {prod.options && prod.options.length > 0 && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                +{prod.options.length} grupo(s) opciones
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-slate-900 text-sm mt-1">
                            {prod.name}
                          </h4>
                        </div>
                        <div className="text-right">
                          {prod.originalPrice && prod.originalPrice > prod.price && (
                            <span className="text-[10px] text-slate-400 line-through block">
                              {formatCOP(prod.originalPrice)}
                            </span>
                          )}
                          <span className="text-sm font-black text-slate-900">
                            {formatCOP(prod.price)}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {prod.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      {/* Switch Agotado Hoy */}
                      <button
                        onClick={() => toggleProductAvailability(restaurant.id, prod.id)}
                        className={`px-2.5 py-1 rounded-xl font-bold text-[11px] transition flex items-center gap-1 cursor-pointer ${
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
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Editar plato y opciones"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer"
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
        {/* PESTAÑA 3: HORARIOS, OPERACIÓN Y CUENTAS DE TRANSFERENCIA */}
        {/* ============================================================== */}
        {activeTab === 'HORARIOS' && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Horarios, Operación y Cuentas de Recaudo
              </h3>
              <p className="text-xs text-slate-500">
                Configura horarios, pedido mínimo y tus cuentas directas de Nequi, Daviplata y Llave Bre-B para transferencias de clientes.
              </p>
            </div>

            <form onSubmit={handleSaveRestaurantSettings} className="space-y-4">
              {settingsError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{settingsError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    Celular / WhatsApp de Contacto (10 dígitos)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      maxLength={10}
                      value={restPhone}
                      onChange={(e) => setRestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="3001234567"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Dirección en Valledupar */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dirección Exacta del Local (Punto de Recogida)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={restAddress}
                      onChange={(e) => setRestAddress(e.target.value)}
                      placeholder="Ej: Carrera 9 # 12-40"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Barrio */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Barrio en Valledupar
                  </label>
                  <input
                    type="text"
                    value={restNeighborhood}
                    onChange={(e) => setRestNeighborhood(e.target.value)}
                    placeholder="Ej: Novalito, Centro, Los Cortijos"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Descripción comercial */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción Comercial del Restaurante
                </label>
                <textarea
                  rows={2}
                  value={restDescription}
                  onChange={(e) => setRestDescription(e.target.value)}
                  placeholder="Describe la especialidad de tu restaurante..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Pedido mínimo y tiempos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pedido Mínimo ($ COP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={restMinOrder}
                    onChange={(e) => setRestMinOrder(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tiempo Estimado Mín. (min)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={90}
                    value={restTimeMin}
                    onChange={(e) => setRestTimeMin(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tiempo Estimado Máx. (min)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={120}
                    value={restTimeMax}
                    onChange={(e) => setRestTimeMax(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Formas de Pago Aceptadas y Cuentas */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Métodos de Pago y Cuentas Directas del Negocio
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cuando el cliente elige transferencia digital, verá directamente tu número o llave en el Checkout para transferirte sin intermediarios.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={acceptsCash}
                      onChange={(e) => setAcceptsCash(e.target.checked)}
                      className="accent-orange-600 rounded"
                    />
                    <span>💵 Efectivo</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={acceptsNequi}
                      onChange={(e) => setAcceptsNequi(e.target.checked)}
                      className="accent-orange-600 rounded"
                    />
                    <span>📱 Nequi</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={acceptsBreb}
                      onChange={(e) => setAcceptsBreb(e.target.checked)}
                      className="accent-orange-600 rounded"
                    />
                    <span>🔑 Llave Bre-B</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={acceptsDaviplata}
                      onChange={(e) => setAcceptsDaviplata(e.target.checked)}
                      className="accent-orange-600 rounded"
                    />
                    <span>📲 Daviplata</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Número Nequi del Negocio
                    </label>
                    <input
                      type="text"
                      value={nequiNumber}
                      onChange={(e) => setNequiNumber(e.target.value)}
                      placeholder={restPhone || 'Ej: 3001234567'}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Llave Bre-B del Negocio
                    </label>
                    <input
                      type="text"
                      value={brebKey}
                      onChange={(e) => setBrebKey(e.target.value)}
                      placeholder="Ej: @mirestaurante o 3001234567"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Número Daviplata del Negocio
                    </label>
                    <input
                      type="text"
                      value={daviplataNumber}
                      onChange={(e) => setDaviplataNumber(e.target.value)}
                      placeholder={restPhone || 'Ej: 3001234567'}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-5 py-3 rounded-2xl text-xs transition flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4 text-orange-400" />
                <span>Guardar Configuración Operativa</span>
              </button>
            </form>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 4: CIERRE DE CAJA Y LIQUIDACIONES CON DONDOMI */}
        {/* ============================================================== */}
        {activeTab === 'VENTAS' && (
          <div className="space-y-4">
            {/* Barra de Periodo e Impresión POS */}
            <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    { id: 'TODAY', label: 'Hoy' },
                    { id: 'YESTERDAY', label: 'Ayer' },
                    { id: 'WEEK', label: 'Últimos 7 Días' },
                    { id: 'MONTH', label: 'Últimos 30 Días' },
                    { id: 'ALL', label: 'Histórico Total' },
                  ] as { id: SettlementPeriod; label: string }[]
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSalesPeriod(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      salesPeriod === p.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handlePrintSettlement}
                className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Cierre POS</span>
              </button>
            </div>

            {/* 4 KPIs Principales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Venta Comida Entregada
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 block">
                  {formatCOP(settlement.foodSubtotalTotal)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  En {settlement.deliveredOrdersCount} pedidos completados
                </span>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Comida en Efectivo vs Digital
                </span>
                <span className="text-sm font-black text-slate-900 mt-1 block">
                  💵 {formatCOP(settlement.cashFoodSubtotal)}
                </span>
                <span className="text-xs font-bold text-blue-600 mt-0.5 block">
                  📲 {formatCOP(settlement.digitalFoodSubtotal)}
                </span>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Comisión DonDomi ({settlement.commissionRate}%)
                </span>
                <span className="text-xl sm:text-2xl font-black text-orange-600 mt-1 block">
                  {formatCOP(settlement.platformCommissionAmount)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Neto comida: {formatCOP(settlement.netRestaurantFoodEarnings)}
                </span>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Flota de Despacho
                </span>
                <span className="text-sm font-black text-blue-600 mt-1 block">
                  🛵 DonDomi: {settlement.dondomiFleetCount} carreras
                </span>
                <span className="text-xs font-bold text-slate-700 mt-0.5 block">
                  🏠 Propia: {settlement.ownFleetCount} carreras
                </span>
              </div>
            </div>

            {/* Desglose de Liquidación y Cruce de Domicilios Digitales */}
            <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-orange-400" />
                  <div>
                    <h4 className="font-black text-sm">
                      Estado de Liquidación y Cuadre de Caja
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Cruce transparente de ventas, domicilios por transferencia y comisión de plataforma.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold bg-slate-800 text-orange-400 px-3 py-1 rounded-full border border-slate-700">
                  {settlement.deliveredOrdersCount} entregados · {settlement.cancelledOrdersCount} cancelados
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-800/70 rounded-2xl p-4 border border-slate-700/70 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    1. Ingresos de tu Cocina
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Subtotal platos vendidos:</span>
                    <span className="font-bold text-white">{formatCOP(settlement.foodSubtotalTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Recaudado en Efectivo (Comida):</span>
                    <span className="font-bold text-amber-300">{formatCOP(settlement.cashFoodSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Recibido en tus cuentas (Nequi/Bre-B/Davi):</span>
                    <span className="font-bold text-blue-300">{formatCOP(settlement.digitalFoodSubtotal)}</span>
                  </div>
                  {settlement.ownFleetDeliveryEarnings > 0 && (
                    <div className="flex justify-between pt-1 border-t border-slate-700">
                      <span className="text-emerald-300">+ Domicilios hechos con tu Flota Propia:</span>
                      <span className="font-bold text-emerald-400">{formatCOP(settlement.ownFleetDeliveryEarnings)}</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-800/70 rounded-2xl p-4 border border-slate-700/70 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    2. Cruce con Repartidores DonDomi y Plataforma
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-300">
                      Domicilios transferidos a tu cuenta (a pagar a repartidor DonDomi):
                    </span>
                    <span className="font-bold text-amber-400">
                      {formatCOP(settlement.deliveryFeesOwedToDrivers)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">
                      Comisión DonDomi ({settlement.commissionRate}% sobre comida):
                    </span>
                    <span className="font-bold text-orange-400">
                      {formatCOP(settlement.platformCommissionAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700 font-black text-sm">
                    <span>Total a liquidar con DonDomi / Repartidores:</span>
                    <span className="text-orange-400">
                      {formatCOP(settlement.totalOwedByRestaurant)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Historial de Ventas del Periodo */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
              <h4 className="font-extrabold text-sm text-slate-900">
                Detalle de Pedidos del Periodo ({periodOrders.length})
              </h4>

              {periodOrders.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  No hay pedidos registrados en este periodo.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {periodOrders.map((o) => (
                    <div key={o.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-black text-slate-900">{o.orderNumber}</span>
                        <span className="text-slate-400 mx-1.5">•</span>
                        <span className="text-slate-700 font-bold">{o.customerName}</span>
                        <span className="text-[11px] text-slate-400 block">
                          {new Date(o.createdAt).toLocaleString('es-CO', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}{' '}
                          · Pago: <strong>{o.paymentMethod}</strong> · Flota:{' '}
                          <strong>{o.deliveryFleet === 'PROPIO' ? 'Propia' : o.driverName || 'DonDomi'}</strong>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900 block">
                          Comida: {formatCOP(o.subtotal)} (Total: {formatCOP(o.total)})
                        </span>
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
      {/* MODAL CREAR / EDITAR PLATO CON OPCIONES Y ADICIONES */}
      {/* ============================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:hidden">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="font-black text-base text-slate-900">
                {editingProduct ? 'Editar Plato y Opciones' : 'Agregar Nuevo Plato a la Carta'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              {productFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span className="font-bold leading-tight">{productFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Plato *</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Categoría en tu Menú *</label>
                  <input
                    type="text"
                    required
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    placeholder="Ej: Salchipapas, Hamburguesas, Bebidas"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Precio Venta ($ COP) *</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={500}
                    value={prodPrice}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    placeholder="25000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Precio Antes (Opcional)</label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={prodOriginalPrice || ''}
                    onChange={(e) => setProdOriginalPrice(Number(e.target.value))}
                    placeholder="Ej: 29000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Prep. Estimada (min)</label>
                  <input
                    type="number"
                    min={5}
                    max={90}
                    value={prodPrepTime}
                    onChange={(e) => setProdPrepTime(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">URL de Fotografía (Opcional)</label>
                <input
                  type="url"
                  value={prodImageUrl}
                  onChange={(e) => setProdImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prodIsPopular}
                  onChange={(e) => setProdIsPopular(e.target.checked)}
                  className="accent-orange-600 rounded"
                />
                <span>🔥 Marcar como Plato Más Vendido / Especialidad de la Casa</span>
              </label>

              {/* Editor de Grupos de Opciones y Adiciones */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-orange-600" />
                      <span>Grupos de Acompañamientos y Adiciones ({prodOptions.length})</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Ej: &quot;Elige tu proteína&quot; (obligatorio) o &quot;Adiciones extras&quot; (opcional con costo extra).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOptionGroup}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Grupo</span>
                  </button>
                </div>

                {prodOptions.map((grp, grpIdx) => (
                  <div
                    key={grp.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <input
                        type="text"
                        value={grp.name}
                        onChange={(e) =>
                          handleUpdateOptionGroup(grp.id, { name: e.target.value })
                        }
                        placeholder={`Nombre del grupo #${grpIdx + 1} (Ej: Elige tu acompañamiento)`}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
                      />

                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={grp.required}
                          onChange={(e) =>
                            handleUpdateOptionGroup(grp.id, { required: e.target.checked })
                          }
                          className="accent-orange-600"
                        />
                        <span>Obligatorio (1 opción)</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleRemoveOptionGroup(grp.id)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"
                        title="Eliminar grupo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Opciones dentro del grupo */}
                    <div className="space-y-1.5 pl-2 border-l-2 border-orange-200">
                      {grp.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              handleUpdateOptionItem(grp.id, item.id, {
                                name: e.target.value,
                              })
                            }
                            placeholder="Ej: Queso costeño extra / Patacón"
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-400">+$</span>
                            <input
                              type="number"
                              min={0}
                              step={500}
                              value={item.additionalPrice}
                              onChange={(e) =>
                                handleUpdateOptionItem(grp.id, item.id, {
                                  additionalPrice: Number(e.target.value),
                                })
                              }
                              className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveOptionItem(grp.id, item.id)}
                            className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                            title="Quitar opción"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddOptionItem(grp.id)}
                        className="text-[11px] font-bold text-orange-600 hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Agregar opción a &quot;{grp.name || 'este grupo'}&quot;</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md cursor-pointer"
                >
                  Guardar Plato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMAR ELIMINACIÓN DE PLATO */}
      {/* ============================================================== */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in print:hidden">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-slate-800 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
              🗑️
            </div>
            <div className="text-center">
              <h4 className="font-black text-slate-900 text-base">¿Eliminar plato de tu carta?</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                ¿Estás seguro de que deseas eliminar permanentemente <strong>&quot;{productToDelete.name}&quot;</strong>? Los clientes ya no podrán pedirlo en DonDomi.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                className="py-2.5 px-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/25 transition cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RECHAZAR PEDIDO CON MOTIVO */}
      {/* ============================================================== */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in print:hidden">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <h3 className="font-black text-sm text-slate-900">
                  Rechazar Pedido #{rejectingOrder.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Selecciona el motivo por el cual no es posible atender este pedido. Esta información se registrará y notificará al cliente:
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-3">
              <div className="space-y-2">
                {[
                  'Sin existencias / Ingredientes agotados',
                  'Alta congestión / Cocina saturada',
                  'Fuera de horario de atención',
                  'Dirección fuera de cobertura de entrega',
                  'Otro motivo',
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold cursor-pointer transition ${
                      rejectReason === reason
                        ? 'border-red-500 bg-red-50 text-red-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectReason"
                      value={reason}
                      checked={rejectReason === reason}
                      onChange={() => setRejectReason(reason)}
                      className="accent-red-600"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {rejectReason === 'Otro motivo' && (
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Describe el motivo para el cliente *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={customRejectReason}
                    onChange={(e) => setCustomRejectReason(e.target.value)}
                    placeholder="Ej: Falla en suministro de gas, local cerrando..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmittingReject}
                  onClick={() => setRejectingOrder(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Volver / No rechazar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReject}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingReject ? 'Rechazando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DIÁLOGO IMPRESIÓN COMANDA TÉRMICA POS (58mm/80mm) */}
      {/* ============================================================== */}
      {ticketOrder && !printingSettlement && (
        <div id="print-ticket" className="hidden print:block fixed inset-0 bg-white p-4 font-mono text-black text-xs leading-tight">
          <div className="text-center pb-2 border-b border-black">
            <h2 className="text-base font-black">*** DON DOMI ***</h2>
            <p className="font-bold">{ticketOrder.restaurantName}</p>
            <p className="text-[10px]">Valledupar, Cesar</p>
            <p className="font-bold mt-1">ORDEN: #{ticketOrder.orderNumber}</p>
            <p className="text-[10px]">{new Date(ticketOrder.createdAt).toLocaleString('es-CO')}</p>
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
              <div key={it.id}>
                <div className="flex justify-between">
                  <span>{it.quantity}x {it.productName}</span>
                  <span>{formatCOP(it.subtotal)}</span>
                </div>
                {it.selectedOptions && it.selectedOptions.length > 0 && (
                  <p className="text-[10px] pl-2">
                    + {it.selectedOptions.map((o) => o.itemName).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="py-2 border-b border-black space-y-1">
            <div className="flex justify-between">
              <span>Subtotal Comida:</span>
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

      {/* ============================================================== */}
      {/* IMPRESIÓN TÉRMICA DE CIERRE DE CAJA POS */}
      {/* ============================================================== */}
      {printingSettlement && (
        <div id="print-settlement" className="hidden print:block fixed inset-0 bg-white p-4 font-mono text-black text-xs leading-tight">
          <div className="text-center pb-2 border-b border-black">
            <h2 className="text-base font-black">*** CIERRE DE CAJA DON DOMI ***</h2>
            <p className="font-bold">{restaurant.name}</p>
            <p className="text-[10px]">Periodo: {salesPeriod}</p>
            <p className="text-[10px]">{new Date().toLocaleString('es-CO')}</p>
          </div>

          <div className="py-2 border-b border-black space-y-1">
            <div className="flex justify-between">
              <span>Pedidos Entregados:</span>
              <span>{settlement.deliveredOrdersCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Pedidos Cancelados:</span>
              <span>{settlement.cancelledOrdersCount}</span>
            </div>
            <div className="flex justify-between font-bold pt-1">
              <span>Subtotal Venta Comida:</span>
              <span>{formatCOP(settlement.foodSubtotalTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>- En Efectivo:</span>
              <span>{formatCOP(settlement.cashFoodSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>- En Transferencias:</span>
              <span>{formatCOP(settlement.digitalFoodSubtotal)}</span>
            </div>
          </div>

          <div className="py-2 border-b border-black space-y-1">
            <div className="flex justify-between">
              <span>Carreras Flota DonDomi:</span>
              <span>{settlement.dondomiFleetCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Carreras Flota Propia:</span>
              <span>{settlement.ownFleetCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Domicilios Digitales Repartidor:</span>
              <span>{formatCOP(settlement.deliveryFeesOwedToDrivers)}</span>
            </div>
            <div className="flex justify-between">
              <span>Comisión DonDomi ({settlement.commissionRate}%):</span>
              <span>{formatCOP(settlement.platformCommissionAmount)}</span>
            </div>
          </div>

          <div className="text-center pt-2 text-[10px]">
            <p>*** DonDomi Valledupar ***</p>
          </div>
        </div>
      )}
    </div>
  );
}
