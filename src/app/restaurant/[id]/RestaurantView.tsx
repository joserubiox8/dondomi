'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Star,
  Clock,
  Bike,
  MapPin,
  Plus,
  Phone,
  Info,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { RESTAURANTS, PRODUCTS_BY_RESTAURANT } from '@/data/mockData';
import { Product } from '@/types';
import { useApp } from '@/context/AppContext';
import { calculateDeliveryEstimate } from '@/lib/delivery';
import { formatCOP } from '@/lib/utils';
import ProductModal from '@/components/restaurant/ProductModal';

interface RestaurantViewProps {
  restaurantId: string;
}

export default function RestaurantView({ restaurantId }: RestaurantViewProps) {
  const { currentNeighborhood, restaurants, productsByRestaurant } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);

  // Buscar restaurante en el estado dinámico
  const restaurant = restaurants.find((r) => r.id === restaurantId);

  // Obtener productos de este restaurante (100% textuales con adiciones)
  const products = productsByRestaurant[restaurantId] || [];

  // Calcular categorías únicas disponibles en el menú
  const menuCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => cats.add(p.categoryName));
    return ['TODOS', ...Array.from(cats)];
  }, [products]);

  // Filtrar productos por categoría
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'TODOS') return products;
    return products.filter((p) => p.categoryName === selectedCategory);
  }, [products, selectedCategory]);

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-slate-800">Restaurante no encontrado</h2>
        <p className="text-sm text-slate-500 mt-1">El restaurante que buscas no está disponible en DonDomi.</p>
        <Link
          href="/"
          className="mt-4 bg-orange-600 text-white font-bold px-6 py-2.5 rounded-2xl shadow-md text-sm"
        >
          Volver al Inicio
        </Link>
      </div>
    );
  }

  // Cálculo dinámico de entrega para Valledupar
  const deliveryInfo = calculateDeliveryEstimate(
    restaurant.neighborhood,
    currentNeighborhood,
    restaurant.deliveryFeeBase,
    restaurant.estimatedTimeMin,
    restaurant.estimatedTimeMax
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Top Floating Back Bar */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-center truncate px-2">
          <h1 className="text-sm font-black text-slate-900 truncate">{restaurant.name}</h1>
          <p className="text-[10px] text-slate-500 truncate">Valledupar, Cesar</p>
        </div>
        <div className="w-10 flex justify-end">
          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-200">
            ★ {restaurant.rating.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-3 space-y-5">
        {/* Restaurant Banner & Profile Card */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs">
          {/* Banner Hero */}
          <div className="relative h-48 sm:h-60 w-full bg-slate-100">
            <Image
              src={restaurant.bannerUrl}
              alt={restaurant.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            <div className="absolute top-3 left-3">
              {restaurant.isOpen ? (
                <span className="bg-emerald-500 text-white text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  Abierto ahora
                </span>
              ) : (
                <span className="bg-slate-900/90 text-slate-300 text-xs font-bold uppercase px-3 py-1 rounded-full backdrop-blur-xs">
                  Cerrado · Abre mañana
                </span>
              )}
            </div>

            {/* Restaurant Logo overlay */}
            <div className="absolute bottom-3 left-4 flex items-end gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white p-1 shadow-lg relative overflow-hidden border-2 border-white flex-shrink-0">
                <Image
                  src={restaurant.logoUrl}
                  alt={`${restaurant.name} logo`}
                  fill
                  sizes="64px"
                  className="object-cover rounded-xl"
                />
              </div>
              <div className="text-white pb-1">
                <h2 className="text-xl sm:text-2xl font-black drop-shadow-md">
                  {restaurant.name}
                </h2>
                <p className="text-xs text-slate-200 drop-shadow-xs">
                  {restaurant.tags.join(' · ')}
                </p>
              </div>
            </div>
          </div>

          {/* Details & Delivery Matrix info */}
          <div className="p-4 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              {restaurant.description}
            </p>

            {/* Delivery highlights */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Tiempo estimado
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-orange-600" />
                  {deliveryInfo.timeMin}–{deliveryInfo.timeMax} min
                </span>
              </div>

              <div className="border-x border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Domicilio a {currentNeighborhood}
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-orange-600 flex items-center justify-center gap-1 mt-0.5">
                  <Bike className="w-3.5 h-3.5 text-orange-600" />
                  {formatCOP(deliveryInfo.fee)}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Pedido Mínimo
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 mt-0.5 block">
                  {formatCOP(restaurant.minOrderAmount)}
                </span>
              </div>
            </div>

            {/* Address and schedule */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 gap-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {restaurant.address} ({restaurant.neighborhood})
              </span>
              <span>Horario: {restaurant.openingHours}</span>
            </div>
          </div>
        </div>

        {/* Category Pills inside Restaurant */}
        <div className="sticky top-16 z-20 bg-slate-50/95 backdrop-blur-md py-2 -mx-4 px-4 overflow-x-auto no-scrollbar border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            {menuCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {cat === 'TODOS' ? 'Todo el menú' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
              Platos y Combos
            </h3>
            <span className="text-xs text-slate-500 font-semibold">
              {filteredProducts.length} disponibles
            </span>
          </div>

          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => setActiveModalProduct(product)}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:border-orange-300 hover:shadow-xs transition cursor-pointer flex flex-col justify-between gap-3 group active:scale-[0.99]"
              >
                {/* Product Text Details */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-base font-extrabold text-slate-900 group-hover:text-orange-600 transition leading-snug">
                      {product.name}
                    </h4>
                    {product.isPopular && (
                      <span className="flex-shrink-0 bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        🔥 Popular
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {product.description}
                  </p>

                  {product.options && product.options.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {product.options.map((opt) => (
                        <span
                          key={opt.id}
                          className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md"
                        >
                          + {opt.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Row: Price and Add Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-black text-slate-900">
                      {formatCOP(product.price)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatCOP(product.originalPrice)}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveModalProduct(product);
                    }}
                    className="bg-orange-50 hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-200 hover:border-orange-600 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs group-hover:bg-orange-600 group-hover:text-white"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Agregar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal interactivo de producto */}
      <ProductModal
        product={activeModalProduct}
        restaurantName={restaurant.name}
        onClose={() => setActiveModalProduct(null)}
      />
    </div>
  );
}
