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
  const { restaurants, productsByRestaurant } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [activeModalProduct, setActiveModalProduct] = useState<Product | null>(null);
  const [scrollY, setScrollY] = useState<number>(0);

  // Efecto de ocultamiento suave de la portada al hacer scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY || 0);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Buscar restaurante en el estado dinámico
  const restaurant = restaurants.find((r) => r.id === restaurantId);

  // Obtener productos propios de este restaurante (sin mezclar con otros negocios)
  const products = useMemo(
    () => productsByRestaurant[restaurantId] || [],
    [productsByRestaurant, restaurantId]
  );

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

  // Progreso de scroll (0 a 1) para ocultar suavemente la portada hacia arriba
  const collapseProgress = Math.min(1, Math.max(0, scrollY / 170));
  const isHeaderSolid = scrollY > 95;

  return (
    <div className="min-h-screen bg-slate-50 pb-52 sm:pb-36">
      {/* Barra Superior Fija: transparente sobre la portada y sólida al ocultar la portada con scroll */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between transition-all duration-300 ${
          isHeaderSolid
            ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs'
            : 'bg-transparent'
        }`}
      >
        <Link
          href="/"
          className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow-sm ${
            isHeaderSolid
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              : 'bg-black/45 hover:bg-black/65 text-white backdrop-blur-md border border-white/20'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Título compacto que aparece suavemente cuando la portada se oculta */}
        <div
          className={`flex items-center gap-2 min-w-0 px-2 transition-all duration-300 ${
            isHeaderSolid
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          <div className="w-7 h-7 rounded-full overflow-hidden relative border border-slate-200 flex-shrink-0 bg-white">
            <Image
              src={restaurant.logoUrl}
              alt={restaurant.name}
              fill
              sizes="28px"
              className="object-cover"
            />
          </div>
          <div className="text-center truncate">
            <h1 className="text-sm font-black text-slate-900 truncate">{restaurant.name}</h1>
          </div>
        </div>

        <div className="flex justify-end">
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition ${
              isHeaderSolid
                ? 'text-slate-700 bg-slate-100 border border-slate-200'
                : 'text-white bg-black/45 backdrop-blur-md border border-white/20'
            }`}
          >
            <MapPin className="w-3 h-3 text-orange-500" />
            <span className="truncate max-w-[110px]">{restaurant.neighborhood}</span>
          </span>
        </div>
      </div>

      {/* Portada Full-Width (ancho a ancho) con logo centrado en la parte inferior y ocultamiento suave al hacer scroll */}
      <div
        style={{
          opacity: 1 - collapseProgress,
          transform: `translateY(-${collapseProgress * 64}px) scale(${1 - collapseProgress * 0.04})`,
          pointerEvents: collapseProgress > 0.85 ? 'none' : 'auto',
        }}
        className="relative w-full transition-transform duration-150 ease-out will-change-transform"
      >
        {/* Imagen de portada de ancho completo */}
        <div className="relative h-48 sm:h-64 w-full bg-slate-900 overflow-hidden">
          <Image
            src={restaurant.bannerUrl}
            alt={restaurant.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/35 to-black/30" />

          {/* Estado Abierto / Cerrado sobre la portada */}
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10">
            {restaurant.isOpen ? (
              <span className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md flex items-center gap-1.5 border border-white/20">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                Abierto ahora
              </span>
            ) : (
              <span className="bg-slate-900/95 text-slate-300 text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full backdrop-blur-xs border border-white/15">
                Cerrado
              </span>
            )}
          </div>
        </div>

        {/* Foto de perfil / Logo centrado en la parte inferior sobre la portada */}
        <div className="relative z-20 -mt-12 flex flex-col items-center px-4 text-center">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white p-1 shadow-xl relative overflow-hidden border-4 border-white flex-shrink-0">
            <Image
              src={restaurant.logoUrl}
              alt={`${restaurant.name} logo`}
              fill
              sizes="112px"
              className="object-cover rounded-2xl"
            />
          </div>

          <h2 className="mt-2.5 text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
            {restaurant.name}
          </h2>

          {restaurant.tags && restaurant.tags.length > 0 && (
            <p className="text-xs font-bold text-orange-600 mt-0.5">
              {restaurant.tags.join(' · ')}
            </p>
          )}

          {restaurant.description && (
            <p className="text-xs text-slate-600 max-w-md mt-1.5 leading-relaxed line-clamp-2">
              {restaurant.description}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200/90 shadow-2xs font-medium text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-orange-600" />
              <span>
                {restaurant.address} · {restaurant.neighborhood}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200/90 shadow-2xs text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{restaurant.openingHours}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {/* Closed Restaurant Alert Banner */}
        {!restaurant.isOpen && (
          <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-4 flex items-center gap-3 text-amber-900 shadow-2xs">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm">Restaurante cerrado temporalmente</h4>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Horario de atención: <strong>{restaurant.openingHours}</strong>. Puedes ver los platos de la carta, pero las compras están deshabilitadas hasta su reapertura.
              </p>
            </div>
          </div>
        )}

        {/* Category Pills inside Restaurant con animación y alto contraste */}
        <div className="sticky top-[60px] z-30 bg-slate-50/95 backdrop-blur-md py-2.5 -mx-4 px-4 overflow-x-auto no-scrollbar border-b border-slate-200/60">
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
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 space-y-2">
                <p className="font-bold text-slate-800 text-sm">
                  Este restaurante está actualizando su carta
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Aún no hay platos publicados en esta categoría. Vuelve en unos minutos o explora otros comercios en Valledupar.
                </p>
              </div>
            ) : (
              filteredProducts.map((product) => {
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
                          className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
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
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal interactivo de producto */}
      <ProductModal
        product={activeModalProduct}
        restaurantName={restaurant.name}
        isRestaurantOpen={restaurant.isOpen}
        onClose={() => setActiveModalProduct(null)}
      />
    </div>
  );
}
