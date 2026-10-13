'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Store,
  Bike,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  MapPin,
  Clock,
  ArrowUpRight,
  Plus,
  Eye,
  X,
  Trash2,
  Edit2,
  Phone,
  Check,
  Lock,
  Unlock,
  KeyRound,
  AlertCircle,
  Megaphone,
  Save,
  LogOut,
  Sliders,
  Layers,
  Percent,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';
import { Restaurant, FoodCategory, Driver, Order } from '@/types';

type AdminTab = 'CATEGORIAS' | 'RESTAURANTES' | 'DOMICILIARIOS' | 'PEDIDOS' | 'AJUSTES';

export default function AdminPage() {
  const router = useRouter();
  const {
    restaurants,
    addRestaurant,
    toggleRestaurantStatus,
    orders,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    globalDeliveryFee,
    setGlobalDeliveryFee,
    globalAnnouncement,
    setGlobalAnnouncement,
    drivers,
    addDriver,
    toggleDriverStatus,
    updateOrderStatus,
    currentUser,
    logout,
  } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>('CATEGORIAS');

  // Autenticación Master
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [masterPinInput, setMasterPinInput] = useState<string>('');
  const [masterPinError, setMasterPinError] = useState<string | null>(null);

  React.useEffect(() => {
    if (currentUser?.role === 'ADMINISTRADOR') {
      setIsAdminAuthenticated(true);
      return;
    }
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('admin_master_auth');
      if (auth === 'true') {
        setIsAdminAuthenticated(true);
      }
    }
  }, [currentUser]);

  const handleMasterPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (masterPinInput.trim() === '2026') {
      setIsAdminAuthenticated(true);
      setMasterPinError(null);
      setMasterPinInput('');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('admin_master_auth', 'true');
      }
    } else {
      setMasterPinError('PIN Maestro incorrecto. (PIN predeterminado: 2026)');
    }
  };

  const handleAdminLock = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_master_auth');
    }
    if (currentUser?.role === 'ADMINISTRADOR') {
      logout();
    }
    setIsAdminAuthenticated(false);
  };

  // Notificaciones flotantes
  const [notice, setNotice] = useState<string | null>(null);
  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // ==============================================================
  // MODAL: CATEGORÍA DE COMIDA ("¿Qué se te antoja hoy?")
  // ==============================================================
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FoodCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catIcon, setCatIcon] = useState('🍟');
  const [catBadge, setCatBadge] = useState('');

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatSlug('');
    setCatIcon('🍟');
    setCatBadge('');
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: FoodCategory) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatSlug(cat.slug);
    setCatIcon(cat.icon);
    setCatBadge(cat.badge || '');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const slug = catSlug.trim() || catName.trim().toLowerCase().replace(/[\s\W]+/g, '-');

    if (editingCategory) {
      const updated: FoodCategory = {
        ...editingCategory,
        name: catName.trim(),
        slug,
        icon: catIcon.trim() || '🍽️',
        badge: catBadge.trim() || undefined,
      };
      updateCategory(updated);
      showNotice(`✅ Categoría "${updated.name}" actualizada`);
    } else {
      const newCat: FoodCategory = {
        id: `cat-${Date.now()}`,
        name: catName.trim(),
        slug,
        icon: catIcon.trim() || '🍽️',
        badge: catBadge.trim() || undefined,
      };
      addCategory(newCat);
      showNotice(`🎉 Categoría "${newCat.name}" agregada a la pantalla principal`);
    }

    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = (catId: string, name: string) => {
    if (window.confirm(`¿Deseas eliminar la categoría "${name}" de la pantalla principal?`)) {
      deleteCategory(catId);
      showNotice(`🗑️ Categoría "${name}" eliminada`);
    }
  };

  // ==============================================================
  // MODAL: AFILIAR RESTAURANTE
  // ==============================================================
  const [isAddRestModalOpen, setIsAddRestModalOpen] = useState(false);
  const [newRestName, setNewRestName] = useState('');
  const [newRestNeighborhood, setNewRestNeighborhood] = useState('Centro Histórico');
  const [newRestAddress, setNewRestAddress] = useState('');
  const [newRestPhone, setNewRestPhone] = useState('');
  const [newRestEmail, setNewRestEmail] = useState('');
  const [newRestHours, setNewRestHours] = useState('11:00 AM - 10:00 PM');
  const [newRestCommission, setNewRestCommission] = useState(0);
  const [newRestPin, setNewRestPin] = useState('1234');

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRestName.trim() || !newRestPhone.trim()) {
      alert('Completa el nombre y teléfono del restaurante.');
      return;
    }

    const slug = newRestName.toLowerCase().replace(/[\s\W]+/g, '-');
    const created: Restaurant = {
      id: `rest-${Date.now()}`,
      name: newRestName.trim(),
      slug,
      description: `Restaurante afiliado a DonDomi en ${newRestNeighborhood}, Valledupar.`,
      logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80',
      rating: 5.0,
      reviewsCount: 1,
      tags: ['Local', 'Valledupar'],
      address: newRestAddress.trim() || `Valledupar, Cesar`,
      neighborhood: newRestNeighborhood.trim(),
      phone: newRestPhone.trim(),
      email: newRestEmail.trim() || `${slug}@dondomi.com`,
      isOpen: true,
      openingHours: newRestHours,
      estimatedTimeMin: 25,
      estimatedTimeMax: 40,
      deliveryFeeBase: globalDeliveryFee,
      minOrderAmount: 15000,
      commissionRate: Number(newRestCommission),
      pin: newRestPin.trim() || '1234',
      acceptsCash: true,
      acceptsNequi: true,
      acceptsBreb: true,
      acceptsDaviplata: true,
      featured: false,
    };

    await addRestaurant(created);
    setIsAddRestModalOpen(false);
    setNewRestName('');
    setNewRestAddress('');
    setNewRestPhone('');
    setNewRestEmail('');
    showNotice(`🎉 Restaurante "${created.name}" afiliado con éxito`);
  };

  // ==============================================================
  // MODAL: REGISTRAR DOMICILIARIO
  // ==============================================================
  const [isAddDriverModalOpen, setIsAddDriverModalOpen] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverPlate, setNewDriverPlate] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');

  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName.trim() || !newDriverPhone.trim()) {
      alert('Completa el nombre y teléfono del domiciliario.');
      return;
    }

    const driver: Driver = {
      id: `drv-${Date.now()}`,
      name: newDriverName.trim(),
      phone: newDriverPhone.trim(),
      plate: newDriverPlate.trim() || 'MOTO-01',
      email: newDriverEmail.trim() || `${newDriverName.toLowerCase().replace(/[\s\W]+/g, '')}@dondomi.com`,
      isActive: true,
      totalDeliveries: 0,
      rating: 5.0,
      createdAt: new Date().toISOString(),
    };

    addDriver(driver);
    setIsAddDriverModalOpen(false);
    setNewDriverName('');
    setNewDriverPhone('');
    setNewDriverPlate('');
    setNewDriverEmail('');
    showNotice(`🛵 Domiciliario "${driver.name}" registrado en la flota`);
  };

  // Métricas de Plataforma
  const totalGMV = orders.filter((o) => o.status === 'DELIVERED').reduce((acc, o) => acc + o.total, 0);
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;
  const activeOrdersCount = orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20 selection:bg-orange-500 selection:text-white">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 px-4 py-3 shadow-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
              title="Volver a la App Cliente"
            >
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight text-white">
                  DonDomi Control Central
                </span>
                <span className="bg-orange-600/30 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
                  Master Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Valledupar, Cesar</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-700 transition hidden sm:inline-flex items-center gap-1.5"
            >
              <span>Ver App</span>
              <Eye className="w-3.5 h-3.5" />
            </Link>

            {isAdminAuthenticated && (
              <button
                onClick={handleAdminLock}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                title="Bloquear panel maestro"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bloquear</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Floating Notice */}
      {notice && (
        <div className="fixed top-16 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold border border-slate-700 animate-in slide-in-from-top-2">
          {notice}
        </div>
      )}

      {/* PANTALLA DE BLOQUEO POR PIN */}
      {!isAdminAuthenticated ? (
        <main className="max-w-md mx-auto px-4 py-16">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 text-orange-500 mx-auto flex items-center justify-center shadow-inner">
              <Shield className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full">
                Acceso Maestro Restringido
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2">
                DonDomi Control Central
              </h2>
              <p className="text-xs text-slate-500">
                Ingresa el PIN Maestro para gestionar categorías, afiliados y la red en Valledupar.
              </p>
            </div>

            <form onSubmit={handleMasterPinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  placeholder="PIN Maestro (2026)"
                  value={masterPinInput}
                  onChange={(e) => {
                    setMasterPinInput(e.target.value);
                    setMasterPinError(null);
                  }}
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono font-black py-3 px-4 bg-slate-50 border-2 border-slate-200 focus:border-orange-500 focus:bg-white rounded-2xl outline-none transition"
                />
                {masterPinError && (
                  <p className="text-xs text-red-600 font-bold mt-2 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{masterPinError}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-lg shadow-slate-900/25 transition text-sm flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4 text-orange-400" />
                <span>Desbloquear Administración</span>
              </button>
            </form>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
              💡 PIN Maestro predeterminado: <strong className="text-slate-600 font-mono">2026</strong>
            </div>
          </div>
        </main>
      ) : (
        /* PANTALLA PRINCIPAL DESBLOQUEADA */
        <main className="max-w-6xl mx-auto px-4 py-4 space-y-5">
          {/* 3 Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Restaurantes en Red
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {restaurants.length}
              </span>
              <span className="text-[10px] text-slate-400 block">Afiliados en Valledupar</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Pedidos Totales
              </span>
              <span className="text-2xl font-black text-orange-600 mt-1 block">
                {deliveredCount}
              </span>
              <span className="text-[10px] text-slate-400 block">Entregados con éxito</span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Flota de Repartidores
              </span>
              <span className="text-2xl font-black text-blue-600 mt-1 block">
                {drivers.length}
              </span>
              <span className="text-[10px] text-slate-400 block">Domiciliarios registrados</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-5 gap-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('CATEGORIAS')}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === 'CATEGORIAS'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Categorías ({categories.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('RESTAURANTES')}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === 'RESTAURANTES'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Restaurantes ({restaurants.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('DOMICILIARIOS')}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === 'DOMICILIARIOS'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>Domiciliarios ({drivers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('PEDIDOS')}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === 'PEDIDOS'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Torre de Pedidos</span>
            </button>

            <button
              onClick={() => setActiveTab('AJUSTES')}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === 'AJUSTES'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Ajustes & Tarifa</span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* TAB 1: GESTIÓN DE CATEGORÍAS ("¿Qué se te antoja hoy?") */}
          {/* ============================================================== */}
          {activeTab === 'CATEGORIAS' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Categorías de Comida en Valledupar
                  </h3>
                  <p className="text-xs text-slate-500">
                    Aparecen en el carrusel de la página principal bajo &quot;¿Qué se te antoja hoy?&quot;.
                  </p>
                </div>

                <button
                  onClick={handleOpenAddCategory}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold px-3.5 py-2 rounded-2xl text-xs transition flex items-center gap-1.5 shadow-md shadow-orange-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Categoría</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between gap-3 group hover:border-orange-300 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-2xl shadow-inner">
                        {cat.icon}
                      </div>
                      {cat.badge && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded-full">
                          {cat.badge}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-black text-sm text-slate-900">{cat.name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">slug: {cat.slug}</p>
                    </div>

                    <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenEditCategory(cat)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="Editar categoría"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition"
                        title="Eliminar categoría"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: DIRECTORIO Y AFILIACIÓN DE RESTAURANTES */}
          {/* ============================================================== */}
          {activeTab === 'RESTAURANTES' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Restaurantes Afiliados ({restaurants.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cada restaurante administra de forma autónoma su propio menú desde su panel.
                  </p>
                </div>

                <button
                  onClick={() => setIsAddRestModalOpen(true)}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold px-3.5 py-2 rounded-2xl text-xs transition flex items-center gap-1.5 shadow-md shadow-orange-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Afiliar Restaurante</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {restaurants.map((rest) => (
                  <div
                    key={rest.id}
                    className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                        <div>
                          <h4 className="font-black text-base text-slate-900">{rest.name}</h4>
                          <p className="text-xs text-slate-500">{rest.neighborhood} · Valledupar</p>
                        </div>

                        <button
                          onClick={() => toggleRestaurantStatus(rest.id)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                            rest.isOpen
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              rest.isOpen ? 'bg-emerald-600' : 'bg-red-600'
                            }`}
                          ></span>
                          <span>{rest.isOpen ? 'Activo' : 'Pausado'}</span>
                        </button>
                      </div>

                      <div className="pt-2 space-y-1 text-xs text-slate-600">
                        <p><strong>Teléfono:</strong> {rest.phone}</p>
                        <p><strong>Correo acceso:</strong> {rest.email || `${rest.slug}@dondomi.com`}</p>
                        <p><strong>Comisión DonDomi:</strong> {rest.commissionRate}% pactada</p>
                        <p><strong>Horario:</strong> {rest.openingHours}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <Link
                        href={`/restaurant/${rest.id}`}
                        target="_blank"
                        className="text-orange-600 font-bold hover:underline flex items-center gap-1"
                      >
                        <span>Ver menú público</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>

                      <span className="text-[11px] text-slate-400">PIN Cocina: {rest.pin || '1234'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: FLOTA DE DOMICILIARIOS */}
          {/* ============================================================== */}
          {activeTab === 'DOMICILIARIOS' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Flota de Domiciliarios ({drivers.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Repartidores autorizados para tomar carreras con tarifa fija de $7.000 COP en Valledupar.
                  </p>
                </div>

                <button
                  onClick={() => setIsAddDriverModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-3.5 py-2 rounded-2xl text-xs transition flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Domiciliario</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {drivers.map((drv) => (
                  <div
                    key={drv.id}
                    className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                            <Bike className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-black text-sm text-slate-900">{drv.name}</h4>
                            <p className="text-xs text-slate-500">{drv.phone} · Placa: {drv.plate}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => toggleDriverStatus(drv.id)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                            drv.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              drv.isActive ? 'bg-emerald-600' : 'bg-red-600'
                            }`}
                          ></span>
                          <span>{drv.isActive ? 'Activo' : 'Inactivo'}</span>
                        </button>
                      </div>

                      <div className="pt-2 text-xs text-slate-600 space-y-1">
                        <p><strong>Correo acceso:</strong> {drv.email}</p>
                        <p><strong>Carreras realizadas:</strong> {drv.totalDeliveries}</p>
                        <p><strong>Calificación:</strong> ★ {drv.rating}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <a
                        href={`https://wa.me/57${drv.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 font-bold hover:underline"
                      >
                        Contactar WhatsApp
                      </a>
                      <span className="text-[11px] text-slate-400">Contraseña: domi1234</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: TORRE DE CONTROL DE PEDIDOS EN VIVO */}
          {/* ============================================================== */}
          {activeTab === 'PEDIDOS' && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Torre de Control de Pedidos ({orders.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Supervisa todas las órdenes en curso o cancela pedidos en caso de conflicto.
                  </p>
                </div>
              </div>

              {orders.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No hay pedidos registrados.</p>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {orders.map((o) => (
                    <div key={o.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{o.orderNumber}</span>
                          <span className="text-slate-400">•</span>
                          <span className="font-bold text-slate-700">{o.restaurantName}</span>
                        </div>
                        <p className="text-slate-500 mt-0.5">
                          Cliente: {o.customerName} ({o.customerPhone}) · {o.deliveryAddress.neighborhood}
                        </p>
                        {o.driverName && (
                          <p className="text-blue-600 font-semibold text-[11px]">
                            Repartidor asignado: {o.driverName}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-black text-slate-900 text-sm block">
                            {formatCOP(o.total)}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              o.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : o.status === 'CANCELLED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {o.status}
                          </span>
                        </div>

                        {o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && (
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Cancelar forzosamente el pedido ${o.orderNumber}?`)) {
                                updateOrderStatus(o.id, 'CANCELLED');
                                showNotice(`Pedido ${o.orderNumber} cancelado forzosamente`);
                              }
                            }}
                            className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-red-200"
                            title="Cancelar pedido de emergencia"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: AJUSTES Y TARIFA GLOBAL DE VALLEDUPAR */}
          {/* ============================================================== */}
          {activeTab === 'AJUSTES' && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-6">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Parámetros Globales de DonDomi
                </h3>
                <p className="text-xs text-slate-500">
                  Controla la tarifa fija de la ciudad y emite comunicados en tiempo real.
                </p>
              </div>

              {/* Tarifa fija de Domicilio */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      Tarifa Plana de Domicilio en Valledupar
                    </h4>
                    <p className="text-xs text-slate-500">
                      Actualmente fijada para todos los pedidos de la plataforma.
                    </p>
                  </div>
                  <span className="text-xl font-black text-orange-600">
                    {formatCOP(globalDeliveryFee)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step={500}
                    min={3000}
                    value={globalDeliveryFee}
                    onChange={(e) => setGlobalDeliveryFee(Number(e.target.value))}
                    className="w-36 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                  <button
                    onClick={() => showNotice(`✅ Tarifa plana actualizada a ${formatCOP(globalDeliveryFee)}`)}
                    className="bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl"
                  >
                    Guardar Tarifa
                  </button>
                </div>
              </div>

              {/* Banner de Anuncio Global en la App */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-orange-600" />
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Banner de Aviso Global (Visible para todos los clientes)
                  </h4>
                </div>

                <textarea
                  rows={2}
                  value={globalAnnouncement || ''}
                  onChange={(e) => setGlobalAnnouncement(e.target.value)}
                  placeholder="Ej: Lluvias en Valledupar: los tiempos de entrega pueden presentar demoras de 10-15 minutos."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                ></textarea>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (globalAnnouncement) {
                        showNotice('📢 Aviso global publicado en la App');
                      } else {
                        showNotice('Aviso global retirado');
                      }
                    }}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-4 py-2 rounded-xl"
                  >
                    Guardar Comunicado
                  </button>
                  {globalAnnouncement && (
                    <button
                      onClick={() => {
                        setGlobalAnnouncement(null);
                        showNotice('Aviso global retirado');
                      }}
                      className="bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl"
                    >
                      Quitar Aviso
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ============================================================== */}
      {/* MODAL CREAR / EDITAR CATEGORÍA */}
      {/* ============================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría de Comida'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la Categoría</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ej: Salchipapas, Desgranados, Parrilla"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ícono (Emoji)</label>
                <input
                  type="text"
                  required
                  value={catIcon}
                  onChange={(e) => setCatIcon(e.target.value)}
                  placeholder="🍟"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 text-center"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Insignia / Badge (Opcional)</label>
                <input
                  type="text"
                  value={catBadge}
                  onChange={(e) => setCatBadge(e.target.value)}
                  placeholder="Ej: Top Valle, Nuevo, Típico"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md"
                >
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL AFILIAR RESTAURANTE */}
      {/* ============================================================== */}
      {isAddRestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900">Afiliar Nuevo Restaurante</h3>
              <button
                onClick={() => setIsAddRestModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRestaurant} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Restaurante</label>
                <input
                  type="text"
                  required
                  value={newRestName}
                  onChange={(e) => setNewRestName(e.target.value)}
                  placeholder="Ej: Asados del Valle"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Barrio en Valledupar</label>
                <input
                  type="text"
                  required
                  value={newRestNeighborhood}
                  onChange={(e) => setNewRestNeighborhood(e.target.value)}
                  placeholder="Ej: Novalito, Los Cortijos, Centro"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dirección Exacta</label>
                <input
                  type="text"
                  required
                  value={newRestAddress}
                  onChange={(e) => setNewRestAddress(e.target.value)}
                  placeholder="Ej: Calle 9 # 6-30"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Celular / WhatsApp</label>
                <input
                  type="text"
                  required
                  value={newRestPhone}
                  onChange={(e) => setNewRestPhone(e.target.value)}
                  placeholder="300 123 4567"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Comisión Pactada (%)</label>
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={newRestCommission}
                  onChange={(e) => setNewRestCommission(Number(e.target.value))}
                  placeholder="0 (gratis primeros meses) o 10%"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md"
                >
                  Afiliar Restaurante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL REGISTRAR DOMICILIARIO */}
      {/* ============================================================== */}
      {isAddDriverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900">Registrar Domiciliario</h3>
              <button
                onClick={() => setIsAddDriverModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDriver} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  placeholder="Ej: Andrés Pardo"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Celular</label>
                <input
                  type="text"
                  required
                  value={newDriverPhone}
                  onChange={(e) => setNewDriverPhone(e.target.value)}
                  placeholder="300 987 6543"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Placa de la Moto</label>
                <input
                  type="text"
                  value={newDriverPlate}
                  onChange={(e) => setNewDriverPlate(e.target.value)}
                  placeholder="Ej: ABC-45D"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDriverModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
