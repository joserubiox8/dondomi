'use client';

import React, { useMemo } from 'react';
import { FOOD_CATEGORIES } from '@/data/mockData';
import { useApp } from '@/context/AppContext';
import RestaurantCard from './RestaurantCard';
import { Store, Flame, UtensilsCrossed } from 'lucide-react';

export default function RestaurantList() {
  const { searchQuery, selectedCategorySlug, onlyOpenFilter, restaurants } = useApp();

  // Encontrar el nombre de la categoría seleccionada (si aplica)
  const activeCategory = useMemo(() => {
    if (!selectedCategorySlug) return null;
    return FOOD_CATEGORIES.find((c) => c.slug === selectedCategorySlug);
  }, [selectedCategorySlug]);

  // Filtrado de restaurantes
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      // Filtro de abiertos
      if (onlyOpenFilter && !r.isOpen) return false;

      // Filtro de categoría
      if (selectedCategorySlug && activeCategory) {
        const matchesCategory = r.tags.some((tag) =>
          tag.toLowerCase().includes(activeCategory.name.toLowerCase().split(' ')[0])
        );
        if (!matchesCategory) return false;
      }

      // Filtro de búsqueda
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
  }, [searchQuery, selectedCategorySlug, onlyOpenFilter, activeCategory]);

  const featuredRestaurants = useMemo(() => {
    return filteredRestaurants.filter((r) => r.featured);
  }, [filteredRestaurants]);

  return (
    <div className="space-y-6">
      {/* Sección: Restaurantes Destacados (solo si no hay búsqueda activa que restrinja mucho) */}
      {!searchQuery && !selectedCategorySlug && featuredRestaurants.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Destacados en Valledupar
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Recomendados</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {featuredRestaurants.map((restaurant) => (
              <RestaurantCard key={`featured-${restaurant.id}`} restaurant={restaurant} />
            ))}
          </div>
        </section>
      )}

      {/* Sección principal: Lista completa */}
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
            {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'lugar' : 'lugares'}
          </span>
        </div>

        {filteredRestaurants.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 mx-auto flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">No encontramos resultados</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                No hay restaurantes que coincidan con tu búsqueda en este momento. Prueba cambiando los filtros o el barrio.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
