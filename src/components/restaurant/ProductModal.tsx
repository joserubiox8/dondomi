'use client';

import React, { useState } from 'react';
import { X, Plus, Minus, Check, AlertCircle } from 'lucide-react';
import { Product, SelectedOption, ProductOptionItem } from '@/types';
import { formatCOP } from '@/lib/utils';
import { useApp } from '@/context/AppContext';

interface ProductModalProps {
  product: Product | null;
  restaurantName: string;
  isRestaurantOpen?: boolean;
  onClose: () => void;
}

export default function ProductModal({
  product,
  restaurantName,
  isRestaurantOpen = true,
  onClose,
}: ProductModalProps) {
  const { addToCart } = useApp();
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, ProductOptionItem[]>>({});
  const [notes, setNotes] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);

  if (!product) return null;

  // Calcular precio total incluyendo todas las opciones seleccionadas
  let additionalOptionsPrice = 0;
  Object.values(selectedByGroup).forEach((items) => {
    items.forEach((opt) => {
      additionalOptionsPrice += opt.additionalPrice;
    });
  });

  const unitTotal = product.price + additionalOptionsPrice;
  const grandTotal = unitTotal * quantity;
  const isAvailable = product.isAvailable !== false;
  const canAdd = isAvailable && isRestaurantOpen;

  const handleToggleOption = (
    groupId: string,
    groupName: string,
    item: ProductOptionItem,
    minSelect: number,
    maxSelect: number
  ) => {
    setModalError(null);
    setSelectedByGroup((prev) => {
      const current = prev[groupId] || [];
      const exists = current.some((i) => i.id === item.id);

      if (maxSelect === 1) {
        if (exists && minSelect === 0) {
          return { ...prev, [groupId]: [] };
        }
        return { ...prev, [groupId]: [item] };
      }

      if (exists) {
        return {
          ...prev,
          [groupId]: current.filter((i) => i.id !== item.id),
        };
      }

      if (current.length >= maxSelect) {
        setModalError(
          `Máximo ${maxSelect} ${maxSelect === 1 ? 'opción permitida' : 'opciones permitidas'} en "${groupName}".`
        );
        return prev;
      }

      return {
        ...prev,
        [groupId]: [...current, item],
      };
    });
  };

  const handleAdd = () => {
    setModalError(null);
    if (!canAdd) {
      setModalError(
        !isAvailable
          ? 'Este plato está agotado por hoy en cocina.'
          : 'El restaurante se encuentra cerrado en este momento.'
      );
      return;
    }

    // Validar mínimos y máximos requeridos por cada grupo
    if (product.options) {
      for (const group of product.options) {
        const minReq = group.required
          ? Math.max(1, group.minSelect || 1)
          : Math.max(0, group.minSelect || 0);
        const selectedList = selectedByGroup[group.id] || [];

        if (selectedList.length < minReq) {
          setModalError(
            minReq === 1
              ? `Por favor selecciona al menos 1 opción en "${group.name}".`
              : `Por favor selecciona al menos ${minReq} opciones en "${group.name}" (seleccionaste ${selectedList.length} de ${minReq}).`
          );
          return;
        }
      }
    }

    const selectedOptionsList: SelectedOption[] = [];

    if (product.options) {
      product.options.forEach((group) => {
        const chosen = selectedByGroup[group.id] || [];
        chosen.forEach((item) => {
          selectedOptionsList.push({
            groupName: group.name,
            itemName: item.name,
            price: item.additionalPrice,
          });
        });
      });
    }

    addToCart(product, restaurantName, quantity, selectedOptionsList, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Clean Text-Only Modal Header */}
        <div className="p-5 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100/70 px-2.5 py-0.5 rounded-full">
              {product.categoryName}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-start justify-between gap-3">
            <h3 className="text-xl font-black text-slate-900 leading-snug">
              {product.name}
            </h3>
            <span className="text-lg font-black text-orange-600 flex-shrink-0">
              {formatCOP(product.price)}
            </span>
          </div>

          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            {product.description}
          </p>

          {!isAvailable && (
            <div className="mt-3 bg-slate-100 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-700 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span>Este plato se encuentra agotado por el día de hoy en cocina.</span>
            </div>
          )}

          {!isRestaurantOpen && isAvailable && (
            <div className="mt-3 bg-amber-50 border border-amber-300 rounded-xl p-2.5 text-xs text-amber-900 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>El restaurante se encuentra cerrado en este momento.</span>
            </div>
          )}
        </div>

        {/* Scrollable details */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">

          {/* Option Groups (if any) */}
          {product.options &&
            product.options.map((group) => {
              const minReq = group.required
                ? Math.max(1, group.minSelect || 1)
                : Math.max(0, group.minSelect || 0);
              const maxAllowed = Math.max(
                minReq,
                group.maxSelect || (group.required ? 1 : group.items.length)
              );
              const selectedList = selectedByGroup[group.id] || [];
              const isGroupRequired = minReq > 0;

              const ruleSubtitle = isGroupRequired
                ? minReq === maxAllowed
                  ? `Obligatorio · Selecciona ${minReq}`
                  : `Obligatorio · Selecciona de ${minReq} a ${maxAllowed}`
                : maxAllowed === 1
                ? 'Opcional · Máximo 1 opción'
                : `Opcional · Hasta ${maxAllowed} opciones`;

              return (
                <div key={group.id} className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{group.name}</h4>
                      <p className="text-[11px] text-slate-500">{ruleSubtitle}</p>
                    </div>
                    {isGroupRequired ? (
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                          selectedList.length >= minReq
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {selectedList.length >= minReq
                          ? `✓ Listo (${selectedList.length}/${maxAllowed})`
                          : `Obligatorio (${selectedList.length}/${minReq})`}
                      </span>
                    ) : (
                      selectedList.length > 0 && (
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                          {selectedList.length}/{maxAllowed}
                        </span>
                      )
                    )}
                  </div>

                  <div className="space-y-2">
                    {group.items.map((item) => {
                      const isChecked = selectedList.some((i) => i.id === item.id);

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            handleToggleOption(group.id, group.name, item, minReq, maxAllowed)
                          }
                          className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                            isChecked
                              ? 'border-orange-500 bg-orange-50/50'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                                isChecked
                                  ? 'border-orange-600 bg-orange-600 text-white'
                                  : 'border-slate-300'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="text-xs font-semibold text-slate-800">
                              {item.name}
                            </span>
                          </div>
                          {item.additionalPrice > 0 ? (
                            <span className="text-xs font-bold text-orange-600">
                              +{formatCOP(item.additionalPrice)}
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">Incluido</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

          {/* Notes textarea */}
          <div className="pt-3 border-t border-slate-100 space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              Instrucciones especiales para la cocina (opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: salsa tártara aparte, sin cebolla, bien tostado..."
              className="w-full text-xs p-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
        </div>

        {/* Mensaje de validación dentro de la app DonDomi */}
        {modalError && (
          <div className="mx-4 my-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="font-bold leading-tight">{modalError}</span>
          </div>
        )}

        {/* Bottom action bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
          {/* Quantity selector */}
          <div className={`flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-xs ${!canAdd ? 'opacity-50 pointer-events-none' : ''}`}>
            <button
              disabled={!canAdd}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition disabled:cursor-not-allowed"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-bold text-slate-800">
              {quantity}
            </span>
            <button
              disabled={!canAdd}
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add button */}
          {canAdd ? (
            <button
              onClick={handleAdd}
              className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-3 px-4 rounded-2xl shadow-md shadow-orange-500/25 flex items-center justify-between transition active:scale-[0.98] cursor-pointer"
            >
              <span>Agregar al pedido</span>
              <span>{formatCOP(grandTotal)}</span>
            </button>
          ) : (
            <button
              disabled
              className="flex-1 bg-slate-200 text-slate-500 font-bold py-3 px-4 rounded-2xl cursor-not-allowed text-center text-xs"
            >
              {!isAvailable ? 'Plato Agotado Hoy' : 'Restaurante Cerrado'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
