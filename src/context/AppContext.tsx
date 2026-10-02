'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Product, SelectedOption, Restaurant, Order, OrderStatus } from '@/types';
import { RESTAURANTS as INITIAL_RESTAURANTS, PRODUCTS_BY_RESTAURANT as INITIAL_PRODUCTS, MOCK_ORDERS as INITIAL_ORDERS } from '@/data/mockData';

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

  // Restaurantes en memoria/persistencia
  restaurants: Restaurant[];
  addRestaurant: (newRestaurant: Restaurant) => void;
  updateRestaurant: (restaurant: Restaurant) => void;
  toggleRestaurantStatus: (id: string) => void;

  // Menús y Platos (100% textuales con adiciones)
  productsByRestaurant: Record<string, Product[]>;
  addProduct: (restaurantId: string, newProduct: Product) => void;
  deleteProduct: (restaurantId: string, productId: string) => void;

  // Pedidos
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
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

  // Estados persistibles para restaurantes, productos y pedidos
  const [restaurants, setRestaurants] = useState<Restaurant[]>(INITIAL_RESTAURANTS);
  const [productsByRestaurant, setProductsByRestaurant] = useState<Record<string, Product[]>>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);

  // Cargar desde localStorage en el cliente (si existe)
  useEffect(() => {
    try {
      const savedRest = localStorage.getItem('dondomi_restaurants');
      if (savedRest) setRestaurants(JSON.parse(savedRest));

      const savedProds = localStorage.getItem('dondomi_products');
      if (savedProds) setProductsByRestaurant(JSON.parse(savedProds));

      const savedOrders = localStorage.getItem('dondomi_orders');
      if (savedOrders) setOrders(JSON.parse(savedOrders));
    } catch (e) {
      console.warn('Error reading localStorage:', e);
    }
  }, []);

  // Guardar en localStorage cuando cambian
  useEffect(() => {
    try {
      localStorage.setItem('dondomi_restaurants', JSON.stringify(restaurants));
    } catch (e) {}
  }, [restaurants]);

  useEffect(() => {
    try {
      localStorage.setItem('dondomi_products', JSON.stringify(productsByRestaurant));
    } catch (e) {}
  }, [productsByRestaurant]);

  useEffect(() => {
    try {
      localStorage.setItem('dondomi_orders', JSON.stringify(orders));
    } catch (e) {}
  }, [orders]);

  // Manejo de restaurantes
  const addRestaurant = (newRest: Restaurant) => {
    setRestaurants((prev) => [newRest, ...prev]);
  };

  const updateRestaurant = (updated: Restaurant) => {
    setRestaurants((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const toggleRestaurantStatus = (id: string) => {
    setRestaurants((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isOpen: !r.isOpen } : r))
    );
  };

  // Manejo de platos del menú
  const addProduct = (restaurantId: string, newProduct: Product) => {
    setProductsByRestaurant((prev) => {
      const currentList = prev[restaurantId] || [];
      return {
        ...prev,
        [restaurantId]: [newProduct, ...currentList],
      };
    });
  };

  const deleteProduct = (restaurantId: string, productId: string) => {
    setProductsByRestaurant((prev) => {
      const currentList = prev[restaurantId] || [];
      return {
        ...prev,
        [restaurantId]: currentList.filter((p) => p.id !== productId),
      };
    });
  };

  // Manejo de pedidos
  const addOrder = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  };

  // Calcular totales del carrito
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
