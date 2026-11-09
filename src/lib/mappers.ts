import { Restaurant, Product, FoodCategory, Driver } from '@/types';
import { RESTAURANTS } from '@/data/mockData';

const RESTAURANT_META_STORAGE_KEY = 'dondomi_restaurants_meta_v1';

export function getLocalRestaurantsMeta(): Record<string, Partial<Restaurant>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(RESTAURANT_META_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalRestaurantMeta(rest: Restaurant) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalRestaurantsMeta();
    current[rest.id] = {
      id: rest.id,
      name: rest.name,
      slug: rest.slug,
      description: rest.description,
      logoUrl: rest.logoUrl,
      bannerUrl: rest.bannerUrl,
      rating: rest.rating,
      reviewsCount: rest.reviewsCount,
      tags: rest.tags,
      address: rest.address,
      neighborhood: rest.neighborhood,
      phone: rest.phone,
      isOpen: rest.accountStatus && rest.accountStatus !== 'ACTIVE' ? false : rest.isOpen,
      openingHours: rest.openingHours,
      estimatedTimeMin: rest.estimatedTimeMin,
      estimatedTimeMax: rest.estimatedTimeMax,
      deliveryFeeBase: rest.deliveryFeeBase,
      minOrderAmount: rest.minOrderAmount,
      commissionRate: rest.commissionRate ?? 0,
      acceptsCash: rest.acceptsCash,
      acceptsNequi: rest.acceptsNequi,
      acceptsDaviplata: rest.acceptsDaviplata,
      acceptsBreb: rest.acceptsBreb ?? true,
      acceptsCard: rest.acceptsCard ?? false,
      pin: rest.pin,
      email: rest.email,
      accountStatus: rest.accountStatus || 'ACTIVE',
      nequiNumber: rest.nequiNumber,
      daviplataNumber: rest.daviplataNumber,
      brebKey: rest.brebKey,
      customCategories: rest.customCategories,
    };
    localStorage.setItem(RESTAURANT_META_STORAGE_KEY, JSON.stringify(current));
  } catch {}
}

// Convertir de modelo TypeScript (camelCase) a Supabase (snake_case)
export function restaurantToDb(r: Restaurant) {
  saveLocalRestaurantMeta(r);
  const payload: Record<string, any> = {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    logo_url: r.logoUrl,
    banner_url: r.bannerUrl,
    rating: r.rating,
    reviews_count: r.reviewsCount,
    tags: r.tags,
    address: r.address,
    neighborhood: r.neighborhood,
    phone: r.phone,
    is_open: r.accountStatus && r.accountStatus !== 'ACTIVE' ? false : r.isOpen,
    opening_hours: r.openingHours,
    estimated_time_min: r.estimatedTimeMin,
    estimated_time_max: r.estimatedTimeMax,
    delivery_fee_base: r.deliveryFeeBase,
    min_order_amount: r.minOrderAmount,
    commission_rate: r.commissionRate ?? 0,
    accepts_cash: r.acceptsCash,
    accepts_nequi: r.acceptsNequi,
    accepts_daviplata: r.acceptsDaviplata,
    accepts_breb: r.acceptsBreb ?? true,
    accepts_card: r.acceptsCard ?? false,
    featured: false, // Monetización y espacios patrocinados desactivados en esta etapa
    account_status: r.accountStatus || 'ACTIVE',
    email: r.email || null,
    nequi_number: r.nequiNumber || null,
    daviplata_number: r.daviplataNumber || null,
    breb_key: r.brebKey || null,
    custom_categories: Array.isArray(r.customCategories) ? r.customCategories : [],
  };
  if (r.pin !== undefined) {
    payload.pin = r.pin || null;
  }
  return payload;
}

export function dbToRestaurant(data: any): Restaurant {
  const seed = RESTAURANTS.find((ir) => ir.id === data.id);
  const localMeta = getLocalRestaurantsMeta()[data.id] || {};
  const cleanPhone = (localMeta.phone || data.phone || seed?.phone || '3004567890').replace(/\D/g, '');
  const resolvedAccountStatus =
    localMeta.accountStatus || data.account_status || seed?.accountStatus || 'ACTIVE';
  const rawIsOpen = localMeta.isOpen !== undefined ? localMeta.isOpen : (data.is_open ?? true);

  return {
    id: data.id,
    name: localMeta.name ?? data.name,
    slug: localMeta.slug ?? data.slug,
    description: localMeta.description ?? data.description ?? '',
    logoUrl:
      localMeta.logoUrl ||
      data.logo_url ||
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
    bannerUrl:
      localMeta.bannerUrl ||
      data.banner_url ||
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80',
    rating: Number(data.rating) || 5.0,
    reviewsCount: Number(data.reviews_count) || 1,
    tags: localMeta.tags || data.tags || ['Valledupar'],
    address: localMeta.address || data.address || 'Valledupar, Cesar',
    neighborhood: localMeta.neighborhood || data.neighborhood || 'Centro',
    phone: localMeta.phone || data.phone || '300 000 0000',
    isOpen: resolvedAccountStatus !== 'ACTIVE' ? false : rawIsOpen,
    openingHours: localMeta.openingHours || data.opening_hours || '11:00 AM - 10:00 PM',
    estimatedTimeMin: localMeta.estimatedTimeMin ?? data.estimated_time_min ?? 25,
    estimatedTimeMax: localMeta.estimatedTimeMax ?? data.estimated_time_max ?? 40,
    deliveryFeeBase: Number(localMeta.deliveryFeeBase ?? data.delivery_fee_base) || 7000,
    minOrderAmount: Number(localMeta.minOrderAmount ?? data.min_order_amount) ?? 0,
    commissionRate: 0,
    acceptsCash: localMeta.acceptsCash ?? data.accepts_cash ?? true,
    acceptsNequi: localMeta.acceptsNequi ?? data.accepts_nequi ?? true,
    acceptsBreb: localMeta.acceptsBreb ?? data.accepts_breb ?? true,
    acceptsDaviplata: localMeta.acceptsDaviplata ?? data.accepts_daviplata ?? true,
    acceptsCard: localMeta.acceptsCard ?? data.accepts_card ?? false,
    featured: false,
    pin: localMeta.pin || data.pin || seed?.pin || undefined,
    email: localMeta.email || data.email || seed?.email || `${data.slug || data.id}@dondomi.com`,
    accountStatus: resolvedAccountStatus,
    nequiNumber: localMeta.nequiNumber || data.nequi_number || cleanPhone,
    daviplataNumber: localMeta.daviplataNumber || data.daviplata_number || cleanPhone,
    brebKey: localMeta.brebKey || data.breb_key || `@${(data.slug || 'comercio').replace(/[^a-z0-9]/gi, '')}`,
    customCategories: Array.isArray(localMeta.customCategories)
      ? localMeta.customCategories
      : Array.isArray(data.custom_categories)
      ? data.custom_categories
      : [],
  };
}

export function productToDb(p: Product) {
  return {
    id: p.id,
    restaurant_id: p.restaurantId,
    category_name: p.categoryName,
    name: p.name,
    description: p.description,
    price: p.price,
    original_price: p.originalPrice || null,
    image_url: p.imageUrl || null,
    is_available: p.isAvailable,
    is_archived: Boolean(p.isArchived),
    is_popular: p.isPopular || false,
    preparation_time_min: p.preparationTimeMin || 20,
    options: p.options && p.options.length > 0 ? p.options : null,
  };
}

export function dbToProduct(data: any): Product {
  return {
    id: data.id,
    restaurantId: data.restaurant_id,
    categoryName: data.category_name,
    name: data.name,
    description: data.description || '',
    price: Number(data.price),
    originalPrice: data.original_price ? Number(data.original_price) : undefined,
    imageUrl: data.image_url || undefined,
    isAvailable: data.is_available ?? true,
    isArchived: Boolean(data.is_archived),
    isPopular: data.is_popular ?? false,
    preparationTimeMin: data.preparation_time_min || 20,
    options: data.options || undefined,
  };
}

export function categoryToDb(c: FoodCategory) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    badge: c.badge || null,
    image_url: c.imageUrl || null,
  };
}

export function dbToCategory(data: any): FoodCategory {
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    icon: data.icon,
    badge: data.badge || undefined,
    imageUrl: data.image_url || undefined,
  };
}

export function driverToDb(d: Driver) {
  const payload: Record<string, any> = {
    id: d.id,
    user_id: d.userId || null,
    name: d.name,
    phone: d.phone,
    email: d.email,
    plate: d.plate,
    vehicle_type: d.vehicleType || 'MOTO',
    is_active: d.isActive,
    is_available: d.isAvailable ?? true,
    rating: d.rating,
    total_deliveries: d.totalDeliveries,
  };
  if (d.passwordHash) {
    payload.password_hash = d.passwordHash;
  }
  return payload;
}

export function dbToDriver(data: any): Driver {
  return {
    id: data.id,
    userId: data.user_id || undefined,
    name: data.name,
    phone: data.phone,
    email: data.email,
    plate: data.plate,
    vehicleType: (data.vehicle_type as 'MOTO' | 'BICICLETA' | 'AUTO') || 'MOTO',
    isActive: data.is_active ?? true,
    isAvailable: data.is_available ?? true,
    rating: Number(data.rating) || 5.0,
    totalDeliveries: Number(data.total_deliveries) || 0,
    createdAt: data.created_at || new Date().toISOString(),
  };
}
