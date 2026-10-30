'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  Plus,
  Minus,
  ShoppingBag,
  Bike,
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Wallet,
  Trash2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';
import { calculateOrderPricing } from '@/lib/pricing';
import { Order, OrderItem, PaymentMethod, Restaurant } from '@/types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CUSTOMER_PROFILE_KEY = 'dondomi_customer_profile_v1';

interface SavedCustomerProfile {
  customerName?: string;
  customerPhone?: string;
  deliveryNeighborhood?: string;
  deliveryStreet?: string;
  deliveryReference?: string;
  orderNotes?: string;
  paymentMethod?: 'EFECTIVO' | 'NEQUI' | 'BRE_B' | 'DAVIPLATA' | 'CARD';
}

function readSavedProfile(): SavedCustomerProfile {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(CUSTOMER_PROFILE_KEY);
    if (saved) {
      return JSON.parse(saved) || {};
    }
  } catch {}
  return {};
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const {
    cart,
    cartRestaurantId,
    cartRestaurantName,
    updateCartQuantity,
    clearCart,
    cartSubtotal,
    restaurants,
    productsByRestaurant,
    addOrder,
    globalDeliveryFee,
  } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'NEQUI' | 'BRE_B' | 'DAVIPLATA' | 'CARD'>(() => {
    const p = readSavedProfile();
    return p.paymentMethod || 'EFECTIVO';
  });
  const [customerName, setCustomerName] = useState<string>(() => readSavedProfile().customerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(() =>
    String(readSavedProfile().customerPhone || '')
      .replace(/\D/g, '')
      .slice(0, 10)
  );
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState<string>(
    () => readSavedProfile().deliveryNeighborhood || ''
  );
  const [deliveryStreet, setDeliveryStreet] = useState<string>(() => readSavedProfile().deliveryStreet || '');
  const [deliveryReference, setDeliveryReference] = useState<string>(
    () => readSavedProfile().deliveryReference || ''
  );
  const [orderNotes, setOrderNotes] = useState<string>(() => readSavedProfile().orderNotes || '');
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [checkoutStage, setCheckoutStage] = useState<'IDLE' | 'SENDING' | 'CONFIRMED'>('IDLE');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);

  // Idempotencia en reintentos de orden (evita duplicar pedidos ante errores de red)
  const [draftOrderId, setDraftOrderId] = useState<string | null>(null);
  const [draftOrderNumber, setDraftOrderNumber] = useState<string | null>(null);

  // Cargar datos completos del cliente desde localStorage al abrir el cajón o montar
  useEffect(() => {
    if (!isOpen) return;
    const parsed = readSavedProfile();
    if (parsed.customerName) setCustomerName((prev) => prev || parsed.customerName || '');
    if (parsed.customerPhone) {
      const clean = String(parsed.customerPhone).replace(/\D/g, '').slice(0, 10);
      setCustomerPhone((prev) => prev || clean);
    }
    if (parsed.deliveryNeighborhood) {
      setDeliveryNeighborhood((prev) => prev || parsed.deliveryNeighborhood || '');
    }
    if (parsed.deliveryStreet) {
      setDeliveryStreet((prev) => prev || parsed.deliveryStreet || '');
    }
    if (parsed.deliveryReference !== undefined) {
      setDeliveryReference((prev) => prev || parsed.deliveryReference || '');
    }
    if (parsed.orderNotes !== undefined) {
      setOrderNotes((prev) => prev || parsed.orderNotes || '');
    }
    if (parsed.paymentMethod) {
      setPaymentMethod(parsed.paymentMethod);
    }
  }, [isOpen]);

  // Guardar automáticamente en localStorage cada cambio que haga el cliente en sus datos
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasAnyData =
      customerName.trim() ||
      customerPhone.trim() ||
      deliveryNeighborhood.trim() ||
      deliveryStreet.trim() ||
      deliveryReference.trim() ||
      orderNotes.trim();

    if (!hasAnyData) return;

    try {
      const existing = readSavedProfile();
      localStorage.setItem(
        CUSTOMER_PROFILE_KEY,
        JSON.stringify({
          ...existing,
          customerName,
          customerPhone: customerPhone.replace(/\D/g, '').slice(0, 10),
          deliveryNeighborhood,
          deliveryStreet,
          deliveryReference,
          orderNotes,
          paymentMethod,
        })
      );
    } catch {}
  }, [
    customerName,
    customerPhone,
    deliveryNeighborhood,
    deliveryStreet,
    deliveryReference,
    orderNotes,
    paymentMethod,
  ]);

  // Reiniciar borrador si el contenido de la canasta cambia
  useEffect(() => {
    setDraftOrderId(null);
    setDraftOrderNumber(null);
  }, [cart.length, cartSubtotal]);

  const currentRestaurant = restaurants.find((r) => r.id === cartRestaurantId);
  const placedOrderRestaurant = placedOrder
    ? restaurants.find(
        (r) => r.id === placedOrder.restaurantId || r.name === placedOrder.restaurantName
      )
    : undefined;

  // Filtrar métodos de pago habilitados por el restaurante actual
  const availablePaymentMethods = useMemo(() => {
    const list: { id: 'EFECTIVO' | 'NEQUI' | 'BRE_B' | 'DAVIPLATA' | 'CARD'; label: string }[] = [];
    if (!currentRestaurant || currentRestaurant.acceptsCash !== false) {
      list.push({ id: 'EFECTIVO', label: 'Efectivo' });
    }
    if (!currentRestaurant || currentRestaurant.acceptsNequi !== false) {
      list.push({ id: 'NEQUI', label: 'Nequi' });
    }
    if (!currentRestaurant || currentRestaurant.acceptsBreb !== false) {
      list.push({ id: 'BRE_B', label: 'Llave Bre-B' });
    }
    if (!currentRestaurant || currentRestaurant.acceptsDaviplata !== false) {
      list.push({ id: 'DAVIPLATA', label: 'Daviplata' });
    }
    if (currentRestaurant?.acceptsCard === true) {
      list.push({ id: 'CARD', label: 'Tarjeta (Wompi)' });
    }
    return list.length > 0 ? list : [{ id: 'EFECTIVO' as const, label: 'Efectivo' }];
  }, [currentRestaurant]);

  // Asegurar que el método seleccionado esté entre los permitidos por el restaurante
  useEffect(() => {
    if (!availablePaymentMethods.some((m) => m.id === paymentMethod)) {
      setPaymentMethod(availablePaymentMethods[0].id);
    }
  }, [availablePaymentMethods, paymentMethod]);

  if (!isOpen) return null;

  const pricing = calculateOrderPricing(cartSubtotal, globalDeliveryFee);
  const deliveryFee = pricing.deliveryFee;
  const grandTotal = pricing.total;
  const minOrderAmount = currentRestaurant?.minOrderAmount || 0;
  const isBelowMinOrder = minOrderAmount > 0 && cartSubtotal < minOrderAmount;

  // Obtener cuenta de transferencia del negocio según el medio elegido
  const getTransferAccountInfo = (method: string, targetRest?: Restaurant) => {
    const rest = targetRest || currentRestaurant || placedOrderRestaurant;
    const fallbackPhone = (rest?.phone || '3004567890').replace(/\D/g, '');
    if (method === 'NEQUI') {
      return {
        label: 'Cuenta Nequi del Restaurante',
        value: rest?.nequiNumber || fallbackPhone,
      };
    }
    if (method === 'DAVIPLATA') {
      return {
        label: 'Daviplata del Restaurante',
        value: rest?.daviplataNumber || fallbackPhone,
      };
    }
    if (method === 'BRE_B') {
      return {
        label: 'Llave Bre-B del Restaurante',
        value: rest?.brebKey || fallbackPhone,
      };
    }
    return null;
  };

  const activeTransferInfo = getTransferAccountInfo(paymentMethod, currentRestaurant);

  const handleCopyAccount = (val: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(val).catch(() => {});
    }
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  // Generador de mensaje de WhatsApp con formato para Colombia
  const generateWhatsAppUrl = (order: Order) => {
    const targetRest =
      restaurants.find((r) => r.id === order.restaurantId || r.name === order.restaurantName) ||
      currentRestaurant;
    const rawPhone = targetRest?.phone || '3004567890';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;

    const itemsSummary = order.items
      .map((it) => {
        let text = `• *${it.quantity}x* ${it.productName} (${formatCOP(it.subtotal)})`;
        if (it.selectedOptions && it.selectedOptions.length > 0) {
          text += `\n  _Opciones: ${it.selectedOptions.map((o) => `${o.itemName}`).join(', ')}_`;
        }
        if (it.notes) {
          text += `\n  _Nota: ${it.notes}_`;
        }
        return text;
      })
      .join('\n');

    const transferNote =
      order.paymentMethod !== 'EFECTIVO'
        ? `\n_Adjunto comprobante de transferencia (${order.paymentMethod})._`
        : '';

    const message = `*¡Hola ${targetRest?.name || order.restaurantName || 'DonDomi'}! Acabo de hacer un pedido por la plataforma:*

*Orden:* #${order.orderNumber}
*Cliente:* ${order.customerName}
*Teléfono:* ${order.customerPhone}
*Dirección:* ${order.deliveryAddress.neighborhood}, ${order.deliveryAddress.street}
${order.deliveryAddress.reference ? `*Referencia:* ${order.deliveryAddress.reference}\n` : ''}
*Platos:*
${itemsSummary}

*Subtotal:* ${formatCOP(order.subtotal)}
*Domicilio:* ${formatCOP(order.deliveryFee)}
*Total a pagar:* *${formatCOP(order.total)}*
*Método de Pago:* ${order.paymentMethod}${transferNote}
${order.customerNotes ? `\n*Observaciones:* ${order.customerNotes}` : ''}

_¡Muchas gracias! Quedo atento a la confirmación de la cocina._`;

    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    const cleanPhone = customerPhone.replace(/\D/g, '');

    if (!customerName.trim() || !customerPhone.trim() || !deliveryNeighborhood.trim() || !deliveryStreet.trim()) {
      setCheckoutError('Por favor completa tu nombre, celular, barrio y dirección exacta para la entrega.');
      return;
    }

    if (cleanPhone.length !== 10) {
      setCheckoutError('El número de celular o WhatsApp debe tener exactamente 10 dígitos (Ej: 300 123 4567).');
      return;
    }

    if (
      currentRestaurant &&
      (currentRestaurant.isOpen === false ||
        currentRestaurant.accountStatus === 'SUSPENDED' ||
        currentRestaurant.accountStatus === 'ARCHIVED')
    ) {
      setCheckoutError('El restaurante se encuentra cerrado en este momento y no puede recibir pedidos.');
      return;
    }

    if (isBelowMinOrder) {
      setCheckoutError(
        `El pedido mínimo en ${currentRestaurant?.name || 'este restaurante'} es de ${formatCOP(
          minOrderAmount
        )} (en platos). Te faltan ${formatCOP(minOrderAmount - cartSubtotal)}.`
      );
      return;
    }

    // Verificar si algún producto de la canasta está marcado como agotado
    const restaurantProducts = cartRestaurantId ? productsByRestaurant[cartRestaurantId] || [] : [];
    for (const item of cart) {
      const match = restaurantProducts.find((p) => p.id === item.product.id);
      if (match && match.isAvailable === false) {
        setCheckoutError(`El producto "${item.product.name}" se agotó en cocina. Elimínalo de tu canasta antes de continuar.`);
        return;
      }
    }

    // Guardar perfil completo de entrega del cliente en localStorage para próximas compras
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          CUSTOMER_PROFILE_KEY,
          JSON.stringify({
            customerName: customerName.trim(),
            customerPhone: cleanPhone,
            deliveryNeighborhood: deliveryNeighborhood.trim(),
            deliveryStreet: deliveryStreet.trim(),
            deliveryReference: deliveryReference.trim(),
            orderNotes: orderNotes.trim(),
            paymentMethod,
          })
        );
      } catch {}
    }

    // Idempotencia: Si ya teníamos un borrador generado por un reintento fallido, lo reutilizamos
    const orderNumber = draftOrderNumber || `DD-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = draftOrderId || `ord-${Date.now()}`;

    if (!draftOrderId) {
      setDraftOrderId(orderId);
      setDraftOrderNumber(orderNumber);
    }

    const orderItems: OrderItem[] = cart.map((item, idx) => ({
      id: `item-${orderId}-${idx}-${item.product.id}`,
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.product.price,
      selectedOptions: item.selectedOptions,
      notes: item.notes,
      subtotal: item.itemTotal,
    }));

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      customerId: cleanPhone,
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      restaurantId: cartRestaurantId || 'rest-1',
      restaurantName: cartRestaurantName || 'Restaurante',
      status: 'PENDING',
      items: orderItems,
      subtotal: cartSubtotal,
      deliveryFee,
      serviceFee: 0,
      total: grandTotal,
      paymentMethod: paymentMethod as PaymentMethod,
      paymentStatus: 'PENDING',
      deliveryAddress: {
        id: `addr-${Date.now()}`,
        label: 'Entrega',
        street: deliveryStreet.trim(),
        neighborhood: deliveryNeighborhood.trim(),
        city: 'Valledupar',
        reference: deliveryReference.trim() || undefined,
      },
      customerNotes: orderNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      estimatedDeliveryTime: currentRestaurant
        ? `${currentRestaurant.estimatedTimeMin}–${currentRestaurant.estimatedTimeMax} min`
        : '30–45 min',
    };

    const whatsappUrl = generateWhatsAppUrl(newOrder);

    setIsSubmitting(true);
    setCheckoutStage('SENDING');

    try {
      const minAnimationTimer = new Promise((resolve) => setTimeout(resolve, 900));
      await Promise.all([addOrder(newOrder), minAnimationTimer]);

      // CRÍTICO: Vaciar la canasta inmediatamente tras confirmar la orden en base de datos
      // para impedir cualquier envío duplicado o que la canasta permanezca activa
      clearCart();
      setDraftOrderId(null);
      setDraftOrderNumber(null);

      if (typeof window !== 'undefined') {
        let activeOrders: string[] = [];
        try {
          const stored = localStorage.getItem('dondomi_active_orders');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) activeOrders = parsed;
          }
        } catch {}

        if (!activeOrders.includes(newOrder.orderNumber)) {
          activeOrders.unshift(newOrder.orderNumber);
        }
        localStorage.setItem('dondomi_active_orders', JSON.stringify(activeOrders));
        localStorage.setItem('dondomi_active_order', newOrder.orderNumber);
        localStorage.setItem('dondomi_active_order_time', Date.now().toString());
      }

      setPlacedOrder(newOrder);
      setCheckoutStage('CONFIRMED');
      await new Promise((resolve) => setTimeout(resolve, 600));
      setCheckoutStage('IDLE');

      // Redirigir automáticamente al cliente a WhatsApp después de hacer el pedido
      if (typeof window !== 'undefined') {
        window.location.href = whatsappUrl;
      }
    } catch (err: any) {
      setCheckoutStage('IDLE');
      console.error('Error durante el checkout:', err);
      setCheckoutError(err?.message || 'Hubo un error registrando tu pedido. Por favor verifica tu conexión y vuelve a intentar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const placedTransferInfo = placedOrder
    ? getTransferAccountInfo(placedOrder.paymentMethod, placedOrderRestaurant)
    : null;

  const handleCloseDrawer = () => {
    setPlacedOrder(null);
    setCheckoutError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Tu Pedido</h3>
              <p className="text-xs text-slate-500 line-clamp-1">
                {cartRestaurantName || placedOrder?.restaurantName || 'DonDomi'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseDrawer}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {checkoutStage === 'SENDING' ? (
          <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-6 flex-1 min-h-[380px] animate-in fade-in">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping" />
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-orange-600 to-red-500 text-white flex items-center justify-center shadow-xl shadow-orange-500/30">
                <Bike className="w-10 h-10 animate-bounce" />
              </div>
            </div>
            <div className="space-y-2 max-w-xs mx-auto">
              <span className="text-[11px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                Transmitiendo Pedido
              </span>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                Enviando tu pedido a la cocina...
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Conectando en tiempo real con <strong>{cartRestaurantName || placedOrder?.restaurantName || 'el restaurante'}</strong> en Valledupar. Por favor no cierres la pantalla.
              </p>
            </div>
            <div className="w-48 bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-orange-500 via-red-500 to-amber-500 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        ) : checkoutStage === 'CONFIRMED' ? (
          <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-5 flex-1 min-h-[380px] animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-1.5 max-w-xs mx-auto">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                ¡Recibido con Éxito!
              </span>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                ¡Pedido confirmado! Abriendo WhatsApp...
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tu canasta fue procesada y estamos redirigiéndote al WhatsApp del restaurante.
              </p>
            </div>
          </div>
        ) : placedOrder ? (
          <div className="p-6 text-center space-y-4 overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full">
                Pedido #{placedOrder.orderNumber}
              </span>
              <h4 className="text-xl font-black text-slate-900 mt-1">¡Pedido Registrado con Éxito!</h4>
              <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                El restaurante <strong>{placedOrder.restaurantName}</strong> ya tiene tu orden registrada en su pantalla.
              </p>
            </div>

            {placedTransferInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-left space-y-2 text-xs text-blue-950">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                    {placedTransferInfo.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyAccount(placedTransferInfo.value)}
                    className="bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    {copiedAccount ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedAccount ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <p className="text-sm font-black font-mono text-slate-900">{placedTransferInfo.value}</p>
                <p className="text-[11px] text-blue-800">
                  Realiza la transferencia por <strong>{formatCOP(placedOrder.total)}</strong> a la cuenta del restaurante y envía el comprobante por WhatsApp.
                </p>
              </div>
            )}

            <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Total a pagar:</span>
                <span className="text-base text-orange-600 font-black">{formatCOP(placedOrder.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Forma de pago:</span>
                <span className="font-bold text-slate-900">{placedOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>Entregar en:</span>
                <span className="font-medium text-slate-800 text-right">
                  {placedOrder.deliveryAddress.neighborhood}, {placedOrder.deliveryAddress.street}
                </span>
              </div>
            </div>

            <Link
              href={`/order/${placedOrder.orderNumber}`}
              onClick={handleCloseDrawer}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 text-sm transition"
            >
              <span>🛵 Rastrear mi Pedido en Tiempo Real</span>
            </Link>

            <a
              href={generateWhatsAppUrl(placedOrder)}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>
                {placedOrder.paymentMethod === 'EFECTIVO'
                  ? 'Abrir WhatsApp del Restaurante nuevamente'
                  : 'Enviar Comprobante de Pago por WhatsApp'}
              </span>
            </a>

            <button
              type="button"
              onClick={handleCloseDrawer}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-2xl text-xs transition cursor-pointer"
            >
              Cerrar y volver
            </button>
          </div>
        ) : cart.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700">Tu canasta está vacía</p>
            <p className="text-xs text-slate-400">Agrega platos desde el menú del restaurante.</p>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4 overflow-y-auto space-y-4 flex-1 divide-y divide-slate-100">
              {/* Platos seleccionados */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Platos seleccionados
                    </span>
                    {minOrderAmount > 0 && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isBelowMinOrder
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        Mínimo: {formatCOP(minOrderAmount)}
                      </span>
                    )}
                  </div>

                  {/* Botón para eliminar la canasta completa */}
                  <button
                    type="button"
                    onClick={() => {
                      clearCart();
                      setDraftOrderId(null);
                      setDraftOrderNumber(null);
                      setCheckoutError(null);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 px-2.5 py-1 rounded-xl transition cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vaciar canasta</span>
                  </button>
                </div>

                {cart.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-bold text-slate-900 truncate">
                        {item.product.name}
                      </h5>
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {item.selectedOptions.map((o) => o.itemName).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[10px] text-amber-600 italic">Nota: {item.notes}</p>
                      )}
                      <span className="text-xs font-black text-orange-600 mt-0.5 block">
                        {formatCOP(item.itemTotal)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white rounded-xl p-1 border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Datos de entrega */}
              <div className="pt-4 space-y-3">
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                  Datos de Entrega
                </span>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nombre de quien recibe *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Carlos Gutiérrez"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        Teléfono celular / WhatsApp <span className="text-red-500">*</span>
                      </label>
                      <span className={`text-[10px] font-bold ${customerPhone.length === 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {customerPhone.length}/10 dígitos
                      </span>
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="Ej: 3001234567"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Barrio en Valledupar *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Novalito, La Nevada, Garupal, Los Cortijos..."
                      value={deliveryNeighborhood}
                      onChange={(e) => setDeliveryNeighborhood(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Dirección exacta (Calle / Carrera / Casa / Apto) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Calle 8 # 6-30, Mz 4 Casa 12"
                      value={deliveryStreet}
                      onChange={(e) => setDeliveryStreet(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Punto de referencia (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Casa blanca de rejas negras frente al parque"
                      value={deliveryReference}
                      onChange={(e) => setDeliveryReference(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Observaciones para el pedido (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Traer cambio de $50.000, timbrar en el segundo piso"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Selector de método de pago filtrado según lo que acepta el restaurante */}
              <div className="pt-4 space-y-2.5">
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                  Forma de pago en {currentRestaurant?.name || 'el restaurante'}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {availablePaymentMethods.map((method) => (
                    <button
                      type="button"
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                        paymentMethod === method.id
                          ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-2xs'
                          : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>

                {/* Cuadro con datos de transferencia directa a la cuenta del restaurante */}
                {activeTransferInfo && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 space-y-1.5 text-xs text-blue-950 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1">
                        <Wallet className="w-3.5 h-3.5" />
                        <span>{activeTransferInfo.label}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyAccount(activeTransferInfo.value)}
                        className="bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        {copiedAccount ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedAccount ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                    <p className="text-sm font-black font-mono text-slate-900">{activeTransferInfo.value}</p>
                    <p className="text-[11px] text-blue-800 leading-snug">
                      El pago por <strong>{formatCOP(grandTotal)}</strong> se transfiere directamente a la cuenta de <strong>{currentRestaurant?.name}</strong>. Al confirmar tu orden podrás enviar el comprobante por WhatsApp.
                    </p>
                  </div>
                )}
              </div>

              {/* Resumen de costos */}
              <div className="pt-4 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal platos:</span>
                  <span>{formatCOP(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <Bike className="w-3.5 h-3.5 text-orange-600" />
                    Domicilio fijo:
                  </span>
                  <span className="font-semibold text-slate-800">{formatCOP(deliveryFee)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                  <span>Total a pagar:</span>
                  <span className="text-orange-600 text-base">{formatCOP(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Bottom Checkout Button & Error Banner */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
              {isBelowMinOrder && !checkoutError && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 text-xs text-amber-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    Pedido mínimo: <strong>{formatCOP(minOrderAmount)}</strong> (te faltan{' '}
                    <strong>{formatCOP(minOrderAmount - cartSubtotal)}</strong> en platos).
                  </span>
                </div>
              )}

              {checkoutError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-red-800 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold">No se pudo procesar el pedido</p>
                    <p className="text-[11px] text-red-700 mt-0.5">{checkoutError}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  isBelowMinOrder ||
                  (currentRestaurant &&
                    (currentRestaurant.isOpen === false ||
                      currentRestaurant.accountStatus === 'SUSPENDED' ||
                      currentRestaurant.accountStatus === 'ARCHIVED'))
                }
                className={`w-full text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-lg flex items-center justify-between transition ${
                  isSubmitting ||
                  isBelowMinOrder ||
                  (currentRestaurant &&
                    (currentRestaurant.isOpen === false ||
                      currentRestaurant.accountStatus === 'SUSPENDED' ||
                      currentRestaurant.accountStatus === 'ARCHIVED'))
                    ? 'bg-slate-400 cursor-not-allowed opacity-80'
                    : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-orange-500/25 active:scale-[0.98] cursor-pointer'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2 w-full py-0.5">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Conectando con cocina...</span>
                  </div>
                ) : (
                  <>
                    <span>Confirmar Pedido</span>
                    <div className="flex items-center gap-1">
                      <span>{formatCOP(grandTotal)}</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
