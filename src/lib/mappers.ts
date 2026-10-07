import { Restaurant, Product } from '@/types';
import { RESTAURANTS, PRODUCTS_BY_RESTAURANT } from '@/data/mockData';
import { supabase } from '@/lib/supabase';

// Convertir de modelo TypeScript (camelCase) a Supabase (snake_case)
export function restaurantToDb(r: Restaurant) {
  return {
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
    is_open: r.isOpen,
    opening_hours: r.openingHours,
    estimated_time_min: r.estimatedTimeMin,
    estimated_time_max: r.estimatedTimeMax,
    delivery_fee_base: r.deliveryFeeBase,
    min_order_amount: r.minOrderAmount,
    commission_rate: r.commissionRate,
    accepts_cash: r.acceptsCash,
    accepts_nequi: r.acceptsNequi,
    accepts_daviplata: r.acceptsDaviplata,
    accepts_breb: r.acceptsBreb ?? true,
    accepts_card: r.acceptsCard ?? false,
    featured: r.featured || false,
    pin: r.pin || '1234',
  };
}

export function dbToRestaurant(data: any): Restaurant {
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description || '',
    logoUrl: data.logo_url || '',
    bannerUrl: data.banner_url || '',
    rating: Number(data.rating) || 5.0,
    reviewsCount: Number(data.reviews_count) || 0,
    tags: data.tags || [],
    address: data.address,
    neighborhood: data.neighborhood,
    phone: data.phone,
    isOpen: data.is_open ?? true,
    openingHours: data.opening_hours || '11:00 AM - 10:00 PM',
    estimatedTimeMin: data.estimated_time_min || 25,
    estimatedTimeMax: data.estimated_time_max || 40,
    deliveryFeeBase: Number(data.delivery_fee_base) || 7000,
    minOrderAmount: Number(data.min_order_amount) || 15000,
    commissionRate: Number(data.commission_rate) || 0,
    acceptsCash: data.accepts_cash ?? true,
    acceptsNequi: data.accepts_nequi ?? true,
    acceptsBreb: data.accepts_breb ?? true,
    acceptsDaviplata: data.accepts_daviplata ?? true,
    acceptsCard: data.accepts_card ?? false,
    featured: data.featured ?? false,
    pin: data.pin || '1234',
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
    is_popular: p.isPopular || false,
    preparation_time_min: p.preparationTimeMin || 20,
    options: p.options || null,
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
    isPopular: data.is_popular ?? false,
    preparationTimeMin: data.preparation_time_min || 20,
    options: data.options || undefined,
  };
}
