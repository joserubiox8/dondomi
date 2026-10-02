'use client';

import React from 'react';
import { FOOD_CATEGORIES } from '@/data/mockData';
import { useApp } from '@/context/AppContext';

export default function CategoryChips() {
  const { selectedCategorySlug, setSelectedCategorySlug } = useApp();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">¿Qué se te antoja hoy?</h2>
        <span className="text-xs font-semibold text-orange-600">Valledupar</span>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
        {/* "Todos" button */}
        <button
          onClick={() => setSelectedCategorySlug(null)}
          className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-2xl transition group ${
            selectedCategorySlug === null
              ? 'scale-105'
              : 'opacity-85 hover:opacity-100'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition shadow-xs ${
              selectedCategorySlug === null
                ? 'bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-orange-500/25 ring-2 ring-orange-500 ring-offset-2'
                : 'bg-white border border-slate-200/90 group-hover:border-slate-300'
            }`}
          >
            🍽️
          </div>
          <span
            className={`text-xs text-center font-medium max-w-[70px] truncate ${
              selectedCategorySlug === null ? 'text-orange-600 font-bold' : 'text-slate-700'
            }`}
          >
            Todos
          </span>
        </button>

        {/* Categories list */}
        {FOOD_CATEGORIES.map((cat) => {
          const isSelected = selectedCategorySlug === cat.slug;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategorySlug(isSelected ? null : cat.slug)}
              className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-2xl transition group relative ${
                isSelected ? 'scale-105' : 'opacity-85 hover:opacity-100'
              }`}
            >
              {cat.badge && (
                <span className="absolute -top-0.5 right-1 z-10 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                  {cat.badge}
                </span>
              )}
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition shadow-xs ${
                  isSelected
                    ? 'bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-orange-500/25 ring-2 ring-orange-500 ring-offset-2'
                    : 'bg-white border border-slate-200/90 group-hover:border-slate-300'
                }`}
              >
                {cat.icon}
              </div>
              <span
                className={`text-xs text-center font-medium max-w-[75px] truncate ${
                  isSelected ? 'text-orange-600 font-bold' : 'text-slate-700'
                }`}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
