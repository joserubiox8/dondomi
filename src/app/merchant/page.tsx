'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  ArrowLeft,
  PackageCheck,
  Printer,
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
  FolderPlus,
  Monitor,
  ShoppingBag,
  CreditCard,
  Coins,
  Share2,
  Minus,
  Receipt,
  Sparkles,
  QrCode,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Flame,
  Copy,
  Download,
  MessageSquare,
  Bell,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';
import {
  filterOrdersByPeriod,
  calculateRestaurantSettlement,
  generateWhatsAppSettlementMessage,
  generateCustomerOrderStatusWhatsAppMessage,
  SettlementPeriod,
} from '@/lib/pricing';
import { getCustomerLoyaltyTier } from '@/services/dataService';
import { playOrderAlertSound, playKitchenBellChime } from '@/lib/sound';
import {
  Order,
  Product,
  ProductOptionGroup,
  ProductOptionItem,
  Restaurant,
  OrderChannel,
  TransferPlatform,
  SelectedOption,
} from '@/types';

type MerchantTab = 'KDS' | 'POS' | 'MENU' | 'HORARIOS' | 'VENTAS';
type KdsFilter = 'NUEVOS' | 'EN_COCINA' | 'EN_RUTA' | 'ENTREGADOS' | 'CANCELADOS';
type KdsChannelFilter = 'TODOS' | 'pos_local' | 'pos_takeout' | 'delivery_app';

export default function MerchantPage() {
  const {
    restaurants,
    orders,
    productsByRestaurant,
    fetchProductsForRestaurant,
    updateOrderStatus,
    dispatchWithOwnDriver,
    confirmOrderPayment,
    rejectOrder,
    toggleProductAvailability,
    addProduct,
    updateProduct,
    deleteProduct,
    restoreProduct,
    updateRestaurant,
    toggleRestaurantStatus,
    currentUser,
    loginWithEmail,
    logout,
    addOrder,
    globalDeliveryFee,
  } = useApp();

  // Estado para autenticación individual de tienda en modo producción
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPin, setLoginPin] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const isMerchantAuthenticated = currentUser?.role === 'RESTAURANTE';

  const handleMerchantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await loginWithEmail(loginIdentifier, loginPin);
      if (!res.success || res.role !== 'RESTAURANTE') {
        setLoginError(
          res.error || 'Identificador de tienda o PIN/contraseña inválidos.'
        );
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const [activeTab, setActiveTab] = useState<MerchantTab>('KDS');
  const [kdsFilter, setKdsFilter] = useState<KdsFilter>('NUEVOS');
  const [kdsChannelFilter, setKdsChannelFilter] = useState<KdsChannelFilter>('TODOS');
  const [kdsSearch, setKdsSearch] = useState<string>('');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const prevPendingCountRef = useRef<number>(0);

  // Estados para Modo Pantalla de Cocina (KDS Fullscreen) & SLA
  const [isKdsFullscreen, setIsKdsFullscreen] = useState<boolean>(false);
  const [kdsStationFilter, setKdsStationFilter] = useState<'TODOS' | 'LOCAL' | 'DOMI'>('TODOS');
  const [autoPrintOnAccept, setAutoPrintOnAccept] = useState<boolean>(false);
  const [liveCurrentTime, setLiveCurrentTime] = useState<number>(Date.now());

  // Estados para Generador de Código QR & Hablador de Mesa
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [printingQrStand, setPrintingQrStand] = useState<boolean>(false);

  // Modal para ticket térmico de comanda o cierre de caja
  const [ticketOrder, setTicketOrder] = useState<Order | null>(null);
  const [printingSettlement, setPrintingSettlement] = useState<boolean>(false);

  // Modal para rechazar pedido
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Sin existencias / Ingredientes agotados');
  const [customRejectReason, setCustomRejectReason] = useState<string>('');
  const [isSubmittingReject, setIsSubmittingReject] = useState<boolean>(false);

  // Filtros y gestión centralizada de categorías en Mi Carta
  const [menuCategoryFilter, setMenuCategoryFilter] = useState<string>('TODAS');
  const [menuSearch, setMenuSearch] = useState<string>('');
  const [customMenuCategories, setCustomMenuCategories] = useState<string[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [categoryModalError, setCategoryModalError] = useState<string | null>(null);

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

  // ============================================================================
  // ESTADOS DEL MÓDULO PUNTO DE VENTA (POS) INTEGRADO
  // ============================================================================
  interface PosCartItem {
    id: string;
    product: Product;
    quantity: number;
    selectedOptions: SelectedOption[];
    notes?: string;
    itemTotal: number;
  }

  const [posSearch, setPosSearch] = useState<string>('');
  const [posCategoryFilter, setPosCategoryFilter] = useState<string>('TODAS');
  const [posCart, setPosCart] = useState<PosCartItem[]>([]);
  const [posChannel, setPosChannel] = useState<OrderChannel>('pos_local');
  const [posTableNumber, setPosTableNumber] = useState<string>('Mesa 1');
  const [posCustomerPhone, setPosCustomerPhone] = useState<string>('');
  const [posCustomerName, setPosCustomerName] = useState<string>('');
  const [posDeliveryAddress, setPosDeliveryAddress] = useState<string>('');
  const [posDeliveryNeighborhood, setPosDeliveryNeighborhood] = useState<string>('Centro');
  const [posDeliveryFleet, setPosDeliveryFleet] = useState<'DONDOMI' | 'PROPIO'>('DONDOMI');
  const [posPaymentType, setPosPaymentType] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'DIVIDIDO'>('EFECTIVO');
  const [posTransferPlatform, setPosTransferPlatform] = useState<TransferPlatform>('Nequi');
  const [posCashTendered, setPosCashTendered] = useState<string>('');
  const [posSplitCash, setPosSplitCash] = useState<string>('');
  const [posSplitTransfer, setPosSplitTransfer] = useState<string>('');
  const [posSubmitting, setPosSubmitting] = useState<boolean>(false);
  const [posError, setPosError] = useState<string | null>(null);

  // Modal para seleccionar opciones de plato en POS
  const [posOptionProduct, setPosOptionProduct] = useState<Product | null>(null);
  const [posSelectedOptionsByGroup, setPosSelectedOptionsByGroup] = useState<Record<string, ProductOptionItem[]>>({});
  const [posOptionQty, setPosOptionQty] = useState<number>(1);
  const [posOptionNotes, setPosOptionNotes] = useState<string>('');
  const [posOptionModalError, setPosOptionModalError] = useState<string | null>(null);

  // Modal de confirmación de cobro POS exitoso
  const [posSuccessOrder, setPosSuccessOrder] = useState<Order | null>(null);

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

  // Carga bajo demanda del menú del restaurante para la Caja POS y gestión de carta
  useEffect(() => {
    if (restaurant?.id) {
      fetchProductsForRestaurant(restaurant.id);
    }
  }, [restaurant?.id, fetchProductsForRestaurant]);

  const allRestaurantProducts = productsByRestaurant[restaurant.id] || [];
  const products = allRestaurantProducts.filter((p) => !p.isArchived);
  const archivedProducts = allRestaurantProducts.filter((p) => p.isArchived === true);

  // Sincronizar categorías personalizadas de la carta desde el restaurante en Supabase (con respaldo local)
  useEffect(() => {
    if (!restaurant.id) return;
    if (Array.isArray(restaurant.customCategories) && restaurant.customCategories.length > 0) {
      setCustomMenuCategories(restaurant.customCategories.filter(Boolean));
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`dondomi_merchant_categories_${restaurant.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setCustomMenuCategories(parsed.filter(Boolean));
            return;
          }
        }
      } catch {}
    }
    setCustomMenuCategories([]);
  }, [restaurant.id, restaurant.customCategories]);

  const persistCustomMenuCategories = async (nextList: string[]) => {
    if (typeof window !== 'undefined' && restaurant.id) {
      try {
        localStorage.setItem(
          `dondomi_merchant_categories_${restaurant.id}`,
          JSON.stringify(nextList)
        );
      } catch {}
    }
    const res = await updateRestaurant({
      ...restaurant,
      customCategories: nextList,
    });
    if (res.ok) {
      setCustomMenuCategories(nextList);
    }
    return res;
  };

  // Unificar categorías creadas centralizadamente + categorías de platos activos existentes
  const productCategories = Array.from(
    new Set(products.map((p) => p.categoryName).filter(Boolean))
  );
  const combinedCategories = Array.from(
    new Set([...customMenuCategories, ...productCategories])
  );
  const menuCategories =
    combinedCategories.length > 0
      ? combinedCategories
      : ['Platos Fuertes', 'Combos', 'Entradas', 'Bebidas', 'Adicionales'];

  const handleAddMenuCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryModalError(null);
    const clean = newCategoryName.trim();
    if (!clean) {
      setCategoryModalError('Escribe un nombre válido para la categoría.');
      return;
    }
    if (menuCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setCategoryModalError('Esta categoría ya existe en tu carta.');
      return;
    }
    const updated = [...customMenuCategories, clean];
    const res = await persistCustomMenuCategories(updated);
    if (!res.ok) {
      setCategoryModalError(
        res.error || 'No se pudo persistir la categoría en Supabase.'
      );
      return;
    }
    setProdCategory(clean);
    setNewCategoryName('');
    showNotice(`✅ Categoría "${clean}" guardada en Supabase`);
  };

  const handleRemoveMenuCategory = async (catName: string) => {
    const usedCount = products.filter((p) => p.categoryName === catName).length;
    if (usedCount > 0) {
      setCategoryModalError(
        `No puedes eliminar "${catName}" porque tiene ${usedCount} plato(s) asignado(s).`
      );
      return;
    }
    const updated = customMenuCategories.filter((c) => c !== catName);
    const res = await persistCustomMenuCategories(updated);
    if (!res.ok) {
      setCategoryModalError(
        res.error || 'No se pudo eliminar la categoría en Supabase.'
      );
      return;
    }
    if (menuCategoryFilter === catName) {
      setMenuCategoryFilter('TODAS');
    }
    showNotice(`🗑️ Categoría "${catName}" eliminada`);
  };

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

  // Si inicialmente no hay pedidos en NUEVOS pero sí en EN_COCINA, iniciar en EN_COCINA para comodidad del cajero
  const didInitKdsTabRef = useRef<boolean>(false);
  useEffect(() => {
    if (!didInitKdsTabRef.current && restaurantOrders.length > 0) {
      didInitKdsTabRef.current = true;
      if (pendingOrders.length === 0 && preparingOrders.length > 0) {
        setKdsFilter('EN_COCINA');
      } else if (pendingOrders.length === 0 && preparingOrders.length === 0 && readyOrDispatchedOrders.length > 0) {
        setKdsFilter('EN_RUTA');
      }
    }
  }, [restaurantOrders.length, pendingOrders.length, preparingOrders.length, readyOrDispatchedOrders.length]);

  const filteredKdsOrders = restaurantOrders.filter((o) => {
    const matchesTab =
      kdsFilter === 'NUEVOS'
        ? o.status === 'PENDING'
        : kdsFilter === 'EN_COCINA'
        ? o.status === 'PREPARING'
        : kdsFilter === 'EN_RUTA'
        ? o.status === 'READY_FOR_PICKUP' || o.status === 'ON_THE_WAY'
        : kdsFilter === 'ENTREGADOS'
        ? o.status === 'DELIVERED'
        : o.status === 'CANCELLED';

    const resolvedChannel: OrderChannel =
      o.orderChannel === 'pos_local' || o.orderChannel === 'pos_takeout'
        ? o.orderChannel
        : 'delivery_app';
    const matchesChannel =
      kdsChannelFilter === 'TODOS' || resolvedChannel === kdsChannelFilter;

    const q = kdsSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      (o.tableNumber && o.tableNumber.toLowerCase().includes(q));

    return matchesTab && matchesChannel && matchesSearch;
  });

  // Actualización del cronómetro en vivo para SLA de cocina (cada 5 segundos)
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveCurrentTime(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Atajo de teclado para salir de KDS Fullscreen o cerrar modales con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isKdsFullscreen) setIsKdsFullscreen(false);
        if (isQrModalOpen) setIsQrModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isKdsFullscreen, isQrModalOpen]);

  // Generación reactiva de código QR nítido para la mesa / tienda
  useEffect(() => {
    if (isQrModalOpen && restaurant?.id && typeof window !== 'undefined') {
      const directUrl = `${window.location.origin}/restaurant/${restaurant.id}`;
      QRCode.toDataURL(directUrl, {
        width: 500,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error al generar código QR:', err));
    }
  }, [isQrModalOpen, restaurant?.id]);

  // Alerta sonora en tiempo real (Campanada Doble de Cocina) cuando llega un nuevo pedido PENDING
  useEffect(() => {
    const currentPendingCount = pendingOrders.length;
    if (audioEnabled && currentPendingCount > prevPendingCountRef.current) {
      playKitchenBellChime();
    }
    prevPendingCountRef.current = currentPendingCount;
  }, [pendingOrders.length, audioEnabled]);

  // Pedidos activos para pantalla KDS de Cocina (PENDING, PREPARING, READY_FOR_PICKUP)
  const activeKdsOrders = useMemo(() => {
    return restaurantOrders.filter((o) => {
      const isActiveStatus =
        o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'READY_FOR_PICKUP';
      if (!isActiveStatus) return false;

      if (kdsStationFilter === 'LOCAL') {
        return o.orderChannel === 'pos_local' || o.orderChannel === 'pos_takeout';
      }
      if (kdsStationFilter === 'DOMI') {
        return o.orderChannel === 'delivery_app' || !o.orderChannel;
      }
      return true;
    });
  }, [restaurantOrders, kdsStationFilter]);

  const activeLocalOrdersCount = useMemo(() => {
    return restaurantOrders.filter(
      (o) =>
        (o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'READY_FOR_PICKUP') &&
        (o.orderChannel === 'pos_local' || o.orderChannel === 'pos_takeout')
    ).length;
  }, [restaurantOrders]);

  const activeDeliveryOrdersCount = useMemo(() => {
    return restaurantOrders.filter(
      (o) =>
        (o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'READY_FOR_PICKUP') &&
        (o.orderChannel === 'delivery_app' || !o.orderChannel)
    ).length;
  }, [restaurantOrders]);

  const getOrderSlaMinutes = (createdAt: string) => {
    const diff = liveCurrentTime - new Date(createdAt).getTime();
    return Math.max(0, Math.floor(diff / 60000));
  };

  const renderSlaBadge = (createdAt: string, isKdsMode = false) => {
    const mins = getOrderSlaMinutes(createdAt);
    if (mins < 10) {
      return (
        <span
          className={`inline-flex items-center gap-1 font-black rounded-lg ${
            isKdsMode
              ? 'px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs'
              : 'px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          ⏱️ {mins}m en cola
        </span>
      );
    }
    if (mins <= 15) {
      return (
        <span
          className={`inline-flex items-center gap-1 font-black rounded-lg ${
            isKdsMode
              ? 'px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs'
              : 'px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          ⚠️ {mins}m de espera
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1 font-black rounded-lg animate-pulse ${
          isKdsMode
            ? 'px-3 py-1 bg-rose-500/30 text-rose-300 border border-rose-500/60 text-xs'
            : 'px-2 py-0.5 bg-rose-100 text-rose-800 text-[11px]'
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
        🚨 {mins}m demorado
      </span>
    );
  };

  const handlePrintTicket = (order: Order) => {
    setPrintingSettlement(false);
    setPrintingQrStand(false);
    setTicketOrder(order);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handlePrintSettlement = () => {
    setTicketOrder(null);
    setPrintingQrStand(false);
    setPrintingSettlement(true);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handlePrintQrStand = () => {
    setTicketOrder(null);
    setPrintingSettlement(false);
    setPrintingQrStand(true);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handleDownloadQrPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `dondomi-${(restaurant?.name || 'restaurante').toLowerCase().replace(/\s+/g, '-')}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotice('✅ Imagen QR descargada con éxito');
  };

  const handleCopyStoreLink = async () => {
    if (typeof window === 'undefined' || !restaurant?.id) return;
    const directUrl = `${window.location.origin}/restaurant/${restaurant.id}`;
    try {
      await navigator.clipboard.writeText(directUrl);
      showNotice('📋 Enlace de tu restaurante copiado al portapapeles');
    } catch {
      showNotice('⚠️ Copia el enlace directamente desde el campo de texto');
    }
  };

  const handleAcceptOrder = async (order: Order) => {
    await updateOrderStatus(order.id, 'PREPARING');
    showNotice(`🔥 Pedido ${order.orderNumber} en preparación en cocina`);
    if (autoPrintOnAccept) {
      handlePrintTicket(order);
    }
  };

  // Toggle rápido maestro de Abierto/Cerrado (verificado en Supabase)
  const handleToggleOpenClose = async () => {
    if (restaurant.isOpen && pendingOrders.length > 0) {
      showNotice(
        `⚠️ Tienes ${pendingOrders.length} pedido(s) en espera (PENDING). Acéptalos o recházalos antes de cerrar la cocina.`
      );
      return;
    }
    const res = await toggleRestaurantStatus(restaurant.id);
    if (!res.ok) {
      showNotice(`❌ ${res.error || 'No se pudo actualizar el estado en Supabase'}`);
      return;
    }
    showNotice(
      restaurant.isOpen
        ? '🔴 Cocina pausada temporalmente'
        : '🟢 Cocina abierta para pedidos en DonDomi'
    );
  };

  // Guardar configuración de restaurante (solo confirma éxito cuando Supabase confirma)
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
    const res = await updateRestaurant(updated);
    if (!res.ok) {
      setSettingsError(
        res.error || 'No se pudo guardar la configuración en Supabase.'
      );
      return;
    }
    showNotice('✅ Configuración, horarios y cuentas guardadas en Supabase');
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

    // Limpiar grupos de opciones vacíos y respetar mínimo/máximo configurados (incluyendo selección múltiple obligatoria)
    const sanitizedOptions: ProductOptionGroup[] = prodOptions
      .map((grp) => {
        const cleanItems = grp.items
          .filter((it) => it.name.trim().length > 0)
          .map((it) => ({
            ...it,
            name: it.name.trim(),
            additionalPrice: Math.max(0, Number(it.additionalPrice) || 0),
          }));

        const maxPossible = Math.max(1, cleanItems.length);
        const rawMin = grp.required
          ? Math.max(1, Number(grp.minSelect) || 1)
          : Math.max(0, Number(grp.minSelect) || 0);
        const safeMin = Math.min(rawMin, maxPossible);
        const rawMax = Number(grp.maxSelect) || (grp.required ? safeMin : maxPossible);
        const safeMax = Math.min(Math.max(safeMin, 1, rawMax), maxPossible);

        return {
          ...grp,
          name: grp.name.trim() || 'Opciones',
          required: safeMin > 0,
          minSelect: safeMin,
          maxSelect: safeMax,
          items: cleanItems,
        };
      })
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
      const res = await updateProduct(restaurant.id, updated);
      if (!res.ok) {
        setProductFormError(res.error || 'No se pudo actualizar el plato en Supabase.');
        return;
      }
      showNotice(`✅ Plato "${updated.name}" actualizado en Supabase`);
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
        isArchived: false,
        isPopular: prodIsPopular,
        options: sanitizedOptions.length > 0 ? sanitizedOptions : undefined,
      };
      const res = await addProduct(restaurant.id, newProd);
      if (!res.ok) {
        setProductFormError(res.error || 'No se pudo guardar el plato en Supabase.');
        return;
      }
      showNotice(`🎉 Plato "${newProd.name}" guardado en Supabase`);
    }

    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = (prodId: string, name: string) => {
    setProductToDelete({ id: prodId, name });
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const res = await deleteProduct(restaurant.id, productToDelete.id);
    if (!res.ok) {
      showNotice(`❌ ${res.error || 'No se pudo archivar el plato en Supabase'}`);
      setProductToDelete(null);
      return;
    }
    showNotice(`📦 Plato "${productToDelete.name}" archivado de la carta pública`);
    setProductToDelete(null);
  };

  const handleRestoreProduct = async (prodId: string, name: string) => {
    const res = await restoreProduct(restaurant.id, prodId);
    if (!res.ok) {
      showNotice(`❌ ${res.error || 'No se pudo restaurar el plato en Supabase'}`);
      return;
    }
    showNotice(`✅ Plato "${name}" restaurado a tu carta`);
  };

  const handleToggleProductAvailability = async (prodId: string) => {
    const res = await toggleProductAvailability(restaurant.id, prodId);
    if (!res.ok) {
      showNotice(`❌ ${res.error || 'No se pudo cambiar la disponibilidad en Supabase'}`);
    }
  };

  // Liquidación financiera del restaurante según periodo seleccionado
  const periodOrders = filterOrdersByPeriod(restaurantOrders, salesPeriod);
  const settlement = calculateRestaurantSettlement(periodOrders, restaurant.commissionRate || 0);

  // ============================================================================
  // LÓGICA Y HANDLERS DEL MÓDULO PUNTO DE VENTA (POS)
  // ============================================================================
  const filteredPosProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = posCategoryFilter === 'TODAS' || p.categoryName === posCategoryFilter;
      const q = posSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, posCategoryFilter, posSearch]);

  const handlePosPhoneChange = (val: string) => {
    setPosError(null);
    const clean = val.replace(/\D/g, '').slice(0, 10);
    setPosCustomerPhone(clean);

    if (clean.length === 10) {
      if (clean === '0000000000') {
        if (!posCustomerName || posCustomerName === '') {
          setPosCustomerName('Cliente Mostrador');
        }
      } else {
        const found = orders.find(
          (o) => (o.customerPhone || '').replace(/\D/g, '') === clean && o.customerName
        );
        if (found && (!posCustomerName || posCustomerName === 'Cliente Mostrador' || posCustomerName === '')) {
          setPosCustomerName(found.customerName);
        }
      }
    }
  };

  const handleSetExpressCustomer = () => {
    setPosCustomerPhone('0000000000');
    setPosCustomerName('Cliente Mostrador');
    setPosError(null);
  };

  const currentPosLoyalty = useMemo(() => {
    return getCustomerLoyaltyTier(posCustomerPhone, orders);
  }, [posCustomerPhone, orders]);

  const posCartSubtotal = useMemo(() => {
    return posCart.reduce((acc, item) => acc + item.itemTotal, 0);
  }, [posCart]);

  const effectiveDeliveryFee = globalDeliveryFee || 7000;
  const posDeliveryFee = posChannel === 'delivery_app' ? effectiveDeliveryFee : 0;
  const posTotal = posCartSubtotal + posDeliveryFee;

  const handleAddDirectToPos = (prod: Product) => {
    if (!prod.isAvailable) return;
    if (prod.options && prod.options.length > 0) {
      setPosOptionProduct(prod);
      setPosSelectedOptionsByGroup({});
      setPosOptionQty(1);
      setPosOptionNotes('');
      setPosOptionModalError(null);
      return;
    }

    setPosCart((prev) => {
      const idx = prev.findIndex(
        (it) => it.product.id === prod.id && (!it.selectedOptions || it.selectedOptions.length === 0) && !it.notes
      );
      if (idx >= 0) {
        const next = [...prev];
        const nextQty = next[idx].quantity + 1;
        next[idx] = {
          ...next[idx],
          quantity: nextQty,
          itemTotal: prod.price * nextQty,
        };
        return next;
      }
      return [
        ...prev,
        {
          id: `pos-it-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          product: prod,
          quantity: 1,
          selectedOptions: [],
          notes: '',
          itemTotal: prod.price,
        },
      ];
    });
  };

  const handleConfirmAddOptionProduct = () => {
    if (!posOptionProduct) return;
    setPosOptionModalError(null);

    // Validar selecciones mínimas requeridas
    if (posOptionProduct.options) {
      for (const grp of posOptionProduct.options) {
        const selected = posSelectedOptionsByGroup[grp.id] || [];
        if (grp.required && selected.length < (grp.minSelect || 1)) {
          setPosOptionModalError(`Selecciona al menos ${grp.minSelect || 1} opción en "${grp.name}".`);
          return;
        }
      }
    }

    const flatOptions: SelectedOption[] = [];
    let addPrice = 0;
    Object.entries(posSelectedOptionsByGroup).forEach(([grpId, items]) => {
      const grp = posOptionProduct.options?.find((g) => g.id === grpId);
      const grpName = grp?.name || 'Opciones';
      items.forEach((it) => {
        flatOptions.push({
          groupName: grpName,
          itemName: it.name,
          price: it.additionalPrice,
        });
        addPrice += it.additionalPrice;
      });
    });

    const unitPrice = posOptionProduct.price + addPrice;
    const itemTotal = unitPrice * posOptionQty;

    setPosCart((prev) => [
      ...prev,
      {
        id: `pos-it-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        product: posOptionProduct,
        quantity: posOptionQty,
        selectedOptions: flatOptions,
        notes: posOptionNotes.trim(),
        itemTotal,
      },
    ]);

    setPosOptionProduct(null);
  };

  const handleUpdatePosQty = (itemId: string, delta: number) => {
    setPosCart((prev) => {
      return prev
        .map((it) => {
          if (it.id !== itemId) return it;
          const nextQty = it.quantity + delta;
          if (nextQty <= 0) return null;
          const unitPrice = it.itemTotal / it.quantity;
          return {
            ...it,
            quantity: nextQty,
            itemTotal: unitPrice * nextQty,
          };
        })
        .filter(Boolean) as PosCartItem[];
    });
  };

  const handleRemovePosItem = (itemId: string) => {
    setPosCart((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handleChargePosOrder = async () => {
    setPosError(null);
    if (posCart.length === 0) {
      setPosError('La comanda está vacía. Selecciona al menos un plato.');
      return;
    }
    const cleanPhone = posCustomerPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setPosError('El celular debe tener 10 dígitos numéricos (ej. 3001234567 o usa "Mostrador Express: 0000000000").');
      return;
    }
    const custName = posCustomerName.trim() || (cleanPhone === '0000000000' ? 'Cliente Mostrador' : 'Cliente Local');
    if (posChannel === 'pos_local' && !posTableNumber.trim()) {
      setPosError('Ingresa el número o nombre de la mesa (ej. Mesa 1, Mesa 4, Barra).');
      return;
    }
    if (posChannel === 'delivery_app' && !posDeliveryAddress.trim()) {
      setPosError('Ingresa la dirección para el domicilio en Valledupar.');
      return;
    }

    let isSplit = false;
    let cashAmt = 0;
    let transferAmt = 0;
    let paymentMethod: any = 'EFECTIVO';
    let tPlatform: TransferPlatform | undefined = undefined;

    if (posPaymentType === 'EFECTIVO') {
      cashAmt = posTotal;
      paymentMethod = 'EFECTIVO';
    } else if (posPaymentType === 'TRANSFERENCIA') {
      transferAmt = posTotal;
      paymentMethod = 'TRANSFERENCIA';
      tPlatform = posTransferPlatform;
    } else {
      isSplit = true;
      cashAmt = Number(posSplitCash) || 0;
      transferAmt = Number(posSplitTransfer) || 0;
      tPlatform = posTransferPlatform;
      paymentMethod = 'DIVIDIDO';

      if (cashAmt + transferAmt !== posTotal) {
        setPosError(
          `La suma de efectivo ($${cashAmt.toLocaleString('es-CO')}) + transferencia ($${transferAmt.toLocaleString('es-CO')}) debe ser exactamente igual al total ($${posTotal.toLocaleString('es-CO')}).`
        );
        return;
      }
    }

    setPosSubmitting(true);
    try {
      const orderItems = posCart.map((c) => ({
        id: `it-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: c.product.id,
        productName: c.product.name,
        quantity: c.quantity,
        unitPrice: c.product.price,
        selectedOptions: c.selectedOptions,
        notes: c.notes || undefined,
        subtotal: c.itemTotal,
      }));

      const orderNumber = `DD-${Math.floor(1000 + Math.random() * 9000)}`;
      const newOrderId = `ord-pos-${Date.now()}`;

      const isOwnDelivery = posChannel === 'delivery_app' && posDeliveryFleet === 'PROPIO';

      const newOrder: Order = {
        id: newOrderId,
        orderNumber,
        customerId: cleanPhone,
        customerName: custName,
        customerPhone: cleanPhone,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        status: 'PREPARING',
        items: orderItems,
        subtotal: posCartSubtotal,
        deliveryFee: posDeliveryFee,
        serviceFee: 0,
        total: posTotal,
        paymentMethod,
        paymentStatus: 'COMPLETED',
        deliveryAddress: {
          id: `addr-${Date.now()}`,
          label:
            posChannel === 'pos_local'
              ? `En Mesa (${posTableNumber.trim()})`
              : posChannel === 'pos_takeout'
              ? 'Para Llevar (Mostrador)'
              : isOwnDelivery
              ? 'Domicilio Flota Propia'
              : 'Domicilio DonDomi',
          street:
            posChannel === 'delivery_app'
              ? posDeliveryAddress.trim()
              : posChannel === 'pos_local'
              ? `Consumo en Salón (${posTableNumber.trim()})`
              : 'Retiro en Mostrador del Restaurante',
          neighborhood:
            posChannel === 'delivery_app'
              ? posDeliveryNeighborhood.trim()
              : restaurant.neighborhood || 'Valledupar',
          city: 'Valledupar',
        },
        customerNotes:
          posChannel === 'pos_local'
            ? `Servicio en ${posTableNumber.trim()}`
            : posChannel === 'pos_takeout'
            ? 'Pedido empacado para llevar en mostrador'
            : isOwnDelivery
            ? 'Despacho con Domiciliario Propio | [Flota: PROPIO]'
            : undefined,
        driverId: isOwnDelivery ? 'propio' : undefined,
        driverName: isOwnDelivery ? 'Domiciliario Propio' : undefined,
        deliveryFleet:
          posChannel === 'delivery_app'
            ? isOwnDelivery
              ? 'PROPIO'
              : 'DONDOMI'
            : undefined,
        createdAt: new Date().toISOString(),
        orderChannel: posChannel,
        tableNumber: posChannel === 'pos_local' ? posTableNumber.trim() : undefined,
        isSplitPayment: isSplit,
        cashAmount: cashAmt,
        transferAmount: transferAmt,
        transferPlatform: tPlatform,
      };

      await addOrder(newOrder);

      setPosSuccessOrder(newOrder);
      setKdsFilter('EN_COCINA');
      setPosCart([]);
      setPosCustomerPhone('');
      setPosCustomerName('');
      setPosCashTendered('');
      setPosSplitCash('');
      setPosSplitTransfer('');
      setPosDeliveryAddress('');
      showNotice(`✅ ¡Venta POS #${orderNumber} cobrada y enviada a En Preparación!`);
    } catch (err: any) {
      setPosError(err?.message || 'Error guardando pedido en Supabase.');
    } finally {
      setPosSubmitting(false);
    }
  };

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
                Ingresa las credenciales de tu restaurante para acceder al panel operativo
              </p>
            </div>

            {loginError && (
              <div className="p-3 bg-red-950/70 border border-red-500/40 rounded-2xl text-xs font-bold text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleMerchantLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Identificador de Tienda, Usuario o Correo
                </label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="Correo registrado o código de tienda"
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  PIN de Cocina o Contraseña
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-2xl shadow-lg transition text-sm cursor-pointer"
              >
                {isLoggingIn ? 'Verificando acceso...' : 'Entrar al Panel Aliado'}
              </button>
            </form>
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
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Ver código QR y enlace directo de mi tienda para Instagram/WhatsApp"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Mi QR & Link</span>
            </button>

            <button
              type="button"
              onClick={() => setIsKdsFullscreen(true)}
              className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-orange-600/30 cursor-pointer"
              title="Abrir modo pantalla completa para monitores o tablets en cocina"
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Pantalla KDS</span>
            </button>

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
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-2 sm:grid-cols-5 gap-1 text-xs font-bold">
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
            onClick={() => setActiveTab('POS')}
            className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'POS'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>🖥️ Caja POS</span>
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
          <div className="space-y-3.5">
            {/* Pestañas Operativas de Cocina (5 Etapas Claras) */}
            <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => setKdsFilter('NUEVOS')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                  kdsFilter === 'NUEVOS'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white border-slate-100 text-slate-700 hover:bg-amber-50/50'
                }`}
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-85 block truncate">
                    🔔 Por Aceptar
                  </span>
                  <span className="text-[11px] font-medium opacity-75 hidden sm:block truncate">
                    Nuevas entrantes
                  </span>
                </div>
                <span
                  className={`text-sm font-black px-2 py-0.5 rounded-lg shrink-0 ${
                    kdsFilter === 'NUEVOS'
                      ? 'bg-white/20 text-white'
                      : pendingOrders.length > 0
                      ? 'bg-amber-100 text-amber-800 animate-pulse'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {pendingOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setKdsFilter('EN_COCINA')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                  kdsFilter === 'EN_COCINA'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white border-slate-100 text-slate-700 hover:bg-blue-50/50'
                }`}
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-85 block truncate">
                    👨‍🍳 En Preparación
                  </span>
                  <span className="text-[11px] font-medium opacity-75 hidden sm:block truncate">
                    Cocinándose
                  </span>
                </div>
                <span
                  className={`text-sm font-black px-2 py-0.5 rounded-lg shrink-0 ${
                    kdsFilter === 'EN_COCINA'
                      ? 'bg-white/20 text-white'
                      : preparingOrders.length > 0
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {preparingOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setKdsFilter('EN_RUTA')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                  kdsFilter === 'EN_RUTA'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white border-slate-100 text-slate-700 hover:bg-indigo-50/50'
                }`}
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-85 block truncate">
                    🛵 Listos / Despacho
                  </span>
                  <span className="text-[11px] font-medium opacity-75 hidden sm:block truncate">
                    En barra o ruta
                  </span>
                </div>
                <span
                  className={`text-sm font-black px-2 py-0.5 rounded-lg shrink-0 ${
                    kdsFilter === 'EN_RUTA'
                      ? 'bg-white/20 text-white'
                      : readyOrDispatchedOrders.length > 0
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {readyOrDispatchedOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setKdsFilter('ENTREGADOS')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                  kdsFilter === 'ENTREGADOS'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white border-slate-100 text-slate-700 hover:bg-emerald-50/50'
                }`}
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-85 block truncate">
                    ✅ Completados
                  </span>
                  <span className="text-[11px] font-medium opacity-75 hidden sm:block truncate">
                    Servidos / Entregados
                  </span>
                </div>
                <span
                  className={`text-sm font-black px-2 py-0.5 rounded-lg shrink-0 ${
                    kdsFilter === 'ENTREGADOS'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {deliveredOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setKdsFilter('CANCELADOS')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 col-span-2 sm:col-span-1 ${
                  kdsFilter === 'CANCELADOS'
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-white border-slate-100 text-slate-700 hover:bg-red-50/50'
                }`}
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-85 block truncate">
                    ❌ Cancelados
                  </span>
                  <span className="text-[11px] font-medium opacity-75 hidden sm:block truncate">
                    Rechazados / Anulados
                  </span>
                </div>
                <span
                  className={`text-sm font-black px-2 py-0.5 rounded-lg shrink-0 ${
                    kdsFilter === 'CANCELADOS'
                      ? 'bg-white/20 text-white'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {cancelledOrders.length}
                </span>
              </button>
            </div>

            {/* Barra de Herramientas Sutil: Título, Filtro de Modalidad, Buscador y Botón Discreto de Monitor KDS */}
            <div className="bg-white px-3.5 py-2.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5 mr-1">
                  <ChefHat className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>
                    {kdsFilter === 'NUEVOS' && 'Por Aceptar'}
                    {kdsFilter === 'EN_COCINA' && 'En Preparación'}
                    {kdsFilter === 'EN_RUTA' && 'Listos y En Despacho'}
                    {kdsFilter === 'ENTREGADOS' && 'Completados'}
                    {kdsFilter === 'CANCELADOS' && 'Cancelados'} ({filteredKdsOrders.length})
                  </span>
                </h3>

                {/* Píldoras de filtro por canal */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setKdsChannelFilter('TODOS')}
                    className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                      kdsChannelFilter === 'TODOS'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setKdsChannelFilter('pos_local')}
                    className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                      kdsChannelFilter === 'pos_local'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🍽️ En Mesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setKdsChannelFilter('pos_takeout')}
                    className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                      kdsChannelFilter === 'pos_takeout'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🛍️ Para Llevar
                  </button>
                  <button
                    type="button"
                    onClick={() => setKdsChannelFilter('delivery_app')}
                    className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                      kdsChannelFilter === 'delivery_app'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🛵 Domicilios
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={kdsSearch}
                    onChange={(e) => setKdsSearch(e.target.value)}
                    placeholder="Buscar #DD, mesa, cliente..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !audioEnabled;
                    setAudioEnabled(next);
                    if (next) playKitchenBellChime();
                  }}
                  className={`p-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                    audioEnabled
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                  }`}
                  title={audioEnabled ? 'Timbre de cocina activo' : 'Timbre silenciado'}
                >
                  {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsKdsFullscreen(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                  title="Abrir monitor de cocina en pantalla completa (KDS)"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-orange-400" />
                  <span className="hidden md:inline">Modo Monitor</span>
                </button>
              </div>
            </div>

            {/* Listado de Pedidos Filtrados */}
            <div className="space-y-3">
              {filteredKdsOrders.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700 text-sm">
                    {kdsFilter === 'NUEVOS' && 'No tienes pedidos nuevos pendientes por aceptar'}
                    {kdsFilter === 'EN_COCINA' && 'No hay comandas en preparación en este momento'}
                    {kdsFilter === 'EN_RUTA' && 'No hay pedidos listos en barra ni en ruta'}
                    {kdsFilter === 'ENTREGADOS' && 'Aún no hay pedidos completados con este filtro'}
                    {kdsFilter === 'CANCELADOS' && 'No hay pedidos cancelados o rechazados'}
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {kdsFilter === 'NUEVOS' && preparingOrders.length > 0
                      ? `Tienes ${preparingOrders.length} comanda(s) cocinándose en la pestaña "👨‍🍳 En Preparación".`
                      : 'Cuando ingrese un nuevo pedido o registres una venta en Caja POS, aparecerá automáticamente en su etapa correspondiente.'}
                  </p>
                  {kdsFilter === 'NUEVOS' && preparingOrders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setKdsFilter('EN_COCINA')}
                      className="mt-2 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer shadow-xs"
                    >
                      <ChefHat className="w-3.5 h-3.5" />
                      <span>Ver {preparingOrders.length} en preparación</span>
                    </button>
                  )}
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
                    const isPosOrder = order.orderChannel === 'pos_local' || order.orderChannel === 'pos_takeout';
                    const orderLoyalty = getCustomerLoyaltyTier(order.customerPhone, orders);

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

                            {/* Badge de Canal */}
                            {order.orderChannel === 'pos_local' ? (
                              <span className="bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-lg text-xs font-black flex items-center gap-1">
                                <span>🍽️</span>
                                <span>{order.tableNumber || 'En Mesa'}</span>
                              </span>
                            ) : order.orderChannel === 'pos_takeout' ? (
                              <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-lg text-xs font-black flex items-center gap-1">
                                <span>🛍️</span>
                                <span>Para Llevar</span>
                              </span>
                            ) : (
                              <span className="bg-blue-100 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-lg text-xs font-black flex items-center gap-1">
                                <span>🛵</span>
                                <span>
                                  {order.deliveryFleet === 'PROPIO' ? 'Domicilio Propio' : 'Domicilio DonDomi'}
                                </span>
                              </span>
                            )}

                            {/* Insignia Fidelización VIP */}
                            {orderLoyalty && (
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[11px] font-black border flex items-center gap-1 ${orderLoyalty.badgeClass}`}
                                title={`Cliente ${orderLoyalty.tier} con ${orderLoyalty.orderCount} pedidos entregados`}
                              >
                                <span>{orderLoyalty.icon}</span>
                                <span>{orderLoyalty.tier}</span>
                              </span>
                            )}

                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-bold text-slate-700">
                              Cliente: {order.customerName}
                            </span>
                            {order.customerPhone && order.customerPhone !== '0000000000' && (
                              <a
                                href={`tel:${order.customerPhone}`}
                                className="text-xs text-blue-600 hover:underline font-bold"
                              >
                                ({order.customerPhone})
                              </a>
                            )}

                            {/* Semáforo SLA de Tiempo (solo en pedidos activos) */}
                            {!isDelivered && !isCancelled && renderSlaBadge(order.createdAt)}

                            {order.customerPhone && order.customerPhone.replace(/\D/g, '') !== '0000000000' && order.customerPhone.replace(/\D/g, '').length === 10 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const msg = generateCustomerOrderStatusWhatsAppMessage(order, restaurant.name, orderLoyalty);
                                  const clean = order.customerPhone.replace(/\D/g, '');
                                  window.open(`https://wa.me/57${clean}?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                                className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold px-2.5 py-1 rounded-xl transition flex items-center gap-1 cursor-pointer"
                                title="Notificar estado al cliente por WhatsApp en 1 clic"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Avisar WhatsApp</span>
                              </button>
                            )}
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
                              ⚠️ Nota: &quot;{order.customerNotes}&quot;
                            </p>
                          )}
                        </div>

                        {/* Destino / Modalidad y Forma de pago */}
                        <div className="text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                          {order.orderChannel === 'pos_local' ? (
                            <span className="text-purple-900 font-bold">
                              🍽️ Servicio en Salón:{' '}
                              <strong>{order.tableNumber || 'Mesa en Restaurante'}</strong>{' '}
                              <span className="text-slate-400 font-normal">(Consumo local · Sin domiciliario)</span>
                            </span>
                          ) : order.orderChannel === 'pos_takeout' ? (
                            <span className="text-amber-900 font-bold">
                              🛍️ Entrega en Mostrador:{' '}
                              <strong>Para Llevar</strong>{' '}
                              <span className="text-slate-400 font-normal">(Cliente retira en caja · Sin domiciliario)</span>
                            </span>
                          ) : (
                            <span>
                              📍 Dirección Entrega:{' '}
                              <strong>
                                {order.deliveryAddress.street}, {order.deliveryAddress.neighborhood}
                              </strong>
                              {order.deliveryAddress.reference && ` (${order.deliveryAddress.reference})`}
                            </span>
                          )}

                          <div className="flex items-center gap-2 flex-wrap">
                            {order.isSplitPayment ? (
                              <span className="bg-indigo-100 text-indigo-900 border border-indigo-200 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                💳 Pago Mixto: Efec. {formatCOP(order.cashAmount || 0)} + {order.transferPlatform || 'Transf.'} {formatCOP(order.transferAmount || 0)}
                              </span>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                  order.paymentMethod === 'EFECTIVO'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                Pago: {order.paymentMethod === 'TRANSFERENCIA' && order.transferPlatform ? `📲 ${order.transferPlatform}` : order.paymentMethod}
                              </span>
                            )}

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
                              {isPosOrder
                                ? `Subtotal Salón/Mostrador: ${formatCOP(order.subtotal)}`
                                : `Comida: ${formatCOP(order.subtotal)} · Domicilio: ${formatCOP(order.deliveryFee)}`}
                            </span>
                          </div>
                        </div>

                        {/* Botones de cambio de estado en cocina */}
                        <div className="pt-1 flex flex-wrap items-center gap-2">
                          {isNew && (
                            <div className="flex-1 flex flex-wrap gap-2">
                              <button
                                onClick={() => handleAcceptOrder(order)}
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
                              {isPosOrder ? (
                                <>
                                  <button
                                    onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>
                                      {order.orderChannel === 'pos_local' ? `Servir en ${order.tableNumber || 'Mesa'} (Completar)` : 'Entregar en Mostrador (Completar)'}
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => updateOrderStatus(order.id, 'READY_FOR_PICKUP')}
                                    className="bg-amber-600 hover:bg-amber-500 text-white font-black py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                                  >
                                    <PackageCheck className="w-4 h-4" />
                                    <span>Pasar a Listo en Barra</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => updateOrderStatus(order.id, 'READY_FOR_PICKUP')}
                                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-2.5 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                                  >
                                    <PackageCheck className="w-4 h-4" />
                                    <span>
                                      {order.deliveryFleet === 'PROPIO'
                                        ? 'Empacado · Listo para Domiciliario Propio'
                                        : order.driverName
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
                                </>
                              )}
                            </div>
                          )}

                          {isReady && (
                            <div className="flex-1 flex flex-wrap items-center justify-between gap-2 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                              <div className="text-xs text-amber-900">
                                <span className="font-bold block">
                                  {order.orderChannel === 'pos_local'
                                    ? `🍽️ Listo en barra para servir en ${order.tableNumber || 'Mesa'}`
                                    : order.orderChannel === 'pos_takeout'
                                    ? '🛍️ Empacado y listo para entregar al cliente en mostrador'
                                    : '🛵 Empacado y listo para recogida de domicilio'}
                                </span>
                                <span className="text-[11px] text-amber-700">
                                  {order.orderChannel === 'pos_local' || order.orderChannel === 'pos_takeout'
                                    ? 'Orden exclusiva de salón/mostrador (no visible para domiciliarios).'
                                    : order.deliveryFleet === 'PROPIO'
                                    ? 'Asignado a domiciliario propio del restaurante.'
                                    : order.driverName
                                    ? `Repartidor DonDomi asignado: ${order.driverName} (en camino al restaurante)`
                                    : 'Visible en el radar de domiciliarios DonDomi'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {order.orderChannel === 'pos_local' || order.orderChannel === 'pos_takeout' ? (
                                  <button
                                    onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 px-4 rounded-xl text-xs transition shadow-md cursor-pointer flex items-center gap-1.5"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>
                                      {order.orderChannel === 'pos_local'
                                        ? `Servido en ${order.tableNumber || 'Mesa'}`
                                        : 'Entregado en Mostrador'}
                                    </span>
                                  </button>
                                ) : (
                                  <>
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
                                  </>
                                )}
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
                                  {order.orderChannel === 'pos_local'
                                    ? `Servido en Salón (${order.tableNumber || 'Mesa'})`
                                    : order.orderChannel === 'pos_takeout'
                                    ? 'Entregado en Mostrador (Para Llevar)'
                                    : `Entregado a Domicilio (${order.deliveryFleet === 'PROPIO' ? 'Flota Propia' : `Repartidor: ${order.driverName || 'DonDomi'}`})`}
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
        {/* PESTAÑA: CAJA POS (MOSTRADOR / MESAS / DOMICILIOS) */}
        {/* ============================================================== */}
        {activeTab === 'POS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* COLUMNA IZQUIERDA: CATÁLOGO TÁCTIL (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-3">
              {/* Buscador y Filtro por Categorías */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={posSearch}
                    onChange={(e) => setPosSearch(e.target.value)}
                    placeholder="Buscar plato en la carta táctil..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                  {posSearch && (
                    <button
                      onClick={() => setPosSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Categorías en chips horizontales con scroll */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                  <button
                    onClick={() => setPosCategoryFilter('TODAS')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                      posCategoryFilter === 'TODAS'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    🍽️ Todas ({products.length})
                  </button>
                  {menuCategories.map((cat) => {
                    const count = products.filter((p) => p.categoryName === cat).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setPosCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                          posCategoryFilter === cat
                            ? 'bg-orange-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grilla Táctil de Platos */}
              {filteredPosProducts.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
                  <UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700 text-sm">
                    No se encontraron platos con este criterio
                  </p>
                  <p className="text-xs text-slate-400">
                    Verifica el texto en el buscador o cambia la categoría seleccionada.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {filteredPosProducts.map((prod) => {
                    const hasOptions = prod.options && prod.options.length > 0;
                    const inCartCount = posCart
                      .filter((c) => c.product.id === prod.id)
                      .reduce((acc, c) => acc + c.quantity, 0);

                    return (
                      <button
                        key={prod.id}
                        type="button"
                        disabled={!prod.isAvailable}
                        onClick={() => handleAddDirectToPos(prod)}
                        className={`relative text-left p-3 rounded-2xl border transition flex flex-col justify-between cursor-pointer active:scale-[0.98] ${
                          !prod.isAvailable
                            ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                            : inCartCount > 0
                            ? 'bg-orange-50/40 border-orange-300 ring-2 ring-orange-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                        }`}
                      >
                        {/* Insignia contador en comanda */}
                        {inCartCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-orange-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                            {inCartCount}
                          </span>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400 line-clamp-1">
                              {prod.categoryName}
                            </span>
                            {hasOptions && (
                              <span className="text-[9px] bg-blue-100 text-blue-700 font-extrabold px-1.5 py-0.5 rounded-md shrink-0">
                                Opciones
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-xs text-slate-900 leading-snug line-clamp-2">
                            {prod.name}
                          </h4>
                          {prod.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {prod.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 flex items-center justify-between mt-1 border-t border-slate-100">
                          <span className="font-black text-xs text-emerald-700">
                            {formatCOP(prod.price)}
                          </span>
                          {!prod.isAvailable ? (
                            <span className="text-[10px] font-black text-red-600">Agotado</span>
                          ) : (
                            <span className="w-5 h-5 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center text-xs font-black">
                              +
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* COLUMNA DERECHA: COMANDA Y COBRO POS (lg:col-span-5) */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4 sticky top-16">
              {/* Header Comanda */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-orange-600" />
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Comanda POS ({posCart.reduce((acc, it) => acc + it.quantity, 0)} items)
                  </h3>
                </div>
                {posCart.length > 0 && (
                  <button
                    onClick={() => setPosCart([])}
                    className="text-[11px] font-bold text-red-600 hover:text-red-700 transition cursor-pointer"
                  >
                    Vaciar
                  </button>
                )}
              </div>

              {/* Selector de Canal / Modalidad */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-700 block">
                  Modalidad de Venta *
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPosChannel('pos_local')}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                      posChannel === 'pos_local'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-base block">🍽️</span>
                    <span className="text-[10px] font-extrabold block mt-0.5">En Mesa</span>
                    <span className="text-[9px] opacity-80 block">$0 Domicilio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPosChannel('pos_takeout')}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                      posChannel === 'pos_takeout'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-base block">🛍️</span>
                    <span className="text-[10px] font-extrabold block mt-0.5">Para Llevar</span>
                    <span className="text-[9px] opacity-80 block">$0 Domicilio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPosChannel('delivery_app')}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                      posChannel === 'delivery_app'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-base block">🛵</span>
                    <span className="text-[10px] font-extrabold block mt-0.5">Domicilio</span>
                    <span className="text-[9px] opacity-80 block">+{formatCOP(effectiveDeliveryFee)}</span>
                  </button>
                </div>

                {/* Subcampo según canal */}
                {posChannel === 'pos_local' && (
                  <div className="pt-1 space-y-1">
                    <input
                      type="text"
                      value={posTableNumber}
                      onChange={(e) => setPosTableNumber(e.target.value)}
                      placeholder="Identificador (ej. Mesa 4, Barra 2, Salón B)..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-[10px] text-purple-700 font-medium px-1">
                      ✓ Orden exclusiva de salón · No se enviará al radar de domiciliarios.
                    </p>
                  </div>
                )}

                {posChannel === 'pos_takeout' && (
                  <div className="pt-1">
                    <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200/70 rounded-xl px-2.5 py-1.5 font-medium">
                      🛍️ El cliente retira su pedido empacado en mostrador · No se enviará a domiciliarios.
                    </p>
                  </div>
                )}

                {posChannel === 'delivery_app' && (
                  <div className="pt-1 space-y-1.5">
                    <input
                      type="text"
                      value={posDeliveryAddress}
                      onChange={(e) => setPosDeliveryAddress(e.target.value)}
                      placeholder="Dirección exacta en Valledupar (ej. Cra 9 # 12-34)..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={posDeliveryNeighborhood}
                      onChange={(e) => setPosDeliveryNeighborhood(e.target.value)}
                      placeholder="Barrio (ej. Novalito, Alfonso López, Las Flores)..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setPosDeliveryFleet('DONDOMI')}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                          posDeliveryFleet === 'DONDOMI'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        🛵 Flota DonDomi
                      </button>
                      <button
                        type="button"
                        onClick={() => setPosDeliveryFleet('PROPIO')}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                          posDeliveryFleet === 'PROPIO'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        🏠 Domi Propio
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Datos del Cliente & Fidelización VIP */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-600" />
                    <span>Celular Cliente (10 dígitos)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleSetExpressCustomer}
                    className="text-[10px] font-black text-orange-600 hover:text-orange-700 bg-orange-100/70 hover:bg-orange-100 px-2 py-0.5 rounded-lg transition cursor-pointer"
                    title="Usa teléfono genérico 0000000000 para ventas rápidas de mostrador"
                  >
                    ⚡ Mostrador Express
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="tel"
                    maxLength={10}
                    value={posCustomerPhone}
                    onChange={(e) => handlePosPhoneChange(e.target.value)}
                    placeholder="Ej: 3001234567"
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="text"
                    value={posCustomerName}
                    onChange={(e) => setPosCustomerName(e.target.value)}
                    placeholder="Nombre del cliente..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Banner de Fidelización VIP en tiempo real */}
                {currentPosLoyalty && (
                  <div className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${currentPosLoyalty.badgeClass}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{currentPosLoyalty.icon}</span>
                      <div>
                        <span className="text-xs font-black block leading-none">
                          Cliente {currentPosLoyalty.tier}
                        </span>
                        <span className="text-[10px] opacity-80 block leading-tight mt-0.5">
                          {currentPosLoyalty.orderCount} pedidos entregados
                        </span>
                      </div>
                    </div>
                    {currentPosLoyalty.discountMessage && (
                      <span className="text-[10px] font-bold text-amber-800 text-right">
                        {currentPosLoyalty.discountMessage}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Items en Comanda */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-slate-700 block">
                  Platos a Ordenar
                </span>
                {posCart.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-1">
                    <ShoppingBag className="w-6 h-6 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">Comanda vacía</p>
                    <p className="text-[11px] text-slate-400">
                      Toca cualquier plato de la izquierda para agregarlo.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-1.5 divide-y divide-slate-100 pr-1">
                    {posCart.map((item) => (
                      <div key={item.id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-extrabold text-slate-900 truncate">
                            {item.product.name}
                          </h5>
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <p className="text-[10px] text-slate-500 line-clamp-1">
                              + {item.selectedOptions.map((o) => o.itemName).join(', ')}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-[10px] text-amber-700 italic truncate">
                              &quot;{item.notes}&quot;
                            </p>
                          )}
                          <span className="text-[11px] font-bold text-slate-600">
                            {formatCOP(item.itemTotal)}
                          </span>
                        </div>

                        {/* Controles de Cantidad */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdatePosQty(item.id, -1)}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-black text-xs w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdatePosQty(item.id, 1)}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black cursor-pointer"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePosItem(item.id)}
                            className="w-6 h-6 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center cursor-pointer ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selector de Método de Pago y Calculadora de Cambio */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-[11px] font-extrabold text-slate-700 block">
                  Método de Pago *
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setPosPaymentType('EFECTIVO')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                      posPaymentType === 'EFECTIVO'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Efectivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPosPaymentType('TRANSFERENCIA')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                      posPaymentType === 'TRANSFERENCIA'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Digital</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPosPaymentType('DIVIDIDO')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                      posPaymentType === 'DIVIDIDO'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Mixto</span>
                  </button>
                </div>

                {/* Pago 100% Efectivo con Calculadora de Devuelta */}
                {posPaymentType === 'EFECTIVO' && (
                  <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/70 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-amber-900">¿Con cuánto paga el cliente?</span>
                      <button
                        type="button"
                        onClick={() => setPosCashTendered(posTotal.toString())}
                        className="text-[10px] font-black text-amber-800 underline hover:text-amber-900"
                      >
                        Pago Exacto
                      </button>
                    </div>

                    <div className="relative">
                      <span className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs">$</span>
                      <input
                        type="number"
                        value={posCashTendered}
                        onChange={(e) => setPosCashTendered(e.target.value)}
                        placeholder={posTotal > 0 ? posTotal.toString() : '0'}
                        className="w-full bg-white border border-amber-300 rounded-xl pl-7 pr-3 py-1.5 text-xs text-slate-900 font-black focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Botones rápidos de billetes comunes */}
                    {posTotal > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        {[
                          posTotal,
                          Math.ceil(posTotal / 10000) * 10000,
                          Math.ceil(posTotal / 20000) * 20000,
                          Math.ceil(posTotal / 50000) * 50000,
                        ]
                          .filter((v, i, a) => v >= posTotal && a.indexOf(v) === i)
                          .map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setPosCashTendered(val.toString())}
                              className="px-2 py-0.5 rounded-lg bg-white border border-amber-200 text-amber-900 font-bold text-[10px] hover:bg-amber-100"
                            >
                              ${val.toLocaleString('es-CO')}
                            </button>
                          ))}
                      </div>
                    )}

                    {/* Resultado de Cambio / Devuelta */}
                    {Number(posCashTendered) > 0 && (
                      <div className="pt-1 border-t border-amber-200/80 flex items-center justify-between font-black">
                        <span className="text-amber-900 text-xs">Devuelta / Cambio:</span>
                        <span
                          className={`text-sm ${
                            Number(posCashTendered) >= posTotal ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {Number(posCashTendered) >= posTotal
                            ? formatCOP(Number(posCashTendered) - posTotal)
                            : `Faltan ${formatCOP(posTotal - Number(posCashTendered))}`}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Pago 100% Digital / Transferencia */}
                {posPaymentType === 'TRANSFERENCIA' && (
                  <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-200/70 space-y-2 text-xs">
                    <span className="font-extrabold text-blue-900 block">
                      Selecciona la plataforma receptora:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['Nequi', 'Daviplata', 'Bancolombia', 'Datáfono'] as TransferPlatform[]).map((plat) => (
                        <button
                          key={plat}
                          type="button"
                          onClick={() => setPosTransferPlatform(plat)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            posTransferPlatform === plat
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-white border-blue-200 text-blue-900 hover:bg-blue-100/50'
                          }`}
                        >
                          {plat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pago Mixto / Dividido */}
                {posPaymentType === 'DIVIDIDO' && (
                  <div className="bg-indigo-50/70 p-3 rounded-2xl border border-indigo-200/70 space-y-2 text-xs">
                    <span className="font-extrabold text-indigo-900 block">
                      Desglose de Pago Dividido:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                          En Efectivo ($)
                        </label>
                        <input
                          type="number"
                          value={posSplitCash}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPosSplitCash(val);
                            const num = Number(val) || 0;
                            if (num <= posTotal) {
                              setPosSplitTransfer((posTotal - num).toString());
                            }
                          }}
                          placeholder="0"
                          className="w-full bg-white border border-indigo-300 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                          En Transferencia ($)
                        </label>
                        <input
                          type="number"
                          value={posSplitTransfer}
                          onChange={(e) => setPosSplitTransfer(e.target.value)}
                          placeholder="0"
                          className="w-full bg-white border border-indigo-300 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1 pt-1">
                      {(['Nequi', 'Daviplata', 'Bancolombia', 'Datáfono'] as TransferPlatform[]).map((plat) => (
                        <button
                          key={plat}
                          type="button"
                          onClick={() => setPosTransferPlatform(plat)}
                          className={`py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                            posTransferPlatform === plat
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white border-indigo-200 text-indigo-900'
                          }`}
                        >
                          {plat}
                        </button>
                      ))}
                    </div>

                    {/* Validación de balance */}
                    {(() => {
                      const totalSplit = (Number(posSplitCash) || 0) + (Number(posSplitTransfer) || 0);
                      const diff = posTotal - totalSplit;
                      return (
                        <div className="pt-1 text-[11px] font-black flex items-center justify-between border-t border-indigo-200">
                          <span>Suma Dividida: {formatCOP(totalSplit)}</span>
                          <span className={diff === 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {diff === 0 ? '✓ Cuadrado' : diff > 0 ? `Faltan ${formatCOP(diff)}` : `Excede por ${formatCOP(-diff)}`}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Resumen Financiero de la Venta */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Comida:</span>
                  <span className="font-bold text-slate-800">{formatCOP(posCartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tarifa Domicilio:</span>
                  <span className="font-bold text-slate-800">
                    {posChannel === 'delivery_app' ? formatCOP(posDeliveryFee) : '$0 COP'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-900 font-black text-base pt-1.5 border-t border-slate-200">
                  <span>TOTAL A COBRAR:</span>
                  <span className="text-orange-600">{formatCOP(posTotal)}</span>
                </div>
              </div>

              {/* Mensaje de Error en POS */}
              {posError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{posError}</span>
                </div>
              )}

              {/* Botón Maestro de Cobro y Envío a Cocina */}
              <button
                type="button"
                disabled={posCart.length === 0 || posSubmitting}
                onClick={handleChargePosOrder}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                  posCart.length === 0 || posSubmitting
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-[0.99]'
                }`}
              >
                {posSubmitting ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Registrando y Enviando a Cocina...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cobrar y Enviar a Cocina ({formatCOP(posTotal)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PESTAÑA 2: GESTIÓN DE MENÚ, CATEGORÍAS Y ADICIONES */}
        {/* ============================================================== */}
        {activeTab === 'MENU' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Carta de {restaurant.name} ({products.length} platos)
                </h3>
                <p className="text-xs text-slate-500">
                  Administra tus categorías, platos, precios, grupos de opciones/adiciones y disponibilidad en tiempo real.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryModalError(null);
                    setNewCategoryName('');
                    setIsCategoryModalOpen(true);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-3.5 py-2 rounded-2xl text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4 text-orange-400" />
                  <span>Agregar Categoría</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddProduct}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold px-3.5 py-2 rounded-2xl text-xs transition flex items-center gap-1.5 shadow-md shadow-orange-600/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Nuevo Plato</span>
                </button>
              </div>
            </div>

            {/* Filtros por categoría de carta y buscador */}
            {(products.length > 0 || menuCategories.length > 0) && (
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
                        onClick={() => handleToggleProductAvailability(prod.id)}
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

                      {/* Botones Editar y Archivar */}
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
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition cursor-pointer"
                          title="Archivar plato (ocultar de la carta sin borrar historial)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sección de Platos Archivados (conservados para historial y con opción de restauración) */}
            {archivedProducts.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📦</span>
                    <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                      Platos Archivados ({archivedProducts.length})
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Ocultos del menú público · Histórico protegido
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {archivedProducts.map((archived) => (
                    <div
                      key={archived.id}
                      className="bg-white border border-slate-200/90 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 truncate">
                            {archived.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({archived.categoryName})
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {formatCOP(archived.price)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreProduct(archived.id, archived.name)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold transition flex-shrink-0 cursor-pointer"
                        title="Restaurar plato a la carta pública"
                      >
                        Restaurar
                      </button>
                    </div>
                  ))}
                </div>
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

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const periodLabel =
                      salesPeriod === 'TODAY'
                        ? 'Hoy'
                        : salesPeriod === 'YESTERDAY'
                        ? 'Ayer'
                        : salesPeriod === 'WEEK'
                        ? 'Últimos 7 Días'
                        : salesPeriod === 'MONTH'
                        ? 'Últimos 30 Días'
                        : 'Histórico Total';
                    const msg = generateWhatsAppSettlementMessage(restaurant.name, settlement, periodLabel);
                    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                    window.open(waUrl, '_blank');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Enviar resumen financiero del día por WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>📲 Enviar Cierre por WhatsApp</span>
                </button>

                <button
                  onClick={handlePrintSettlement}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir POS</span>
                </button>
              </div>
            </div>

            {/* KPIs Principales con Ticket Promedio y Canales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Venta Comida Realizada
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 block">
                  {formatCOP(settlement.foodSubtotalTotal)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {settlement.deliveredOrdersCount} ventas completadas
                </span>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Ticket Promedio
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                  {formatCOP(settlement.averageTicket)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Promedio por comanda
                </span>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Efectivo en Caja vs Digital
                </span>
                <span className="text-sm font-black text-amber-900 mt-1 block">
                  💵 {formatCOP(settlement.cashFoodSubtotal)}
                </span>
                <span className="text-xs font-bold text-blue-600 mt-0.5 block">
                  📲 {formatCOP(settlement.digitalFoodSubtotal)}
                </span>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Canales de Venta
                </span>
                <span className="text-xs font-bold text-purple-700 mt-1 block">
                  🍽️ Mesa: {settlement.posLocalCount} ({formatCOP(settlement.posLocalSales)})
                </span>
                <span className="text-xs font-bold text-amber-700 block">
                  🛍️ Llevar: {settlement.posTakeoutCount} ({formatCOP(settlement.posTakeoutSales)})
                </span>
                <span className="text-xs font-bold text-blue-700 block">
                  🛵 Domicilio: {settlement.deliveryAppCount} ({formatCOP(settlement.deliveryAppSales)})
                </span>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Comisión DonDomi (0%)
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 block">
                  $0 COP
                </span>
                <span className="text-[10px] text-emerald-700 font-extrabold mt-0.5 block">
                  ✓ Modelo 100% Gratuito
                </span>
              </div>
            </div>

            {/* Desglose de Liquidación y Cruce de Domicilios Digitales */}
            <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-sm leading-tight">
                      Estado de Liquidación y Cuadre de Caja
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Cruce transparente de ventas, domicilios por transferencia y comisión de plataforma.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <div className="flex items-center justify-center gap-1.5 bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span>{settlement.deliveredOrdersCount} entregados</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 bg-rose-950/60 border border-rose-700/50 text-rose-300 px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                    <span>{settlement.cancelledOrdersCount} cancelados</span>
                  </div>
                </div>
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

            {/* Top Platos Más Vendidos del Periodo */}
            {settlement.topProducts && settlement.topProducts.length > 0 && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>🏆</span>
                    <span>Top Platos Más Vendidos del Periodo</span>
                  </h4>
                  <span className="text-[11px] font-bold text-slate-400">
                    Ranking por unidades
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {settlement.topProducts.map((p, idx) => (
                    <div
                      key={p.name}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0 font-black">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-xs text-slate-900 truncate">
                            {p.name}
                          </h5>
                          <span className="text-[10px] text-slate-500 block">
                            {p.quantity} unidades vendidas
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-700 shrink-0">
                        {formatCOP(p.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Categoría en tu Menú *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryModalError(null);
                        setNewCategoryName('');
                        setIsCategoryModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Nueva categoría</span>
                    </button>
                  </div>
                  <select
                    required
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                  >
                    <option value="" disabled>
                      Selecciona una categoría...
                    </option>
                    {menuCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    {prodCategory && !menuCategories.includes(prodCategory) && (
                      <option value={prodCategory}>{prodCategory}</option>
                    )}
                  </select>
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
                        placeholder={`Nombre del grupo #${grpIdx + 1} (Ej: Elige tus salsas o acompañamientos)`}
                        className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveOptionGroup(grp.id)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"
                        title="Eliminar grupo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Configuración de obligatoriedad y cantidades múltiples (Mínimo / Máximo) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={grp.required}
                          onChange={(e) => {
                            const isReq = e.target.checked;
                            const nextMin = isReq ? Math.max(1, grp.minSelect || 1) : 0;
                            const nextMax = Math.max(nextMin || 1, grp.maxSelect || 1);
                            handleUpdateOptionGroup(grp.id, {
                              required: isReq,
                              minSelect: nextMin,
                              maxSelect: nextMax,
                            });
                          }}
                          className="accent-orange-600 rounded"
                        />
                        <span>Selección Obligatoria</span>
                      </label>

                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <label className="text-[11px] font-bold text-slate-600 whitespace-nowrap">
                          Mín. requerido:
                        </label>
                        <input
                          type="number"
                          min={grp.required ? 1 : 0}
                          max={20}
                          value={grp.required ? Math.max(1, grp.minSelect || 1) : grp.minSelect ?? 0}
                          onChange={(e) => {
                            const rawMin = Math.max(0, Number(e.target.value) || 0);
                            const isReq = rawMin > 0;
                            const nextMax = Math.max(rawMin || 1, grp.maxSelect || 1);
                            handleUpdateOptionGroup(grp.id, {
                              required: isReq,
                              minSelect: rawMin,
                              maxSelect: nextMax,
                            });
                          }}
                          className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-extrabold text-slate-900 text-center"
                        />
                      </div>

                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <label className="text-[11px] font-bold text-slate-600 whitespace-nowrap">
                          Máx. permitido:
                        </label>
                        <input
                          type="number"
                          min={Math.max(1, grp.required ? grp.minSelect || 1 : 1)}
                          max={30}
                          value={Math.max(grp.required ? grp.minSelect || 1 : 1, grp.maxSelect || 1)}
                          onChange={(e) => {
                            const minAllowed = Math.max(1, grp.required ? grp.minSelect || 1 : 1);
                            const nextMax = Math.max(minAllowed, Number(e.target.value) || minAllowed);
                            handleUpdateOptionGroup(grp.id, {
                              maxSelect: nextMax,
                            });
                          }}
                          className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-extrabold text-slate-900 text-center"
                        />
                      </div>
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
      {/* MODAL: AGREGAR Y GESTIONAR CATEGORÍAS DE LA CARTA */}
      {/* ============================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:hidden">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-orange-600" />
                <h3 className="font-black text-base text-slate-900">
                  Categorías de tu Carta
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Crea y organiza las categorías de tu menú para clasificar tus platos (ej. Entradas, Combos, Salchipapas, Bebidas).
            </p>

            {categoryModalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-bold leading-tight">{categoryModalError}</span>
              </div>
            )}

            <form onSubmit={handleAddMenuCategory} className="flex items-center gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  if (categoryModalError) setCategoryModalError(null);
                }}
                placeholder="Ej: Asados, Salchipapas, Bebidas..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1 shadow-sm cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Crear</span>
              </button>
            </form>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Categorías Activas ({menuCategories.length})
              </span>

              {menuCategories.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  Aún no has creado categorías en tu carta.
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {menuCategories.map((cat) => {
                    const count = products.filter((p) => p.categoryName === cat).length;
                    return (
                      <div
                        key={cat}
                        className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-extrabold text-slate-800 truncate">{cat}</span>
                          <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                            {count} {count === 1 ? 'plato' : 'platos'}
                          </span>
                        </div>
                        {count === 0 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMenuCategory(cat)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition cursor-pointer"
                            title="Eliminar categoría vacía"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMAR ARCHIVADO LÓGICO DE PLATO */}
      {/* ============================================================== */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in print:hidden">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-slate-800 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-xl font-bold">
              📦
            </div>
            <div className="text-center">
              <h4 className="font-black text-slate-900 text-base">¿Archivar plato de tu carta?</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                ¿Deseas archivar <strong>&quot;{productToDelete.name}&quot;</strong>? Desaparecerá del menú público y no podrá ser pedido por clientes, pero se conservará en tu historial de ventas y podrás restaurarlo cuando quieras.
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
                className="py-2.5 px-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/25 transition cursor-pointer"
              >
                Sí, archivar
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
      {/* MODAL PERSONALIZAR OPCIONES DE PLATO EN CAJA POS */}
      {/* ============================================================== */}
      {posOptionProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  {posOptionProduct.categoryName}
                </span>
                <h3 className="font-extrabold text-base text-slate-900">
                  {posOptionProduct.name}
                </h3>
                <span className="text-xs font-black text-emerald-700 block mt-0.5">
                  Base: {formatCOP(posOptionProduct.price)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPosOptionProduct(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {posOptionModalError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{posOptionModalError}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {posOptionProduct.options?.map((group) => {
                const selectedItems = posSelectedOptionsByGroup[group.id] || [];
                return (
                  <div key={group.id} className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-slate-900 block">{group.name}</span>
                        <span className="text-[10px] text-slate-500 block">
                          {group.required
                            ? `Obligatorio (min ${group.minSelect || 1})`
                            : 'Opcional'}
                          {group.maxSelect ? ` · Máx ${group.maxSelect}` : ''}
                        </span>
                      </div>
                      {group.required && selectedItems.length < (group.minSelect || 1) && (
                        <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">
                          Requerido
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {group.items.map((it) => {
                        const isChecked = selectedItems.some((s) => s.id === it.id);
                        return (
                          <label
                            key={it.id}
                            className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition ${
                              isChecked
                                ? 'bg-orange-50 border-orange-400 text-orange-950 font-bold'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type={group.maxSelect === 1 ? 'radio' : 'checkbox'}
                                name={group.id}
                                checked={isChecked}
                                onChange={() => {
                                  setPosSelectedOptionsByGroup((prev) => {
                                    const current = prev[group.id] || [];
                                    if (group.maxSelect === 1) {
                                      return { ...prev, [group.id]: [it] };
                                    }
                                    if (isChecked) {
                                      return {
                                        ...prev,
                                        [group.id]: current.filter((s) => s.id !== it.id),
                                      };
                                    }
                                    if (group.maxSelect && current.length >= group.maxSelect) {
                                      return prev;
                                    }
                                    return {
                                      ...prev,
                                      [group.id]: [...current, it],
                                    };
                                  });
                                }}
                                className="accent-orange-600"
                              />
                              <span>{it.name}</span>
                            </div>
                            <span className="font-bold text-slate-700">
                              {it.additionalPrice > 0 ? `+${formatCOP(it.additionalPrice)}` : 'Incluido'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Cantidad e Instrucción especial para cocina */}
              <div className="space-y-2 pt-1">
                <label className="font-extrabold text-slate-800 block">
                  Instrucción especial para cocina (opcional):
                </label>
                <input
                  type="text"
                  value={posOptionNotes}
                  onChange={(e) => setPosOptionNotes(e.target.value)}
                  placeholder="Ej: Sin cebolla, término medio, salsa aparte..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-extrabold text-slate-800">Cantidad:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPosOptionQty((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-black text-sm w-6 text-center">{posOptionQty}</span>
                  <button
                    type="button"
                    onClick={() => setPosOptionQty((q) => q + 1)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setPosOptionProduct(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAddOptionProduct}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-600/20 transition cursor-pointer"
              >
                Agregar a la Comanda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL CELEBRACIÓN Y CONFIRMACIÓN VENTA POS EXITOSA */}
      {/* ============================================================== */}
      {posSuccessOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">
                Venta Cobrada y En Cocina
              </span>
              <h3 className="font-black text-xl text-slate-900 mt-0.5">
                ¡Orden #{posSuccessOrder.orderNumber} Registrada!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                La orden ya aparece en la bandeja de Comandas de Cocina para preparación inmediata.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-1.5 text-xs text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Modalidad:</span>
                <span className="font-extrabold text-slate-800">
                  {posSuccessOrder.orderChannel === 'pos_local'
                    ? `🍽️ Mesa ${posSuccessOrder.tableNumber || ''}`
                    : posSuccessOrder.orderChannel === 'pos_takeout'
                    ? '🛍️ Para Llevar'
                    : '🛵 Domicilio DonDomi'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-bold text-slate-800">{posSuccessOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Forma de Pago:</span>
                <span className="font-bold text-slate-800">
                  {posSuccessOrder.isSplitPayment
                    ? `Mixto (Efec: ${formatCOP(posSuccessOrder.cashAmount || 0)} + ${posSuccessOrder.transferPlatform}: ${formatCOP(posSuccessOrder.transferAmount || 0)})`
                    : posSuccessOrder.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-200">
                <span className="text-slate-900">Total Cobrado:</span>
                <span className="text-emerald-600">{formatCOP(posSuccessOrder.total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handlePrintTicket(posSuccessOrder)}
                className="py-2.5 px-3 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Ticket POS</span>
              </button>

              <button
                type="button"
                onClick={() => setPosSuccessOrder(null)}
                className="py-2.5 px-3 rounded-xl text-xs font-black bg-orange-600 hover:bg-orange-500 text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-orange-600/20"
              >
                <span>Nueva Venta POS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PANTALLA COMPLETA DE COCINA (KDS FULLSCREEN) */}
      {/* ============================================================== */}
      {isKdsFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col overflow-hidden select-none animate-in fade-in">
          {/* Top Bar KDS */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            {/* Restaurant brand & live clock */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black shadow-md shadow-orange-600/30">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black tracking-widest text-orange-400 bg-orange-950/70 border border-orange-500/40 px-2 py-0.5 rounded-full">
                    KDS Cocina Fullscreen
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {new Date(liveCurrentTime).toLocaleTimeString('es-CO')}
                  </span>
                </div>
                <h2 className="text-base font-black text-white tracking-tight leading-none mt-0.5">
                  {restaurant.name}
                </h2>
              </div>
            </div>

            {/* Station Filter Pills */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
              <button
                type="button"
                onClick={() => setKdsStationFilter('TODOS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  kdsStationFilter === 'TODOS'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Todos</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-900/60 text-[10px]">
                  {restaurantOrders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'READY_FOR_PICKUP').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setKdsStationFilter('LOCAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  kdsStationFilter === 'LOCAL'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🍽️ Mesa/Mostrador</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-900/60 text-[10px]">
                  {activeLocalOrdersCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setKdsStationFilter('DOMI')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  kdsStationFilter === 'DOMI'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🛵 Domicilios App</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-900/60 text-[10px]">
                  {activeDeliveryOrdersCount}
                </span>
              </button>
            </div>

            {/* Actions, sound, print and exit */}
            <div className="flex items-center gap-2">
              {/* Sonido toggle y test */}
              <button
                type="button"
                onClick={() => {
                  setAudioEnabled(!audioEnabled);
                  if (!audioEnabled) {
                    playKitchenBellChime();
                  }
                }}
                className={`p-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                  audioEnabled
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/60'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title={audioEnabled ? 'Sonido de timbre activado' : 'Sonido silenciado'}
              >
                {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                <span className="hidden sm:inline">{audioEnabled ? 'Timbre Activo' : 'Silencio'}</span>
              </button>

              <button
                type="button"
                onClick={() => playKitchenBellChime()}
                className="p-2 rounded-xl text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                title="Probar sonido campanada doble de cocina"
              >
                <Bell className="w-4 h-4" />
              </button>

              {/* Auto-print toggle */}
              <button
                type="button"
                onClick={() => setAutoPrintOnAccept(!autoPrintOnAccept)}
                className={`p-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                  autoPrintOnAccept
                    ? 'bg-sky-950/60 border-sky-500/40 text-sky-400 hover:bg-sky-900/60'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Imprimir comanda térmica automáticamente al aceptar"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden md:inline">
                  {autoPrintOnAccept ? 'Auto-Imprimir: SÍ' : 'Auto-Imprimir: NO'}
                </span>
              </button>

              {/* Salir de KDS */}
              <button
                type="button"
                onClick={() => setIsKdsFullscreen(false)}
                className="bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/50 p-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer"
                title="Salir del Modo KDS Pantalla Completa (o presiona tecla ESC)"
              >
                <Minimize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Salir KDS (ESC)</span>
              </button>
            </div>
          </div>

          {/* Grid de Comandas KDS */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-950">
            {activeKdsOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-emerald-400 shadow-xl">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-slate-200">¡Cocina al Día!</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  No hay comandas activas pendientes de preparación en este momento. Cuando entre un pedido, sonará automáticamente la campanada de cocina.
                </p>
                <button
                  type="button"
                  onClick={() => playKitchenBellChime()}
                  className="mt-5 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 transition flex items-center gap-2 cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-orange-400" />
                  <span>Probar timbre de cocina</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {activeKdsOrders.map((order) => {
                  const orderLoyalty = getCustomerLoyaltyTier(order.customerPhone, orders);
                  const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');
                  const canSendWhatsApp = cleanPhone.length === 10 && cleanPhone !== '0000000000';

                  const isPending = order.status === 'PENDING';
                  const isPreparing = order.status === 'PREPARING';
                  const isReady = order.status === 'READY_FOR_PICKUP';

                  return (
                    <div
                      key={order.id}
                      className={`rounded-2xl border-2 flex flex-col justify-between overflow-hidden transition-all shadow-xl ${
                        isPending
                          ? 'bg-amber-950/20 border-amber-500/80 shadow-amber-500/10'
                          : isPreparing
                          ? 'bg-slate-900 border-sky-500/80 shadow-sky-500/10'
                          : 'bg-emerald-950/20 border-emerald-500/80 shadow-emerald-500/10'
                      }`}
                    >
                      {/* Header de la comanda */}
                      <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/60 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-white tracking-tight">
                              #{order.orderNumber}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                isPending
                                  ? 'bg-amber-500 text-slate-950'
                                  : isPreparing
                                  ? 'bg-sky-500 text-slate-950'
                                  : 'bg-emerald-500 text-slate-950'
                              }`}
                            >
                              {isPending ? 'Nuevo' : isPreparing ? 'En Cocina' : 'Listo'}
                            </span>
                          </div>

                          {/* Semáforo SLA de Tiempo */}
                          <div>{renderSlaBadge(order.createdAt, true)}</div>
                        </div>

                        {/* Canal y Datos del Cliente */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            {order.orderChannel === 'pos_local' ? (
                              <span className="bg-purple-900/80 text-purple-200 border border-purple-500/40 px-2 py-0.5 rounded-lg font-black text-[11px] flex items-center gap-1">
                                🍽️ Mesa {order.tableNumber || 'Local'}
                              </span>
                            ) : order.orderChannel === 'pos_takeout' ? (
                              <span className="bg-indigo-900/80 text-indigo-200 border border-indigo-500/40 px-2 py-0.5 rounded-lg font-black text-[11px] flex items-center gap-1">
                                🛍️ Para Llevar
                              </span>
                            ) : (
                              <span className="bg-amber-900/80 text-amber-200 border border-amber-500/40 px-2 py-0.5 rounded-lg font-black text-[11px] flex items-center gap-1">
                                🛵 Domicilio DonDomi
                              </span>
                            )}

                            {orderLoyalty && orderLoyalty.tier !== 'Nuevo' && (
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${orderLoyalty.badgeClass}`}
                              >
                                {orderLoyalty.icon} {orderLoyalty.label}
                              </span>
                            )}
                          </div>

                          <span className="text-slate-400 font-bold truncate max-w-[130px]">
                            {order.customerName}
                          </span>
                        </div>
                      </div>

                      {/* Cuerpo con los Platos a Cocinar */}
                      <div className="p-3.5 space-y-3 flex-1 overflow-y-auto max-h-[360px]">
                        <div className="space-y-2">
                          {order.items.map((it) => (
                            <div
                              key={it.id}
                              className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2">
                                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-sm px-2 py-0.5 rounded-lg">
                                    {it.quantity}x
                                  </span>
                                  <span className="font-bold text-white text-sm leading-snug">
                                    {it.productName}
                                  </span>
                                </div>
                              </div>

                              {it.selectedOptions && it.selectedOptions.length > 0 && (
                                <div className="text-xs text-slate-400 pl-8 space-y-0.5">
                                  {it.selectedOptions.map((opt, optIdx) => (
                                    <p key={`${opt.groupName}-${opt.itemName}-${optIdx}`} className="text-slate-300">
                                      + {opt.itemName}
                                    </p>
                                  ))}
                                </div>
                              )}

                              {it.notes && (
                                <p className="text-xs text-amber-300 font-medium italic pl-8 bg-amber-950/40 border-l-2 border-amber-500 py-0.5 px-1.5 rounded-r">
                                  Nota: &quot;{it.notes}&quot;
                                </p>
                              )}
                            </div>
                          ))}
                        </div>

                        {order.customerNotes && (
                          <div className="bg-amber-950/60 border border-amber-600/50 p-2.5 rounded-xl text-xs text-amber-200">
                            <span className="font-black text-amber-400 block mb-0.5">
                              ⚠️ Nota del cliente:
                            </span>
                            &quot;{order.customerNotes}&quot;
                          </div>
                        )}
                      </div>

                      {/* Footer con Acciones Táctiles Gigantes */}
                      <div className="p-3 bg-slate-900/90 border-t border-slate-800 space-y-2">
                        {/* Botones principales de avance de estado */}
                        {isPending && (
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => handleAcceptOrder(order)}
                              className="col-span-2 bg-orange-600 hover:bg-orange-500 text-white font-black py-3 px-3 rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <ChefHat className="w-5 h-5" />
                              <span>Cocinar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenRejectModal(order)}
                              className="bg-slate-800 hover:bg-rose-950/80 text-rose-300 border border-slate-700 hover:border-rose-500/40 font-bold py-3 px-2 rounded-xl text-xs transition flex items-center justify-center cursor-pointer"
                            >
                              Rechazar
                            </button>
                          </div>
                        )}

                        {isPreparing && (
                          <div className="space-y-1.5">
                            {order.orderChannel === 'pos_local' ? (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-2 rounded-xl text-xs transition flex items-center justify-center gap-1 cursor-pointer shadow-md"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Servir en Mesa</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateOrderStatus(order.id, 'READY_FOR_PICKUP')}
                                  className="bg-amber-600 hover:bg-amber-500 text-white font-black py-3 px-2 rounded-xl text-xs transition flex items-center justify-center gap-1 cursor-pointer shadow-md"
                                >
                                  <PackageCheck className="w-4 h-4" />
                                  <span>Listo en Barra</span>
                                </button>
                              </div>
                            ) : order.orderChannel === 'pos_takeout' ? (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-2 rounded-xl text-xs transition flex items-center justify-center gap-1 cursor-pointer shadow-md"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Entregar Cliente</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateOrderStatus(order.id, 'READY_FOR_PICKUP')}
                                  className="bg-amber-600 hover:bg-amber-500 text-white font-black py-3 px-2 rounded-xl text-xs transition flex items-center justify-center gap-1 cursor-pointer shadow-md"
                                >
                                  <PackageCheck className="w-4 h-4" />
                                  <span>Listo en Barra</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateOrderStatus(order.id, 'READY_FOR_PICKUP')}
                                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-3 px-3 rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                              >
                                <PackageCheck className="w-5 h-5" />
                                <span>Empacado / Listo para Domiciliario</span>
                              </button>
                            )}
                          </div>
                        )}

                        {isReady && (
                          <div className="space-y-1.5">
                            {order.orderChannel === 'pos_local' || order.orderChannel === 'pos_takeout' ? (
                              <button
                                type="button"
                                onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-3 rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                                <span>Completar Entrega</span>
                              </button>
                            ) : (
                              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl text-center text-xs text-amber-300 font-bold flex items-center justify-center gap-1.5">
                                <Bike className="w-4 h-4 text-amber-400" />
                                <span>Esperando Retiro por Domiciliario</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Acciones auxiliares: ticket térmico y notificación WhatsApp */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => handlePrintTicket(order)}
                            className="py-1.5 px-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center justify-center gap-1 cursor-pointer"
                            title="Imprimir comanda térmica"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-400" />
                            <span>Comanda</span>
                          </button>

                          {canSendWhatsApp ? (
                            <button
                              type="button"
                              onClick={() => {
                                const msg = generateCustomerOrderStatusWhatsAppMessage(order, restaurant.name, orderLoyalty);
                                window.open(`https://wa.me/57${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                              }}
                              className="py-1.5 px-2 rounded-lg text-xs font-extrabold bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 transition flex items-center justify-center gap-1 cursor-pointer"
                              title="Avisar al cliente por WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                              <span>WhatsApp</span>
                            </button>
                          ) : (
                            <div className="py-1.5 px-2 rounded-lg text-[11px] font-medium text-slate-500 bg-slate-950 text-center flex items-center justify-center">
                              <span>Sin WhatsApp</span>
                            </div>
                          )}
                        </div>
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
      {/* MODAL CÓDIGO QR Y ENLACE DIRECTO DE MI TIENDA */}
      {/* ============================================================== */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 leading-tight">
                    Mi Código QR y Enlace Directo
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comparte tu carta en redes o colócala en las mesas de tu local
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Enlace Directo de la Tienda */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Enlace Directo de tu Carta (Bio de Instagram / WhatsApp):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/restaurant/${restaurant.id}` : ''}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyStoreLink}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Copiar enlace directo"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Tus clientes pueden pedir sin descargar apps pesadas ni crear cuentas obligatorias.
              </p>
            </div>

            {/* Tarjeta Visual de Hablador / Stand de Mesa */}
            <div className="bg-gradient-to-b from-slate-50 to-orange-50/40 rounded-2xl p-4 border border-orange-100 text-center space-y-3">
              <div className="inline-block bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                Hablador de Mesa Oficial · DonDomi
              </div>

              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {restaurant.name}
              </h4>

              <div className="flex justify-center py-2">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR ${restaurant.name}`}
                    className="w-48 h-48 rounded-2xl border-4 border-white shadow-lg bg-white p-2 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-xs text-slate-400">
                    Generando QR...
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-wider text-orange-600">
                  ¡Escanea y pide sin filas!
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Pide a domicilio o en mesa con DonDomi Valledupar
                </p>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handlePrintQrStand}
                className="py-3 px-3 rounded-xl text-xs font-black bg-orange-600 hover:bg-orange-500 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-orange-600/20"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Hablador</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQrPng}
                className="py-3 px-3 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PNG</span>
              </button>
            </div>
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
            <p className="text-[10px]">Valledupar, Cesar, Colombia</p>
            <p className="font-black mt-1 text-sm">ORDEN: #{ticketOrder.orderNumber}</p>
            <p className="text-[10px]">{new Date(ticketOrder.createdAt).toLocaleString('es-CO')}</p>
          </div>

          <div className="py-2 border-b border-black space-y-1">
            <p>
              <strong>MODALIDAD:</strong>{' '}
              {ticketOrder.orderChannel === 'pos_local'
                ? `EN MESA (${ticketOrder.tableNumber || 'S/N'})`
                : ticketOrder.orderChannel === 'pos_takeout'
                ? 'PARA LLEVAR'
                : 'DOMICILIO APP DONDOMI'}
            </p>
            <p><strong>CLIENTE:</strong> {ticketOrder.customerName}</p>
            <p><strong>TEL:</strong> {ticketOrder.customerPhone}</p>
            {ticketOrder.orderChannel === 'delivery_app' && (
              <>
                <p><strong>DIR:</strong> {ticketOrder.deliveryAddress.street}, {ticketOrder.deliveryAddress.neighborhood}</p>
                {ticketOrder.deliveryAddress.reference && (
                  <p><strong>REF:</strong> {ticketOrder.deliveryAddress.reference}</p>
                )}
              </>
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
                {it.notes && (
                  <p className="text-[10px] pl-2 italic">
                    * {it.notes}
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
              <span>Tarifa Domicilio:</span>
              <span>{formatCOP(ticketOrder.deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-black text-sm pt-1 border-t border-black">
              <span>TOTAL A COBRAR:</span>
              <span>{formatCOP(ticketOrder.total)}</span>
            </div>
            {ticketOrder.isSplitPayment ? (
              <p className="pt-1">
                <strong>PAGO MIXTO:</strong> Efectivo {formatCOP(ticketOrder.cashAmount || 0)} + {ticketOrder.transferPlatform || 'Digital'} {formatCOP(ticketOrder.transferAmount || 0)}
              </p>
            ) : (
              <p className="pt-1">
                <strong>PAGO:</strong> {ticketOrder.paymentMethod === 'TRANSFERENCIA' && ticketOrder.transferPlatform ? `TRANSFERENCIA (${ticketOrder.transferPlatform})` : ticketOrder.paymentMethod}
              </p>
            )}
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
            <h2 className="text-base font-black">*** CIERRE DE CAJA POS ***</h2>
            <p className="font-bold">{restaurant.name}</p>
            <p className="text-[10px]">Periodo: {salesPeriod}</p>
            <p className="text-[10px]">{new Date().toLocaleString('es-CO')}</p>
          </div>

          <div className="py-2 border-b border-black space-y-1">
            <div className="flex justify-between">
              <span>Ventas Completadas:</span>
              <span>{settlement.deliveredOrdersCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Ticket Promedio:</span>
              <span>{formatCOP(settlement.averageTicket)}</span>
            </div>
            <div className="flex justify-between font-bold pt-1">
              <span>Subtotal Venta Comida:</span>
              <span>{formatCOP(settlement.foodSubtotalTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>- Efectivo en Caja:</span>
              <span>{formatCOP(settlement.cashFoodSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>- Transferencias / Digital:</span>
              <span>{formatCOP(settlement.digitalFoodSubtotal)}</span>
            </div>
          </div>

          <div className="py-2 border-b border-black space-y-1">
            <p className="font-bold">DESGLOSE CANALES:</p>
            <div className="flex justify-between">
              <span>- En Mesa (POS Local):</span>
              <span>{settlement.posLocalCount} ({formatCOP(settlement.posLocalSales)})</span>
            </div>
            <div className="flex justify-between">
              <span>- Para Llevar (Takeout):</span>
              <span>{settlement.posTakeoutCount} ({formatCOP(settlement.posTakeoutSales)})</span>
            </div>
            <div className="flex justify-between">
              <span>- Domicilios DonDomi:</span>
              <span>{settlement.deliveryAppCount} ({formatCOP(settlement.deliveryAppSales)})</span>
            </div>
          </div>

          {settlement.topProducts && settlement.topProducts.length > 0 && (
            <div className="py-2 border-b border-black space-y-1">
              <p className="font-bold">TOP PLATOS VENDIDOS:</p>
              {settlement.topProducts.slice(0, 3).map((tp, idx) => (
                <div key={tp.name} className="flex justify-between">
                  <span>#{idx + 1} {tp.name} ({tp.quantity})</span>
                  <span>{formatCOP(tp.revenue)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="py-2 border-b border-black space-y-1">
            <div className="flex justify-between">
              <span>Comisión DonDomi (0%):</span>
              <span>$0 COP</span>
            </div>
          </div>

          <div className="text-center pt-2 text-[10px]">
            <p>*** DonDomi Valledupar ***</p>
            <p>Plataforma 100% Gratuita para Restaurantes</p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* IMPRESIÓN HABLADOR DE MESA / STAND QR PARA CLIENTES */}
      {/* ============================================================== */}
      {printingQrStand && (
        <div id="print-qr-stand" className="hidden print:flex flex-col items-center justify-center fixed inset-0 bg-white p-8 text-black text-center font-sans">
          <div className="w-[85mm] max-w-sm border-4 border-slate-900 rounded-3xl p-6 flex flex-col items-center justify-between text-center mx-auto min-h-[140mm] shadow-none">
            <div className="w-full pb-3 border-b-2 border-slate-900">
              <span className="text-[11px] font-black tracking-widest uppercase bg-slate-900 text-white px-3 py-1 rounded-full">
                DonDomi Valledupar
              </span>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950 mt-3 leading-tight">
                {restaurant.name}
              </h1>
              <p className="text-xs font-bold text-slate-600 mt-1">
                Carta Digital · Pedidos en Mesa y Domicilio
              </p>
            </div>

            <div className="py-4 flex flex-col items-center justify-center">
              <p className="text-xs font-black uppercase tracking-wider text-orange-600 mb-2">
                ¡Escanea y pide sin filas!
              </p>
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR ${restaurant.name}`}
                  className="w-56 h-56 object-contain border-2 border-slate-200 rounded-2xl p-2 bg-white"
                />
              ) : (
                <div className="w-56 h-56 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-xs text-slate-400">
                  Cargando código QR...
                </div>
              )}
              <p className="text-[11px] font-bold text-slate-700 mt-3 max-w-[220px]">
                Apunta con la cámara de tu celular al código QR para ver el menú completo.
              </p>
            </div>

            <div className="w-full pt-3 border-t-2 border-slate-900 text-[10px] space-y-0.5 text-slate-600">
              <p className="font-extrabold text-slate-900">Pide fácil y apoya el comercio local</p>
              <p>Valledupar, Cesar · www.dondomi.com</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
