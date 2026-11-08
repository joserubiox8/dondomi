'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserRole,
  User,
  Product,
  SelectedOption,
  Restaurant,
  Order,
  OrderStatus,
  FoodCategory,
  Driver,
  MutationResult,
  OrderChannel,
  TransferPlatform,
} from '@/types';
import { FOOD_CATEGORIES, INITIAL_DRIVERS, RESTAURANTS as INITIAL_RESTAURANTS, PRODUCTS_BY_RESTAURANT as INITIAL_PRODUCTS, MOCK_ORDERS as INITIAL_ORDERS } from '@/data/mockData';
import { supabase } from '@/lib/supabase';
import { dbToRestaurant, dbToProduct, dbToCategory, dbToDriver } from '@/lib/mappers';
import { dataService } from '@/services/dataService';
import { calculateOrderPricing } from '@/lib/pricing';

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedOptions?: SelectedOption[];
  notes?: string;
  itemTotal: number;
}

// Matriz de transiciones válidas para ciclo de vida de pedidos (incluye soporte POS)
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PREPARING', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED'],
  READY_FOR_PICKUP: ['ON_THE_WAY', 'DELIVERED', 'CANCELLED'],
  ON_THE_WAY: ['DELIVERED', 'READY_FOR_PICKUP', 'CANCELLED'],
  DELIVERED: [], // Terminal
  CANCELLED: [], // Terminal
};

// Parser seguro de notas de cancelación, incidencias, flota, calificaciones y metadatos POS
export function parseOrderNotes(notes?: string) {
  if (!notes) return {};
  const res: {
    cancellationReason?: string;
    cancelledBy?: 'CLIENTE' | 'RESTAURANTE' | 'SISTEMA' | 'ADMINISTRADOR';
    incidentReason?: string;
    deliveryFleet?: 'DONDOMI' | 'PROPIO';
    rating?: number;
    reviewComment?: string;
    orderChannel?: OrderChannel;
    tableNumber?: string;
    isSplitPayment?: boolean;
    cashAmount?: number;
    transferAmount?: number;
    transferPlatform?: TransferPlatform;
  } = {};
  const cancelMatch = notes.match(
    /\[Cancelado por (CLIENTE|RESTAURANTE|SISTEMA|ADMINISTRADOR):\s*([^\]]+)\]/i
  );
  if (cancelMatch) {
    res.cancelledBy = cancelMatch[1].toUpperCase() as any;
    res.cancellationReason = cancelMatch[2].trim();
  } else {
    const reasonMatch = notes.match(/\[(?:Motivo|Razón):\s*([^\]]+)\]/i);
    if (reasonMatch) res.cancellationReason = reasonMatch[1].trim();
  }
  const incMatch = notes.match(/\[Incidencia Repartidor:\s*([^\]]+)\]/i);
  if (incMatch) res.incidentReason = incMatch[1].trim();

  const fleetMatch = notes.match(/\[Flota:\s*(DONDOMI|PROPIO)\]/i);
  if (fleetMatch) res.deliveryFleet = fleetMatch[1].toUpperCase() as 'DONDOMI' | 'PROPIO';

  const ratingMatch = notes.match(/\[Calificación:\s*(\d)(?:★)?(?:\s*-\s*([^\]]+))?\]/i);
  if (ratingMatch) {
    res.rating = Number(ratingMatch[1]) || 5;
    if (ratingMatch[2]) res.reviewComment = ratingMatch[2].trim();
  }

  const channelMatch = notes.match(/\[Canal:\s*(delivery_app|pos_local|pos_takeout)(?:\s*\|\s*Mesa:\s*([^\]]+))?\]/i);
  if (channelMatch) {
    res.orderChannel = channelMatch[1].toLowerCase() as OrderChannel;
    if (channelMatch[2]) res.tableNumber = channelMatch[2].trim();
  }

  const splitMatch = notes.match(/\[Pago Dividido:\s*Efectivo\s*\$([\d.]+)\s*\+\s*([^\$]+)\s*\$([\d.]+)\]/i);
  if (splitMatch) {
    res.isSplitPayment = true;
    res.cashAmount = Number(splitMatch[1]);
    res.transferPlatform = splitMatch[2].trim() as TransferPlatform;
    res.transferAmount = Number(splitMatch[3]);
  }

  return res;
}

interface AppContextType {
  // Autenticación Real de la Plataforma
  currentUser: User | null;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  loginAsAdmin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  loginAsRestaurant: (restaurantId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDriver: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  // Ubicación del cliente en Valledupar
  currentNeighborhood: string;
  setCurrentNeighborhood: (neighborhood: string) => void;
  isLocationModalOpen: boolean;
  setIsLocationModalOpen: (open: boolean) => void;

  // Carrito de compras
  cart: CartItem[];
  cartRestaurantId: string | null;
  cartRestaurantName: string | null;
  addToCart: (
    product: Product,
    restaurantName: string,
    quantity: number,
    selectedOptions?: SelectedOption[],
    notes?: string
  ) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, newQty: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;

  // Rol activo
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;

  // Filtros de búsqueda
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategorySlug: string | null;
  setSelectedCategorySlug: (slug: string | null) => void;
  onlyOpenFilter: boolean;
  setOnlyOpenFilter: (onlyOpen: boolean) => void;

  // Categorías de comida de Valledupar ("¿Qué se te antoja hoy?")
  categories: FoodCategory[];
  addCategory: (category: FoodCategory) => Promise<MutationResult>;
  updateCategory: (category: FoodCategory) => Promise<MutationResult>;
  deleteCategory: (categoryId: string) => Promise<MutationResult>;

  // Ajustes de Plataforma DonDomi
  globalDeliveryFee: number;
  setGlobalDeliveryFee: (fee: number) => Promise<MutationResult>;
  globalAnnouncement: string | null;
  setGlobalAnnouncement: (announcement: string | null) => Promise<MutationResult>;

  // Flota de Domiciliarios
  drivers: Driver[];
  addDriver: (driver: Driver, rawPassword: string) => Promise<MutationResult>;
  updateDriver: (driver: Driver, rawPassword?: string) => Promise<MutationResult>;
  toggleDriverStatus: (driverId: string) => Promise<MutationResult>;
  toggleDriverAvailability: (driverId: string) => Promise<MutationResult>;

  // Restaurantes en la nube (Supabase)
  restaurants: Restaurant[];
  addRestaurant: (newRestaurant: Restaurant) => Promise<MutationResult>;
  updateRestaurant: (restaurant: Restaurant) => Promise<MutationResult>;
  toggleRestaurantStatus: (id: string) => Promise<MutationResult>;

  // Menús y Platos (con soporte de Archivado Lógico y Restauración)
  productsByRestaurant: Record<string, Product[]>;
  fetchProductsForRestaurant: (restaurantId: string) => Promise<Product[]>;
  isMenuLoading: (restaurantId: string) => boolean;
  addProduct: (restaurantId: string, newProduct: Product) => Promise<MutationResult>;
  updateProduct: (restaurantId: string, updatedProduct: Product) => Promise<MutationResult>;
  deleteProduct: (restaurantId: string, productId: string) => Promise<MutationResult>;
  archiveProduct: (restaurantId: string, productId: string) => Promise<MutationResult>;
  restoreProduct: (restaurantId: string, productId: string) => Promise<MutationResult>;
  toggleProductAvailability: (restaurantId: string, productId: string) => Promise<MutationResult>;

  // Pedidos
  orders: Order[];
  addOrder: (order: Order) => Promise<boolean>;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    reason?: string,
    cancelledBy?: 'CLIENTE' | 'RESTAURANTE' | 'SISTEMA' | 'ADMINISTRADOR'
  ) => Promise<boolean>;
  rejectOrder: (orderId: string, reason: string) => Promise<boolean>;
  cancelOrderByCustomer: (orderId: string, reason?: string) => Promise<boolean>;
  claimOrder: (
    orderId: string,
    driverName: string,
    driverPhone?: string
  ) => Promise<{ success: boolean; error?: string }>;
  confirmOrderPickup: (orderId: string) => Promise<boolean>;
  dispatchWithOwnDriver: (orderId: string) => Promise<boolean>;
  assignDriverByAdmin: (orderId: string, driver: Driver | null) => Promise<boolean>;
  confirmOrderPayment: (orderId: string) => Promise<boolean>;
  rateOrder: (orderId: string, rating: number, comment?: string) => Promise<boolean>;
  reorderItems: (order: Order) => void;
  unclaimOrder: (orderId: string, incidentReason: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentNeighborhood, setCurrentNeighborhood] = useState<string>('Los Cortijos');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);

  // Carrito persistente con tiempo de espera de 2 horas
  const CART_STORAGE_KEY = 'dondomi_cart_v1';
  const CART_EXPIRATION_MS = 2 * 60 * 60 * 1000; // 2 horas

  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const age = Date.now() - (parsed.timestamp || 0);
          if (age < CART_EXPIRATION_MS && Array.isArray(parsed.cart)) {
            return parsed.cart;
          } else {
            localStorage.removeItem(CART_STORAGE_KEY);
          }
        }
      } catch (e) {}
    }
    return [];
  });

  const [cartRestaurantId, setCartRestaurantId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const age = Date.now() - (parsed.timestamp || 0);
          if (age < CART_EXPIRATION_MS) return parsed.cartRestaurantId || null;
        }
      } catch (e) {}
    }
    return null;
  });

  const [cartRestaurantName, setCartRestaurantName] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const age = Date.now() - (parsed.timestamp || 0);
          if (age < CART_EXPIRATION_MS) return parsed.cartRestaurantName || null;
        }
      } catch (e) {}
    }
    return null;
  });

  // Estado para cambio de restaurante en canasta sin alert/confirm
  const [pendingCartSwitch, setPendingCartSwitch] = useState<{
    product: Product;
    restaurantName: string;
    quantity: number;
    selectedOptions: SelectedOption[];
    notes: string;
  } | null>(null);

  const [activeRole, setActiveRole] = useState<UserRole>('CLIENTE');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [onlyOpenFilter, setOnlyOpenFilter] = useState<boolean>(false);

  // Estados reactivos sincronizados con Supabase (con carga bajo demanda de menús)
  const [restaurants, setRestaurants] = useState<Restaurant[]>(INITIAL_RESTAURANTS);
  const [productsByRestaurant, setProductsByRestaurant] = useState<Record<string, Product[]>>({});
  const [loadingMenus, setLoadingMenus] = useState<Record<string, boolean>>({});
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);

  // Categorías de la ciudad ("¿Qué se te antoja hoy?")
  const [categories, setCategories] = useState<FoodCategory[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dondomi_categories');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return FOOD_CATEGORIES;
  });

  const addCategory = async (newCat: FoodCategory): Promise<MutationResult> => {
    const res = await dataService.saveCategory(newCat);
    if (!res.ok) return res;
    setCategories((prev) => [...prev, newCat]);
    return res;
  };

  const updateCategory = async (cat: FoodCategory): Promise<MutationResult> => {
    const res = await dataService.saveCategory(cat);
    if (!res.ok) return res;
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? cat : c)));
    return res;
  };

  const deleteCategory = async (catId: string): Promise<MutationResult> => {
    const res = await dataService.deleteCategory(catId);
    if (!res.ok) return res;
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    return res;
  };

  // Ajustes Globales de Plataforma
  const [globalDeliveryFee, setGlobalDeliveryFeeState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dondomi_global_delivery_fee');
      if (saved) return Number(saved) || 7000;
    }
    return 7000;
  });

  const setGlobalDeliveryFee = async (fee: number): Promise<MutationResult> => {
    const res = await dataService.updatePlatformConfig({ globalDeliveryFee: fee });
    if (!res.ok) return res;
    setGlobalDeliveryFeeState(fee);
    return res;
  };

  const [globalAnnouncement, setGlobalAnnouncementState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dondomi_global_announcement') || null;
    }
    return null;
  });

  const setGlobalAnnouncement = async (ann: string | null): Promise<MutationResult> => {
    const res = await dataService.updatePlatformConfig({ globalAnnouncement: ann });
    if (!res.ok) return res;
    setGlobalAnnouncementState(ann);
    return res;
  };

  // Flota de Domiciliarios
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dondomi_drivers');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return INITIAL_DRIVERS;
  });

  const requestPasswordHashFromServer = async (
    rawPassword: string
  ): Promise<{ ok: boolean; passwordHash?: string; error?: string }> => {
    try {
      const resp = await fetch('/api/driver-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hash', password: rawPassword }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.ok || !json.passwordHash) {
        return {
          ok: false,
          error: json.error || 'No se pudo generar el hash seguro de la contraseña.',
        };
      }
      return { ok: true, passwordHash: json.passwordHash };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || 'Error de red generando el hash de contraseña en servidor.',
      };
    }
  };

  const addDriver = async (driver: Driver, rawPassword: string): Promise<MutationResult> => {
    const hashRes = await requestPasswordHashFromServer(rawPassword);
    if (!hashRes.ok || !hashRes.passwordHash) {
      return { ok: false, persistedInSupabase: false, error: hashRes.error };
    }

    const driverForDb: Driver = {
      ...driver,
      passwordHash: hashRes.passwordHash,
    };
    const res = await dataService.saveDriver(driverForDb);
    if (!res.ok) return res;

    const cleanDriver: Driver = { ...driver, passwordHash: undefined };
    setDrivers((prev) => [cleanDriver, ...prev]);
    return res;
  };

  const updateDriver = async (driver: Driver, rawPassword?: string): Promise<MutationResult> => {
    let passwordHash: string | undefined;
    if (rawPassword && rawPassword.trim().length > 0) {
      const hashRes = await requestPasswordHashFromServer(rawPassword);
      if (!hashRes.ok || !hashRes.passwordHash) {
        return { ok: false, persistedInSupabase: false, error: hashRes.error };
      }
      passwordHash = hashRes.passwordHash;
    }

    const driverForDb: Driver = {
      ...driver,
      passwordHash,
    };
    const res = await dataService.saveDriver(driverForDb);
    if (!res.ok) return res;

    const cleanDriver: Driver = { ...driver, passwordHash: undefined };
    setDrivers((prev) => prev.map((d) => (d.id === cleanDriver.id ? cleanDriver : d)));
    return res;
  };

  const toggleDriverStatus = async (driverId: string): Promise<MutationResult> => {
    const target = drivers.find((d) => d.id === driverId);
    const currentActive = target ? target.isActive : true;
    const res = await dataService.toggleDriverActive(driverId, currentActive);
    if (!res.ok) return res;

    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, isActive: !currentActive } : d))
    );
    return res;
  };

  const toggleDriverAvailability = async (driverId: string): Promise<MutationResult> => {
    const target = drivers.find((d) => d.id === driverId);
    const nextAvailable = target ? (target.isAvailable === false ? true : false) : true;
    const res = await dataService.updateDriverAvailability(driverId, nextAvailable);
    if (!res.ok) return res;

    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, isAvailable: nextAvailable } : d))
    );
    return res;
  };

  // Autenticación Real de la Plataforma
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Restaurar sesión de usuario si existe
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('dondomi_auth_user');
        if (saved) {
          const parsed: User = JSON.parse(saved);
          setCurrentUser(parsed);
          setActiveRole(parsed.role || 'CLIENTE');
        }
      } catch (err) {
        console.error('Error restaurando sesión:', err);
      }
    }
  }, []);

  // Cancelación automática de pedidos PENDING tras 15 minutos de inactividad
  useEffect(() => {
    const PENDING_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos

    const checkPendingOrders = () => {
      const now = Date.now();
      setOrders((prev) => {
        let hasChanges = false;
        const updated = prev.map((ord) => {
          if (
            ord.status === 'PENDING' &&
            now - new Date(ord.createdAt).getTime() > PENDING_TIMEOUT_MS
          ) {
            hasChanges = true;
            const updatedNote = ord.customerNotes
              ? `${ord.customerNotes} | [Cancelado por SISTEMA: Tiempo de 15 min expirado sin confirmación]`
              : `[Cancelado por SISTEMA: Tiempo de 15 min expirado sin confirmación]`;

            supabase
              .from('orders')
              .update({ status: 'CANCELLED', customer_notes: updatedNote })
              .eq('id', ord.id)
              .then(({ error }: { error: any }) => {
                if (error) console.warn('Error auto-cancelando pedido:', error);
              });

            return {
              ...ord,
              status: 'CANCELLED' as OrderStatus,
              cancellationReason: 'Tiempo reglamentario de 15 minutos expirado sin confirmación de la cocina',
              cancelledBy: 'SISTEMA' as const,
              customerNotes: updatedNote,
            };
          }
          return ord;
        });

        return hasChanges ? updated : prev;
      });
    };

    checkPendingOrders();
    const interval = setInterval(checkPendingOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cargar datos iniciales desde la capa de persistencia (Supabase con fallback local)
  useEffect(() => {
    async function loadData() {
      try {
        const [restRes, orderRes, catRes, drvRes, cfgRes] = await Promise.allSettled([
          dataService.getRestaurants(),
          dataService.getOrders(),
          dataService.getCategories(),
          dataService.getDrivers(),
          dataService.getPlatformConfig(),
        ]);

        if (restRes.status === 'fulfilled' && restRes.value.data.length > 0) {
          setRestaurants(restRes.value.data);
        }
        if (orderRes.status === 'fulfilled' && orderRes.value.data.length > 0) {
          setOrders(orderRes.value.data);
        }
        if (catRes.status === 'fulfilled' && catRes.value.data.length > 0) {
          setCategories(catRes.value.data);
        }
        if (drvRes.status === 'fulfilled' && drvRes.value.data.length > 0) {
          setDrivers(drvRes.value.data);
        }
        if (cfgRes.status === 'fulfilled') {
          setGlobalDeliveryFeeState(cfgRes.value.config.globalDeliveryFee);
          setGlobalAnnouncementState(cfgRes.value.config.globalAnnouncement);
        }
      } catch (err) {
        console.warn('Error inicializando datos en AppContext:', err);
      }
    }

    loadData();

    // 1. Suscripción en tiempo real a Pedidos (Supabase Realtime)
    const ordersChannel = supabase
      .channel('realtime_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row: any = payload.new;
            const parsed = parseOrderNotes(row.customer_notes);
            const newOrder: Order = {
              id: row.id,
              orderNumber: row.order_number,
              customerId: row.customer_name,
              customerName: row.customer_name,
              customerPhone: row.customer_phone,
              restaurantId: row.restaurant_id || '',
              restaurantName: row.restaurant_name,
              driverId: row.driver_id || undefined,
              driverName: row.driver_name || undefined,
              status: row.status,
              items: row.items || [],
              subtotal: Number(row.subtotal),
              deliveryFee: Number(row.delivery_fee),
              serviceFee: Number(row.service_fee || 0),
              total: Number(row.total),
              paymentMethod: row.payment_method,
              paymentStatus: row.payment_status,
              deliveryAddress: row.delivery_address,
              customerNotes: row.customer_notes,
              estimatedDeliveryTime: row.estimated_delivery_time,
              createdAt: row.created_at,
              cancellationReason: parsed.cancellationReason,
              cancelledBy: parsed.cancelledBy,
              incidentReason: parsed.incidentReason,
              deliveryFleet: parsed.deliveryFleet,
              rating: parsed.rating,
              reviewComment: parsed.reviewComment,
              orderChannel: row.order_channel || parsed.orderChannel || 'delivery_app',
              tableNumber: row.table_number || parsed.tableNumber || undefined,
              isSplitPayment: Boolean(row.is_split_payment ?? parsed.isSplitPayment ?? false),
              cashAmount: row.cash_amount != null ? Number(row.cash_amount) : (parsed.cashAmount ?? 0),
              transferAmount: row.transfer_amount != null ? Number(row.transfer_amount) : (parsed.transferAmount ?? 0),
              transferPlatform: row.transfer_platform || parsed.transferPlatform || undefined,
            };
            setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const row: any = payload.new;
            const parsed = parseOrderNotes(row.customer_notes);
            setOrders((prev) =>
              prev.map((o) =>
                o.id === row.id
                  ? {
                      ...o,
                      status: row.status,
                      driverId: row.driver_id || undefined,
                      driverName: row.driver_name || undefined,
                      paymentStatus: row.payment_status,
                      customerNotes: row.customer_notes,
                      cancellationReason: parsed.cancellationReason || o.cancellationReason,
                      cancelledBy: parsed.cancelledBy || o.cancelledBy,
                      incidentReason: parsed.incidentReason || o.incidentReason,
                      deliveryFleet: parsed.deliveryFleet || o.deliveryFleet,
                      rating: parsed.rating || o.rating,
                      reviewComment: parsed.reviewComment || o.reviewComment,
                      orderChannel: row.order_channel || parsed.orderChannel || o.orderChannel || 'delivery_app',
                      tableNumber: row.table_number || parsed.tableNumber || o.tableNumber,
                      isSplitPayment: row.is_split_payment !== undefined ? Boolean(row.is_split_payment) : (parsed.isSplitPayment ?? o.isSplitPayment),
                      cashAmount: row.cash_amount != null ? Number(row.cash_amount) : (parsed.cashAmount ?? o.cashAmount),
                      transferAmount: row.transfer_amount != null ? Number(row.transfer_amount) : (parsed.transferAmount ?? o.transferAmount),
                      transferPlatform: row.transfer_platform || parsed.transferPlatform || o.transferPlatform,
                    }
                  : o
              )
            );
          }
        }
      )
      .subscribe();

    // 2. Suscripción en tiempo real a Catálogo (Restaurantes, Platos y Categorías)
    const catalogChannel = supabase
      .channel('realtime_catalog')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurants' },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updatedRest = dbToRestaurant(payload.new);
            setRestaurants((prev) => {
              const idx = prev.findIndex((r) => r.id === updatedRest.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = updatedRest;
                return next;
              }
              return [updatedRest, ...prev];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const p = dbToProduct(payload.new);
            setProductsByRestaurant((prev) => {
              const currentList = prev[p.restaurantId] || [];
              const idx = currentList.findIndex((item) => item.id === p.id);
              let nextList: Product[];
              if (idx >= 0) {
                nextList = [...currentList];
                nextList[idx] = p;
              } else {
                nextList = [p, ...currentList];
              }
              return { ...prev, [p.restaurantId]: nextList };
            });
          } else if (payload.eventType === 'DELETE' && payload.old?.id) {
            const deletedId = payload.old.id;
            setProductsByRestaurant((prev) => {
              const updated: Record<string, Product[]> = {};
              Object.keys(prev).forEach((restId) => {
                updated[restId] = prev[restId].filter((item) => item.id !== deletedId);
              });
              return updated;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const cat = dbToCategory(payload.new);
            setCategories((prev) => {
              const idx = prev.findIndex((c) => c.id === cat.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = cat;
                return next;
              }
              return [...prev, cat];
            });
          } else if (payload.eventType === 'DELETE' && payload.old?.id) {
            setCategories((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // 3. Suscripción en tiempo real a Flota y Configuración Global
    const fleetConfigChannel = supabase
      .channel('realtime_fleet_config')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const drv = dbToDriver(payload.new);
            setDrivers((prev) => {
              const idx = prev.findIndex((d) => d.id === drv.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = drv;
                return next;
              }
              return [drv, ...prev];
            });
          } else if (payload.eventType === 'DELETE' && payload.old?.id) {
            setDrivers((prev) => prev.filter((d) => d.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_config' },
        (payload) => {
          if (payload.new) {
            const row: any = payload.new;
            if (row.global_delivery_fee !== undefined) {
              setGlobalDeliveryFeeState(Number(row.global_delivery_fee) || 7000);
            }
            if (row.global_announcement !== undefined) {
              setGlobalAnnouncementState(row.global_announcement);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(catalogChannel);
      supabase.removeChannel(fleetConfigChannel);
    };
  }, []);

  // Revalidación throttled (15 segundos) al recuperar foco o visibilidad de la pestaña
  useEffect(() => {
    let lastRevalidation = Date.now();
    const THROTTLE_MS = 15000;

    const handleRevalidation = async () => {
      const now = Date.now();
      if (now - lastRevalidation < THROTTLE_MS) return;
      lastRevalidation = now;

      try {
        const [ordersRes, restRes, catRes, drvRes, cfgRes] = await Promise.allSettled([
          dataService.getOrders(),
          dataService.getRestaurants(),
          dataService.getCategories(),
          dataService.getDrivers(),
          dataService.getPlatformConfig(),
        ]);

        if (ordersRes.status === 'fulfilled' && ordersRes.value.data.length > 0) {
          setOrders(ordersRes.value.data);
        }
        if (restRes.status === 'fulfilled' && restRes.value.data.length > 0) {
          setRestaurants(restRes.value.data);
        }
        if (catRes.status === 'fulfilled' && catRes.value.data.length > 0) {
          setCategories(catRes.value.data);
        }
        if (drvRes.status === 'fulfilled' && drvRes.value.data.length > 0) {
          setDrivers(drvRes.value.data);
        }
        if (cfgRes.status === 'fulfilled') {
          setGlobalDeliveryFeeState(cfgRes.value.config.globalDeliveryFee);
          setGlobalAnnouncementState(cfgRes.value.config.globalAnnouncement);
        }
      } catch (err) {
        console.warn('Revalidación throttled falló en segundo plano:', err);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRevalidation();
      }
    };

    const onFocus = () => {
      handleRevalidation();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Manejo de restaurantes sincronizado con Supabase (solo actualiza estado tras confirmación de Supabase)
  const addRestaurant = async (newRest: Restaurant): Promise<MutationResult> => {
    const res = await dataService.saveRestaurant(newRest, true);
    if (!res.ok) return res;
    setRestaurants((prev) => [newRest, ...prev]);
    return res;
  };

  const updateRestaurant = async (updated: Restaurant): Promise<MutationResult> => {
    const res = await dataService.saveRestaurant(updated, false);
    if (!res.ok) return res;
    setRestaurants((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    return res;
  };

  const toggleRestaurantStatus = async (id: string): Promise<MutationResult> => {
    const target = restaurants.find((r) => r.id === id);
    if (!target) {
      return { ok: false, persistedInSupabase: false, error: 'Restaurante no encontrado.' };
    }
    const newStatus = !target.isOpen;

    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ is_open: newStatus })
        .eq('id', id);
      if (error) {
        return {
          ok: false,
          persistedInSupabase: false,
          error: `No se pudo actualizar el estado del restaurante en Supabase: ${error.message}`,
        };
      }
      setRestaurants((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isOpen: newStatus } : r))
      );
      return { ok: true, persistedInSupabase: true };
    } catch (e: any) {
      return {
        ok: false,
        persistedInSupabase: false,
        error: e?.message || 'Error de conexión actualizando el estado del restaurante.',
      };
    }
  };

  // Manejo de platos del menú sincronizado con Supabase (con Archivado Lógico y Restauración)
  const addProduct = async (restaurantId: string, newProduct: Product): Promise<MutationResult> => {
    const res = await dataService.saveProduct(newProduct, true);
    if (!res.ok) return res;

    setProductsByRestaurant((prev) => {
      const currentList = prev[restaurantId] || [];
      return {
        ...prev,
        [restaurantId]: [newProduct, ...currentList],
      };
    });
    return res;
  };

  const deleteProduct = async (
    restaurantId: string,
    productId: string
  ): Promise<MutationResult> => {
    const currentList = productsByRestaurant[restaurantId] || [];
    const target = currentList.find((p) => p.id === productId);
    const res = await dataService.archiveProduct(productId, target?.name);
    if (!res.ok) return res;

    setProductsByRestaurant((prev) => {
      const list = prev[restaurantId] || [];
      return {
        ...prev,
        [restaurantId]: list.map((p) =>
          p.id === productId ? { ...p, isArchived: true, isAvailable: false } : p
        ),
      };
    });
    return res;
  };

  const restoreProduct = async (
    restaurantId: string,
    productId: string
  ): Promise<MutationResult> => {
    const currentList = productsByRestaurant[restaurantId] || [];
    const target = currentList.find((p) => p.id === productId);
    const res = await dataService.restoreProduct(productId, target?.name);
    if (!res.ok) return res;

    setProductsByRestaurant((prev) => {
      const list = prev[restaurantId] || [];
      return {
        ...prev,
        [restaurantId]: list.map((p) =>
          p.id === productId ? { ...p, isArchived: false } : p
        ),
      };
    });
    return res;
  };

  const toggleProductAvailability = async (
    restaurantId: string,
    productId: string
  ): Promise<MutationResult> => {
    const currentList = productsByRestaurant[restaurantId] || [];
    const target = currentList.find((p) => p.id === productId);
    if (!target) {
      return { ok: false, persistedInSupabase: false, error: 'Plato no encontrado.' };
    }
    if (target.isArchived) {
      return {
        ok: false,
        persistedInSupabase: false,
        error: 'Este plato se encuentra archivado. Restáuralo primero antes de activarlo.',
      };
    }

    const nextAvailable = !target.isAvailable;
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_available: nextAvailable })
        .eq('id', productId);
      if (error) {
        return {
          ok: false,
          persistedInSupabase: false,
          error: `No se pudo actualizar la disponibilidad del plato en Supabase: ${error.message}`,
        };
      }
      setProductsByRestaurant((prev) => {
        const list = prev[restaurantId] || [];
        return {
          ...prev,
          [restaurantId]: list.map((p) =>
            p.id === productId ? { ...p, isAvailable: nextAvailable } : p
          ),
        };
      });
      return { ok: true, persistedInSupabase: true };
    } catch (e: any) {
      return {
        ok: false,
        persistedInSupabase: false,
        error: e?.message || 'Error de conexión actualizando la disponibilidad del plato.',
      };
    }
  };

  // Carga bajo demanda y optimizada del menú por restaurante con caché en memoria
  const fetchProductsForRestaurant = async (restaurantId: string): Promise<Product[]> => {
    if (!restaurantId) return [];

    // Si ya existe en caché local de memoria y contiene platos, devolver de inmediato sin consumir red
    const cached = productsByRestaurant[restaurantId];
    if (cached && cached.length > 0) {
      return cached;
    }

    setLoadingMenus((prev) => ({ ...prev, [restaurantId]: true }));
    try {
      const res = await dataService.getProductsByRestaurant(restaurantId);
      const items = res.data || [];
      setProductsByRestaurant((prev) => ({
        ...prev,
        [restaurantId]: items,
      }));
      return items;
    } finally {
      setLoadingMenus((prev) => ({ ...prev, [restaurantId]: false }));
    }
  };

  const isMenuLoading = (restaurantId: string): boolean => {
    return !!loadingMenus[restaurantId];
  };

  // Manejo de pedidos sincronizado con Supabase (validando en servidor existencia, restaurante, archivado, disponibilidad y precio vigente)
  const addOrder = async (newOrder: Order): Promise<boolean> => {
    // 1. Verificar estado vigente del restaurante directamente en Supabase
    const { data: dbRest, error: restErr } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', newOrder.restaurantId)
      .maybeSingle();

    if (restErr || !dbRest) {
      throw new Error(
        'No se pudo verificar el estado actual del restaurante en Supabase. Por favor intenta de nuevo.'
      );
    }

    if (
      dbRest.is_open === false ||
      (dbRest.account_status && dbRest.account_status !== 'ACTIVE')
    ) {
      throw new Error(
        `"${dbRest.name || newOrder.restaurantName}" se encuentra cerrado o no disponible en este momento. No es posible procesar el pedido.`
      );
    }

    // 2. Verificar en Supabase cada producto del pedido (existencia, pertenencia al restaurante, no archivado, disponible y precio vigente)
    const itemProductIds = Array.from(
      new Set(newOrder.items.map((it) => it.productId).filter(Boolean))
    );
    if (itemProductIds.length === 0) {
      throw new Error('El pedido no contiene productos válidos.');
    }

    const { data: dbProducts, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .in('id', itemProductIds);

    if (prodErr || !dbProducts) {
      throw new Error(
        'No se pudo verificar la disponibilidad y los precios vigentes de los productos en Supabase. Por favor intenta de nuevo.'
      );
    }

    let verifiedSubtotal = 0;
    const verifiedItems = newOrder.items.map((item) => {
      const dbProd: any = dbProducts.find((p: any) => p.id === item.productId);
      if (!dbProd) {
        throw new Error(
          `El producto "${item.productName}" ya no existe en el catálogo del restaurante. Retíralo de tu canasta.`
        );
      }
      if (dbProd.restaurant_id !== newOrder.restaurantId) {
        throw new Error(
          `El producto "${dbProd.name || item.productName}" no pertenece al restaurante seleccionado.`
        );
      }
      if (dbProd.is_archived === true) {
        throw new Error(
          `El producto "${dbProd.name || item.productName}" fue archivado y ya no está disponible para la venta. Retíralo de tu canasta.`
        );
      }
      if (dbProd.is_available === false) {
        throw new Error(
          `El producto "${dbProd.name || item.productName}" se agotó en cocina. Retíralo de tu canasta antes de continuar.`
        );
      }

      const liveBasePrice = Number(dbProd.price);
      const liveGroups: any[] = Array.isArray(dbProd.options) ? dbProd.options : [];
      let liveOptionsTotal = 0;
      const verifiedOptions = (item.selectedOptions || []).map((selOpt) => {
        const grp = liveGroups.find((g) => g.name === selOpt.groupName);
        const optItem = grp?.items?.find((i: any) => i.name === selOpt.itemName);
        const liveOptPrice =
          optItem !== undefined ? Number(optItem.additionalPrice) || 0 : Number(selOpt.price) || 0;
        liveOptionsTotal += liveOptPrice;
        return {
          ...selOpt,
          price: liveOptPrice,
        };
      });

      const expectedUnitPrice = liveBasePrice + liveOptionsTotal;
      const expectedItemSubtotal = expectedUnitPrice * item.quantity;

      if (
        Math.abs(item.unitPrice - expectedUnitPrice) > 0.01 ||
        Math.abs(item.subtotal - expectedItemSubtotal) > 0.01
      ) {
        const freshProd = dbToProduct(dbProd);
        setProductsByRestaurant((prev) => ({
          ...prev,
          [newOrder.restaurantId]: (prev[newOrder.restaurantId] || []).map((p) =>
            p.id === freshProd.id ? freshProd : p
          ),
        }));
        setCart((prevCart) => {
          const updatedCart = prevCart.map((cItem) => {
            if (cItem.product.id === freshProd.id) {
              return {
                ...cItem,
                product: freshProd,
                selectedOptions: verifiedOptions,
                itemTotal: expectedUnitPrice * cItem.quantity,
              };
            }
            return cItem;
          });
          saveCartToStorage(updatedCart, cartRestaurantId, cartRestaurantName);
          return updatedCart;
        });
        throw new Error(
          `El precio de "${dbProd.name}" se actualizó en el menú a $${expectedUnitPrice.toLocaleString(
            'es-CO'
          )} COP. Hemos sincronizado tu canasta con el precio vigente de Supabase; verifica el nuevo total y confirma tu pedido.`
        );
      }

      verifiedSubtotal += expectedItemSubtotal;
      return {
        ...item,
        productName: dbProd.name || item.productName,
        unitPrice: expectedUnitPrice,
        selectedOptions: verifiedOptions,
        subtotal: expectedItemSubtotal,
      };
    });

    const isPosOrder = newOrder.orderChannel === 'pos_local' || newOrder.orderChannel === 'pos_takeout';
    const effectiveDeliveryFee = isPosOrder ? 0 : (typeof newOrder.deliveryFee === 'number' ? newOrder.deliveryFee : globalDeliveryFee);
    const verifiedPricing = calculateOrderPricing(verifiedSubtotal, effectiveDeliveryFee);

    // Formatear notas serializando metadatos POS si aplica para máxima compatibilidad
    let formattedNotes = newOrder.customerNotes || '';
    if (newOrder.orderChannel && newOrder.orderChannel !== 'delivery_app') {
      formattedNotes = `[Canal: ${newOrder.orderChannel}${newOrder.tableNumber ? ` | Mesa: ${newOrder.tableNumber}` : ''}] ${formattedNotes}`.trim();
    }
    if (newOrder.isSplitPayment) {
      formattedNotes = `[Pago Dividido: Efectivo $${newOrder.cashAmount || 0} + ${newOrder.transferPlatform || 'Transferencia'} $${newOrder.transferAmount || 0}] ${formattedNotes}`.trim();
    }

    // 3. Persistir en Supabase con precios e ítems verificados
    const dbRow: any = {
      id: newOrder.id,
      order_number: newOrder.orderNumber,
      customer_name: newOrder.customerName,
      customer_phone: newOrder.customerPhone,
      restaurant_id: newOrder.restaurantId,
      restaurant_name: dbRest.name || newOrder.restaurantName,
      driver_id: newOrder.driverId || null,
      driver_name: newOrder.driverName || null,
      status: newOrder.status,
      items: verifiedItems,
      subtotal: verifiedPricing.subtotal,
      delivery_fee: verifiedPricing.deliveryFee,
      service_fee: verifiedPricing.serviceFee,
      total: verifiedPricing.total,
      payment_method: newOrder.paymentMethod,
      payment_status: newOrder.paymentStatus,
      delivery_address: newOrder.deliveryAddress,
      customer_notes: formattedNotes || null,
      estimated_delivery_time: newOrder.estimatedDeliveryTime || null,
      order_channel: newOrder.orderChannel || 'delivery_app',
      table_number: newOrder.tableNumber || null,
      is_split_payment: Boolean(newOrder.isSplitPayment),
      cash_amount: Number(newOrder.cashAmount) || 0,
      transfer_amount: Number(newOrder.transferAmount) || 0,
      transfer_platform: newOrder.transferPlatform || null,
    };

    let insertError = null;
    const { error } = await supabase.from('orders').insert([dbRow]);
    if (error) {
      if (error.code === '42703' || String(error.message).includes('column')) {
        const fallbackRow = { ...dbRow };
        delete fallbackRow.order_channel;
        delete fallbackRow.table_number;
        delete fallbackRow.is_split_payment;
        delete fallbackRow.cash_amount;
        delete fallbackRow.transfer_amount;
        delete fallbackRow.transfer_platform;
        const retry = await supabase.from('orders').insert([fallbackRow]);
        insertError = retry.error;
      } else {
        insertError = error;
      }
    }

    if (insertError) {
      console.error('Error guardando pedido en Supabase:', insertError);
      throw new Error('Hubo un problema de conexión al registrar la orden en Supabase. Por favor intenta de nuevo.');
    }

    const confirmedOrder: Order = {
      ...newOrder,
      restaurantName: dbRest.name || newOrder.restaurantName,
      items: verifiedItems,
      subtotal: verifiedPricing.subtotal,
      deliveryFee: verifiedPricing.deliveryFee,
      serviceFee: verifiedPricing.serviceFee,
      total: verifiedPricing.total,
      customerNotes: formattedNotes || undefined,
    };

    // Actualizar estado local sólo después de confirmar guardado en Supabase
    setOrders((prev) => [confirmedOrder, ...prev.filter((o) => o.id !== confirmedOrder.id)]);
    return true;
  };

  const updateOrderStatus = async (
    orderId: string,
    newStatus: OrderStatus,
    reason?: string,
    cancelledBy?: 'CLIENTE' | 'RESTAURANTE' | 'SISTEMA' | 'ADMINISTRADOR'
  ): Promise<boolean> => {
    const current = orders.find((o) => o.id === orderId);
    if (!current) return false;

    // Validar transición permitida en ciclo de vida
    const allowed = VALID_ORDER_TRANSITIONS[current.status] || [];
    if (!allowed.includes(newStatus)) {
      console.warn(
        `Transición de estado rechazada: de ${current.status} a ${newStatus} para la orden ${orderId}`
      );
      return false;
    }

    let updatedNotes = current.customerNotes;
    if (reason) {
      const tag = cancelledBy ? `Cancelado por ${cancelledBy}: ${reason}` : `Motivo: ${reason}`;
      updatedNotes = current.customerNotes ? `${current.customerNotes} | [${tag}]` : `[${tag}]`;
    }

    const nextPaymentStatus =
      newStatus === 'DELIVERED'
        ? 'COMPLETED'
        : newStatus === 'CANCELLED' && current.paymentStatus === 'COMPLETED'
        ? 'REFUNDED'
        : current.paymentStatus;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: newStatus,
              paymentStatus: nextPaymentStatus,
              cancellationReason: reason || o.cancellationReason,
              cancelledBy: cancelledBy || o.cancelledBy,
              customerNotes: updatedNotes,
            }
          : o
      )
    );

    try {
      const payload: any = { status: newStatus, payment_status: nextPaymentStatus };
      if (updatedNotes !== current.customerNotes) {
        payload.customer_notes = updatedNotes;
      }
      const { error } = await supabase.from('orders').update(payload).eq('id', orderId);
      if (error) console.error('Error actualizando pedido en Supabase:', error);
      return !error;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // Rechazar pedido por parte del restaurante
  const rejectOrder = async (orderId: string, reason: string): Promise<boolean> => {
    return await updateOrderStatus(orderId, 'CANCELLED', reason, 'RESTAURANTE');
  };

  // Cancelar pedido por parte del cliente mientras esté en espera (PENDING)
  const cancelOrderByCustomer = async (orderId: string, reason?: string): Promise<boolean> => {
    const current = orders.find((o) => o.id === orderId);
    if (!current || current.status !== 'PENDING') {
      return false;
    }
    return await updateOrderStatus(
      orderId,
      'CANCELLED',
      reason || 'Cancelado por el cliente antes de ser aceptado por la cocina',
      'CLIENTE'
    );
  };

  // Asignar pedido al domiciliario con prevención de reclamación simultánea (atomic lock)
  // El pedido conserva su estado (PREPARING o READY_FOR_PICKUP) hasta que el domiciliario confirme recogida en el local.
  const claimOrder = async (
    orderId: string,
    driverName: string,
    driverPhone?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return { success: false, error: 'Pedido no encontrado' };

    if (target.status !== 'READY_FOR_PICKUP' && target.status !== 'PREPARING') {
      return {
        success: false,
        error: 'Este pedido aún no ha sido aceptado por la cocina o ya no está disponible.',
      };
    }
    if (target.driverId) {
      return { success: false, error: 'Esta carrera ya fue tomada por otro domiciliario.' };
    }

    const driverId = currentUser?.id || `drv-${Date.now()}`;

    // Verificar que este domiciliario no lleve ya otra carrera activa sin entregar
    const existingActive = orders.find(
      (o) =>
        o.id !== orderId &&
        (o.driverId === driverId || o.driverName === driverName) &&
        (o.status === 'ON_THE_WAY' || o.status === 'READY_FOR_PICKUP' || o.status === 'PREPARING')
    );
    if (existingActive) {
      return {
        success: false,
        error: `Ya tienes la carrera activa #${existingActive.orderNumber}. Finalízala o libérala antes de tomar otra.`,
      };
    }

    // Operación atómica condicional: sólo actualiza si driver_id es NULL en base de datos
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          driver_id: driverId,
          driver_name: driverName,
        })
        .eq('id', orderId)
        .is('driver_id', null)
        .select();

      if (error) {
        console.warn('Error en reclamo atómico:', error);
      } else if (data && data.length === 0) {
        return {
          success: false,
          error: 'Esta carrera acaba de ser tomada por otro domiciliario.',
        };
      }
    } catch (e) {
      console.warn('Excepción en reclamo:', e);
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              driverId,
              driverName,
              deliveryFleet: 'DONDOMI',
            }
          : o
      )
    );

    return { success: true };
  };

  // Confirmar que el domiciliario recogió el pedido en el restaurante e inicia ruta al cliente (ON_THE_WAY)
  const confirmOrderPickup = async (orderId: string): Promise<boolean> => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return false;

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'ON_THE_WAY' } : o))
    );

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'ON_THE_WAY' })
        .eq('id', orderId);
      return !error;
    } catch {
      return false;
    }
  };

  // Despachar pedido con domiciliario propio del restaurante
  const dispatchWithOwnDriver = async (orderId: string): Promise<boolean> => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return false;

    const cleanBaseNotes = (target.customerNotes || '').replace(/\s*\|?\s*\[Flota:\s*\w+\]/gi, '').trim();
    const updatedNotes = cleanBaseNotes ? `${cleanBaseNotes} | [Flota: PROPIO]` : `[Flota: PROPIO]`;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'ON_THE_WAY',
              driverId: 'propio',
              driverName: 'Domiciliario Propio',
              deliveryFleet: 'PROPIO',
              customerNotes: updatedNotes,
            }
          : o
      )
    );

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'ON_THE_WAY',
          driver_id: 'propio',
          driver_name: 'Domiciliario Propio',
          customer_notes: updatedNotes,
        })
        .eq('id', orderId);
      return !error;
    } catch {
      return false;
    }
  };

  // Asignar o reasignar domiciliario manualmente desde la Torre de Control (/admin)
  const assignDriverByAdmin = async (orderId: string, driver: Driver | null): Promise<boolean> => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return false;

    const nextDriverId = driver ? driver.id : undefined;
    const nextDriverName = driver ? driver.name : undefined;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              driverId: nextDriverId,
              driverName: nextDriverName,
              deliveryFleet: driver ? 'DONDOMI' : undefined,
            }
          : o
      )
    );

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          driver_id: driver ? driver.id : null,
          driver_name: driver ? driver.name : null,
        })
        .eq('id', orderId);
      return !error;
    } catch {
      return false;
    }
  };

  // Confirmar verificación de pago por transferencia digital
  const confirmOrderPayment = async (orderId: string): Promise<boolean> => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: 'COMPLETED' } : o))
    );

    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'COMPLETED' })
        .eq('id', orderId);
      return !error;
    } catch {
      return false;
    }
  };

  // Calificar pedido entregado (1 a 5 estrellas + comentario opcional)
  const rateOrder = async (orderId: string, rating: number, comment?: string): Promise<boolean> => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return false;

    const safeRating = Math.max(1, Math.min(5, Math.round(rating)));
    const cleanBaseNotes = (target.customerNotes || '')
      .replace(/\s*\|?\s*\[Calificación:[^\]]+\]/gi, '')
      .trim();
    const tag = comment?.trim()
      ? `[Calificación: ${safeRating}★ - ${comment.trim().replace(/[\[\]]/g, '')}]`
      : `[Calificación: ${safeRating}★]`;
    const updatedNotes = cleanBaseNotes ? `${cleanBaseNotes} | ${tag}` : tag;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              rating: safeRating,
              reviewComment: comment?.trim() || undefined,
              customerNotes: updatedNotes,
            }
          : o
      )
    );

    try {
      const { error } = await supabase
        .from('orders')
        .update({ customer_notes: updatedNotes })
        .eq('id', orderId);
      return !error;
    } catch {
      return false;
    }
  };

  // Volver a pedir: carga en la canasta únicamente los platos vigentes, disponibles y no archivados con su precio actual
  const reorderItems = (order: Order) => {
    const restProducts = productsByRestaurant[order.restaurantId] || [];
    const newCartItems: CartItem[] = [];

    order.items.forEach((it, idx) => {
      const foundProd = restProducts.find(
        (p) => p.id === it.productId || p.name === it.productName
      );
      if (!foundProd || foundProd.isArchived || foundProd.isAvailable === false) {
        return;
      }
      const optionsTotal = (it.selectedOptions || []).reduce(
        (acc, opt) => acc + (Number(opt.price) || 0),
        0
      );
      const liveUnitPrice = foundProd.price + optionsTotal;
      newCartItems.push({
        id: `${foundProd.id}-${Date.now()}-${idx}`,
        product: foundProd,
        quantity: it.quantity,
        selectedOptions: it.selectedOptions,
        notes: it.notes,
        itemTotal: liveUnitPrice * it.quantity,
      });
    });

    if (newCartItems.length === 0) return;

    setCartRestaurantId(order.restaurantId);
    setCartRestaurantName(order.restaurantName);
    setCart(newCartItems);
    saveCartToStorage(newCartItems, order.restaurantId, order.restaurantName);
  };

  // Liberar carrera por parte del domiciliario ante una incidencia en ruta o antes de recoger
  const unclaimOrder = async (orderId: string, incidentReason: string): Promise<boolean> => {
    const target = orders.find((o) => o.id === orderId);
    if (!target || !target.driverId) return false;

    const noteTag = `[Incidencia Repartidor: ${incidentReason} (${target.driverName || 'repartidor'})]`;
    const updatedNotes = target.customerNotes ? `${target.customerNotes} | ${noteTag}` : noteTag;
    const nextStatus: OrderStatus =
      target.status === 'PREPARING' ? 'PREPARING' : 'READY_FOR_PICKUP';

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: nextStatus,
          driver_id: null,
          driver_name: null,
          customer_notes: updatedNotes,
        })
        .eq('id', orderId);
      if (error) {
        console.error('Error liberando carrera en Supabase:', error);
        return false;
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: nextStatus,
                driverId: undefined,
                driverName: undefined,
                customerNotes: updatedNotes,
                incidentReason,
              }
            : o
        )
      );
      return true;
    } catch (e) {
      console.error('Error liberando carrera:', e);
      return false;
    }
  };

  // Actualizar plato para un restaurante (solo confirma tras persistir en Supabase)
  const updateProduct = async (
    restaurantId: string,
    updatedProduct: Product
  ): Promise<MutationResult> => {
    const res = await dataService.saveProduct(updatedProduct, false);
    if (!res.ok) return res;

    setProductsByRestaurant((prev) => {
      const current = prev[restaurantId] || [];
      return {
        ...prev,
        [restaurantId]: current.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)),
      };
    });
    return res;
  };

  // Verificación de domiciliario del lado servidor (hash criptográfico scrypt en /api/driver-auth)
  const verifyDriverOnServer = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; driver?: Driver; error?: string }> => {
    try {
      const resp = await fetch('/api/driver-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          identifier: identifier.trim(),
          password: password.trim(),
        }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.ok || !json.driver) {
        return {
          success: false,
          error: json.error || 'Credenciales de domiciliario inválidas.',
        };
      }
      return { success: true, driver: json.driver };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Error de conexión verificando credenciales del domiciliario.',
      };
    }
  };

  // Login inteligente universal con correo/identificador y contraseña
  const loginWithEmail = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'Por favor ingresa tu identificador/correo y contraseña.' };
    }

    // 1. Detección Administrador
    if (cleanEmail === 'admin@dondomi.com' || cleanEmail === 'admin@valledupar.com') {
      if (cleanPass !== 'admin2026' && cleanPass !== '2026') {
        return { success: false, error: 'Contraseña de Administrador incorrecta.' };
      }
      const user: User = {
        id: 'admin-master',
        name: 'Administrador DonDomi',
        email: cleanEmail,
        role: 'ADMINISTRADOR',
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(user);
      setActiveRole('ADMINISTRADOR');
      if (typeof window !== 'undefined') {
        localStorage.setItem('dondomi_auth_user', JSON.stringify(user));
        sessionStorage.setItem('admin_master_auth', 'true');
      }
      return { success: true, role: 'ADMINISTRADOR' };
    }

    const RESTAURANT_ALIASES: Record<string, string> = {
      'elvalle@dondomi.com': 'rest-1',
      'polloselvalle@dondomi.com': 'rest-1',
      'guatapuri@dondomi.com': 'rest-2',
      'pedro@dondomi.com': 'rest-3',
      'elasadordepedro@dondomi.com': 'rest-3',
      'lasirena@dondomi.com': 'rest-4',
      'caciqueupar@dondomi.com': 'rest-5',
      'donchalo@dondomi.com': 'rest-6',
    };

    // 2. Detección Restaurante (por alias, correo, código/ID, slug, nombre o teléfono)
    const normalizedIdentity = cleanEmail.replace(/[\s\W]+/g, '');
    const cleanIdentityDigits = cleanEmail.replace(/\D/g, '');
    const targetRestId =
      RESTAURANT_ALIASES[cleanEmail] || RESTAURANT_ALIASES[`${cleanEmail}@dondomi.com`];
    const foundRest = targetRestId
      ? restaurants.find((r) => r.id === targetRestId)
      : restaurants.find(
          (r) =>
            r.id.toLowerCase() === cleanEmail ||
            r.slug.toLowerCase() === cleanEmail ||
            r.slug.toLowerCase().replace(/[\s\W]+/g, '') === normalizedIdentity ||
            r.name.toLowerCase() === cleanEmail ||
            r.name.toLowerCase().replace(/[\s\W]+/g, '') === normalizedIdentity ||
            (r.email && r.email.toLowerCase() === cleanEmail) ||
            (cleanIdentityDigits.length === 10 && r.phone.replace(/\D/g, '') === cleanIdentityDigits) ||
            r.name.toLowerCase().replace(/[\s\W]+/g, '') + '@dondomi.com' === cleanEmail ||
            r.slug.replace(/[\s\W]+/g, '') + '@dondomi.com' === cleanEmail
        );

    if (foundRest) {
      if (foundRest.accountStatus === 'ARCHIVED') {
        return {
          success: false,
          error: 'La cuenta de este restaurante ha sido archivada por la administración.',
        };
      }
      if (!foundRest.pin) {
        return {
          success: false,
          error:
            'Este restaurante aún no tiene una clave/PIN asignada en Supabase. Solicita al administrador configurarla.',
        };
      }
      if (cleanPass !== foundRest.pin) {
        return { success: false, error: 'Contraseña de restaurante incorrecta.' };
      }
      const user: User = {
        id: `user-${foundRest.id}`,
        name: foundRest.name,
        email: foundRest.email || cleanEmail,
        role: 'RESTAURANTE',
        restaurantId: foundRest.id,
        phone: foundRest.phone,
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(user);
      setActiveRole('RESTAURANTE');
      if (typeof window !== 'undefined') {
        localStorage.setItem('dondomi_auth_user', JSON.stringify(user));
        sessionStorage.setItem(`merchant_auth_${foundRest.id}`, 'true');
      }
      return { success: true, role: 'RESTAURANTE' };
    }

    // 3. Detección Domiciliario (validación criptográfica del lado servidor en /api/driver-auth)
    const matchesKnownDriver = drivers.some(
      (d) =>
        d.id.toLowerCase() === cleanEmail ||
        d.email.toLowerCase() === cleanEmail ||
        (cleanIdentityDigits.length === 10 && d.phone.replace(/\D/g, '') === cleanIdentityDigits)
    );

    if (matchesKnownDriver || cleanEmail.startsWith('drv-')) {
      const drvAuth = await verifyDriverOnServer(cleanEmail, cleanPass);
      if (!drvAuth.success || !drvAuth.driver) {
        return {
          success: false,
          error: drvAuth.error || 'Credenciales de domiciliario inválidas.',
        };
      }
      const verified = drvAuth.driver;
      const user: User = {
        id: verified.id,
        name: verified.name,
        email: verified.email,
        phone: verified.phone,
        role: 'DOMICILIARIO',
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(user);
      setActiveRole('DOMICILIARIO');
      if (typeof window !== 'undefined') {
        localStorage.setItem('dondomi_auth_user', JSON.stringify(user));
      }
      return { success: true, role: 'DOMICILIARIO' };
    }

    if (cleanEmail.includes('@dondomi.com')) {
      return {
        success: false,
        error: 'No se encontró ninguna cuenta activa con este correo en DonDomi.',
      };
    }

    // 4. Usuario Cliente general
    const clientUser: User = {
      id: `cli-${Date.now()}`,
      name: cleanEmail.split('@')[0],
      email: cleanEmail,
      role: 'CLIENTE',
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(clientUser);
    setActiveRole('CLIENTE');
    if (typeof window !== 'undefined') {
      localStorage.setItem('dondomi_auth_user', JSON.stringify(clientUser));
    }
    return { success: true, role: 'CLIENTE' };
  };

  // Métodos de autenticación por rol
  const loginAsAdmin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    if (pin.trim() !== '2026') {
      return { success: false, error: 'PIN Maestro de Administrador incorrecto.' };
    }
    const user: User = {
      id: 'admin-master',
      name: 'Administrador DonDomi',
      role: 'ADMINISTRADOR',
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(user);
    setActiveRole('ADMINISTRADOR');
    if (typeof window !== 'undefined') {
      localStorage.setItem('dondomi_auth_user', JSON.stringify(user));
      sessionStorage.setItem('admin_master_auth', 'true');
    }
    return { success: true };
  };

  const loginAsRestaurant = async (
    restaurantId: string,
    pin: string
  ): Promise<{ success: boolean; error?: string }> => {
    const rest = restaurants.find((r) => r.id === restaurantId);
    if (!rest) {
      return { success: false, error: 'Restaurante no encontrado.' };
    }
    if (!rest.pin) {
      return {
        success: false,
        error:
          'Este restaurante aún no tiene una clave/PIN asignada en Supabase. Solicita al administrador configurarla.',
      };
    }
    if (pin.trim() !== rest.pin) {
      return { success: false, error: 'PIN de Cocina incorrecto para este restaurante.' };
    }
    const user: User = {
      id: `user-${rest.id}`,
      name: rest.name,
      role: 'RESTAURANTE',
      restaurantId: rest.id,
      phone: rest.phone,
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(user);
    setActiveRole('RESTAURANTE');
    if (typeof window !== 'undefined') {
      localStorage.setItem('dondomi_auth_user', JSON.stringify(user));
      sessionStorage.setItem(`merchant_auth_${rest.id}`, 'true');
    }
    return { success: true };
  };

  const loginAsDriver = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!identifier.trim() || !password.trim()) {
      return {
        success: false,
        error: 'Ingresa tu identificador (correo, celular o código) y tu contraseña.',
      };
    }
    const drvAuth = await verifyDriverOnServer(identifier, password);
    if (!drvAuth.success || !drvAuth.driver) {
      return {
        success: false,
        error: drvAuth.error || 'Credenciales de domiciliario inválidas.',
      };
    }
    const verified = drvAuth.driver;
    const user: User = {
      id: verified.id,
      name: verified.name,
      email: verified.email,
      phone: verified.phone,
      role: 'DOMICILIARIO',
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(user);
    setActiveRole('DOMICILIARIO');
    if (typeof window !== 'undefined') {
      localStorage.setItem('dondomi_auth_user', JSON.stringify(user));
    }
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveRole('CLIENTE');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dondomi_auth_user');
      sessionStorage.removeItem('admin_master_auth');
    }
  };

  // Totales del carrito
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.itemTotal, 0);

  const saveCartToStorage = (newCart: CartItem[], restId: string | null, restName: string | null) => {
    if (typeof window !== 'undefined') {
      if (newCart.length === 0) {
        localStorage.removeItem(CART_STORAGE_KEY);
      } else {
        localStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify({
            cart: newCart,
            cartRestaurantId: restId,
            cartRestaurantName: restName,
            timestamp: Date.now(),
          })
        );
      }
    }
  };

  const executeAddToCart = (
    product: Product,
    restaurantName: string,
    quantity: number,
    selectedOptions: SelectedOption[] = [],
    notes: string = ''
  ) => {
    if (product.isArchived || product.isAvailable === false) {
      return;
    }
    setCartRestaurantId(product.restaurantId);
    setCartRestaurantName(restaurantName);

    const optionsTotal = selectedOptions.reduce((acc, opt) => acc + opt.price, 0);
    const unitPriceWithOptions = product.price + optionsTotal;
    const itemTotal = unitPriceWithOptions * quantity;

    const newItem: CartItem = {
      id: `${product.id}-${Date.now()}`,
      product,
      quantity,
      selectedOptions,
      notes,
      itemTotal,
    };

    setCart((prev) => {
      const updated = [...prev, newItem];
      saveCartToStorage(updated, product.restaurantId, restaurantName);
      return updated;
    });
  };

  const addToCart = (
    product: Product,
    restaurantName: string,
    quantity: number,
    selectedOptions: SelectedOption[] = [],
    notes: string = ''
  ) => {
    if (product.isArchived || product.isAvailable === false) {
      return;
    }
    if (cartRestaurantId && cartRestaurantId !== product.restaurantId && cart.length > 0) {
      setPendingCartSwitch({
        product,
        restaurantName,
        quantity,
        selectedOptions,
        notes,
      });
      return;
    }

    executeAddToCart(product, restaurantName, quantity, selectedOptions, notes);
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => {
      const updated = prev.filter((item) => item.id !== cartItemId);
      const nextRestId = updated.length === 0 ? null : cartRestaurantId;
      const nextRestName = updated.length === 0 ? null : cartRestaurantName;
      if (updated.length === 0) {
        setCartRestaurantId(null);
        setCartRestaurantName(null);
      }
      saveCartToStorage(updated, nextRestId, nextRestName);
      return updated;
    });
  };

  const updateCartQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prev) => {
      const updated = prev.map((item) => {
        if (item.id === cartItemId) {
          const optionsTotal = (item.selectedOptions || []).reduce((acc, opt) => acc + opt.price, 0);
          const unitPriceWithOptions = item.product.price + optionsTotal;
          return {
            ...item,
            quantity: newQty,
            itemTotal: unitPriceWithOptions * newQty,
          };
        }
        return item;
      });
      saveCartToStorage(updated, cartRestaurantId, cartRestaurantName);
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    setCartRestaurantId(null);
    setCartRestaurantName(null);
    saveCartToStorage([], null, null);
  };

  return (
    <AppContext.Provider
      value={{
        currentNeighborhood,
        setCurrentNeighborhood,
        isLocationModalOpen,
        setIsLocationModalOpen,
        cart,
        cartRestaurantId,
        cartRestaurantName,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartCount,
        cartSubtotal,
        activeRole,
        setActiveRole,
        searchQuery,
        setSearchQuery,
        selectedCategorySlug,
        setSelectedCategorySlug,
        onlyOpenFilter,
        setOnlyOpenFilter,
        restaurants,
        addRestaurant,
        updateRestaurant,
        toggleRestaurantStatus,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        globalDeliveryFee,
        setGlobalDeliveryFee,
        globalAnnouncement,
        setGlobalAnnouncement,
        drivers,
        addDriver,
        updateDriver,
        toggleDriverStatus,
        toggleDriverAvailability,
        productsByRestaurant,
        fetchProductsForRestaurant,
        isMenuLoading,
        addProduct,
        updateProduct,
        deleteProduct,
        archiveProduct: deleteProduct,
        restoreProduct,
        toggleProductAvailability,
        currentUser,
        loginWithEmail,
        loginAsAdmin,
        loginAsRestaurant,
        loginAsDriver,
        logout,
        claimOrder,
        confirmOrderPickup,
        dispatchWithOwnDriver,
        assignDriverByAdmin,
        confirmOrderPayment,
        rateOrder,
        reorderItems,
        unclaimOrder,
        orders,
        addOrder,
        updateOrderStatus,
        rejectOrder,
        cancelOrderByCustomer,
      }}
    >
      {children}

      {/* Modal DonDomi de confirmación para cambiar de restaurante en la canasta */}
      {pendingCartSwitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-slate-800 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <div className="text-center">
              <h4 className="font-black text-slate-900 text-base">¿Cambiar de restaurante?</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Tu canasta tiene platos de <strong>&quot;{cartRestaurantName}&quot;</strong>. Si agregas platos de{' '}
                <strong>&quot;{pendingCartSwitch.restaurantName}&quot;</strong>, se vaciará tu canasta anterior.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingCartSwitch(null)}
                className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Conservar actual
              </button>
              <button
                type="button"
                onClick={() => {
                  const pending = pendingCartSwitch;
                  setPendingCartSwitch(null);
                  setCart([]);
                  setCartRestaurantId(null);
                  setCartRestaurantName(null);
                  saveCartToStorage([], null, null);
                  executeAddToCart(
                    pending.product,
                    pending.restaurantName,
                    pending.quantity,
                    pending.selectedOptions,
                    pending.notes
                  );
                }}
                className="py-2.5 px-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md shadow-orange-600/25 transition cursor-pointer"
              >
                Sí, cambiar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
}
