'use client';

import React, { useMemo, useEffect } from 'react';
import { FOOD_CATEGORIES } from '@/data/mockData';
import { useApp } from '@/context/AppContext';
import RestaurantCard from './RestaurantCard';
import { Store, UtensilsCrossed } from 'lucide-react';

export default function RestaurantList() {
  const { searchQuery, selectedCategorySlug, restaurants, categories } = useApp();

  // Restaurar posición de scroll al regresar desde el menú de un restaurante
  useEffect(() => {
    if (typeof window === 'undefined' || restaurants.length === 0) return;
    try {
      const shouldRestore = sessionStorage.getItem('dondomi_home_restore_scroll');
      const savedY = sessionStorage.getItem('dondomi_home_scroll_y');
      if (shouldRestore === 'true' && savedY !== null) {
        const targetY = Number(savedY);
        if (!isNaN(targetY) && targetY > 0) {
          requestAnimationFrame(() => {
            window.scrollTo({ top: targetY, behavior: 'instant' });
            setTimeout(() => {
              window.scrollTo({ top: targetY, behavior: 'instant' });
            }, 60);
          });
        }
        sessionStorage.removeItem('dondomi_home_restore_scroll');
      }
    } catch {}
  }, [restaurants.length]);

  // Guardar continuamente el scroll mientras el usuario navega en la lista principal
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => {
      try {
        if (window.location.pathname === '/') {
          sessionStorage.setItem('dondomi_home_scroll_y', String(window.scrollY));
        }
      } catch {}
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Encontrar el nombre de la categoría seleccionada (si aplica)
  const activeCategory = useMemo(() => {
    if (!selectedCategorySlug) return null;
    return (
      categories.find((c) => c.slug === selectedCategorySlug) ||
      FOOD_CATEGORIES.find((c) => c.slug === selectedCategorySlug)
    );
  }, [selectedCategorySlug, categories]);

  // Filtrado y ordenamiento inteligente por conveniencia e imparcialidad
  const sortedAndFilteredRestaurants = useMemo(() => {
    const filtered = restaurants.filter((r) => {
      if (r.accountStatus === 'SUSPENDED' || r.accountStatus === 'ARCHIVED') return false;

      // Filtro de categoría mediante tags
      if (selectedCategorySlug && activeCategory) {
        const catKeyword = activeCategory.name.toLowerCase().split(' ')[0];
        const matchesCategory = r.tags.some((tag) =>
          tag.toLowerCase().includes(catKeyword)
        );
        if (!matchesCategory) return false;
      }

      // Filtro de búsqueda textual
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(query);
        const matchesDescription = r.description.toLowerCase().includes(query);
        const matchesTags = r.tags.some((t) => t.toLowerCase().includes(query));
        const matchesNeighborhood = r.neighborhood.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription && !matchesTags && !matchesNeighborhood) {
          return false;
        }
      }

      return true;
    });

    // Ordenamiento natural:
    // 1. Restaurantes abiertos (isOpen: true) van siempre de primero.
    // 2. Restaurantes cerrados (isOpen: false) se desplazan automáticamente al final.
    // 3. Dentro de los abiertos, ordenar por tiempo estimado más rápido y mejor calificación.
    return filtered.sort((a, b) => {
      if (a.isOpen && !b.isOpen) return -1;
      if (!a.isOpen && b.isOpen) return 1;

      if (a.isOpen && b.isOpen) {
        const timeA = a.estimatedTimeMin || 30;
        const timeB = b.estimatedTimeMin || 30;
        if (timeA !== timeB) return timeA - timeB;
        return (b.rating || 5) - (a.rating || 5);
      }

      // Si ambos están cerrados, ordenar alfabéticamente
      return a.name.localeCompare(b.name, 'es');
    });
  }, [searchQuery, selectedCategorySlug, restaurants, activeCategory]);

  return (
    <div className="space-y-6">
      {/* Sección principal: Lista completa con ordenamiento por conveniencia */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
              <Store className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {activeCategory ? `Restaurantes de ${activeCategory.name}` : 'Restaurantes disponibles'}
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {sortedAndFilteredRestaurants.length}{' '}
            {sortedAndFilteredRestaurants.length === 1 ? 'lugar' : 'lugares'}
          </span>
        </div>

        {sortedAndFilteredRestaurants.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 mx-auto flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">No encontramos resultados</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                No hay restaurantes que coincidan con tu búsqueda en este momento. Prueba cambiando los filtros o la categoría.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sortedAndFilteredRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
