'use client';

import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function SearchBar() {
  const {
    searchQuery,
    setSearchQuery,
    onlyOpenFilter,
    setOnlyOpenFilter,
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
            onClick={() => setSearchQuery('')}
            className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
        <button
          onClick={() => setOnlyOpenFilter(!onlyOpenFilter)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition whitespace-nowrap ${
            onlyOpenFilter
              ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${onlyOpenFilter ? 'bg-white' : 'bg-emerald-500'}`}></span>
          <span>Abiertos ahora</span>
        </button>

        {selectedCategorySlug && (
          <button
            onClick={() => setSelectedCategorySlug(null)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 font-medium whitespace-nowrap"
          >
            <span>Filtro activo</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
