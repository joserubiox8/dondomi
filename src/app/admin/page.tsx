'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  Store,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  MapPin,
  Clock,
  ArrowUpRight,
  Plus,
  Eye,
  Database,
  X,
  Trash2,
  UtensilsCrossed,
  Phone,
  Check,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { VALLEDUPAR_NEIGHBORHOODS } from '@/data/mockData';
import { formatCOP } from '@/lib/utils';
import { Restaurant, Product, ProductOptionGroup } from '@/types';

export default function AdminPage() {
  const {
    restaurants,
    addRestaurant,
    toggleRestaurantStatus,
    orders,
    productsByRestaurant,
    addProduct,
    deleteProduct,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'RESTAURANTES' | 'PEDIDOS' | 'TARIFAS' | 'ARQUITECTURA'>('RESTAURANTES');

  // Modal para afiliar nuevo restaurante
  const [isAddRestModalOpen, setIsAddRestModalOpen] = useState(false);
  const [newRestName, setNewRestName] = useState('');
  const [newRestNeighborhood, setNewRestNeighborhood] = useState(VALLEDUPAR_NEIGHBORHOODS[0]);
  const [newRestAddress, setNewRestAddress] = useState('');
  const [newRestPhone, setNewRestPhone] = useState('');
  const [newRestHours, setNewRestHours] = useState('11:00 AM - 10:00 PM');
  const [newRestBaseFee, setNewRestBaseFee] = useState(5000);
  const [newRestCommission, setNewRestCommission] = useState(15);
  const [newRestTags, setNewRestTags] = useState('Comida Típica, Asados');
  const [newRestDescription, setNewRestDescription] = useState('');

  // Modal para gestionar menú textual
  const [menuModalRest, setMenuModalRest] = useState<Restaurant | null>(null);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdPrice, setNewProdPrice] = useState<number>(20000);
  const [newProdAdditions, setNewProdAdditions] = useState<string>('Papas extra: 4000, Suero costeño: 2500, Queso frito: 3500');

  // Cálculos de métricas
  const totalSales = orders.reduce((acc, o) => acc + o.total, 0);
  const totalCommissions = orders.reduce((acc, o) => acc + o.subtotal * 0.15, 0);

  const handleCreateRestaurant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRestName.trim() || !newRestAddress.trim() || !newRestPhone.trim()) {
      alert('Por favor completa el nombre, dirección y teléfono del restaurante.');
      return;
    }

    const newId = `rest-${Date.now()}`;
    const slug = newRestName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const created: Restaurant = {
      id: newId,
      name: newRestName.trim(),
      slug,
      description: newRestDescription.trim() || `Restaurante tradicional en ${newRestNeighborhood}, Valledupar.`,
      logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=200&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
      rating: 5.0,
      reviewsCount: 1,
      tags: newRestTags.split(',').map((t) => t.trim()).filter(Boolean),
      address: newRestAddress.trim(),
      neighborhood: newRestNeighborhood,
      phone: newRestPhone.trim(),
      isOpen: true,
      openingHours: newRestHours,
      estimatedTimeMin: 25,
      estimatedTimeMax: 40,
      deliveryFeeBase: Number(newRestBaseFee),
      minOrderAmount: 15000,
      commissionRate: Number(newRestCommission),
      acceptsCash: true,
      acceptsNequi: true,
      acceptsDaviplata: true,
      featured: false,
    };

    addRestaurant(created);
    setIsAddRestModalOpen(false);

    // Reset fields
    setNewRestName('');
    setNewRestAddress('');
    setNewRestPhone('');
    setNewRestDescription('');
    alert(`¡Restaurante "${created.name}" registrado y publicado con éxito!`);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuModalRest || !newProdName.trim() || !newProdCategory.trim() || !newProdPrice) {
      alert('Completa los campos obligatorios del plato.');
      return;
    }

    // Parsear adiciones del texto simple ej: "Papas: 4000, Suero: 2500"
    let optionsGroups: ProductOptionGroup[] = [];
    if (newProdAdditions.trim()) {
      const items = newProdAdditions.split(',').map((part, index) => {
        const [name, priceStr] = part.split(':').map((s) => s.trim());
        const additionalPrice = Number(priceStr) || 0;
        return {
          id: `opt-item-${Date.now()}-${index}`,
          name: name || 'Adición',
          additionalPrice,
        };
      });

      if (items.length > 0) {
        optionsGroups.push({
          id: `grp-${Date.now()}`,
          name: 'Adiciones extras (opcional)',
          required: false,
          minSelect: 0,
          maxSelect: items.length,
          items,
        });
      }
    }

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      restaurantId: menuModalRest.id,
      categoryName: newProdCategory.trim(),
      name: newProdName.trim(),
      description: newProdDesc.trim() || 'Plato preparado con ingredientes locales frescos.',
      price: Number(newProdPrice),
      isAvailable: true,
      options: optionsGroups.length > 0 ? optionsGroups : undefined,
    };

    addProduct(menuModalRest.id, newProd);

    // Limpiar campos del plato
    setNewProdName('');
    setNewProdDesc('');
    setNewProdPrice(20000);
    alert(`Plato "${newProd.name}" agregado al menú de ${menuModalRest.name}.`);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20">
      {/* Admin Top Navigation */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center font-black text-white text-base shadow-sm">
              DD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight">DonDomi Admin</span>
                <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Valledupar
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Control de plataforma & onboarding MVP</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <span>Ver App Cliente</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Banner onboarding target */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 rounded-3xl p-5 text-white shadow-lg border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-orange-500/30">
              <span>Etapa 1: Validación Comercial Valledupar</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black">
              Meta Inicial: 15–20 Restaurantes Afiliados
            </h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Actualmente tienes {restaurants.length} restaurantes configurados en el sistema con menús textuales listos para validar el mercado.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center min-w-[140px]">
            <span className="text-2xl font-black text-orange-400">
              {restaurants.length} / 20
            </span>
            <span className="text-[11px] text-slate-300 block font-medium">
              Progreso Meta MVP
            </span>
            <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-orange-500 h-full rounded-full"
                style={{ width: `${Math.min(100, (restaurants.length / 20) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Restaurantes</span>
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{restaurants.length}</div>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {restaurants.filter((r) => r.isOpen).length} abiertos ahora
            </p>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pedidos Totales</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{orders.length}</div>
            <p className="text-[11px] text-blue-600 font-semibold">
              {orders.filter((o) => o.status !== 'DELIVERED').length} en curso
            </p>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ventas Totales</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{formatCOP(totalSales)}</div>
            <p className="text-[11px] text-slate-500">Subtotal + Domicilios</p>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Comisión DonDomi</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600">{formatCOP(totalCommissions)}</div>
            <p className="text-[11px] text-slate-500">~15% promedio negociado</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('RESTAURANTES')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'RESTAURANTES'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Restaurantes ({restaurants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PEDIDOS')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'PEDIDOS'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Monitoreo de Pedidos ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('TARIFAS')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'TARIFAS'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Zonas & Tarifas Valledupar</span>
          </button>

          <button
            onClick={() => setActiveTab('ARQUITECTURA')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ARQUITECTURA'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Arquitectura & Base de Datos</span>
          </button>
        </div>

        {/* TAB 1: RESTAURANTES */}
        {activeTab === 'RESTAURANTES' && (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs space-y-4 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Restaurantes Aliados en Valledupar
                </h3>
                <p className="text-xs text-slate-500">
                  Registra restaurantes en tus visitas comerciales y gestiona sus menús textuales con adiciones.
                </p>
              </div>
              <button
                onClick={() => setIsAddRestModalOpen(true)}
                className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Afiliar Nuevo Restaurante</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <th className="p-3">Restaurante</th>
                    <th className="p-3">Barrio / Dirección</th>
                    <th className="p-3">WhatsApp Pedidos</th>
                    <th className="p-3">Comisión</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Menú & Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {restaurants.map((r) => {
                    const dishCount = (productsByRestaurant[r.id] || []).length;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={r.logoUrl}
                              alt=""
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                            />
                            <div>
                              <span className="font-extrabold text-slate-900 block">{r.name}</span>
                              <span className="text-[11px] text-slate-400">{r.tags[0]}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-slate-700 block">{r.neighborhood}</span>
                          <span className="text-[11px] text-slate-400">{r.address}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-slate-700">{r.phone}</span>
                        </td>
                        <td className="p-3">
                          <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                            {r.commissionRate}%
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => toggleRestaurantStatus(r.id)}
                            className={`px-2.5 py-1 rounded-full font-bold text-[11px] transition ${
                              r.isOpen
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {r.isOpen ? 'Abierto' : 'Cerrado'}
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setMenuModalRest(r);
                                setNewProdCategory(r.tags[0] || 'Platos');
                              }}
                              className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-bold bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition"
                            >
                              <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600" />
                              <span>Menú ({dishCount})</span>
                            </button>
                            <Link
                              href={`/restaurant/${r.id}`}
                              className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-bold bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded-lg transition"
                              title="Ver cómo lo ve el cliente"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PEDIDOS EN VIVO */}
        {activeTab === 'PEDIDOS' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Monitoreo de Pedidos en Tiempo Real
                </h3>
                <p className="text-xs text-slate-500">
                  Ciclo de gestión: Pedido → Restaurante → Preparación → Entrega
                </p>
              </div>
              <span className="text-xs font-bold bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
                {orders.length} Registrados
              </span>
            </div>

            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">#{order.orderNumber}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="font-extrabold text-orange-600 text-xs">
                        {order.restaurantName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          order.status === 'ON_THE_WAY'
                            ? 'bg-blue-100 text-blue-700'
                            : order.status === 'PREPARING'
                            ? 'bg-amber-100 text-amber-700'
                            : order.status === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {order.status === 'ON_THE_WAY'
                          ? '🛵 En Camino'
                          : order.status === 'PREPARING'
                          ? '👨‍🍳 En Cocina'
                          : order.status === 'DELIVERED'
                          ? '✅ Entregado'
                          : 'Pendiente'}
                      </span>
                      <span className="font-black text-slate-900 text-sm">
                        {formatCOP(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* Order items summary */}
                  <div className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-900">Platos pedidos:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1 text-slate-600">
                      {order.items.map((it) => (
                        <li key={it.id}>
                          <strong>{it.quantity}x</strong> {it.productName} ({formatCOP(it.subtotal)})
                          {it.selectedOptions && it.selectedOptions.length > 0 && (
                            <span className="text-[11px] text-slate-500 block pl-4">
                              Adiciones: {it.selectedOptions.map((o) => o.itemName).join(', ')}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Customer and address */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{order.customerName}</span>
                      <span>·</span>
                      <span className="font-mono text-slate-600">{order.customerPhone}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-orange-600" />
                        {order.deliveryAddress.neighborhood}, {order.deliveryAddress.street}
                      </span>
                    </div>

                    <div className="text-slate-600">
                      Pago: <span className="font-bold text-slate-800">{order.paymentMethod}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: TARIFAS & ZONAS */}
        {activeTab === 'TARIFAS' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Matriz de Tarifas por Zonas en Valledupar
              </h3>
              <p className="text-xs text-slate-500">
                El precio del domicilio se calcula dinámicamente según la distancia entre el barrio del restaurante y la ubicación del cliente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200 space-y-2">
                <span className="text-xs font-black text-orange-700 block uppercase">
                  Zona 1: Centro & Novalito
                </span>
                <p className="text-xs text-slate-600">
                  Tarifa base: <strong>$4.500 - $5.000 COP</strong>
                </p>
                <p className="text-[11px] text-slate-500">
                  Tiempo estimado: 20-30 min. Incluye Centro Histórico, Novalito, Los Cortijos, Alfonso López.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                <span className="text-xs font-black text-amber-800 block uppercase">
                  Zona 2: Intermedia
                </span>
                <p className="text-xs text-slate-600">
                  Tarifa base: <strong>$6.000 - $6.500 COP</strong>
                </p>
                <p className="text-[11px] text-slate-500">
                  Tiempo estimado: 30-40 min. Conexión hacia San Joaquín, Cinco de Noviembre, Los Músicos.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
                <span className="text-xs font-black text-blue-800 block uppercase">
                  Zona 3: Periférica
                </span>
                <p className="text-xs text-slate-600">
                  Tarifa base: <strong>$7.500 - $8.500 COP</strong>
                </p>
                <p className="text-[11px] text-slate-500">
                  Tiempo estimado: 40-50 min. La Nevada, Don Alberto, Villa Ligia.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 mb-2">Barrios registrados para el cálculo dinámico:</h4>
              <div className="flex flex-wrap gap-2">
                {VALLEDUPAR_NEIGHBORHOODS.map((b) => (
                  <span
                    key={b}
                    className="bg-slate-100 text-slate-700 text-xs px-3 py-1 rounded-full border border-slate-200"
                  >
                    📍 {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ARQUITECTURA */}
        {activeTab === 'ARQUITECTURA' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Arquitectura del Sistema & Decisiones del MVP
              </h3>
              <p className="text-xs text-slate-500">
                Estructura modular orientada a afiliar rápidamente restaurantes sin fricciones tecnológicas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block text-sm">
                  1. Menús Textuales & Sin Fricción Visual
                </span>
                <p className="text-slate-600">
                  Para permitir la entrada de restaurantes pequeños que no tienen fotos profesionales ni diseño gráfico, los menús son 100% textuales pero muy descriptivos, con soporte completo para categorías, adiciones y notas.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block text-sm">
                  2. Tipografía Institucional Garantizada
                </span>
                <p className="text-slate-600">
                  Se integró la fuente <strong>Plus Jakarta Sans</strong> directamente en la aplicación. No depende de las fuentes del teléfono móvil, evitando que fuentes extrañas o modificadas degraden la presentación de la plataforma.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block text-sm">
                  3. Acceso Separado por Enlace
                </span>
                <p className="text-slate-600">
                  La experiencia del cliente es 100% limpia sin botones visibles hacia los portales privados. El administrador, restaurantes y domiciliarios acceden mediante sus propias rutas: <code>/admin</code>, <code>/merchant</code> y <code>/driver</code>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block text-sm">
                  4. Despacho Directo & Notificación a WhatsApp
                </span>
                <p className="text-slate-600">
                  En esta primera fase los restaurantes gestionan sus propios domiciliarios. Al confirmar el pedido, el sistema genera automáticamente el mensaje estructurado con un botón para enviar copia directa al WhatsApp del restaurante.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: AFILIAR NUEVO RESTAURANTE */}
      {isAddRestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Afiliar Nuevo Restaurante</h3>
              </div>
              <button
                onClick={() => setIsAddRestModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRestaurant} className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre comercial del restaurante *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Asados & Parrilla El Cacique"
                  value={newRestName}
                  onChange={(e) => setNewRestName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Barrio en Valledupar *</label>
                  <select
                    value={newRestNeighborhood}
                    onChange={(e) => setNewRestNeighborhood(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  >
                    {VALLEDUPAR_NEIGHBORHOODS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">WhatsApp de Pedidos *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 300 456 7890"
                    value={newRestPhone}
                    onChange={(e) => setNewRestPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Dirección física exacta *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Calle 14 # 9-45"
                  value={newRestAddress}
                  onChange={(e) => setNewRestAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Horario</label>
                  <input
                    type="text"
                    value={newRestHours}
                    onChange={(e) => setNewRestHours(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Domicilio Base</label>
                  <input
                    type="number"
                    value={newRestBaseFee}
                    onChange={(e) => setNewRestBaseFee(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Comisión %</label>
                  <input
                    type="number"
                    value={newRestCommission}
                    onChange={(e) => setNewRestCommission(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Categorías / Etiquetas (separadas por coma)</label>
                <input
                  type="text"
                  placeholder="Ej: Pollo Asado, Parrilla, Criollo"
                  value={newRestTags}
                  onChange={(e) => setNewRestTags(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Descripción breve del negocio</label>
                <textarea
                  rows={2}
                  placeholder="Sazón casera con carnes al carbón y patacones con queso costeño..."
                  value={newRestDescription}
                  onChange={(e) => setNewRestDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-extrabold py-3 rounded-2xl shadow-md transition text-xs"
                >
                  Registrar Restaurante en DonDomi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GESTIONAR MENÚ TEXTUAL DEL RESTAURANTE */}
      {menuModalRest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Menú Textual: {menuModalRest.name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Agrega platos con categorías y adiciones (sin requerir imágenes).
                </p>
              </div>
              <button
                onClick={() => setMenuModalRest(null)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Formulario para agregar nuevo plato */}
              <form onSubmit={handleAddProduct} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-extrabold text-slate-900 block text-xs">
                  + Agregar Nuevo Plato al Menú
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nombre del Plato *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Pechuga a la Plancha con Queso Costeño"
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Categoría del Menú *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Platos Fuertes, Combos, Bebidas"
                      value={newProdCategory}
                      onChange={(e) => setNewProdCategory(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="font-bold text-slate-700 block mb-1">Precio COP *</label>
                    <input
                      type="number"
                      required
                      placeholder="24000"
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">
                      Adiciones extras (Nombre: Precio, separado por comas)
                    </label>
                    <input
                      type="text"
                      placeholder="Papas: 4000, Suero: 2500, Queso: 3500"
                      value={newProdAdditions}
                      onChange={(e) => setNewProdAdditions(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Descripción detallada</label>
                  <textarea
                    rows={2}
                    placeholder="Tierna pechuga sellada al carbón, servida con patacón pisao, suero y ensalada verde..."
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition text-xs"
                >
                  Guardar Plato en el Menú
                </button>
              </form>

              {/* Lista actual de platos del restaurante */}
              <div className="space-y-2">
                <span className="font-extrabold text-slate-900 block text-xs">
                  Platos Actuales en el Menú ({(productsByRestaurant[menuModalRest.id] || []).length})
                </span>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white overflow-hidden">
                  {(productsByRestaurant[menuModalRest.id] || []).length === 0 ? (
                    <div className="p-4 text-center text-slate-400">
                      Este restaurante todavía no tiene platos en su menú.
                    </div>
                  ) : (
                    (productsByRestaurant[menuModalRest.id] || []).map((prod) => (
                      <div key={prod.id} className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{prod.name}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                              {prod.categoryName}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2">{prod.description}</p>
                          <span className="font-black text-orange-600 block">{formatCOP(prod.price)}</span>
                        </div>

                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar "${prod.name}" del menú?`)) {
                              deleteProduct(menuModalRest.id, prod.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Eliminar plato"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
