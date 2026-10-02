'use client';

import React, { useState } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';
import { Product, SelectedOption, ProductOptionItem } from '@/types';
import { formatCOP } from '@/lib/utils';
import { useApp } from '@/context/AppContext';

interface ProductModalProps {
  product: Product | null;
  restaurantName: string;
  onClose: () => void;
}

export default function ProductModal({
  product,
  restaurantName,
  onClose,
}: ProductModalProps) {
  const { addToCart } = useApp();
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedRadioOptions, setSelectedRadioOptions] = useState<Record<string, ProductOptionItem>>({});
  const [selectedCheckboxOptions, setSelectedCheckboxOptions] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<string>('');

  if (!product) return null;

  // Calcular precio total incluyendo opciones seleccionadas
  let additionalOptionsPrice = 0;
  Object.values(selectedRadioOptions).forEach((opt) => {
    additionalOptionsPrice += opt.additionalPrice;
  });

  if (product.options) {
    product.options.forEach((group) => {
      if (!group.required) {
        group.items.forEach((item) => {
          if (selectedCheckboxOptions[item.id]) {
            additionalOptionsPrice += item.additionalPrice;
          }
        });
      }
    });
  }

  const unitTotal = product.price + additionalOptionsPrice;
  const grandTotal = unitTotal * quantity;

  const handleAdd = () => {
    // Validar requeridos
    if (product.options) {
      for (const group of product.options) {
        if (group.required && !selectedRadioOptions[group.id]) {
          alert(`Por favor selecciona una opción en "${group.name}"`);
          return;
        }
      }
    }

    const selectedOptionsList: SelectedOption[] = [];

    // Opciones de radio
    Object.entries(selectedRadioOptions).forEach(([groupId, item]) => {
      const group = product.options?.find((g) => g.id === groupId);
      selectedOptionsList.push({
        groupName: group?.name || 'Opción',
        itemName: item.name,
        price: item.additionalPrice,
      });
    });

    // Opciones de checkbox
    if (product.options) {
      product.options.forEach((group) => {
        if (!group.required) {
          group.items.forEach((item) => {
            if (selectedCheckboxOptions[item.id]) {
              selectedOptionsList.push({
                groupName: group.name,
                itemName: item.name,
                price: item.additionalPrice,
              });
            }
          });
        }
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
        </div>

        {/* Scrollable details */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">

          {/* Option Groups (if any) */}
          {product.options && product.options.map((group) => (
            <div key={group.id} className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{group.name}</h4>
                  <p className="text-[11px] text-slate-500">
                    {group.required ? 'Obligatorio · Selecciona 1' : 'Opcional'}
                  </p>
                </div>
                {group.required && (
                  <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Obligatorio
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {group.items.map((item) => {
                  const isChecked = group.required
                    ? selectedRadioOptions[group.id]?.id === item.id
                    : !!selectedCheckboxOptions[item.id];

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (group.required) {
                          setSelectedRadioOptions((prev) => ({
                            ...prev,
                            [group.id]: item,
                          }));
                        } else {
                          setSelectedCheckboxOptions((prev) => ({
                            ...prev,
                            [item.id]: !prev[item.id],
                          }));
                        }
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between ${
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
          ))}

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

        {/* Bottom action bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
          {/* Quantity selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-xs">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-bold text-slate-800">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add button */}
          <button
            onClick={handleAdd}
            className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-3 px-4 rounded-2xl shadow-md shadow-orange-500/25 flex items-center justify-between transition active:scale-[0.98]"
          >
            <span>Agregar al pedido</span>
            <span>{formatCOP(grandTotal)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
