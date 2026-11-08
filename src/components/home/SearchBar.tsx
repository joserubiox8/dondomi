'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function SearchBar() {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategorySlug,
    setSelectedCategorySlug,
  } = useApp();

  return (
    <div className="space-y-2.5">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          <Search className="w-5 h-5 text-slate-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Busca pollo, hamburguesas, pizza o restaurante..."
          className="w-full bg-white border border-slate-200/90 rounded-2xl pl-11 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick filter pills: Solo indicador de categoría seleccionada para removerla */}
      {selectedCategorySlug && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategorySlug(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 font-bold whitespace-nowrap cursor-pointer hover:bg-orange-200 transition"
          >
            <span>Filtro de categoría activo</span>
            <X className="w-3.5 h-3.5 text-orange-600" />
          </button>
        </div>
      )}
    </div>
  );
}
