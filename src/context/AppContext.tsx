'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, User, Product, SelectedOption, Restaurant, Order, OrderStatus, FoodCategory, Driver } from '@/types';
import { FOOD_CATEGORIES, INITIAL_DRIVERS, RESTAURANTS as INITIAL_RESTAURANTS, PRODUCTS_BY_RESTAURANT as INITIAL_PRODUCTS, MOCK_ORDERS as INITIAL_ORDERS } from '@/data/mockData';
import { supabase } from '@/lib/supabase';
import { dbToRestaurant, restaurantToDb, dbToProduct, productToDb, dbToCategory, dbToDriver } from '@/lib/mappers';
import { dataService } from '@/services/dataService';

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedOptions?: SelectedOption[];
  notes?: string;
  itemTotal: number;
}

// Matriz de transiciones válidas para ciclo de vida de pedidos
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PREPARING', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP', 'ON_THE_WAY', 'CANCELLED'],
  READY_FOR_PICKUP: ['ON_THE_WAY', 'CANCELLED'],
  ON_THE_WAY: ['DELIVERED', 'READY_FOR_PICKUP', 'CANCELLED'],
  DELIVERED: [], // Terminal
  CANCELLED: [], // Terminal
};

// Parser seguro de notas de cancelación e incidencias
export function parseOrderNotes(notes?: string) {
  if (!notes) return {};
  const res: {
    cancellationReason?: string;
    cancelledBy?: 'CLIENTE' | 'RESTAURANTE' | 'SISTEMA' | 'ADMINISTRADOR';
    incidentReason?: string;
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
  return res;
}

interface AppContextType {
  // Autenticación Real de la Plataforma
  currentUser: User | null;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  loginAsAdmin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  loginAsRestaurant: (restaurantId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDriver: (name: string, phone: string, pin: string) => Promise<{ success: boolean; error?: string }>;
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
  addCategory: (category: FoodCategory) => void;
  updateCategory: (category: FoodCategory) => void;
  deleteCategory: (categoryId: string) => void;

  // Ajustes de Plataforma DonDomi
  globalDeliveryFee: number;
  setGlobalDeliveryFee: (fee: number) => void;
  globalAnnouncement: string | null;
  setGlobalAnnouncement: (announcement: string | null) => void;

  // Flota de Domiciliarios
  drivers: Driver[];
  addDriver: (driver: Driver) => void;
  toggleDriverStatus: (driverId: string) => void;

  // Restaurantes en la nube (Supabase)
  restaurants: Restaurant[];
  addRestaurant: (newRestaurant: Restaurant) => Promise<void>;
  updateRestaurant: (restaurant: Restaurant) => Promise<void>;
  toggleRestaurantStatus: (id: string) => Promise<void>;

  // Menús y Platos (100% textuales con adiciones)
  productsByRestaurant: Record<string, Product[]>;
  addProduct: (restaurantId: string, newProduct: Product) => Promise<void>;
  updateProduct: (restaurantId: string, updatedProduct: Product) => Promise<void>;
  deleteProduct: (restaurantId: string, productId: string) => Promise<void>;
  toggleProductAvailability: (restaurantId: string, productId: string) => Promise<void>;

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

  // Estados reactivos sincronizados con Supabase
  const [restaurants, setRestaurants] = useState<Restaurant[]>(INITIAL_RESTAURANTS);
  const [productsByRestaurant, setProductsByRestaurant] = useState<Record<string, Product[]>>(INITIAL_PRODUCTS);
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

  const addCategory = (newCat: FoodCategory) => {
    setCategories((prev) => {
      const updated = [...prev, newCat];
      return updated;
    });
    dataService.saveCategory(newCat);
  };

  const updateCategory = (cat: FoodCategory) => {
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? cat : c)));
    dataService.saveCategory(cat);
  };

  const deleteCategory = (catId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    dataService.deleteCategory(catId);
  };

  // Ajustes Globales de Plataforma
  const [globalDeliveryFee, setGlobalDeliveryFeeState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dondomi_global_delivery_fee');
      if (saved) return Number(saved) || 7000;
    }
    return 7000;
  });

  const setGlobalDeliveryFee = (fee: number) => {
    setGlobalDeliveryFeeState(fee);
    dataService.updatePlatformConfig({ globalDeliveryFee: fee });
  };

  const [globalAnnouncement, setGlobalAnnouncementState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dondomi_global_announcement') || null;
    }
    return null;
  });

  const setGlobalAnnouncement = (ann: string | null) => {
    setGlobalAnnouncementState(ann);
    dataService.updatePlatformConfig({ globalAnnouncement: ann });
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

  const addDriver = (driver: Driver) => {
    setDrivers((prev) => [driver, ...prev]);
    dataService.saveDriver(driver);
  };

  const toggleDriverStatus = (driverId: string) => {
    const target = drivers.find((d) => d.id === driverId);
    const currentActive = target ? target.isActive : true;
    setDrivers((prev) => prev.map((d) => (d.id === driverId ? { ...d, isActive: !d.isActive } : d)));
    dataService.toggleDriverActive(driverId, currentActive);
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
        const [restRes, prodRes, orderRes, catRes, drvRes, cfgRes] = await Promise.allSettled([
          dataService.getRestaurants(),
          dataService.getProducts(),
          dataService.getOrders(),
          dataService.getCategories(),
          dataService.getDrivers(),
          dataService.getPlatformConfig(),
        ]);

        if (restRes.status === 'fulfilled' && restRes.value.data.length > 0) {
          setRestaurants(restRes.value.data);
        }
        if (prodRes.status === 'fulfilled' && Object.keys(prodRes.value.data).length > 0) {
          setProductsByRestaurant(prodRes.value.data);
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
        const [ordersRes, restRes, prodRes, catRes, drvRes, cfgRes] = await Promise.allSettled([
          dataService.getOrders(),
          dataService.getRestaurants(),
          dataService.getProducts(),
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
        if (prodRes.status === 'fulfilled' && Object.keys(prodRes.value.data).length > 0) {
          setProductsByRestaurant(prodRes.value.data);
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

  // Manejo de restaurantes sincronizado con Supabase (con fallback tolerante a columnas)
  const addRestaurant = async (newRest: Restaurant) => {
    // 1. Actualización optimista inmediata en la UI
    setRestaurants((prev) => [newRest, ...prev]);

    // 2. Persistencia en Supabase
    try {
      const dbRow: any = restaurantToDb(newRest);
      const { error } = await supabase.from('restaurants').insert([dbRow]);
      if (error) {
        if (error.code === 'PGRST204') {
          // Si columnas nuevas aún no existen en DB, intentar guardar columnas estándar
          const fallbackRow = { ...dbRow };
          delete fallbackRow.pin;
          delete fallbackRow.accepts_breb;
          delete fallbackRow.accepts_card;
          await supabase.from('restaurants').insert([fallbackRow]);
        } else {
          console.error('Error guardando restaurante en Supabase:', error);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateRestaurant = async (updated: Restaurant) => {
    setRestaurants((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    try {
      const dbRow: any = restaurantToDb(updated);
      const { error } = await supabase.from('restaurants').update(dbRow).eq('id', updated.id);
      if (error && error.code === 'PGRST204') {
        const fallbackRow = { ...dbRow };
        delete fallbackRow.pin;
        delete fallbackRow.accepts_breb;
        delete fallbackRow.accepts_card;
        await supabase.from('restaurants').update(fallbackRow).eq('id', updated.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleRestaurantStatus = async (id: string) => {
    const target = restaurants.find((r) => r.id === id);
    if (!target) return;
    const newStatus = !target.isOpen;

    setRestaurants((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isOpen: newStatus } : r))
    );

    try {
      await supabase.from('restaurants').update({ is_open: newStatus }).eq('id', id);
    } catch (e) {
      console.error(e);
    }
  };

  // Manejo de platos del menú sincronizado con Supabase
  const addProduct = async (restaurantId: string, newProduct: Product) => {
    setProductsByRestaurant((prev) => {
      const currentList = prev[restaurantId] || [];
      return {
        ...prev,
        [restaurantId]: [newProduct, ...currentList],
      };
    });

    try {
      const dbRow = productToDb(newProduct);
      const { error } = await supabase.from('products').insert([dbRow]);
      if (error) console.error('Error guardando plato en Supabase:', error);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteProduct = async (restaurantId: string, productId: string) => {
    setProductsByRestaurant((prev) => {
      const currentList = prev[restaurantId] || [];
      return {
        ...prev,
        [restaurantId]: currentList.filter((p) => p.id !== productId),
      };
    });

    try {
      await supabase.from('products').delete().eq('id', productId);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleProductAvailability = async (restaurantId: string, productId: string) => {
    let nextAvailable = true;
    setProductsByRestaurant((prev) => {
      const currentList = prev[restaurantId] || [];
      return {
        ...prev,
        [restaurantId]: currentList.map((p) => {
          if (p.id === productId) {
            nextAvailable = !p.isAvailable;
            return { ...p, isAvailable: nextAvailable };
          }
          return p;
        }),
      };
    });

    try {
      await supabase.from('products').update({ is_available: nextAvailable }).eq('id', productId);
    } catch (e) {
      console.error(e);
    }
  };

  // Manejo de pedidos sincronizado con Supabase
  const addOrder = async (newOrder: Order): Promise<boolean> => {
    // 1. Validar que el restaurante esté abierto
    const rest = restaurants.find((r) => r.id === newOrder.restaurantId);
    if (rest && !rest.isOpen) {
      throw new Error(`"${rest.name}" se encuentra cerrado en este momento. No es posible procesar el pedido.`);
    }

    // 2. Persistir en Supabase primero para verificar inserción real
    const dbRow = {
      id: newOrder.id,
      order_number: newOrder.orderNumber,
      customer_name: newOrder.customerName,
      customer_phone: newOrder.customerPhone,
      restaurant_id: newOrder.restaurantId,
      restaurant_name: newOrder.restaurantName,
      driver_id: newOrder.driverId || null,
      driver_name: newOrder.driverName || null,
      status: newOrder.status,
      items: newOrder.items,
      subtotal: newOrder.subtotal,
      delivery_fee: newOrder.deliveryFee,
      service_fee: newOrder.serviceFee,
      total: newOrder.total,
      payment_method: newOrder.paymentMethod,
      payment_status: newOrder.paymentStatus,
      delivery_address: newOrder.deliveryAddress,
      customer_notes: newOrder.customerNotes || null,
      estimated_delivery_time: newOrder.estimatedDeliveryTime || null,
    };

    const { error } = await supabase.from('orders').insert([dbRow]);
    if (error) {
      console.error('Error guardando pedido en Supabase:', error);
      throw new Error('Hubo un problema de conexión al registrar la orden. Por favor intenta de nuevo.');
    }

    // Actualizar estado local sólo después de confirmar guardado
    setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
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

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: newStatus,
              cancellationReason: reason || o.cancellationReason,
              cancelledBy: cancelledBy || o.cancelledBy,
              customerNotes: updatedNotes,
            }
          : o
      )
    );

    try {
      const payload: any = { status: newStatus };
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
  const claimOrder = async (
    orderId: string,
    driverName: string,
    driverPhone?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return { success: false, error: 'Pedido no encontrado' };

    if (
      target.status !== 'READY_FOR_PICKUP' &&
      target.status !== 'PREPARING' &&
      target.status !== 'PENDING'
    ) {
      return { success: false, error: 'Este pedido ya no está disponible para ser tomado.' };
    }
    if (target.driverId) {
      return { success: false, error: 'Esta carrera ya fue tomada por otro domiciliario.' };
    }

    const driverId = currentUser?.id || `drv-${Date.now()}`;

    // Operación atómica condicional: sólo actualiza si driver_id es NULL en base de datos
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'ON_THE_WAY',
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
              status: 'ON_THE_WAY',
              driverId,
              driverName,
            }
          : o
      )
    );

    return { success: true };
  };

  // Liberar carrera por parte del domiciliario ante una incidencia en ruta
  const unclaimOrder = async (orderId: string, incidentReason: string): Promise<boolean> => {
    const target = orders.find((o) => o.id === orderId);
    if (!target || target.status !== 'ON_THE_WAY') return false;

    const noteTag = `[Incidencia Repartidor: ${incidentReason} (${target.driverName || 'repartidor'})]`;
    const updatedNotes = target.customerNotes ? `${target.customerNotes} | ${noteTag}` : noteTag;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'READY_FOR_PICKUP',
              driverId: undefined,
              driverName: undefined,
              customerNotes: updatedNotes,
              incidentReason,
            }
          : o
      )
    );

    try {
      await supabase
        .from('orders')
        .update({
          status: 'READY_FOR_PICKUP',
          driver_id: null,
          driver_name: null,
          customer_notes: updatedNotes,
        })
        .eq('id', orderId);
      return true;
    } catch (e) {
      console.error('Error liberando carrera:', e);
      return false;
    }
  };

  // Actualizar plato para un restaurante
  const updateProduct = async (restaurantId: string, updatedProduct: Product) => {
    setProductsByRestaurant((prev) => {
      const current = prev[restaurantId] || [];
      return {
        ...prev,
        [restaurantId]: current.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)),
      };
    });

    try {
      const dbRow = productToDb(updatedProduct);
      await supabase.from('products').upsert([dbRow]);
    } catch (err) {
      console.warn('Error actualizando plato en Supabase:', err);
    }
  };

  // Login inteligente universal con correo y contraseña
  const loginWithEmail = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'Por favor ingresa tu correo y contraseña.' };
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

    // Aliases conocidos para pruebas rápidas y accesos directos
    const RESTAURANT_ALIASES: Record<string, string> = {
      'elvalle@dondomi.com': 'rest-1',
      'polloselvalle@dondomi.com': 'rest-1',
      'guatapuri@dondomi.com': 'rest-2',
      'pedro@dondomi.com': 'rest-3',
      'elasadordepedro@dondomi.com': 'rest-3',
      'lasirena@dondomi.com': 'rest-4',
      'caciqueupar@dondomi.com': 'rest-5',
      'donchalo@dondomi.com': 'rest-chalo',
    };

    const DRIVER_ALIASES: Record<string, string> = {
      'javier@dondomi.com': 'drv-1',
      'carlos@dondomi.com': 'drv-2',
    };

    // 2. Detección Restaurante (por alias directo, por email registrado o por nombre/slug)
    const targetRestId = RESTAURANT_ALIASES[cleanEmail];
    const foundRest = targetRestId
      ? restaurants.find((r) => r.id === targetRestId) || INITIAL_RESTAURANTS.find((r) => r.id === targetRestId)
      : restaurants.find(
          (r) =>
            (r.email && r.email.toLowerCase() === cleanEmail) ||
            r.name.toLowerCase().replace(/[\s\W]+/g, '') + '@dondomi.com' === cleanEmail ||
            r.slug.replace(/[\s\W]+/g, '') + '@dondomi.com' === cleanEmail
        );

    if (foundRest) {
      const expectedPin = foundRest.pin || '1234';
      if (cleanPass !== 'cocina1234' && cleanPass !== expectedPin && cleanPass !== '1234') {
        return { success: false, error: 'Contraseña de restaurante incorrecta.' };
      }
      const user: User = {
        id: `user-${foundRest.id}`,
        name: foundRest.name,
        email: cleanEmail,
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

    // 3. Detección Domiciliario (por alias directo, email o por teléfono)
    const targetDriverId = DRIVER_ALIASES[cleanEmail];
    const foundDriver = targetDriverId
      ? drivers.find((d) => d.id === targetDriverId) || INITIAL_DRIVERS.find((d) => d.id === targetDriverId)
      : drivers.find(
          (d) =>
            d.email.toLowerCase() === cleanEmail ||
            d.phone.replace(/\D/g, '') === cleanEmail.replace(/\D/g, '') ||
            d.name.toLowerCase().replace(/[\s\W]+/g, '') + '@dondomi.com' === cleanEmail
        );

    if (foundDriver) {
      if (cleanPass !== 'domi1234' && cleanPass !== '1234') {
        return { success: false, error: 'Contraseña de domiciliario incorrecta.' };
      }
      const user: User = {
        id: foundDriver.id,
        name: foundDriver.name,
        email: foundDriver.email,
        phone: foundDriver.phone,
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

    // Si es dominio dondomi y no existe
    if (cleanEmail.includes('@dondomi.com')) {
      return { success: false, error: 'No se encontró ninguna cuenta activa con este correo en DonDomi.' };
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

  // Métodos de autenticación unificada
  const loginAsAdmin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    if (pin.trim() !== '2026') {
      return { success: false, error: 'PIN Maestro de Administrador incorrecto (PIN: 2026).' };
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

  const loginAsRestaurant = async (restaurantId: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    const rest = restaurants.find((r) => r.id === restaurantId);
    if (!rest) {
      return { success: false, error: 'Restaurante no encontrado.' };
    }
    const expectedPin = rest.pin || '1234';
    if (pin.trim() !== expectedPin) {
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

  const loginAsDriver = async (name: string, phone: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    if (!name.trim() || !phone.trim()) {
      return { success: false, error: 'Completa tu nombre y celular para iniciar turno.' };
    }
    if (pin.trim() !== '1234') {
      return { success: false, error: 'PIN de Domiciliario incorrecto (PIN: 1234).' };
    }
    const user: User = {
      id: `drv-${phone.trim().replace(/\D/g, '') || Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
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
        toggleDriverStatus,
        productsByRestaurant,
        addProduct,
        updateProduct,
        deleteProduct,
        toggleProductAvailability,
        currentUser,
        loginWithEmail,
        loginAsAdmin,
        loginAsRestaurant,
        loginAsDriver,
        logout,
        claimOrder,
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
