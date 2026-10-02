'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Minus,
  ShoppingBag,
  Bike,
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  MapPin,
  User,
  Phone,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';
import { calculateDeliveryEstimate } from '@/lib/delivery';
import { Order, OrderItem } from '@/types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const {
    cart,
    cartRestaurantId,
    cartRestaurantName,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartSubtotal,
    currentNeighborhood,
    restaurants,
    addOrder,
  } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'NEQUI' | 'DAVIPLATA'>('NEQUI');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryStreet, setDeliveryStreet] = useState<string>('');
  const [deliveryReference, setDeliveryReference] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  if (!isOpen) return null;

  const currentRestaurant = restaurants.find((r) => r.id === cartRestaurantId);
  const deliveryInfo = calculateDeliveryEstimate(
    currentRestaurant?.neighborhood || 'Centro Histórico',
    currentNeighborhood,
    currentRestaurant?.deliveryFeeBase || 5000
  );

  const deliveryFee = deliveryInfo.fee;
  const platformFee = 1500;
  const grandTotal = cartSubtotal + deliveryFee + platformFee;

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim() || !deliveryStreet.trim()) {
      alert('Por favor completa tu nombre, teléfono y dirección para la entrega.');
      return;
    }

    const orderNumber = `DD-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderItems: OrderItem[] = cart.map((item) => ({
      id: `item-${Date.now()}-${item.product.id}`,
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.product.price,
      selectedOptions: item.selectedOptions,
      notes: item.notes,
      subtotal: item.itemTotal,
    }));

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customerId: `cust-${Date.now()}`,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      restaurantId: cartRestaurantId || 'rest-1',
      restaurantName: cartRestaurantName || 'Restaurante',
      status: 'PENDING',
      items: orderItems,
      subtotal: cartSubtotal,
      deliveryFee,
      serviceFee: platformFee,
      total: grandTotal,
      paymentMethod,
      paymentStatus: paymentMethod === 'EFECTIVO' ? 'PENDING' : 'COMPLETED',
      deliveryAddress: {
        id: `addr-${Date.now()}`,
        label: 'Entrega',
        street: deliveryStreet.trim(),
        neighborhood: currentNeighborhood,
        city: 'Valledupar',
        reference: deliveryReference.trim() || undefined,
      },
      customerNotes: orderNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      estimatedDeliveryTime: `${deliveryInfo.timeMin}–${deliveryInfo.timeMax} min`,
    };

    addOrder(newOrder);
    setPlacedOrder(newOrder);
  };

  // Generador de mensaje de WhatsApp con formato para Colombia
  const generateWhatsAppUrl = (order: Order) => {
    const rawPhone = currentRestaurant?.phone || '3004567890';
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

    const message = `*¡Hola ${currentRestaurant?.name || 'DonDomi'}! Acabo de hacer un pedido por la plataforma:*

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
*Método de Pago:* ${order.paymentMethod}
${order.customerNotes ? `\n*Observaciones:* ${order.customerNotes}` : ''}

_¡Muchas gracias! Quedo atento a la confirmación de la cocina._`;

    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
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
              <p className="text-xs text-slate-500 line-clamp-1">{cartRestaurantName || 'DonDomi'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {placedOrder ? (
          // Vista de confirmación con botón directo a WhatsApp
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

            {/* Botón WhatsApp */}
            <a
              href={generateWhatsAppUrl(placedOrder)}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 text-sm transition"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Enviar Copia por WhatsApp al Restaurante</span>
            </a>

            <button
              onClick={() => {
                clearCart();
                setPlacedOrder(null);
                onClose();
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-2xl text-xs transition"
            >
              Listo, volver a la tienda
            </button>
          </div>
        ) : cart.length === 0 ? (
          // Carrito vacío
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700">Tu canasta está vacía</p>
            <p className="text-xs text-slate-400">Agrega platos desde el menú del restaurante.</p>
          </div>
        ) : (
          // Lista de items y formulario de entrega
          <form onSubmit={handleCheckout} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4 overflow-y-auto space-y-4 flex-1 divide-y divide-slate-100">
              {/* Platos seleccionados */}
              <div className="space-y-3">
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                  Platos seleccionados
                </span>
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

              {/* Datos de entrega en Valledupar */}
              <div className="pt-4 space-y-3">
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                  Datos de Entrega en Valledupar
                </span>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nombre de quien recibe
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
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Teléfono celular / WhatsApp
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej: 300 123 4567"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        Dirección exacta
                      </label>
                      <span className="text-[10px] text-orange-600 font-semibold">
                        Barrio: {currentNeighborhood}
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Calle 8 # 6-30"
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
                </div>
              </div>

              {/* Selector de método de pago */}
              <div className="pt-4 space-y-2">
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                  Forma de pago en Valledupar
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['NEQUI', 'DAVIPLATA', 'EFECTIVO'] as const).map((method) => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition text-center ${
                        paymentMethod === method
                          ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-2xs'
                          : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumen de costos */}
              <div className="pt-4 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal productos:</span>
                  <span>{formatCOP(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <Bike className="w-3.5 h-3.5 text-orange-600" />
                    Domicilio ({currentNeighborhood}):
                  </span>
                  <span className="font-semibold text-slate-800">{formatCOP(deliveryFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tarifa de servicio DonDomi:</span>
                  <span>{formatCOP(platformFee)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                  <span>Total a pagar:</span>
                  <span className="text-orange-600 text-base">{formatCOP(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Bottom Checkout Button */}
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-between active:scale-[0.98] transition cursor-pointer"
              >
                <span>Confirmar Pedido</span>
                <div className="flex items-center gap-1">
                  <span>{formatCOP(grandTotal)}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
