/**
 * DonDomi - Motor Unificado de Precios, Tarifas y Liquidaciones (Valledupar)
 * 
 * Centraliza la lógica matemática de subtotales, tarifas de entrega, totales,
 * comisiones y cierres de caja para evitar discrepancias entre Header, Tarjeta,
 * Carrito, Órdenes, Restaurante, Domiciliario y Administración.
 */

import { CartItem } from '@/context/AppContext';
import { Order, SelectedOption } from '@/types';

export const DEFAULT_VALLEDUPAR_DELIVERY_FEE = 7000;
export const DEFAULT_SERVICE_FEE = 0; // DonDomi mantiene $0 en cobros ocultos

export interface PricingSummary {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  itemsCount: number;
}

export interface RestaurantSettlementSummary {
  totalOrdersCount: number;
  deliveredOrdersCount: number;
  cancelledOrdersCount: number;
  foodSubtotalTotal: number;
  cashOrdersCount: number;
  cashFoodSubtotal: number;
  cashTotalCollected: number;
  digitalOrdersCount: number;
  digitalFoodSubtotal: number;
  digitalTotalCollected: number;
  nequiSubtotal: number;
  daviplataSubtotal: number;
  brebSubtotal: number;
  cardSubtotal: number;
  dondomiFleetCount: number;
  ownFleetCount: number;
  deliveryFeesTotal: number;
  /** Domicilios ($7.000) que entraron por transferencia a la cuenta del restaurante pero los entregó un domiciliario de DonDomi */
  deliveryFeesOwedToDrivers: number;
  /** Domicilios ($7.000) que pertenecen al restaurante por despachar con su propio domiciliario */
  ownFleetDeliveryEarnings: number;
  commissionRate: number;
  platformCommissionAmount: number;
  /** Saldo neto de comida del restaurante (Subtotal Comida - Comisión DonDomi) */
  netRestaurantFoodEarnings: number;
  /** Total que el restaurante debe transferir a DonDomi/Flota (Comisión DonDomi + Domicilios digitales de flota DonDomi) */
  totalOwedByRestaurant: number;
}

export interface DriverSettlementSummary {
  completedDeliveries: number;
  cashDeliveriesCount: number;
  digitalDeliveriesCount: number;
  /** Ganancia neta del domiciliario por sus carreras ($7.000 c/u) */
  driverDeliveryEarnings: number;
  /** Efectivo total recibido de manos de los clientes (Comida + Domicilio en órdenes en efectivo) */
  totalCashCollectedFromCustomers: number;
  /** Valor de la comida en efectivo que el domiciliario entrega a los restaurantes */
  cashFoodToHandOverToRestaurants: number;
  /** Domicilios de órdenes pagadas por transferencia que el restaurante/plataforma debe pagar al domiciliario */
  digitalDeliveryFeesOwedToDriver: number;
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

/**
 * Calcula la comisión de DonDomi siempre sobre el subtotal de comida (nunca sobre el domicilio).
 */
export function calculateCommission(foodSubtotal: number, commissionRate: number): number {
  const cleanSubtotal = Math.max(0, Number(foodSubtotal) || 0);
  const cleanRate = Math.max(0, Math.min(100, Number(commissionRate) || 0));
  return Math.round((cleanSubtotal * cleanRate) / 100);
}

/**
 * Determina si una orden fue despachada con domiciliario propio del restaurante.
 */
export function isOwnFleetOrder(order: Order): boolean {
  if (order.deliveryFleet === 'PROPIO') return true;
  if (order.driverId === 'propio') return true;
  if (order.driverName && order.driverName.toLowerCase().includes('propio')) return true;
  if (order.customerNotes && /\[Flota:\s*PROPIO\]/i.test(order.customerNotes)) return true;
  return false;
}

/**
 * Determina si el método de pago de una orden es en efectivo.
 */
export function isCashPayment(paymentMethod?: string): boolean {
  return paymentMethod === 'EFECTIVO' || paymentMethod === 'CASH';
}

export type SettlementPeriod = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'ALL';

/**
 * Filtra una lista de órdenes por un rango de tiempo ('TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'ALL').
 */
export function filterOrdersByPeriod(
  orders: Order[],
  period: SettlementPeriod
): Order[] {
  if (period === 'ALL') return orders;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  return orders.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    if (isNaN(t)) return true;

    switch (period) {
      case 'TODAY':
        return t >= startOfToday;
      case 'YESTERDAY':
        return t >= startOfToday - oneDayMs && t < startOfToday;
      case 'WEEK':
        return t >= startOfToday - 6 * oneDayMs;
      case 'MONTH':
        return t >= startOfToday - 29 * oneDayMs;
      default:
        return true;
    }
  });
}

/**
 * Calcula el cierre de caja y liquidación de un restaurante sobre una lista de órdenes (ya filtradas por restaurante y periodo).
 */
export function calculateRestaurantSettlement(
  orders: Order[],
  commissionRate: number = 0
): RestaurantSettlementSummary {
  const delivered = orders.filter((o) => o.status === 'DELIVERED');
  const cancelled = orders.filter((o) => o.status === 'CANCELLED');

  let foodSubtotalTotal = 0;
  let cashOrdersCount = 0;
  let cashFoodSubtotal = 0;
  let cashTotalCollected = 0;
  let digitalOrdersCount = 0;
  let digitalFoodSubtotal = 0;
  let digitalTotalCollected = 0;
  let nequiSubtotal = 0;
  let daviplataSubtotal = 0;
  let brebSubtotal = 0;
  let cardSubtotal = 0;
  let dondomiFleetCount = 0;
  let ownFleetCount = 0;
  let deliveryFeesTotal = 0;
  let deliveryFeesOwedToDrivers = 0;
  let ownFleetDeliveryEarnings = 0;

  for (const ord of delivered) {
    const sub = Number(ord.subtotal) || 0;
    const delFee = Number(ord.deliveryFee) || DEFAULT_VALLEDUPAR_DELIVERY_FEE;
    const tot = Number(ord.total) || sub + delFee;
    const ownFleet = isOwnFleetOrder(ord);
    const cash = isCashPayment(ord.paymentMethod);

    foodSubtotalTotal += sub;
    deliveryFeesTotal += delFee;

    if (ownFleet) {
      ownFleetCount += 1;
      ownFleetDeliveryEarnings += delFee;
    } else {
      dondomiFleetCount += 1;
    }

    if (cash) {
      cashOrdersCount += 1;
      cashFoodSubtotal += sub;
      cashTotalCollected += tot;
    } else {
      digitalOrdersCount += 1;
      digitalFoodSubtotal += sub;
      digitalTotalCollected += tot;

      if (ord.paymentMethod === 'NEQUI') nequiSubtotal += sub;
      else if (ord.paymentMethod === 'DAVIPLATA') daviplataSubtotal += sub;
      else if (ord.paymentMethod === 'BRE_B') brebSubtotal += sub;
      else if (ord.paymentMethod === 'CARD') cardSubtotal += sub;

      // Si el cliente pagó por transferencia a la cuenta del restaurante pero la carrera la hizo un domiciliario DonDomi,
      // el restaurante recibió los $7.000 del domicilio y debe entregárselos al domiciliario / DonDomi.
      if (!ownFleet) {
        deliveryFeesOwedToDrivers += delFee;
      }
    }
  }

  const platformCommissionAmount = calculateCommission(foodSubtotalTotal, commissionRate);
  const netRestaurantFoodEarnings = Math.max(0, foodSubtotalTotal - platformCommissionAmount);
  const totalOwedByRestaurant = platformCommissionAmount + deliveryFeesOwedToDrivers;

  return {
    totalOrdersCount: orders.length,
    deliveredOrdersCount: delivered.length,
    cancelledOrdersCount: cancelled.length,
    foodSubtotalTotal,
    cashOrdersCount,
    cashFoodSubtotal,
    cashTotalCollected,
    digitalOrdersCount,
    digitalFoodSubtotal,
    digitalTotalCollected,
    nequiSubtotal,
    daviplataSubtotal,
    brebSubtotal,
    cardSubtotal,
    dondomiFleetCount,
    ownFleetCount,
    deliveryFeesTotal,
    deliveryFeesOwedToDrivers,
    ownFleetDeliveryEarnings,
    commissionRate,
    platformCommissionAmount,
    netRestaurantFoodEarnings,
    totalOwedByRestaurant,
  };
}

/**
 * Calcula la billetera y cuadre de efectivo de un domiciliario sobre sus órdenes entregadas.
 */
export function calculateDriverSettlement(
  deliveredDriverOrders: Order[],
  defaultFee: number = DEFAULT_VALLEDUPAR_DELIVERY_FEE
): DriverSettlementSummary {
  let cashDeliveriesCount = 0;
  let digitalDeliveriesCount = 0;
  let driverDeliveryEarnings = 0;
  let totalCashCollectedFromCustomers = 0;
  let cashFoodToHandOverToRestaurants = 0;
  let digitalDeliveryFeesOwedToDriver = 0;

  for (const ord of deliveredDriverOrders) {
    if (ord.status !== 'DELIVERED') continue;
    const sub = Number(ord.subtotal) || 0;
    const fee = Number(ord.deliveryFee) || defaultFee;
    const tot = Number(ord.total) || sub + fee;
    const cash = isCashPayment(ord.paymentMethod);

    driverDeliveryEarnings += fee;

    if (cash) {
      cashDeliveriesCount += 1;
      totalCashCollectedFromCustomers += tot;
      cashFoodToHandOverToRestaurants += sub;
    } else {
      digitalDeliveriesCount += 1;
      digitalDeliveryFeesOwedToDriver += fee;
    }
  }

  return {
    completedDeliveries: cashDeliveriesCount + digitalDeliveriesCount,
    cashDeliveriesCount,
    digitalDeliveriesCount,
    driverDeliveryEarnings,
    totalCashCollectedFromCustomers,
    cashFoodToHandOverToRestaurants,
    digitalDeliveryFeesOwedToDriver,
  };
}
