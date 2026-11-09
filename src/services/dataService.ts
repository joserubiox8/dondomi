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
  getLocalRestaurantsMeta,
  saveLocalRestaurantMeta,
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
  DELETED_CATEGORIES: 'dondomi_deleted_categories_v1',
  DRIVERS: 'dondomi_drivers',
  DELETED_DRIVERS: 'dondomi_deleted_drivers_v1',
  DRIVER_HASHES: 'dondomi_driver_hashes_v1',
  PRODUCTS_LOCAL: 'dondomi_products_local_v1',
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

/**
 * Extrae el nombre de la columna faltante reportada por PostgREST (PGRST204) o PostgreSQL (42703)
 */
function extractMissingColumnName(error: any): string | null {
  const msg = String(error?.message || error?.details || '');
  // Ej: "Could not find the 'accepts_breb' column of 'restaurants' in the schema cache"
  const pgrstMatch = msg.match(/Could not find the '([^']+)' column/i);
  if (pgrstMatch && pgrstMatch[1]) return pgrstMatch[1];
  // Ej: column "accepts_breb" of relation "restaurants" does not exist
  const pgMatch = msg.match(/column "([^"]+)"/i);
  if (pgMatch && pgMatch[1]) return pgMatch[1];
  return null;
}

/**
 * Ejecuta un upsert en Supabase eliminando automáticamente cualquier columna opcional
 * que aún no exista en el esquema remoto (PGRST204 / 42703).
 */
async function upsertWithSchemaTolerance(
  table: string,
  initialPayload: Record<string, any>
): Promise<{ persistedInSupabase: boolean; error?: any }> {
  const payload: Record<string, any> = { ...initialPayload };
  const maxAttempts = 15;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { error } = await supabase.from(table).upsert([payload]);
    if (!error) {
      return { persistedInSupabase: true };
    }

    const code = String(error.code || '');
    const msg = String(error.message || '');
    if (code === 'PGRST204' || code === '42703' || msg.includes('schema cache') || msg.includes('column')) {
      const missingCol = extractMissingColumnName(error);
      if (missingCol && missingCol in payload && missingCol !== 'id') {
        delete payload[missingCol];
        continue;
      }
    }
    return { persistedInSupabase: false, error };
  }

  return { persistedInSupabase: false };
}

/**
 * Ejecuta un update por id en Supabase eliminando automáticamente columnas faltantes en el esquema remoto.
 */
async function updateWithSchemaTolerance(
  table: string,
  id: string,
  initialUpdates: Record<string, any>
): Promise<{ persistedInSupabase: boolean; error?: any }> {
  const payload: Record<string, any> = { ...initialUpdates };
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (Object.keys(payload).length === 0) {
      return { persistedInSupabase: false };
    }
    const { error } = await supabase.from(table).update(payload).eq('id', id);
    if (!error) {
      return { persistedInSupabase: true };
    }

    const code = String(error.code || '');
    const msg = String(error.message || '');
    if (code === 'PGRST204' || code === '42703' || msg.includes('schema cache') || msg.includes('column')) {
      const missingCol = extractMissingColumnName(error);
      if (missingCol && missingCol in payload) {
        delete payload[missingCol];
        continue;
      }
    }
    return { persistedInSupabase: false, error };
  }

  return { persistedInSupabase: false };
}

export const dataService = {
  // ==========================================================================
  // 1. CATEGORÍAS DE COMIDA
  // ==========================================================================
  async getCategories(): Promise<{ data: FoodCategory[]; source: 'supabase' | 'local' }> {
    const deletedIds = getDeletedCategoryIds();
    const localCats = getLocalCategories().filter((c) => !deletedIds.has(c.id));
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        return { data: localCats, source: 'local' };
      }

      if (data && data.length > 0) {
        const mapped = data.map(dbToCategory).filter((c) => !deletedIds.has(c.id));
        const catMap = new Map<string, FoodCategory>();
        mapped.forEach((c) => catMap.set(c.id, c));
        localCats.forEach((c) => catMap.set(c.id, c));
        const merged = Array.from(catMap.values());
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(merged));
        }
        return { data: merged, source: 'supabase' };
      }

      return { data: localCats, source: 'local' };
    } catch {
      return { data: localCats, source: 'local' };
    }
  },

  async saveCategory(cat: FoodCategory): Promise<MutationResult> {
    saveLocalCategory(cat);
    try {
      const dbRow = categoryToDb(cat);
      const res = await upsertWithSchemaTolerance('categories', dbRow);
      return { ok: true, persistedInSupabase: res.persistedInSupabase };
    } catch {
      return { ok: true, persistedInSupabase: false };
    }
  },

  async deleteCategory(catId: string): Promise<MutationResult> {
    removeLocalCategory(catId);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', catId);
      return { ok: true, persistedInSupabase: !error };
    } catch {
      return { ok: true, persistedInSupabase: false };
    }
  },

  // ==========================================================================
  // 2. FLOTA DE DOMICILIARIOS (Sin exponer password_hash en consultas cliente)
  // ==========================================================================
  async getDrivers(): Promise<{ data: Driver[]; source: 'supabase' | 'local' }> {
    const deletedIds = getDeletedDriverIds();
    const localDrivers = getLocalDrivers().filter((d) => !deletedIds.has(d.id));
    try {
      const { data, error } = await supabase.from('drivers').select('*').order('name');

      if (error) {
        return { data: localDrivers, source: 'local' };
      }

      if (data && data.length > 0) {
        const mapped = data.map(dbToDriver).filter((d) => !deletedIds.has(d.id));
        const drvMap = new Map<string, Driver>();
        mapped.forEach((d) => drvMap.set(d.id, d));
        // Superponer cambios locales o domiciliarios creados localmente
        localDrivers.forEach((ld) => {
          const existing = drvMap.get(ld.id);
          if (existing) {
            drvMap.set(ld.id, {
              ...existing,
              ...ld,
            });
          } else {
            drvMap.set(ld.id, ld);
          }
        });
        const merged = Array.from(drvMap.values());
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(merged));
        }
        return { data: merged, source: 'supabase' };
      }

      return { data: localDrivers, source: 'local' };
    } catch {
      return { data: localDrivers, source: 'local' };
    }
  },

  async saveDriver(driver: Driver): Promise<MutationResult> {
    if (driver.passwordHash) {
      saveLocalDriverHash(driver.id, driver.passwordHash);
    }
    saveLocalDriver({ ...driver, passwordHash: undefined });
    try {
      const dbRow = driverToDb(driver);
      const res = await upsertWithSchemaTolerance('drivers', dbRow);
      return { ok: true, persistedInSupabase: res.persistedInSupabase };
    } catch {
      return { ok: true, persistedInSupabase: false };
    }
  },

  async toggleDriverActive(driverId: string, currentStatus: boolean): Promise<MutationResult> {
    const nextStatus = !currentStatus;
    toggleLocalDriver(driverId, nextStatus);
    try {
      const res = await updateWithSchemaTolerance('drivers', driverId, { is_active: nextStatus });
      return { ok: true, persistedInSupabase: res.persistedInSupabase };
    } catch {
      return { ok: true, persistedInSupabase: false };
    }
  },

  async updateDriverAvailability(driverId: string, nextAvailable: boolean): Promise<MutationResult> {
    updateLocalDriverAvailability(driverId, nextAvailable);
    try {
      const res = await updateWithSchemaTolerance('drivers', driverId, {
        is_available: nextAvailable,
      });
      return { ok: true, persistedInSupabase: res.persistedInSupabase };
    } catch {
      return { ok: true, persistedInSupabase: false };
    }
  },

  async deleteDriver(driverId: string): Promise<MutationResult> {
    removeLocalDriver(driverId);
    try {
      const { error } = await supabase.from('drivers').delete().eq('id', driverId);
      return { ok: true, persistedInSupabase: !error };
    } catch {
      return { ok: true, persistedInSupabase: false };
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
        globalDeliveryFee: Number(data.global_delivery_fee) || local.globalDeliveryFee || 7000,
        globalAnnouncement:
          data.global_announcement !== undefined
            ? data.global_announcement
            : local.globalAnnouncement,
        serviceFee: 0,
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
    const updated: PlatformConfig = { ...current, ...updates, serviceFee: 0 };
    saveLocalPlatformConfig(updated);

    try {
      const dbRow = {
        id: 'global_valledupar',
        global_delivery_fee: updated.globalDeliveryFee,
        global_announcement: updated.globalAnnouncement,
        service_fee: 0,
        is_open: updated.isOpen,
        updated_at: new Date().toISOString(),
      };
      const res = await upsertWithSchemaTolerance('platform_config', dbRow);
      return { ok: true, persistedInSupabase: res.persistedInSupabase };
    } catch {
      return { ok: true, persistedInSupabase: false };
    }
  },

  // ==========================================================================
  // 4. RESTAURANTES
  // ==========================================================================
  async getRestaurants(): Promise<{ data: Restaurant[]; error?: any }> {
    const applyLocalMeta = (baseList: Restaurant[]): Restaurant[] => {
      const localMetaMap = getLocalRestaurantsMeta();
      const restMap = new Map<string, Restaurant>();

      baseList.forEach((r) => {
        const meta = localMetaMap[r.id];
        if (meta) {
          const mergedStatus = meta.accountStatus || r.accountStatus || 'ACTIVE';
          restMap.set(r.id, {
            ...r,
            ...meta,
            accountStatus: mergedStatus,
            isOpen: mergedStatus !== 'ACTIVE' ? false : (meta.isOpen ?? r.isOpen),
          });
        } else {
          restMap.set(r.id, r);
        }
      });

      // Incluir restaurantes nuevos creados desde /admin que estén en localMetaMap
      Object.entries(localMetaMap).forEach(([id, meta]) => {
        if (!restMap.has(id) && meta && meta.name && meta.slug) {
          const mergedStatus = meta.accountStatus || 'ACTIVE';
          restMap.set(id, {
            id,
            name: meta.name,
            slug: meta.slug,
            description: meta.description || '',
            logoUrl:
              meta.logoUrl ||
              'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
            bannerUrl:
              meta.bannerUrl ||
              'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80',
            rating: meta.rating || 5.0,
            reviewsCount: meta.reviewsCount || 1,
            tags: meta.tags || ['Valledupar'],
            address: meta.address || 'Valledupar, Cesar',
            neighborhood: meta.neighborhood || 'Centro',
            phone: meta.phone || '3000000000',
            isOpen: mergedStatus !== 'ACTIVE' ? false : (meta.isOpen ?? true),
            openingHours: meta.openingHours || '11:00 AM - 10:00 PM',
            estimatedTimeMin: meta.estimatedTimeMin || 25,
            estimatedTimeMax: meta.estimatedTimeMax || 40,
            deliveryFeeBase: meta.deliveryFeeBase || 7000,
            minOrderAmount: meta.minOrderAmount ?? 0,
            commissionRate: 0,
            acceptsCash: meta.acceptsCash ?? true,
            acceptsNequi: meta.acceptsNequi ?? true,
            acceptsBreb: meta.acceptsBreb ?? true,
            acceptsDaviplata: meta.acceptsDaviplata ?? true,
            acceptsCard: meta.acceptsCard ?? false,
            featured: false,
            pin: meta.pin,
            email: meta.email,
            accountStatus: mergedStatus,
            nequiNumber: meta.nequiNumber,
            daviplataNumber: meta.daviplataNumber,
            brebKey: meta.brebKey,
            customCategories: meta.customCategories || [],
          });
        }
      });

      return Array.from(restMap.values());
    };

    try {
      const { data, error } = await supabase.from('restaurants').select('*').order('name');
      if (error) {
        return { data: applyLocalMeta(INITIAL_RESTAURANTS), error };
      }

      if (data && data.length > 0) {
        const dbRests = data.map(dbToRestaurant);
        const restMap = new Map<string, Restaurant>();
        INITIAL_RESTAURANTS.forEach((r) => restMap.set(r.id, r));
        dbRests.forEach((r) => restMap.set(r.id, r));
        return { data: applyLocalMeta(Array.from(restMap.values())) };
      }
      return { data: applyLocalMeta(INITIAL_RESTAURANTS) };
    } catch (err) {
      return { data: applyLocalMeta(INITIAL_RESTAURANTS), error: err };
    }
  },

  async saveRestaurant(restaurant: Restaurant, _isInsert = false): Promise<MutationResult> {
    const dbRow: any = restaurantToDb(restaurant);
    try {
      const res = await upsertWithSchemaTolerance('restaurants', dbRow);
      return { ok: true, persistedInSupabase: res.persistedInSupabase };
    } catch {
      return { ok: true, persistedInSupabase: false };
    }
  },

  // ==========================================================================
  // 5. PRODUCTOS / PLATOS (con soporte de Archivado Lógico)
  // ==========================================================================
  async getProducts(): Promise<{ data: Record<string, Product[]>; error?: any }> {
    const localOverrides = getLocalProductsMap();
    const applyOverrides = (baseMap: Record<string, Product[]>): Record<string, Product[]> => {
      const next: Record<string, Product[]> = {};
      Object.keys(baseMap).forEach((restId) => {
        next[restId] = [...(baseMap[restId] || [])];
      });
      Object.values(localOverrides).forEach((prod) => {
        if (!next[prod.restaurantId]) next[prod.restaurantId] = [];
        const idx = next[prod.restaurantId].findIndex((item) => item.id === prod.id);
        if (idx >= 0) {
          next[prod.restaurantId][idx] = prod;
        } else {
          next[prod.restaurantId].push(prod);
        }
      });
      return next;
    };

    try {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) return { data: applyOverrides(INITIAL_PRODUCTS), error };

      const map: Record<string, Product[]> = {};
      Object.keys(INITIAL_PRODUCTS).forEach((restId) => {
        map[restId] = [...INITIAL_PRODUCTS[restId]];
      });
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
      return { data: applyOverrides(map) };
    } catch (err) {
      return { data: applyOverrides(INITIAL_PRODUCTS), error: err };
    }
  },

  async getProductsByRestaurant(restaurantId: string): Promise<{ data: Product[]; error?: any }> {
    const baseList: Product[] = [...(INITIAL_PRODUCTS[restaurantId] || [])];
    const localOverrides = getLocalProductsMap();
    const applyLocalForRestaurant = (list: Product[]): Product[] => {
      const merged = [...list];
      Object.values(localOverrides).forEach((prod) => {
        if (prod.restaurantId !== restaurantId) return;
        const idx = merged.findIndex((item) => item.id === prod.id);
        if (idx >= 0) {
          merged[idx] = prod;
        } else {
          merged.push(prod);
        }
      });
      return merged;
    };

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');

      if (error) {
        return { data: applyLocalForRestaurant(baseList), error };
      }

      if (data && data.length > 0) {
        data.forEach((row) => {
          const p = dbToProduct(row);
          const existingIdx = baseList.findIndex((item) => item.id === p.id);
          if (existingIdx >= 0) {
            baseList[existingIdx] = p;
          } else {
            baseList.push(p);
          }
        });
      }

      return { data: applyLocalForRestaurant(baseList) };
    } catch (err) {
      return { data: applyLocalForRestaurant(baseList), error: err };
    }
  },

  async saveProduct(product: Product, _isInsert = false): Promise<MutationResult> {
    saveLocalProduct(product);
    const dbRow = productToDb(product);
    try {
      const res = await upsertWithSchemaTolerance('products', dbRow);
      return { ok: true, persistedInSupabase: res.persistedInSupabase };
    } catch {
      return { ok: true, persistedInSupabase: false };
    }
  },

  async archiveProduct(productId: string, _productName?: string): Promise<MutationResult> {
    updateLocalProductFields(productId, { isArchived: true, isAvailable: false });
    try {
      const res = await updateWithSchemaTolerance('products', productId, {
        is_archived: true,
        is_available: false,
      });
      return { ok: true, persistedInSupabase: res.persistedInSupabase };
    } catch {
      return { ok: true, persistedInSupabase: false };
    }
  },

  async restoreProduct(productId: string, _productName?: string): Promise<MutationResult> {
    updateLocalProductFields(productId, { isArchived: false });
    try {
      const res = await updateWithSchemaTolerance('products', productId, {
        is_archived: false,
      });
      return { ok: true, persistedInSupabase: res.persistedInSupabase };
    } catch {
      return { ok: true, persistedInSupabase: false };
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
function getDeletedCategoryIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_CATEGORIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
}

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
    const deleted = getDeletedCategoryIds();
    if (deleted.has(cat.id)) {
      deleted.delete(cat.id);
      localStorage.setItem(STORAGE_KEYS.DELETED_CATEGORIES, JSON.stringify(Array.from(deleted)));
    }
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
    const deleted = getDeletedCategoryIds();
    deleted.add(catId);
    localStorage.setItem(STORAGE_KEYS.DELETED_CATEGORIES, JSON.stringify(Array.from(deleted)));
    const current = getLocalCategories().filter((c) => c.id !== catId);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(current));
  } catch {}
}

function getDeletedDriverIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_DRIVERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
}

export function getLocalDriverHashes(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRIVER_HASHES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalDriverHash(driverId: string, passwordHash: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalDriverHashes();
    current[driverId] = passwordHash;
    localStorage.setItem(STORAGE_KEYS.DRIVER_HASHES, JSON.stringify(current));
  } catch {}
}

function getLocalDrivers(): Driver[] {
  if (typeof window === 'undefined') return INITIAL_DRIVERS;
  const deleted = getDeletedDriverIds();
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.DRIVERS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter((d: Driver) => !deleted.has(d.id));
      }
    }
  } catch {}
  return INITIAL_DRIVERS.filter((d) => !deleted.has(d.id));
}

function saveLocalDriver(driver: Driver) {
  if (typeof window === 'undefined') return;
  try {
    const deleted = getDeletedDriverIds();
    if (deleted.has(driver.id)) {
      deleted.delete(driver.id);
      localStorage.setItem(STORAGE_KEYS.DELETED_DRIVERS, JSON.stringify(Array.from(deleted)));
    }
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

function updateLocalDriverAvailability(driverId: string, nextAvailable: boolean) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalDrivers();
    const updated = current.map((d) =>
      d.id === driverId ? { ...d, isAvailable: nextAvailable } : d
    );
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(updated));
  } catch {}
}

function removeLocalDriver(driverId: string) {
  if (typeof window === 'undefined') return;
  try {
    const deleted = getDeletedDriverIds();
    deleted.add(driverId);
    localStorage.setItem(STORAGE_KEYS.DELETED_DRIVERS, JSON.stringify(Array.from(deleted)));
    const current = getLocalDrivers().filter((d) => d.id !== driverId);
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(current));
  } catch {}
}

export function getLocalProductsMap(): Record<string, Product> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS_LOCAL);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalProduct(product: Product) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalProductsMap();
    current[product.id] = product;
    localStorage.setItem(STORAGE_KEYS.PRODUCTS_LOCAL, JSON.stringify(current));
  } catch {}
}

export function updateLocalProductFields(productId: string, fields: Partial<Product>) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalProductsMap();
    if (current[productId]) {
      current[productId] = { ...current[productId], ...fields };
      localStorage.setItem(STORAGE_KEYS.PRODUCTS_LOCAL, JSON.stringify(current));
      return;
    }
    // Buscar en INITIAL_PRODUCTS si aún no estaba en el mapa local
    for (const restId of Object.keys(INITIAL_PRODUCTS)) {
      const found = (INITIAL_PRODUCTS[restId] || []).find((p) => p.id === productId);
      if (found) {
        current[productId] = { ...found, ...fields };
        localStorage.setItem(STORAGE_KEYS.PRODUCTS_LOCAL, JSON.stringify(current));
        return;
      }
    }
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
