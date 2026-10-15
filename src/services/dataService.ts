/**
 * DonDomi - Data Access Layer (Capa Centralizada de Acceso a Datos)
 * 
 * Centraliza la lectura y persistencia de:
 * - Categorías de comida (categories)
 * - Flota de domiciliarios (drivers)
 * - Configuración global de la plataforma (platform_config)
 * - Restaurantes (restaurants)
 * - Platos / Menús (products)
 * - Pedidos y Ciclo de Vida (orders)
 * 
 * Tolerancia a fallos:
 * Si una tabla aún no existe en Supabase (error 42P01 / PGRST), o si hay caída de red,
 * conmuta automáticamente a localStorage / datos iniciales sin interrumpir la experiencia del usuario.
 */

import { supabase } from '@/lib/supabase';
import { FoodCategory, Driver, Restaurant, Product, Order, OrderStatus } from '@/types';
import {
  FOOD_CATEGORIES,
  INITIAL_DRIVERS,
  RESTAURANTS as INITIAL_RESTAURANTS,
  PRODUCTS_BY_RESTAURANT as INITIAL_PRODUCTS,
} from '@/data/mockData';
import {
  dbToRestaurant,
  restaurantToDb,
  dbToProduct,
  productToDb,
  categoryToDb,
  dbToCategory,
  driverToDb,
  dbToDriver,
} from '@/lib/mappers';
import { parseOrderNotes } from '@/context/AppContext';

// Claves de almacenamiento local de respaldo
const STORAGE_KEYS = {
  CATEGORIES: 'dondomi_categories',
  DRIVERS: 'dondomi_drivers',
  GLOBAL_DELIVERY_FEE: 'dondomi_global_delivery_fee',
  GLOBAL_ANNOUNCEMENT: 'dondomi_global_announcement',
  PLATFORM_CONFIG: 'dondomi_platform_config',
} as const;

export interface PlatformConfig {
  id: string;
  globalDeliveryFee: number;
  globalAnnouncement: string | null;
  serviceFee: number;
  isOpen: boolean;
}

export const dataService = {
  // ==========================================================================
  // 1. CATEGORÍAS DE COMIDA
  // ==========================================================================
  async getCategories(): Promise<{ data: FoodCategory[]; source: 'supabase' | 'local' }> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        // Error de tabla no encontrada (42P01) o permisos
        return { data: getLocalCategories(), source: 'local' };
      }

      if (data && data.length > 0) {
        const mapped = data.map(dbToCategory);
        // Actualizar caché local
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(mapped));
        }
        return { data: mapped, source: 'supabase' };
      }

      return { data: getLocalCategories(), source: 'local' };
    } catch {
      return { data: getLocalCategories(), source: 'local' };
    }
  },

  async saveCategory(cat: FoodCategory): Promise<{ success: boolean; source: 'supabase' | 'local' }> {
    // 1. Guardar en caché local inmediatamente
    saveLocalCategory(cat);

    // 2. Intentar guardar en Supabase si la tabla existe
    try {
      const dbRow = categoryToDb(cat);
      const { error } = await supabase.from('categories').upsert([dbRow]);
      if (error) {
        return { success: true, source: 'local' };
      }
      return { success: true, source: 'supabase' };
    } catch {
      return { success: true, source: 'local' };
    }
  },

  async deleteCategory(catId: string): Promise<{ success: boolean; source: 'supabase' | 'local' }> {
    removeLocalCategory(catId);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', catId);
      if (error) return { success: true, source: 'local' };
      return { success: true, source: 'supabase' };
    } catch {
      return { success: true, source: 'local' };
    }
  },

  // ==========================================================================
  // 2. FLOTA DE DOMICILIARIOS
  // ==========================================================================
  async getDrivers(): Promise<{ data: Driver[]; source: 'supabase' | 'local' }> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name');

      if (error) {
        return { data: getLocalDrivers(), source: 'local' };
      }

      if (data && data.length > 0) {
        const mapped = data.map(dbToDriver);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(mapped));
        }
        return { data: mapped, source: 'supabase' };
      }

      return { data: getLocalDrivers(), source: 'local' };
    } catch {
      return { data: getLocalDrivers(), source: 'local' };
    }
  },

  async saveDriver(driver: Driver): Promise<{ success: boolean; source: 'supabase' | 'local' }> {
    saveLocalDriver(driver);
    try {
      const dbRow = driverToDb(driver);
      const { error } = await supabase.from('drivers').upsert([dbRow]);
      if (error) return { success: true, source: 'local' };
      return { success: true, source: 'supabase' };
    } catch {
      return { success: true, source: 'local' };
    }
  },

  async toggleDriverActive(driverId: string, currentStatus: boolean): Promise<{ success: boolean; source: 'supabase' | 'local' }> {
    const nextStatus = !currentStatus;
    toggleLocalDriver(driverId, nextStatus);
    try {
      const { error } = await supabase.from('drivers').update({ is_active: nextStatus }).eq('id', driverId);
      if (error) return { success: true, source: 'local' };
      return { success: true, source: 'supabase' };
    } catch {
      return { success: true, source: 'local' };
    }
  },

  // ==========================================================================
  // 3. CONFIGURACIÓN GLOBAL DE PLATAFORMA
  // ==========================================================================
  async getPlatformConfig(): Promise<{ config: PlatformConfig; source: 'supabase' | 'local' }> {
    const local = getLocalPlatformConfig();
    try {
      const { data, error } = await supabase
        .from('platform_config')
        .select('*')
        .eq('id', 'global_valledupar')
        .maybeSingle();

      if (error || !data) {
        return { config: local, source: 'local' };
      }

      const config: PlatformConfig = {
        id: data.id || 'global_valledupar',
        globalDeliveryFee: Number(data.global_delivery_fee) || 7000,
        globalAnnouncement: data.global_announcement || null,
        serviceFee: Number(data.service_fee) || 0,
        isOpen: data.is_open ?? true,
      };

      // Sincronizar local
      saveLocalPlatformConfig(config);
      return { config, source: 'supabase' };
    } catch {
      return { config: local, source: 'local' };
    }
  },

  async updatePlatformConfig(updates: Partial<PlatformConfig>): Promise<{ success: boolean; source: 'supabase' | 'local' }> {
    const current = getLocalPlatformConfig();
    const updated: PlatformConfig = { ...current, ...updates };
    saveLocalPlatformConfig(updated);

    try {
      const dbRow = {
        id: 'global_valledupar',
        global_delivery_fee: updated.globalDeliveryFee,
        global_announcement: updated.globalAnnouncement,
        service_fee: updated.serviceFee,
        is_open: updated.isOpen,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('platform_config').upsert([dbRow]);
      if (error) return { success: true, source: 'local' };
      return { success: true, source: 'supabase' };
    } catch {
      return { success: true, source: 'local' };
    }
  },

  // ==========================================================================
  // 4. RESTAURANTES
  // ==========================================================================
  async getRestaurants(): Promise<{ data: Restaurant[]; error?: any }> {
    try {
      const { data, error } = await supabase.from('restaurants').select('*').order('name');
      if (error) return { data: INITIAL_RESTAURANTS, error };

      if (data && data.length > 0) {
        const dbRests = data.map(dbToRestaurant);
        const restMap = new Map<string, Restaurant>();
        INITIAL_RESTAURANTS.forEach((r) => restMap.set(r.id, r));
        dbRests.forEach((r) => restMap.set(r.id, r));
        return { data: Array.from(restMap.values()) };
      }
      return { data: INITIAL_RESTAURANTS };
    } catch (err) {
      return { data: INITIAL_RESTAURANTS, error: err };
    }
  },

  async saveRestaurant(restaurant: Restaurant): Promise<{ success: boolean; error?: any }> {
    const dbRow: any = restaurantToDb(restaurant);
    try {
      const { error } = await supabase.from('restaurants').upsert([dbRow]);
      if (error && error.code === 'PGRST204') {
        const fallback = { ...dbRow };
        delete fallback.pin;
        delete fallback.accepts_breb;
        delete fallback.accepts_card;
        const retry = await supabase.from('restaurants').upsert([fallback]);
        return { success: !retry.error, error: retry.error };
      }
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  // ==========================================================================
  // 5. PRODUCTOS / PLATOS
  // ==========================================================================
  async getProducts(): Promise<{ data: Record<string, Product[]>; error?: any }> {
    try {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) return { data: INITIAL_PRODUCTS, error };

      const map: Record<string, Product[]> = { ...INITIAL_PRODUCTS };
      if (data && data.length > 0) {
        data.forEach((row) => {
          const p = dbToProduct(row);
          if (!map[p.restaurantId]) map[p.restaurantId] = [];
          const existingIdx = map[p.restaurantId].findIndex((item) => item.id === p.id);
          if (existingIdx >= 0) {
            map[p.restaurantId][existingIdx] = p;
          } else {
            map[p.restaurantId].push(p);
          }
        });
      }
      return { data: map };
    } catch (err) {
      return { data: INITIAL_PRODUCTS, error: err };
    }
  },

  // ==========================================================================
  // 6. PEDIDOS Y CICLO DE VIDA
  // ==========================================================================
  async getOrders(): Promise<{ data: Order[]; error?: any }> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return { data: [], error };

      const mapped: Order[] = (data || []).map((row: any) => {
        const parsed = parseOrderNotes(row.customer_notes);
        return {
          id: row.id,
          orderNumber: row.order_number,
          customerId: row.customer_name,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          restaurantId: row.restaurant_id || '',
          restaurantName: row.restaurant_name,
          driverId: row.driver_id || undefined,
          driverName: row.driver_name || undefined,
          status: row.status as OrderStatus,
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
      });

      return { data: mapped };
    } catch (err) {
      return { data: [], error: err };
    }
  },
};

// ============================================================================
// HELPERS LOCALES DE FALLBACK Y CACHÉ
// ============================================================================
function getLocalCategories(): FoodCategory[] {
  if (typeof window === 'undefined') return FOOD_CATEGORIES;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return FOOD_CATEGORIES;
}

function saveLocalCategory(cat: FoodCategory) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalCategories();
    const idx = current.findIndex((c) => c.id === cat.id);
    let updated: FoodCategory[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = cat;
    } else {
      updated = [...current, cat];
    }
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
  } catch {}
}

function removeLocalCategory(catId: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalCategories().filter((c) => c.id !== catId);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(current));
  } catch {}
}

function getLocalDrivers(): Driver[] {
  if (typeof window === 'undefined') return INITIAL_DRIVERS;
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.DRIVERS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_DRIVERS;
}

function saveLocalDriver(driver: Driver) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalDrivers();
    const idx = current.findIndex((d) => d.id === driver.id);
    let updated: Driver[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = driver;
    } else {
      updated = [driver, ...current];
    }
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(updated));
  } catch {}
}

function toggleLocalDriver(driverId: string, nextStatus: boolean) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalDrivers();
    const updated = current.map((d) => (d.id === driverId ? { ...d, isActive: nextStatus } : d));
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(updated));
  } catch {}
}

function getLocalPlatformConfig(): PlatformConfig {
  let fee = 7000;
  let announcement: string | null = null;
  if (typeof window !== 'undefined') {
    const savedFee = localStorage.getItem(STORAGE_KEYS.GLOBAL_DELIVERY_FEE);
    if (savedFee) fee = Number(savedFee) || 7000;
    announcement = localStorage.getItem(STORAGE_KEYS.GLOBAL_ANNOUNCEMENT) || null;
  }
  return {
    id: 'global_valledupar',
    globalDeliveryFee: fee,
    globalAnnouncement: announcement,
    serviceFee: 0,
    isOpen: true,
  };
}

function saveLocalPlatformConfig(config: PlatformConfig) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.GLOBAL_DELIVERY_FEE, String(config.globalDeliveryFee));
    if (config.globalAnnouncement) {
      localStorage.setItem(STORAGE_KEYS.GLOBAL_ANNOUNCEMENT, config.globalAnnouncement);
    } else {
      localStorage.removeItem(STORAGE_KEYS.GLOBAL_ANNOUNCEMENT);
    }
  }
}
