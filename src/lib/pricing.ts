/**
 * DonDomi - Motor Unificado de Precios y Tarifas (Valledupar)
 * 
 * Centraliza la lógica matemática de subtotales, tarifas de entrega y totales
 * para evitar discrepancias de redondeo o cálculo entre Header, Tarjeta, Carrito y Órdenes.
 */

import { CartItem } from '@/context/AppContext';
import { SelectedOption } from '@/types';

export const DEFAULT_VALLEDUPAR_DELIVERY_FEE = 7000;
export const DEFAULT_SERVICE_FEE = 0; // DonDomi mantiene $0 en cobros ocultos

export interface PricingSummary {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  itemsCount: number;
}

/**
 * Calcula el precio total de un ítem individual con sus adiciones seleccionadas.
 */
export function calculateItemTotal(
  basePrice: number,
  quantity: number,
  selectedOptions?: SelectedOption[]
): number {
  const optionsTotal = (selectedOptions || []).reduce((acc, opt) => acc + (Number(opt.price) || 0), 0);
  const unitPriceWithOptions = Number(basePrice) + optionsTotal;
  return Math.max(0, unitPriceWithOptions * Math.max(1, quantity));
}

/**
 * Calcula el resumen de precios para una lista de ítems en canasta o pedido.
 */
export function calculateOrderPricing(
  cartSubtotal: number,
  customDeliveryFee?: number,
  customServiceFee: number = DEFAULT_SERVICE_FEE
): PricingSummary {
  const subtotal = Math.max(0, Number(cartSubtotal) || 0);
  const deliveryFee = typeof customDeliveryFee === 'number' && !isNaN(customDeliveryFee) && customDeliveryFee >= 0
    ? customDeliveryFee
    : DEFAULT_VALLEDUPAR_DELIVERY_FEE;
  const serviceFee = Math.max(0, Number(customServiceFee) || 0);
  const total = subtotal + deliveryFee + serviceFee;

  return {
    subtotal,
    deliveryFee,
    serviceFee,
    total,
    itemsCount: 0,
  };
}

/**
 * Recalcula de forma transparente todos los subtotales de la canasta.
 */
export function summarizeCart(
  items: CartItem[],
  customDeliveryFee?: number
): PricingSummary {
  const itemsCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.itemTotal, 0);
  const pricing = calculateOrderPricing(subtotal, customDeliveryFee);

  return {
    ...pricing,
    itemsCount,
  };
}
