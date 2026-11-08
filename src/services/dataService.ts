/**
 * DonDomi - Data Access Layer (Capa Centralizada de Acceso a Datos)
 *
 * Centraliza la lectura y persistencia en Supabase de:
 * - Categorías de comida (categories)
 * - Flota de domiciliarios (drivers)
 * - Configuración global de la plataforma (platform_config)
 * - Restaurantes (restaurants)
 * - Platos / Menús con archivado lógico (products)
 * - Pedidos y Ciclo de Vida (orders)
 *
 * Regla de honestidad de persistencia:
 * Ningún fallo de Supabase (incluyendo columnas o tablas pendientes de migración)
 * se disfraza como un guardado exitoso. Puede guardarse un respaldo local para
 * recuperación, pero toda mutación devuelve `ok: false` si Supabase no confirmó
 * la escritura.
 */

import { supabase } from '@/lib/supabase';
import {
  FoodCategory,
  Driver,
  Restaurant,
  Product,
  Order,
  OrderStatus,
  MutationResult,
  LoyaltyTier,
  LoyaltyTierInfo,
  OrderChannel,
  TransferPlatform,
} from '@/types';
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

function formatSupabaseWriteError(error: any, entityLabel: string): string {
  if (!error) return `Error desconocido guardando ${entityLabel} en Supabase.`;
  const code = String(error.code || '');
  const msg = String(error.message || '');
  if (code === 'PGRST204' || code === '42703' || msg.includes('column')) {
    return `No se pudo persistir ${entityLabel} en Supabase porque faltan columnas en la base de datos (${msg}). Ejecuta manualmente la migración pendiente: supabase/migrations/20261101_phase1_persistence_and_archive.sql.`;
  }
  if (code === '42P01') {
    return `No se pudo persistir ${entityLabel} en Supabase porque la tabla aún no existe (${msg}). Ejecuta manualmente las migraciones SQL pendientes en Supabase.`;
  }
  return `No se pudo guardar ${entityLabel} en Supabase: ${msg || code || 'Error de red o permisos'}.`;
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
        return { data: getLocalCategories(), source: 'local' };
      }

      if (data && data.length > 0) {
        const mapped = data.map(dbToCategory);
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

  async saveCategory(cat: FoodCategory): Promise<MutationResult> {
    saveLocalCategory(cat);
    try {
      const dbRow = categoryToDb(cat);
      const { error } = await supabase.from('categories').upsert([dbRow]);
      if (error) {
        return {
          ok: false,
          persistedInSupabase: false,
          error: formatSupabaseWriteError(error, `la categoría "${cat.name}"`),
        };
      }
      return { ok: true, persistedInSupabase: true };
    } catch (err: any) {
      return {
        ok: false,
        persistedInSupabase: false,
        error: formatSupabaseWriteError(err, `la categoría "${cat.name}"`),
      };
    }
  },

  async deleteCategory(catId: string): Promise<MutationResult> {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', catId);
      if (error) {
        return {
          ok: false,
          persistedInSupabase: false,
          error: formatSupabaseWriteError(error, 'la eliminación de categoría'),
        };
      }
      removeLocalCategory(catId);
      return { ok: true, persistedInSupabase: true };
    } catch (err: any) {
      return {
        ok: false,
        persistedInSupabase: false,
        error: formatSupabaseWriteError(err, 'la eliminación de categoría'),
      };
    }
  },

  // ==========================================================================
  // 2. FLOTA DE DOMICILIARIOS (Sin exponer password_hash en consultas cliente)
  // ==========================================================================
  async getDrivers(): Promise<{ data: Driver[]; source: 'supabase' | 'local' }> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select(
          'id, user_id, name, phone, email, plate, vehicle_type, is_active, is_available, rating, total_deliveries, created_at'
        )
        .order('name');

      if (error) {
        // Si la columna is_available aún no fue migrada (42703), intentar lectura sin password_hash ni is_available
        if (error.code === '42703' || error.code === 'PGRST204') {
          const fallback = await supabase
            .from('drivers')
            .select(
              'id, user_id, name, phone, email, plate, vehicle_type, is_active, rating, total_deliveries, created_at'
            )
            .order('name');
          if (!fallback.error && fallback.data && fallback.data.length > 0) {
            const mapped = fallback.data.map(dbToDriver);
            return { data: mapped, source: 'supabase' };
          }
        }
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

  async saveDriver(driver: Driver): Promise<MutationResult> {
    try {
      const dbRow = driverToDb(driver);
      const { error } = await supabase.from('drivers').upsert([dbRow]);
      if (error) {
        saveLocalDriver({ ...driver, passwordHash: undefined });
        return {
          ok: false,
          persistedInSupabase: false,
          error: formatSupabaseWriteError(error, `el domiciliario "${driver.name}"`),
        };
      }
      saveLocalDriver({ ...driver, passwordHash: undefined });
      return { ok: true, persistedInSupabase: true };
    } catch (err: any) {
      saveLocalDriver({ ...driver, passwordHash: undefined });
      return {
        ok: false,
        persistedInSupabase: false,
        error: formatSupabaseWriteError(err, `el domiciliario "${driver.name}"`),
      };
    }
  },

  async toggleDriverActive(driverId: string, currentStatus: boolean): Promise<MutationResult> {
    const nextStatus = !currentStatus;
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ is_active: nextStatus })
        .eq('id', driverId);
      if (error) {
        return {
          ok: false,
          persistedInSupabase: false,
          error: formatSupabaseWriteError(error, 'el estado del domiciliario'),
        };
      }
      toggleLocalDriver(driverId, nextStatus);
      return { ok: true, persistedInSupabase: true };
    } catch (err: any) {
      return {
        ok: false,
        persistedInSupabase: false,
        error: formatSupabaseWriteError(err, 'el estado del domiciliario'),
      };
    }
  },

  async updateDriverAvailability(driverId: string, nextAvailable: boolean): Promise<MutationResult> {
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ is_available: nextAvailable })
        .eq('id', driverId);
      if (error) {
        return {
          ok: false,
          persistedInSupabase: false,
          error: formatSupabaseWriteError(error, 'la disponibilidad de turno del domiciliario'),
        };
      }
      return { ok: true, persistedInSupabase: true };
    } catch (err: any) {
      return {
        ok: false,
        persistedInSupabase: false,
        error: formatSupabaseWriteError(err, 'la disponibilidad de turno del domiciliario'),
      };
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

      saveLocalPlatformConfig(config);
      return { config, source: 'supabase' };
    } catch {
      return { config: local, source: 'local' };
    }
  },

  async updatePlatformConfig(updates: Partial<PlatformConfig>): Promise<MutationResult> {
    const current = getLocalPlatformConfig();
    const updated: PlatformConfig = { ...current, ...updates };

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
      if (error) {
        saveLocalPlatformConfig(updated);
        return {
          ok: false,
          persistedInSupabase: false,
          error: formatSupabaseWriteError(error, 'la configuración global de la plataforma'),
        };
      }
      saveLocalPlatformConfig(updated);
      return { ok: true, persistedInSupabase: true };
    } catch (err: any) {
      saveLocalPlatformConfig(updated);
      return {
        ok: false,
        persistedInSupabase: false,
        error: formatSupabaseWriteError(err, 'la configuración global de la plataforma'),
      };
    }
  },

  // ==========================================================================
  // 4. RESTAURANTES
  // ==========================================================================
  async getRestaurants(): Promise<{ data: Restaurant[]; error?: any }> {
    try {
      const { data, error } = await supabase.from('restaurants').select('*').order('name');
      if (error) {
        return { data: INITIAL_RESTAURANTS, error };
      }

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

  async saveRestaurant(restaurant: Restaurant, isInsert = false): Promise<MutationResult> {
    const dbRow: any = restaurantToDb(restaurant);
    try {
      const query = isInsert
        ? supabase.from('restaurants').insert([dbRow])
        : supabase.from('restaurants').update(dbRow).eq('id', restaurant.id);
      const { error } = await query;
      if (error) {
        return {
          ok: false,
          persistedInSupabase: false,
          error: formatSupabaseWriteError(error, `el restaurante "${restaurant.name}"`),
        };
      }
      return { ok: true, persistedInSupabase: true };
    } catch (err: any) {
      return {
        ok: false,
        persistedInSupabase: false,
        error: formatSupabaseWriteError(err, `el restaurante "${restaurant.name}"`),
      };
    }
  },

  // ==========================================================================
  // 5. PRODUCTOS / PLATOS (con soporte de Archivado Lógico)
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

  async getProductsByRestaurant(restaurantId: string): Promise<{ data: Product[]; error?: any }> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');

      if (error) {
        const fallback = (INITIAL_PRODUCTS[restaurantId] || []).filter((p) => !p.isArchived);
        return { data: fallback, error };
      }

      if (data && data.length > 0) {
        const mapped = data.map(dbToProduct).filter((p) => !p.isArchived);
        return { data: mapped };
      }

      const fallback = (INITIAL_PRODUCTS[restaurantId] || []).filter((p) => !p.isArchived);
      return { data: fallback };
    } catch (err) {
      const fallback = (INITIAL_PRODUCTS[restaurantId] || []).filter((p) => !p.isArchived);
      return { data: fallback, error: err };
    }
  },

  async saveProduct(product: Product, isInsert = false): Promise<MutationResult> {
    const dbRow = productToDb(product);
    try {
      const query = isInsert
        ? supabase.from('products').insert([dbRow])
        : supabase.from('products').upsert([dbRow]);
      const { error } = await query;
      if (error) {
        return {
          ok: false,
          persistedInSupabase: false,
          error: formatSupabaseWriteError(error, `el producto "${product.name}"`),
        };
      }
      return { ok: true, persistedInSupabase: true };
    } catch (err: any) {
      return {
        ok: false,
        persistedInSupabase: false,
        error: formatSupabaseWriteError(err, `el producto "${product.name}"`),
      };
    }
  },

  async archiveProduct(productId: string, productName?: string): Promise<MutationResult> {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_archived: true, is_available: false })
        .eq('id', productId);
      if (error) {
        return {
          ok: false,
          persistedInSupabase: false,
          error: formatSupabaseWriteError(
            error,
            `el archivado del producto "${productName || productId}"`
          ),
        };
      }
      return { ok: true, persistedInSupabase: true };
    } catch (err: any) {
      return {
        ok: false,
        persistedInSupabase: false,
        error: formatSupabaseWriteError(
          err,
          `el archivado del producto "${productName || productId}"`
        ),
      };
    }
  },

  async restoreProduct(productId: string, productName?: string): Promise<MutationResult> {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_archived: false })
        .eq('id', productId);
      if (error) {
        return {
          ok: false,
          persistedInSupabase: false,
          error: formatSupabaseWriteError(
            error,
            `la restauración del producto "${productName || productId}"`
          ),
        };
      }
      return { ok: true, persistedInSupabase: true };
    } catch (err: any) {
      return {
        ok: false,
        persistedInSupabase: false,
        error: formatSupabaseWriteError(
          err,
          `la restauración del producto "${productName || productId}"`
        ),
      };
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
      });

      return { data: mapped };
    } catch (err) {
      return { data: [], error: err };
    }
  },
};

/**
 * Calcula en tiempo real el nivel de fidelización VIP de un cliente según
 * su historial de pedidos entregados ('DELIVERED').
 *
 * Niveles oficiales DonDomi:
 * - Bronce: 1 a 3 pedidos.
 * - Plata: 4 a 9 pedidos.
 * - Oro: 10 a 19 pedidos.
 * - VIP: 20 o más pedidos.
 */
export function getCustomerLoyaltyTier(phone: string, allOrders: Order[]): LoyaltyTierInfo {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (!cleanPhone || cleanPhone === '0000000000') {
    return {
      tier: 'Nuevo',
      deliveredOrdersCount: 0,
      label: 'Mostrador / Nuevo',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: '👤',
    };
  }

  const deliveredOrdersCount = allOrders.filter((o) => {
    const oPhone = (o.customerPhone || '').replace(/\D/g, '');
    return oPhone === cleanPhone && o.status === 'DELIVERED';
  }).length;

  if (deliveredOrdersCount >= 20) {
    return {
      tier: 'VIP',
      deliveredOrdersCount,
      orderCount: deliveredOrdersCount,
      label: 'VIP',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 ring-1 ring-purple-400 font-black',
      icon: '👑',
      discountMessage: '🌟 Cliente VIP de Valledupar · Atención prioritaria',
    };
  }
  if (deliveredOrdersCount >= 10) {
    return {
      tier: 'Oro',
      deliveredOrdersCount,
      orderCount: deliveredOrdersCount,
      label: 'Oro',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 ring-1 ring-amber-400 font-bold',
      icon: '🥇',
      discountMessage: '🥇 Cliente Frecuente Oro · Trato preferencial',
    };
  }
  if (deliveredOrdersCount >= 4) {
    return {
      tier: 'Plata',
      deliveredOrdersCount,
      orderCount: deliveredOrdersCount,
      label: 'Plata',
      badgeClass: 'bg-slate-200 text-slate-800 border-slate-300 ring-1 ring-slate-400 font-semibold',
      icon: '🥈',
      discountMessage: '🥈 Cliente Habitual Plata',
    };
  }
  if (deliveredOrdersCount >= 1) {
    return {
      tier: 'Bronce',
      deliveredOrdersCount,
      orderCount: deliveredOrdersCount,
      label: 'Bronce',
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-200 ring-1 ring-orange-300 font-semibold',
      icon: '🥉',
      discountMessage: '🥉 Cliente Bronce',
    };
  }

  return {
    tier: 'Nuevo',
    deliveredOrdersCount: 0,
    orderCount: 0,
    label: 'Nuevo Cliente',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
    icon: '✨',
  };
}

// ============================================================================
// HELPERS LOCALES DE FALLBACK Y CACHÉ DE RECUPERACIÓN
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
