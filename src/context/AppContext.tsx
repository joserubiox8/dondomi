'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Product, SelectedOption, Restaurant, Order, OrderStatus } from '@/types';
import { RESTAURANTS as INITIAL_RESTAURANTS, PRODUCTS_BY_RESTAURANT as INITIAL_PRODUCTS, MOCK_ORDERS as INITIAL_ORDERS } from '@/data/mockData';
import { supabase } from '@/lib/supabase';
import { dbToRestaurant, restaurantToDb, dbToProduct, productToDb } from '@/lib/mappers';

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedOptions?: SelectedOption[];
  notes?: string;
  itemTotal: number;
}

interface AppContextType {
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

  // Restaurantes en la nube (Supabase)
  restaurants: Restaurant[];
  addRestaurant: (newRestaurant: Restaurant) => Promise<void>;
  updateRestaurant: (restaurant: Restaurant) => Promise<void>;
  toggleRestaurantStatus: (id: string) => Promise<void>;

  // Menús y Platos (100% textuales con adiciones)
  productsByRestaurant: Record<string, Product[]>;
  addProduct: (restaurantId: string, newProduct: Product) => Promise<void>;
  deleteProduct: (restaurantId: string, productId: string) => Promise<void>;
  toggleProductAvailability: (restaurantId: string, productId: string) => Promise<void>;

  // Pedidos
  orders: Order[];
  addOrder: (order: Order) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentNeighborhood, setCurrentNeighborhood] = useState<string>('Los Cortijos');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartRestaurantId, setCartRestaurantId] = useState<string | null>(null);
  const [cartRestaurantName, setCartRestaurantName] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('CLIENTE');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [onlyOpenFilter, setOnlyOpenFilter] = useState<boolean>(false);

  // Estados reactivos sincronizados con Supabase
  const [restaurants, setRestaurants] = useState<Restaurant[]>(INITIAL_RESTAURANTS);
  const [productsByRestaurant, setProductsByRestaurant] = useState<Record<string, Product[]>>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);

  // Cargar datos iniciales desde Supabase
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Cargar restaurantes (Mezclando Supabase con iniciales para no perder Salchipapas Donde Chalo ni locales)
        const { data: restData, error: restError } = await supabase
          .from('restaurants')
          .select('*')
          .order('name');

        if (!restError && restData && restData.length > 0) {
          const dbRests = restData.map(dbToRestaurant);
          const restMap = new Map<string, Restaurant>();
          INITIAL_RESTAURANTS.forEach((r) => restMap.set(r.id, r));
          dbRests.forEach((r) => restMap.set(r.id, r));
          setRestaurants(Array.from(restMap.values()));
        }

        // 2. Cargar platos
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select('*')
          .order('name');

        if (!prodError && prodData && prodData.length > 0) {
          const map: Record<string, Product[]> = { ...INITIAL_PRODUCTS };
          prodData.forEach((row) => {
            const p = dbToProduct(row);
            if (!map[p.restaurantId]) map[p.restaurantId] = [];
            const existingIdx = map[p.restaurantId].findIndex((item) => item.id === p.id);
            if (existingIdx >= 0) {
              map[p.restaurantId][existingIdx] = p;
            } else {
              map[p.restaurantId].push(p);
            }
          });
          setProductsByRestaurant(map);
        }

        // 3. Cargar pedidos
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (!orderError && orderData && orderData.length > 0) {
          const mappedOrders: Order[] = orderData.map((row: any) => ({
            id: row.id,
            orderNumber: row.order_number,
            customerId: row.customer_name,
            customerName: row.customer_name,
            customerPhone: row.customer_phone,
            restaurantId: row.restaurant_id || '',
            restaurantName: row.restaurant_name,
            driverId: row.driver_id,
            driverName: row.driver_name,
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
          }));
          setOrders(mappedOrders);
        }
      } catch (err) {
        console.warn('Error conectando a Supabase, usando estado local:', err);
      }
    }

    loadData();

    // Suscripción en tiempo real a nuevos pedidos (Supabase Realtime)
    const channel = supabase
      .channel('realtime_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row: any = payload.new;
            const newOrder: Order = {
              id: row.id,
              orderNumber: row.order_number,
              customerId: row.customer_name,
              customerName: row.customer_name,
              customerPhone: row.customer_phone,
              restaurantId: row.restaurant_id || '',
              restaurantName: row.restaurant_name,
              driverId: row.driver_id,
              driverName: row.driver_name,
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
            };
            setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const row: any = payload.new;
            setOrders((prev) =>
              prev.map((o) =>
                o.id === row.id
                  ? {
                      ...o,
                      status: row.status,
                      driverId: row.driver_id,
                      driverName: row.driver_name,
                      paymentStatus: row.payment_status,
                    }
                  : o
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
  const addOrder = async (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);

    try {
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
      if (error) console.error('Error guardando pedido en Supabase:', error);
    } catch (e) {
      console.error(e);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );

    try {
      await supabase.from('orders').update({ status }).eq('id', orderId);
    } catch (e) {
      console.error(e);
    }
  };

  // Totales del carrito
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.itemTotal, 0);

  const addToCart = (
    product: Product,
    restaurantName: string,
    quantity: number,
    selectedOptions: SelectedOption[] = [],
    notes: string = ''
  ) => {
    if (cartRestaurantId && cartRestaurantId !== product.restaurantId && cart.length > 0) {
      const confirmChange = window.confirm(
        `Tu carrito tiene productos de "${cartRestaurantName}". ¿Deseas vaciarlo para agregar de este nuevo restaurante?`
      );
      if (!confirmChange) return;
      setCart([]);
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

    setCart((prev) => [...prev, newItem]);
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => {
      const updated = prev.filter((item) => item.id !== cartItemId);
      if (updated.length === 0) {
        setCartRestaurantId(null);
        setCartRestaurantName(null);
      }
      return updated;
    });
  };

  const updateCartQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
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
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setCartRestaurantId(null);
    setCartRestaurantName(null);
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
        productsByRestaurant,
        addProduct,
        deleteProduct,
        toggleProductAvailability,
        orders,
        addOrder,
        updateOrderStatus,
      }}
    >
      {children}
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
