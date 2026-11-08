/**
 * DonDomi - Motor Unificado de Precios, Tarifas y Liquidaciones (Valledupar)
 * 
 * Centraliza la lógica matemática de subtotales, tarifas de entrega, totales,
 * comisiones y cierres de caja para evitar discrepancias entre Header, Tarjeta,
 * Carrito, Órdenes, Restaurante, Domiciliario y Administración.
 */

import { CartItem } from '@/context/AppContext';
import { Order, SelectedOption, LoyaltyTierInfo } from '@/types';

export const DEFAULT_VALLEDUPAR_DELIVERY_FEE = 7000;
export const DEFAULT_SERVICE_FEE = 0; // DonDomi mantiene $0 en cobros ocultos

export interface PricingSummary {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  itemsCount: number;
}

export interface TopSoldProduct {
  name: string;
  quantity: number;
  revenue: number;
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
  // Métricas avanzadas de POS Híbrido y Cierre Inteligente
  averageTicket: number;
  splitPaymentsCount: number;
  posLocalCount: number;
  posLocalSales: number;
  posTakeoutCount: number;
  posTakeoutSales: number;
  deliveryAppCount: number;
  deliveryAppSales: number;
  topProducts: TopSoldProduct[];
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
  // En el POS Híbrido, las ventas completadas comprenden las órdenes 'DELIVERED'
  // más los pedidos locales/mostrador ('pos_local' y 'pos_takeout') ya cobrados y no cancelados
  const delivered = orders.filter((o) => {
    if (o.status === 'CANCELLED') return false;
    if (o.status === 'DELIVERED') return true;
    const isPos = o.orderChannel === 'pos_local' || o.orderChannel === 'pos_takeout';
    return isPos && o.paymentStatus === 'COMPLETED';
  });
  const cancelled = orders.filter((o) => o.status === 'CANCELLED');

  let foodSubtotalTotal = 0;
  let cashOrdersCount = 0;
  let cashFoodSubtotal = 0;
  let cashTotalCollected = 0;
  let digitalOrdersCount = 0;
  let digitalFoodSubtotal = 0;
  let digitalTotalCollected = 0;
  let splitPaymentsCount = 0;
  let nequiSubtotal = 0;
  let daviplataSubtotal = 0;
  let brebSubtotal = 0;
  let cardSubtotal = 0;
  let dondomiFleetCount = 0;
  let ownFleetCount = 0;
  let deliveryFeesTotal = 0;
  let deliveryFeesOwedToDrivers = 0;
  let ownFleetDeliveryEarnings = 0;

  let posLocalCount = 0;
  let posLocalSales = 0;
  let posTakeoutCount = 0;
  let posTakeoutSales = 0;
  let deliveryAppCount = 0;
  let deliveryAppSales = 0;

  const productSalesMap = new Map<string, TopSoldProduct>();

  for (const ord of delivered) {
    const sub = Number(ord.subtotal) || 0;
    const delFee = ord.orderChannel === 'pos_local' || ord.orderChannel === 'pos_takeout'
      ? 0
      : (Number(ord.deliveryFee) || DEFAULT_VALLEDUPAR_DELIVERY_FEE);
    const tot = Number(ord.total) || sub + delFee;
    const ownFleet = isOwnFleetOrder(ord);

    foodSubtotalTotal += sub;
    deliveryFeesTotal += delFee;

    // Desglose por canales de venta
    if (ord.orderChannel === 'pos_local') {
      posLocalCount += 1;
      posLocalSales += sub;
    } else if (ord.orderChannel === 'pos_takeout') {
      posTakeoutCount += 1;
      posTakeoutSales += sub;
    } else {
      deliveryAppCount += 1;
      deliveryAppSales += tot;
      if (ownFleet) {
        ownFleetCount += 1;
        ownFleetDeliveryEarnings += delFee;
      } else {
        dondomiFleetCount += 1;
      }
    }

    // Acumulación de productos para Top vendidos
    if (Array.isArray(ord.items)) {
      for (const item of ord.items) {
        const pName = item.productName || 'Plato';
        const existing = productSalesMap.get(pName) || { name: pName, quantity: 0, revenue: 0 };
        existing.quantity += Number(item.quantity) || 1;
        existing.revenue += Number(item.subtotal) || 0;
        productSalesMap.set(pName, existing);
      }
    }

    // Desglose exacto de Efectivo vs. Digital (con soporte de Pagos Divididos / Mixtos)
    if (ord.isSplitPayment) {
      splitPaymentsCount += 1;
      const cPortion = Number(ord.cashAmount) || 0;
      const tPortion = Number(ord.transferAmount) || 0;

      cashTotalCollected += cPortion;
      digitalTotalCollected += tPortion;

      // Distribución proporcional o directa en comida
      cashFoodSubtotal += Math.min(sub, cPortion);
      digitalFoodSubtotal += Math.max(0, sub - Math.min(sub, cPortion));

      if (ord.transferPlatform === 'Nequi') nequiSubtotal += tPortion;
      else if (ord.transferPlatform === 'Daviplata') daviplataSubtotal += tPortion;
      else if (ord.transferPlatform === 'Bancolombia' || ord.transferPlatform === 'Datáfono') cardSubtotal += tPortion;
    } else if (isCashPayment(ord.paymentMethod)) {
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
      else if (ord.paymentMethod === 'CARD' || ord.paymentMethod === 'TRANSFERENCIA') cardSubtotal += sub;

      // Si el cliente pagó domicilio por transferencia pero la carrera la hizo flota DonDomi
      if (ord.orderChannel === 'delivery_app' && !ownFleet && delFee > 0) {
        deliveryFeesOwedToDrivers += delFee;
      }
    }
  }

  const platformCommissionAmount = calculateCommission(foodSubtotalTotal, commissionRate);
  const netRestaurantFoodEarnings = Math.max(0, foodSubtotalTotal - platformCommissionAmount);
  const totalOwedByRestaurant = platformCommissionAmount + deliveryFeesOwedToDrivers;
  const averageTicket = delivered.length > 0 ? Math.round(foodSubtotalTotal / delivered.length) : 0;

  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

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
    averageTicket,
    splitPaymentsCount,
    posLocalCount,
    posLocalSales,
    posTakeoutCount,
    posTakeoutSales,
    deliveryAppCount,
    deliveryAppSales,
    topProducts,
  };
}

/**
 * Genera el texto perfectamente formateado para compartir el Cierre de Caja por WhatsApp en 1 clic.
 */
export function generateWhatsAppSettlementMessage(
  restaurantName: string,
  settlement: RestaurantSettlementSummary,
  periodLabel: string = 'Hoy'
): string {
  const formatMoney = (n: number) => `$ ${n.toLocaleString('es-CO')} COP`;

  let msg = `📊 *CIERRE DE CAJA — ${restaurantName.toUpperCase()}*\n`;
  msg += `📅 *Período:* ${periodLabel} (${new Date().toLocaleDateString('es-CO')})\n`;
  msg += `---------------------------------\n`;
  msg += `💰 *Ventas Totales:* ${formatMoney(settlement.foodSubtotalTotal)}\n`;
  msg += `🧾 *Total Pedidos:* ${settlement.deliveredOrdersCount}\n`;
  msg += `🎯 *Ticket Promedio:* ${formatMoney(settlement.averageTicket)}\n\n`;

  msg += `💵 *Efectivo en Caja:* ${formatMoney(settlement.cashTotalCollected)}\n`;
  msg += `📲 *Transferencias / Digital:* ${formatMoney(settlement.digitalTotalCollected)}\n`;
  if (settlement.splitPaymentsCount > 0) {
    msg += `⚡ *Pagos Divididos (Mixtos):* ${settlement.splitPaymentsCount} transacciones\n`;
  }
  msg += `\n🛵 *Canales de Venta:*\n`;
  msg += `• 🍽️ En Mesa (POS): ${settlement.posLocalCount} pedidos (${formatMoney(settlement.posLocalSales)})\n`;
  msg += `• 🛍️ Para Llevar (POS): ${settlement.posTakeoutCount} pedidos (${formatMoney(settlement.posTakeoutSales)})\n`;
  msg += `• 🛵 Domicilios App DonDomi: ${settlement.deliveryAppCount} pedidos (${formatMoney(settlement.deliveryAppSales)})\n`;

  if (settlement.topProducts && settlement.topProducts.length > 0) {
    msg += `\n🏆 *Top Platos Más Vendidos:*\n`;
    settlement.topProducts.slice(0, 3).forEach((p, idx) => {
      msg += `${idx + 1}. ${p.name} — ${p.quantity} unds (${formatMoney(p.revenue)})\n`;
    });
  }

  msg += `---------------------------------\n`;
  msg += `🤝 *Comisión DonDomi:* 0% ($ 0 COP)\n`;
  msg += `✨ *Generado por DonDomi POS (Valledupar)*`;

  return encodeURIComponent(msg);
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

/**
 * Genera el mensaje dinámico de WhatsApp para notificar al cliente según el estado actual de su pedido.
 */
export function generateCustomerOrderStatusWhatsAppMessage(
  order: Order,
  restaurantName: string,
  loyalty?: LoyaltyTierInfo | null
): string {
  const custName = (order.customerName || 'Cliente').trim();
  const orderNum = order.orderNumber;
  const totalFmt = `$${(order.total || 0).toLocaleString('es-CO')}`;

  const channelText =
    order.orderChannel === 'pos_local'
      ? `en tu ${order.tableNumber || 'mesa'}`
      : order.orderChannel === 'pos_takeout'
      ? 'para llevar en mostrador'
      : 'a domicilio DonDomi';

  if (order.status === 'PREPARING') {
    return `¡Hola ${custName}! 🍳 En *${restaurantName}* ya estamos preparando tu pedido #${orderNum} (${channelText}). Total: ${totalFmt}. ¡Estará listo muy pronto!`;
  }

  if (order.status === 'READY_FOR_PICKUP') {
    if (order.orderChannel === 'pos_takeout') {
      return `¡Hola ${custName}! 🛍️ Tu pedido #${orderNum} en *${restaurantName}* ya está LISTO para recoger en mostrador. ¡Te esperamos!`;
    }
    if (order.orderChannel === 'pos_local') {
      return `¡Hola ${custName}! 🍽️ Tu pedido #${orderNum} en *${restaurantName}* ya va a tu ${order.tableNumber || 'mesa'}. ¡Buen provecho!`;
    }
    return `¡Hola ${custName}! 🛵 Tu pedido #${orderNum} de *${restaurantName}* ya está listo y asignado al domiciliario (${order.driverName || 'Flota DonDomi'}). Va en camino!`;
  }

  if (order.status === 'ON_THE_WAY') {
    return `¡Hola ${custName}! 🛵 Tu pedido #${orderNum} de *${restaurantName}* ya va en camino con ${order.driverName || 'el repartidor'} hacia ${order.deliveryAddress?.street || 'tu dirección'}.`;
  }

  if (order.status === 'DELIVERED') {
    const ordersCount = loyalty?.orderCount || loyalty?.deliveredOrdersCount || 1;
    const tierName = loyalty?.tier && loyalty.tier !== 'Nuevo' ? loyalty.tier : 'Bronce';
    return `¡Gracias por tu compra en *${restaurantName}*, ${custName}! ❤️ Con este pedido sumas ${ordersCount} compras (Nivel ${tierName}). ¡Buen provecho y esperamos que lo disfrutes!`;
  }

  if (order.status === 'CANCELLED') {
    return `Hola ${custName}, te escribimos de *${restaurantName}*. Lamentamos informarte que tu pedido #${orderNum} no pudo ser atendido: ${order.cancellationReason || 'Sin existencias de ingredientes'}. Disculpa las molestias.`;
  }

  // PENDING / default
  return `¡Hola ${custName}! Te escribimos de *${restaurantName}* sobre tu pedido #${orderNum} (${channelText}). Total: ${totalFmt}. ¡Gracias por preferirnos!`;
}

