'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  MapPin,
  Plus,
  Clock,
  Info,
} from 'lucide-react';
import { Product } from '@/types';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';
import ProductModal from '@/components/restaurant/ProductModal';

interface RestaurantViewProps {
  restaurantId: string;
}

export default function RestaurantView({ restaurantId }: RestaurantViewProps) {
  const { restaurants, productsByRestaurant, fetchProductsForRestaurant, isMenuLoading } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);
  const [scrollY, setScrollY] = useState<number>(0);
  const [hasRequestedMenu, setHasRequestedMenu] = useState<boolean>(false);

  // Efecto de ocultamiento suave de la portada al hacer scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY || 0);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Carga bajo demanda (Lazy Loading) del menú de este restaurante específico
  useEffect(() => {
    let isMounted = true;
    async function loadMenu() {
      try {
        await fetchProductsForRestaurant(restaurantId);
      } finally {
        if (isMounted) setHasRequestedMenu(true);
      }
    }
    loadMenu();
    return () => {
      isMounted = false;
    };
  }, [restaurantId, fetchProductsForRestaurant]);

  // Buscar restaurante en el estado dinámico
  const restaurant = restaurants.find((r) => r.id === restaurantId);

  // Obtener únicamente productos activos (no archivados) propios de este restaurante
  const products = useMemo(
    () => (productsByRestaurant[restaurantId] || []).filter((p) => !p.isArchived),
    [productsByRestaurant, restaurantId]
  );

  const isLoading = isMenuLoading(restaurantId) || (!hasRequestedMenu && products.length === 0);

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
          className="mt-4 bg-orange-600 text-white font-bold px-6 py-2.5 rounded-2xl shadow-md text-sm cursor-pointer"
        >
          Volver al Inicio
        </Link>
      </div>
    );
  }

  // Progreso de scroll (0 a 1) para ocultar suavemente la portada hacia arriba
  const collapseProgress = Math.min(1, Math.max(0, scrollY / 170));
  const isHeaderSolid = scrollY > 95;

  return (
    <div className="min-h-screen bg-slate-50 pb-52 sm:pb-36">
      {/* Sticky Top Bar de navegación */}
      <div
        className={`sticky top-0 z-30 transition-colors duration-200 ${
          isHeaderSolid
            ? 'bg-white/95 backdrop-blur-md shadow-xs border-b border-slate-100'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-md text-slate-700 flex items-center justify-center hover:bg-white transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {isHeaderSolid && (
            <div className="text-center animate-in fade-in truncate max-w-[200px] sm:max-w-xs">
              <h1 className="font-extrabold text-sm text-slate-900 truncate">
                {restaurant.name}
              </h1>
              <span className="text-[10px] text-slate-500 block">
                {restaurant.isOpen ? 'Abierto ahora' : 'Cerrado'}
              </span>
            </div>
          )}

          <div className="w-10 h-10" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Banner de Portada colapsable con el scroll */}
        <div
          style={{
            maxHeight: `${Math.max(0, (1 - collapseProgress) * 220)}px`,
            opacity: 1 - collapseProgress,
            marginBottom: `${Math.max(0, (1 - collapseProgress) * 16)}px`,
          }}
          className="relative w-full rounded-3xl overflow-hidden shadow-lg transition-all duration-75 overflow-hidden"
        >
          <div className="relative w-full h-44 sm:h-52 bg-slate-900">
            <Image
              src={restaurant.bannerUrl || restaurant.logoUrl}
              alt={restaurant.name}
              fill
              className="object-cover brightness-75"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>
        </div>

        {/* Ficha Principal del Restaurante */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 -mt-8 relative z-20 space-y-4">
          <div className="flex items-start gap-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md flex-shrink-0 bg-slate-100">
              <Image
                src={restaurant.logoUrl}
                alt={restaurant.name}
                fill
                className="object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    restaurant.isOpen
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {restaurant.isOpen ? '● Abierto' : '● Cerrado'}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                  ⭐ {restaurant.rating.toFixed(1)} ({restaurant.reviewsCount})
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 truncate">
                {restaurant.name}
              </h1>

              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{restaurant.neighborhood}, Valledupar</span>
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
            {restaurant.description}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500 pt-1">
            <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
              <Clock className="w-3 h-3 text-orange-600" />
              <span>{restaurant.estimatedTimeMin}-{restaurant.estimatedTimeMax} min</span>
            </span>
            <span className="bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
              Tarifa Domicilio: <strong className="text-slate-700">{formatCOP(restaurant.deliveryFeeBase || 7000)}</strong>
            </span>
            {restaurant.minOrderAmount > 0 && (
              <span className="bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                Mínimo: {formatCOP(restaurant.minOrderAmount)}
              </span>
            )}
          </div>
        </div>

        {/* Barra de Filtro de Categorías del Menú */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base">Carta del Restaurante</h3>
            <span className="text-xs text-slate-500 font-semibold">
              {isLoading ? 'Cargando platos...' : `${products.length} platos disponibles`}
            </span>
          </div>

          {menuCategories.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {menuCategories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-orange-600 text-white shadow-xs shadow-orange-500/20'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}

          {/* Grilla de Platos con Skeleton Loader para Carga Bajo Demanda */}
          <div className="pt-2">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="bg-white rounded-3xl p-5 border border-slate-200/80 animate-pulse space-y-3"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="h-5 bg-slate-200 rounded-lg w-2/3" />
                      <div className="h-4 bg-slate-200 rounded-full w-14" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3 bg-slate-100 rounded w-full" />
                      <div className="h-3 bg-slate-100 rounded w-4/5" />
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                      <div className="h-5 bg-slate-200 rounded-lg w-20" />
                      <div className="h-8 bg-slate-200 rounded-xl w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 space-y-2">
                <Info className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700">
                  No hay productos disponibles
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Aún no hay platos publicados en esta categoría. Vuelve en unos minutos o explora otros comercios en Valledupar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.map((product) => {
                  const isAvailable = product.isAvailable !== false;
                  const isRestOperative =
                    restaurant.isOpen &&
                    restaurant.accountStatus !== 'SUSPENDED' &&
                    restaurant.accountStatus !== 'ARCHIVED';
                  const canOrder = isRestOperative && isAvailable;

                  return (
                    <div
                      key={product.id}
                      onClick={() => setActiveModalProduct(product)}
                      className={`bg-white rounded-3xl p-5 border-2 transition cursor-pointer flex flex-col justify-between gap-3.5 group active:scale-[0.99] ${
                        !isAvailable
                          ? 'border-slate-200 opacity-60 grayscale-[35%]'
                          : 'border-slate-300 shadow-xs hover:border-orange-500 hover:shadow-md'
                      }`}
                    >
                      {/* Product Text Details */}
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-base font-extrabold text-slate-900 group-hover:text-orange-600 transition leading-snug">
                            {product.name}
                          </h4>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {!isAvailable && (
                              <span className="bg-slate-200 text-slate-700 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                                Agotado hoy
                              </span>
                            )}
                            {product.isPopular && isAvailable && (
                              <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                🔥 Popular
                              </span>
                            )}
                          </div>
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
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-xs text-slate-400 line-through">
                              {formatCOP(product.originalPrice)}
                            </span>
                          )}
                        </div>

                        {canOrder ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveModalProduct(product);
                            }}
                            className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Agregar</span>
                          </button>
                        ) : !isAvailable ? (
                          <span className="bg-slate-100 text-slate-400 font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-200">
                            Agotado
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-400 font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-200">
                            Cerrado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal interactivo de producto montado con key para forzar reseteo absoluto de estado */}
      <ProductModal
        key={activeModalProduct?.id || 'product-modal-closed'}
        product={activeModalProduct}
        restaurantName={restaurant.name}
        isRestaurantOpen={restaurant.isOpen}
        onClose={() => setActiveModalProduct(null)}
      />
    </div>
  );
}
