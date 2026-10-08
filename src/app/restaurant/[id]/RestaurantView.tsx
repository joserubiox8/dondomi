'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
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
  const products = (productsByRestaurant[restaurantId] && productsByRestaurant[restaurantId].length > 0)
    ? productsByRestaurant[restaurantId]
    : productsByRestaurant['rest-1'] || [];

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

  return (
    <div className="min-h-screen bg-slate-50 pb-52 sm:pb-36">
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
        <div className="flex justify-end">
          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-orange-600" />
            <span className="truncate max-w-[110px]">{restaurant.neighborhood}</span>
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-3 space-y-4">
        {/* Restaurant Compact Banner & Profile Card */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xs">
          {/* Banner Hero Compacto */}
          <div className="relative h-28 sm:h-36 w-full bg-slate-100">
            <Image
              src={restaurant.bannerUrl}
              alt={restaurant.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            <div className="absolute top-2.5 left-3">
              {restaurant.isOpen ? (
                <span className="bg-emerald-500 text-white text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  Abierto
                </span>
              ) : (
                <span className="bg-slate-900/90 text-slate-300 text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                  Cerrado
                </span>
              )}
            </div>

            {/* Restaurant Logo overlay */}
            <div className="absolute bottom-2.5 left-3.5 flex items-end gap-2.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white p-0.5 shadow-md relative overflow-hidden border-2 border-white flex-shrink-0">
                <Image
                  src={restaurant.logoUrl}
                  alt={`${restaurant.name} logo`}
                  fill
                  sizes="56px"
                  className="object-cover rounded-xl"
                />
              </div>
              <div className="text-white pb-0.5">
                <h2 className="text-lg sm:text-xl font-black drop-shadow-md leading-tight">
                  {restaurant.name}
                </h2>
                <p className="text-[11px] text-slate-200 drop-shadow-xs line-clamp-1">
                  {restaurant.tags.join(' · ')}
                </p>
              </div>
            </div>
          </div>

          {/* Details info */}
          <div className="p-3 sm:p-4 space-y-2">
            {restaurant.description && (
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                {restaurant.description}
              </p>
            )}

            {/* Address and schedule */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 gap-1.5">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                {restaurant.address} · {restaurant.neighborhood}
              </span>
              <span className="text-slate-500">Horario: {restaurant.openingHours}</span>
            </div>
          </div>
        </div>

        {/* Category Pills inside Restaurant con animación y alto contraste */}
        <div className="sticky top-16 z-20 bg-slate-50/95 backdrop-blur-md py-2.5 -mx-4 px-4 overflow-x-auto no-scrollbar border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            {menuCategories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition-all duration-200 whitespace-nowrap cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-slate-950 text-white border-2 border-orange-500 shadow-lg shadow-orange-500/25 scale-105 ring-2 ring-orange-500/30'
                      : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse inline-block" />
                  )}
                  <span>{cat === 'TODOS' ? 'Todo el menú' : cat}</span>
                </button>
              );
            })}
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

          <div className="space-y-3.5">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => setActiveModalProduct(product)}
                className="bg-white rounded-3xl p-5 border-2 border-slate-300 shadow-xs hover:border-orange-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between gap-3.5 group active:scale-[0.99]"
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
                          className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200"
                        >
                          + {opt.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Row: Price and Add Button */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-black text-slate-900 group-hover:text-orange-600 transition">
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
                    className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
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
