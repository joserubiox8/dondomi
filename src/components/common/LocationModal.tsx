'use client';

import React from 'react';
import { X, MapPin, Check, Navigation } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { VALLEDUPAR_NEIGHBORHOODS } from '@/data/mockData';

export default function LocationModal() {
  const {
    currentNeighborhood,
    setCurrentNeighborhood,
    isLocationModalOpen,
    setIsLocationModalOpen,
  } = useApp();

  if (!isLocationModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300"
        role="dialog"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">¿Dónde te encuentras?</h3>
              <p className="text-xs text-slate-500">Valledupar, Cesar</p>
            </div>
          </div>
          <button
            onClick={() => setIsLocationModalOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info card */}
        <div className="p-4 bg-orange-50/70 border-b border-orange-100/60 flex items-start gap-3">
          <Navigation className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-700 leading-relaxed">
            El costo del domicilio y tiempo estimado se calculan automáticamente según el barrio seleccionado en Valledupar.
          </p>
        </div>

        {/* Neighborhood List */}
        <div className="p-4 overflow-y-auto space-y-1 divide-y divide-slate-100">
          {VALLEDUPAR_NEIGHBORHOODS.map((neighborhood) => {
            const isSelected = currentNeighborhood === neighborhood;
            return (
              <button
                key={neighborhood}
                onClick={() => {
                  setCurrentNeighborhood(neighborhood);
                  setIsLocationModalOpen(false);
                }}
                className={`w-full text-left py-3 px-3 rounded-xl flex items-center justify-between transition ${
                  isSelected
                    ? 'bg-orange-500 text-white font-semibold shadow-xs'
                    : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-orange-400'}`}></span>
                  <span className="text-sm">{neighborhood}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-white" />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            ¿Tu barrio no aparece? Pronto ampliaremos cobertura a toda la comuna.
          </p>
        </div>
      </div>
    </div>
  );
}
