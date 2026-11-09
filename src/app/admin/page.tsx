'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  Store,
  Bike,
  ShoppingBag,
  ArrowUpRight,
  Plus,
  Eye,
  X,
  Trash2,
  Edit2,
  Check,
  Lock,
  Unlock,
  AlertCircle,
  Megaphone,
  Sliders,
  Layers,
  Search,
  Wallet,
  Users,
  Download,
  Printer,
  UtensilsCrossed,
  Star,
  BarChart3,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Ban,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCOP } from '@/lib/utils';
import { validateDriverPasswordPolicy } from '@/lib/passwordPolicy';
import {
  filterOrdersByPeriod,
  SettlementPeriod,
} from '@/lib/pricing';
import { getCustomerLoyaltyTier } from '@/services/dataService';
import { Restaurant, FoodCategory, Driver, Order, OrderStatus } from '@/types';

type AdminTab =
  | 'RESTAURANTES'
  | 'PEDIDOS'
  | 'FINANZAS'
  | 'DOMICILIARIOS'
  | 'CLIENTES'
  | 'CATEGORIAS';

type RestStatusFilter = 'TODOS' | 'ABIERTOS' | 'PAUSADOS' | 'SUSPENDIDOS' | 'ARCHIVADOS';

export default function AdminPage() {
  const {
    restaurants,
    addRestaurant,
    updateRestaurant,
    toggleRestaurantStatus,
    productsByRestaurant,
    fetchProductsForRestaurant,
    toggleProductAvailability,
    archiveProduct,
    restoreProduct,
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
    updateDriver,
    toggleDriverStatus,
    toggleDriverAvailability,
    deleteDriver,
    updateOrderStatus,
    assignDriverByAdmin,
    unclaimOrder,
    confirmOrderPayment,
    currentUser,
    logout,
  } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>('RESTAURANTES');
  const [period, setPeriod] = useState<SettlementPeriod>('ALL');

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
  // FILTROS Y ESTADOS DE RESTAURANTES (CREAR / EDITAR / INSPECCIONAR)
  // ==============================================================
  const [restSearch, setRestSearch] = useState('');
  const [restFilter, setRestFilter] = useState<RestStatusFilter>('TODOS');
  const [isRestModalOpen, setIsRestModalOpen] = useState(false);
  const [editingRest, setEditingRest] = useState<Restaurant | null>(null);
  const [inspectingRest, setInspectingRest] = useState<Restaurant | null>(null);

  useEffect(() => {
    if (inspectingRest?.id) {
      fetchProductsForRestaurant(inspectingRest.id);
    }
  }, [inspectingRest?.id, fetchProductsForRestaurant]);

  const [restName, setRestName] = useState('');
  const [restNeighborhood, setRestNeighborhood] = useState('Centro Histórico');
  const [restAddress, setRestAddress] = useState('');
  const [restPhone, setRestPhone] = useState('');
  const [restEmail, setRestEmail] = useState('');
  const [restHours, setRestHours] = useState('11:00 AM - 10:00 PM');
  const [restCommission, setRestCommission] = useState<number>(0);
  const [restMinOrder, setRestMinOrder] = useState<number>(15000);
  const [restTimeMin, setRestTimeMin] = useState<number>(25);
  const [restTimeMax, setRestTimeMax] = useState<number>(40);
  const [restPin, setRestPin] = useState('1234');
  const [restAccountStatus, setRestAccountStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'>('ACTIVE');
  const [restAcceptsCash, setRestAcceptsCash] = useState(true);
  const [restAcceptsNequi, setRestAcceptsNequi] = useState(true);
  const [restAcceptsBreb, setRestAcceptsBreb] = useState(true);
  const [restAcceptsDaviplata, setRestAcceptsDaviplata] = useState(true);
  const [restNequiNumber, setRestNequiNumber] = useState('');
  const [restDaviplataNumber, setRestDaviplataNumber] = useState('');
  const [restBrebKey, setRestBrebKey] = useState('');
  const [restTags, setRestTags] = useState<string[]>(['Comida Rápida', 'Valledupar']);
  const [restFormError, setRestFormError] = useState<string | null>(null);

  // Advertencia de suspensión cuando hay pedidos PENDING
  const [pendingOrdersWarning, setPendingOrdersWarning] = useState<{
    restaurant: Restaurant;
    pendingOrders: Order[];
    targetStatus: 'SUSPENDED' | 'ARCHIVED';
  } | null>(null);

  // Lista combinada de etiquetas y categorías para asignación en el restaurante
  const allAvailableCategoryTags = useMemo(() => {
    const set = new Set<string>([
      'Comida Rápida',
      'Hamburguesas',
      'Pizza',
      'Parrilla',
      'Pollo',
      'Salchipapas',
      'Desgranados',
      'Bebidas',
      'Típica',
      'Postres',
      'Valledupar',
    ]);
    categories.forEach((c) => {
      if (c.name?.trim()) set.add(c.name.trim());
    });
    return Array.from(set);
  }, [categories]);

  const handleOpenCreateRest = () => {
    setRestFormError(null);
    setEditingRest(null);
    setRestName('');
    setRestNeighborhood('Centro Histórico');
    setRestAddress('');
    setRestPhone('');
    setRestEmail('');
    setRestHours('11:00 AM - 10:00 PM');
    setRestTags(['Comida Rápida', 'Valledupar']);
    setRestCommission(0);
    setRestMinOrder(15000);
    setRestTimeMin(25);
    setRestTimeMax(40);
    setRestPin('1234');
    setRestAccountStatus('ACTIVE');
    setRestAcceptsCash(true);
    setRestAcceptsNequi(true);
    setRestAcceptsBreb(true);
    setRestAcceptsDaviplata(true);
    setRestNequiNumber('');
    setRestDaviplataNumber('');
    setRestBrebKey('');
    setIsRestModalOpen(true);
  };

  const handleOpenEditRest = (r: Restaurant) => {
    setRestFormError(null);
    setEditingRest(r);
    setRestName(r.name);
    setRestNeighborhood(r.neighborhood);
    setRestAddress(r.address);
    setRestPhone(r.phone.replace(/\D/g, '').slice(0, 10));
    setRestEmail(r.email || `${r.slug}@dondomi.com`);
    setRestHours(r.openingHours || '11:00 AM - 10:00 PM');
    setRestTags(Array.isArray(r.tags) && r.tags.length > 0 ? r.tags : ['Local', 'Valledupar']);
    setRestCommission(r.commissionRate || 0);
    setRestMinOrder(r.minOrderAmount || 15000);
    setRestTimeMin(r.estimatedTimeMin || 25);
    setRestTimeMax(r.estimatedTimeMax || 40);
    setRestPin(r.pin || '1234');
    setRestAccountStatus(r.accountStatus || 'ACTIVE');
    setRestAcceptsCash(r.acceptsCash !== false);
    setRestAcceptsNequi(r.acceptsNequi !== false);
    setRestAcceptsBreb(r.acceptsBreb !== false);
    setRestAcceptsDaviplata(r.acceptsDaviplata !== false);
    setRestNequiNumber(r.nequiNumber || '');
    setRestDaviplataNumber(r.daviplataNumber || '');
    setRestBrebKey(r.brebKey || '');
    setIsRestModalOpen(true);
  };

  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestFormError(null);
    const cleanPhone = restPhone.replace(/\D/g, '');
    if (!restName.trim() || cleanPhone.length !== 10) {
      setRestFormError('Ingresa el nombre del restaurante y un celular válido de 10 dígitos.');
      return;
    }

    if (editingRest && restAccountStatus !== 'ACTIVE') {
      const pendingForRest = orders.filter(
        (o) =>
          (o.restaurantId === editingRest.id || o.restaurantName === editingRest.name) &&
          o.status === 'PENDING'
      );
      if (pendingForRest.length > 0) {
        setRestFormError(
          `No se puede suspender "${editingRest.name}" porque tiene ${pendingForRest.length} pedido(s) en estado PENDIENTE. Debes aceptarlos o cancelarlos en la Torre de Control antes de suspender el comercio.`
        );
        return;
      }
    }

    const slug =
      editingRest?.slug ||
      restName
        .trim()
        .toLowerCase()
        .replace(/[\s\W]+/g, '-');

    if (editingRest) {
      const updated: Restaurant = {
        ...editingRest,
        name: restName.trim(),
        neighborhood: restNeighborhood.trim(),
        address: restAddress.trim() || 'Valledupar, Cesar',
        phone: cleanPhone,
        email: restEmail.trim() || `${slug}@dondomi.com`,
        openingHours: restHours.trim(),
        tags: restTags.length > 0 ? restTags : ['Local', 'Valledupar'],
        commissionRate: Number(restCommission) || 0,
        minOrderAmount: Number(restMinOrder) || 0,
        estimatedTimeMin: Number(restTimeMin) || 25,
        estimatedTimeMax: Number(restTimeMax) || 40,
        pin: restPin.trim() || '1234',
        accountStatus: restAccountStatus,
        isOpen: restAccountStatus === 'ACTIVE' ? editingRest.isOpen : false,
        acceptsCash: restAcceptsCash,
        acceptsNequi: restAcceptsNequi,
        acceptsBreb: restAcceptsBreb,
        acceptsDaviplata: restAcceptsDaviplata,
        nequiNumber: restNequiNumber.trim() || undefined,
        daviplataNumber: restDaviplataNumber.trim() || undefined,
        brebKey: restBrebKey.trim() || undefined,
      };
      const res = await updateRestaurant(updated);
      if (!res.ok) {
        setRestFormError(res.error || 'Error al actualizar restaurante');
        return;
      }
      showNotice(`✅ Restaurante "${updated.name}" actualizado`);
    } else {
      const created: Restaurant = {
        id: `rest-${Date.now()}`,
        name: restName.trim(),
        slug,
        description: `Restaurante afiliado a DonDomi en ${restNeighborhood.trim()}, Valledupar.`,
        logoUrl:
          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
        bannerUrl:
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80',
        rating: 5.0,
        reviewsCount: 1,
        tags: restTags.length > 0 ? restTags : ['Comida Rápida', 'Valledupar'],
        address: restAddress.trim() || 'Valledupar, Cesar',
        neighborhood: restNeighborhood.trim(),
        phone: cleanPhone,
        email: restEmail.trim() || `${slug}@dondomi.com`,
        isOpen: restAccountStatus === 'ACTIVE',
        accountStatus: restAccountStatus,
        openingHours: restHours.trim(),
        estimatedTimeMin: Number(restTimeMin) || 25,
        estimatedTimeMax: Number(restTimeMax) || 40,
        deliveryFeeBase: globalDeliveryFee,
        minOrderAmount: Number(restMinOrder) || 15000,
        commissionRate: Number(restCommission) || 0,
        pin: restPin.trim() || '1234',
        acceptsCash: restAcceptsCash,
        acceptsNequi: restAcceptsNequi,
        acceptsBreb: restAcceptsBreb,
        acceptsDaviplata: restAcceptsDaviplata,
        nequiNumber: restNequiNumber.trim() || undefined,
        daviplataNumber: restDaviplataNumber.trim() || undefined,
        brebKey: restBrebKey.trim() || undefined,
        featured: false,
      };
      const res = await addRestaurant(created);
      if (!res.ok) {
        setRestFormError(res.error || 'Error al registrar restaurante');
        return;
      }
      showNotice(`🎉 Restaurante "${created.name}" afiliado con éxito`);
    }

    setIsRestModalOpen(false);
  };

  const handleQuickRestAccountStatus = async (
    rest: Restaurant,
    status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
  ) => {
    if (status !== 'ACTIVE') {
      const pendingForRest = orders.filter(
        (o) =>
          (o.restaurantId === rest.id || o.restaurantName === rest.name) &&
          o.status === 'PENDING'
      );
      if (pendingForRest.length > 0) {
        setPendingOrdersWarning({
          restaurant: rest,
          pendingOrders: pendingForRest,
          targetStatus: status,
        });
        return;
      }
    }

    const updated: Restaurant = {
      ...rest,
      accountStatus: status,
      isOpen: status === 'ACTIVE' ? rest.isOpen : false,
    };
    const res = await updateRestaurant(updated);
    if (!res.ok) {
      showNotice(`❌ Error: ${res.error || 'No se pudo actualizar el estado'}`);
      return;
    }
    showNotice(
      status === 'ACTIVE'
        ? `🟢 "${rest.name}" reactivado en el catálogo`
        : status === 'SUSPENDED'
        ? `⏸️ "${rest.name}" suspendido temporalmente del catálogo`
        : `📦 "${rest.name}" archivado`
    );
  };

  const handleForceEmergencySuspension = async () => {
    if (!pendingOrdersWarning) return;
    const { restaurant, targetStatus } = pendingOrdersWarning;
    const updated: Restaurant = {
      ...restaurant,
      accountStatus: targetStatus,
      isOpen: false,
    };
    const res = await updateRestaurant(updated);
    if (!res.ok) {
      showNotice(`❌ Error: ${res.error || 'No se pudo suspender el restaurante'}`);
    } else {
      showNotice(
        `⚠️ Intervención de emergencia: "${restaurant.name}" puesto en ${targetStatus}. Los pedidos pendientes deben gestionarse en la Torre de Control.`
      );
    }
    setPendingOrdersWarning(null);
  };

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const accStatus = r.accountStatus || 'ACTIVE';
      const matchesStatus =
        restFilter === 'TODOS'
          ? accStatus !== 'ARCHIVED'
          : restFilter === 'ABIERTOS'
          ? accStatus === 'ACTIVE' && r.isOpen
          : restFilter === 'PAUSADOS'
          ? accStatus === 'ACTIVE' && !r.isOpen
          : restFilter === 'SUSPENDIDOS'
          ? accStatus === 'SUSPENDED'
          : accStatus === 'ARCHIVED';

      const q = restSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.neighborhood.toLowerCase().includes(q) ||
        r.phone.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [restaurants, restFilter, restSearch]);

  // ==============================================================
  // MODAL: CATEGORÍA DE COMIDA ("¿Qué se te antoja hoy?")
  // ==============================================================
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FoodCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catIcon, setCatIcon] = useState('🍟');
  const [catBadge, setCatBadge] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);

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

  const handleSaveCategory = async (e: React.FormEvent) => {
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
      const res = await updateCategory(updated);
      if (!res.ok) {
        showNotice(`❌ Error al actualizar categoría: ${res.error || 'Fallo de persistencia'}`);
        return;
      }
      showNotice(`✅ Categoría "${updated.name}" actualizada`);
    } else {
      const newCat: FoodCategory = {
        id: `cat-${Date.now()}`,
        name: catName.trim(),
        slug,
        icon: catIcon.trim() || '🍽️',
        badge: catBadge.trim() || undefined,
      };
      const res = await addCategory(newCat);
      if (!res.ok) {
        showNotice(`❌ Error al guardar categoría: ${res.error || 'Fallo de persistencia'}`);
        return;
      }
      showNotice(`🎉 Categoría "${newCat.name}" agregada a la pantalla principal`);
    }

    setIsCategoryModalOpen(false);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const res = await deleteCategory(categoryToDelete.id);
    if (!res.ok) {
      showNotice(`❌ Error al eliminar categoría: ${res.error || 'Fallo de persistencia'}`);
    } else {
      showNotice(`🗑️ Categoría "${categoryToDelete.name}" eliminada`);
    }
    setCategoryToDelete(null);
  };

  // ==============================================================
  // PARÁMETROS GLOBALES (TARIFA PLANA Y COMUNICADO EN VIVO)
  // ==============================================================
  const [deliveryFeeInput, setDeliveryFeeInput] = useState<string>(String(globalDeliveryFee));
  const [announcementInput, setAnnouncementInput] = useState<string>(globalAnnouncement || '');

  useEffect(() => {
    setDeliveryFeeInput(String(globalDeliveryFee));
  }, [globalDeliveryFee]);

  useEffect(() => {
    setAnnouncementInput(globalAnnouncement || '');
  }, [globalAnnouncement]);

  const handleSaveDeliveryFee = async (customFee?: number) => {
    const raw = customFee !== undefined ? customFee : Number(String(deliveryFeeInput).replace(/\D/g, ''));
    if (isNaN(raw) || raw < 0) {
      showNotice('❌ Ingresa un valor numérico válido para la tarifa de domicilio');
      return;
    }
    setDeliveryFeeInput(String(raw));
    const res = await setGlobalDeliveryFee(raw);
    if (!res.ok) {
      showNotice(`❌ Error al guardar tarifa: ${res.error || 'Fallo de persistencia'}`);
      return;
    }
    showNotice(`✅ Tarifa plana de domicilio actualizada a ${formatCOP(raw)}`);
  };

  const handleSaveAnnouncement = async (clear = false) => {
    const nextValue = clear ? null : announcementInput.trim() || null;
    setAnnouncementInput(nextValue || '');
    const res = await setGlobalAnnouncement(nextValue);
    if (!res.ok) {
      showNotice(`❌ Error al actualizar comunicado: ${res.error || 'Fallo de persistencia'}`);
      return;
    }
    if (nextValue) {
      showNotice('📢 Comunicado global publicado en la App');
    } else {
      showNotice('✅ Aviso global retirado de la App');
    }
  };

  // ==============================================================
  // MODAL: GESTIÓN DE DOMICILIARIOS (CREAR / EDITAR / INHABILITAR / ELIMINAR)
  // ==============================================================
  const [driverSearch, setDriverSearch] = useState('');
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [drvName, setDrvName] = useState('');
  const [drvPhone, setDrvPhone] = useState('');
  const [drvPlate, setDrvPlate] = useState('');
  const [drvEmail, setDrvEmail] = useState('');
  const [drvPassword, setDrvPassword] = useState('');
  const [drvVehicle, setDrvVehicle] = useState<'MOTO' | 'BICICLETA' | 'AUTO'>('MOTO');
  const [driverFormError, setDriverFormError] = useState<string | null>(null);

  const handleOpenAddDriver = () => {
    setDriverFormError(null);
    setEditingDriver(null);
    setDrvName('');
    setDrvPhone('');
    setDrvPlate('');
    setDrvEmail('');
    setDrvPassword('');
    setDrvVehicle('MOTO');
    setIsDriverModalOpen(true);
  };

  const handleOpenEditDriver = (drv: Driver) => {
    setDriverFormError(null);
    setEditingDriver(drv);
    setDrvName(drv.name);
    setDrvPhone(drv.phone.replace(/\D/g, '').slice(0, 10));
    setDrvPlate(drv.plate);
    setDrvEmail(drv.email);
    setDrvPassword('');
    setDrvVehicle(drv.vehicleType || 'MOTO');
    setIsDriverModalOpen(true);
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setDriverFormError(null);
    const cleanPhone = drvPhone.replace(/\D/g, '');
    if (!drvName.trim() || cleanPhone.length !== 10) {
      setDriverFormError('Ingresa el nombre del domiciliario y un celular válido de 10 dígitos.');
      return;
    }

    if (!editingDriver && !drvPassword.trim()) {
      setDriverFormError('Debes ingresar una contraseña de acceso para el domiciliario.');
      return;
    }

    if (drvPassword.trim()) {
      const policy = validateDriverPasswordPolicy(drvPassword);
      if (!policy.valid) {
        setDriverFormError(policy.error || 'Contraseña inválida.');
        return;
      }
    }

    if (editingDriver) {
      const updated: Driver = {
        ...editingDriver,
        name: drvName.trim(),
        phone: cleanPhone,
        plate: drvPlate.trim().toUpperCase() || 'MOTO-01',
        email:
          drvEmail.trim() ||
          `${drvName.toLowerCase().replace(/[\s\W]+/g, '')}@dondomi.com`,
        vehicleType: drvVehicle,
      };
      const res = await updateDriver(updated, drvPassword.trim() || undefined);
      if (!res.ok) {
        setDriverFormError(res.error || 'Error al actualizar domiciliario');
        return;
      }
      showNotice(`✅ Domiciliario "${updated.name}" actualizado`);
    } else {
      const driver: Driver = {
        id: `drv-${Date.now()}`,
        name: drvName.trim(),
        phone: cleanPhone,
        plate: drvPlate.trim().toUpperCase() || 'MOTO-01',
        email:
          drvEmail.trim() ||
          `${drvName.toLowerCase().replace(/[\s\W]+/g, '')}@dondomi.com`,
        vehicleType: drvVehicle,
        isActive: true,
        isAvailable: true,
        totalDeliveries: 0,
        rating: 5.0,
        createdAt: new Date().toISOString(),
      };
      const res = await addDriver(driver, drvPassword.trim());
      if (!res.ok) {
        setDriverFormError(res.error || 'Error al registrar domiciliario');
        return;
      }
      showNotice(`🛵 Domiciliario "${driver.name}" registrado en la flota`);
    }

    setIsDriverModalOpen(false);
  };

  const handleToggleDriverStatus = async (drv: Driver) => {
    const res = await toggleDriverStatus(drv.id);
    if (!res.ok) {
      showNotice(`❌ Error: ${res.error || 'No se pudo cambiar el estado del domiciliario'}`);
      return;
    }
    showNotice(
      drv.isActive
        ? `🚫 Domiciliario "${drv.name}" inhabilitado`
        : `✅ Domiciliario "${drv.name}" habilitado nuevamente`
    );
  };

  const handleConfirmDeleteDriver = async () => {
    if (!driverToDelete) return;
    const target = driverToDelete;
    const res = await deleteDriver(target.id);
    if (!res.ok) {
      showNotice(`❌ Error al eliminar domiciliario: ${res.error || 'Fallo de persistencia'}`);
    } else {
      showNotice(`🗑️ Domiciliario "${target.name}" eliminado de la flota`);
    }
    setDriverToDelete(null);
  };

  const filteredDrivers = useMemo(() => {
    const q = driverSearch.trim().toLowerCase();
    return drivers.filter(
      (d) =>
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        d.plate.toLowerCase().includes(q)
    );
  }, [drivers, driverSearch]);

  // ==============================================================
  // TORRE DE CONTROL DE PEDIDOS E INTERVENCIÓN
  // ==============================================================
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('TODOS');
  const [orderRestFilter, setOrderRestFilter] = useState<string>('TODOS');
  const [inspectingOrder, setInspectingOrder] = useState<Order | null>(null);
  const [selectedDriverForOrder, setSelectedDriverForOrder] = useState<string>('');
  const [adminCancellingOrder, setAdminCancellingOrder] = useState<Order | null>(null);
  const [adminCancelReason, setAdminCancelReason] = useState<string>(
    'Intervención de soporte administrativo'
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus =
        orderStatusFilter === 'TODOS'
          ? true
          : orderStatusFilter === 'ACTIVOS'
          ? o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
          : o.status === orderStatusFilter;

      const matchesRest =
        orderRestFilter === 'TODOS' ||
        o.restaurantId === orderRestFilter ||
        o.restaurantName === orderRestFilter;

      const q = orderSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        o.restaurantName.toLowerCase().includes(q);

      return matchesStatus && matchesRest && matchesSearch;
    });
  }, [orders, orderStatusFilter, orderRestFilter, orderSearch]);

  // ==============================================================
  // DIRECTORIO CONSOLIDADO DE CLIENTES (CON PAGINACIÓN CONTROLADA)
  // ==============================================================
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerTierFilter, setCustomerTierFilter] = useState<string>('TODOS');
  const [customerPage, setCustomerPage] = useState<number>(1);
  const CUSTOMERS_PER_PAGE = 20;

  useEffect(() => {
    setCustomerPage(1);
  }, [customerSearch, customerTierFilter]);

  const customersDirectory = useMemo(() => {
    const map = new Map<
      string,
      {
        phone: string;
        name: string;
        neighborhood: string;
        street: string;
        totalOrders: number;
        deliveredCount: number;
        cancelledCount: number;
        totalSpent: number;
        lastOrderAt: string;
      }
    >();

    orders.forEach((o) => {
      const cleanPhone = o.customerPhone.replace(/\D/g, '') || o.customerPhone;
      const existing = map.get(cleanPhone);
      const isDelivered = o.status === 'DELIVERED';
      const isCancelled = o.status === 'CANCELLED';

      if (!existing) {
        map.set(cleanPhone, {
          phone: cleanPhone,
          name: o.customerName,
          neighborhood: o.deliveryAddress.neighborhood,
          street: o.deliveryAddress.street,
          totalOrders: 1,
          deliveredCount: isDelivered ? 1 : 0,
          cancelledCount: isCancelled ? 1 : 0,
          totalSpent: isDelivered ? o.total : 0,
          lastOrderAt: o.createdAt,
        });
      } else {
        existing.totalOrders += 1;
        if (isDelivered) {
          existing.deliveredCount += 1;
          existing.totalSpent += o.total;
        }
        if (isCancelled) {
          existing.cancelledCount += 1;
        }
        if (new Date(o.createdAt).getTime() > new Date(existing.lastOrderAt).getTime()) {
          existing.name = o.customerName;
          existing.neighborhood = o.deliveryAddress.neighborhood;
          existing.street = o.deliveryAddress.street;
          existing.lastOrderAt = o.createdAt;
        }
      }
    });

    const list = Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
    const q = customerSearch.trim().toLowerCase();
    return list.filter((c) => {
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.neighborhood.toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (customerTierFilter === 'TODOS') return true;
      const tier =
        c.deliveredCount >= 20
          ? 'VIP'
          : c.deliveredCount >= 10
          ? 'Oro'
          : c.deliveredCount >= 4
          ? 'Plata'
          : c.deliveredCount >= 1
          ? 'Bronce'
          : 'Nuevo';
      return tier === customerTierFilter;
    });
  }, [orders, customerSearch, customerTierFilter]);

  const totalCustomerPages = Math.max(1, Math.ceil(customersDirectory.length / CUSTOMERS_PER_PAGE));
  const safeCustomerPage = Math.min(customerPage, totalCustomerPages);
  const paginatedCustomers = useMemo(() => {
    const startIdx = (safeCustomerPage - 1) * CUSTOMERS_PER_PAGE;
    return customersDirectory.slice(startIdx, startIdx + CUSTOMERS_PER_PAGE);
  }, [customersDirectory, safeCustomerPage]);

  // ==============================================================
  // MÉTRICAS EJECUTIVAS Y ESTADÍSTICAS DE RESTAURANTES
  // ==============================================================
  const [statsRestFilter, setStatsRestFilter] = useState<string>('TODOS');
  const periodOrders = useMemo(() => filterOrdersByPeriod(orders, period), [orders, period]);
  const deliveredInPeriod = periodOrders.filter((o) => o.status === 'DELIVERED');
  const totalGMV = deliveredInPeriod.reduce((acc, o) => acc + o.total, 0);
  const totalFoodSubtotal = deliveredInPeriod.reduce((acc, o) => acc + o.subtotal, 0);
  const totalDeliveryFees = deliveredInPeriod.reduce((acc, o) => acc + o.deliveryFee, 0);
  const avgTicketInPeriod =
    deliveredInPeriod.length > 0 ? Math.round(totalGMV / deliveredInPeriod.length) : 0;
  const activeOrders = orders.filter(
    (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
  );

  // Alertas operativas en vivo
  const delayedPendingOrders = activeOrders.filter((o) => {
    if (o.status !== 'PENDING') return false;
    const elapsedMin = (Date.now() - new Date(o.createdAt).getTime()) / 60000;
    return elapsedMin >= 8;
  });
  const unassignedReadyOrders = activeOrders.filter(
    (o) => o.status === 'READY_FOR_PICKUP' && !o.driverId
  );
  const incidentOrders = activeOrders.filter((o) => Boolean(o.incidentReason));

  // Estadísticas detalladas por restaurante (0% comisiones)
  const restaurantStats = useMemo(() => {
    return restaurants
      .filter((r) => statsRestFilter === 'TODOS' || r.id === statsRestFilter)
      .map((r) => {
        const rOrders = periodOrders.filter(
          (o) => o.restaurantId === r.id || o.restaurantName === r.name
        );
        const delivered = rOrders.filter((o) => o.status === 'DELIVERED');
        const cancelled = rOrders.filter((o) => o.status === 'CANCELLED');
        const active = rOrders.filter(
          (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
        );

        const totalSales = delivered.reduce((acc, o) => acc + o.total, 0);
        const foodSales = delivered.reduce((acc, o) => acc + o.subtotal, 0);
        const deliverySales = delivered.reduce((acc, o) => acc + o.deliveryFee, 0);
        const avgTicket = delivered.length > 0 ? Math.round(totalSales / delivered.length) : 0;

        const appDeliveryOrders = delivered.filter(
          (o) => !o.orderChannel || o.orderChannel === 'delivery_app'
        );
        const posLocalOrders = delivered.filter((o) => o.orderChannel === 'pos_local');
        const posTakeoutOrders = delivered.filter((o) => o.orderChannel === 'pos_takeout');

        let cashSales = 0;
        let digitalSales = 0;
        delivered.forEach((o) => {
          if (o.isSplitPayment) {
            cashSales += Number(o.cashAmount) || 0;
            digitalSales += Number(o.transferAmount) || 0;
          } else if (o.paymentMethod === 'EFECTIVO') {
            cashSales += o.total;
          } else {
            digitalSales += o.total;
          }
        });

        // Plato más vendido del restaurante en el periodo
        const dishCounts = new Map<string, { name: string; qty: number; revenue: number }>();
        delivered.forEach((o) => {
          (o.items || []).forEach((it) => {
            const prev = dishCounts.get(it.productName) || {
              name: it.productName,
              qty: 0,
              revenue: 0,
            };
            prev.qty += it.quantity || 1;
            prev.revenue += it.subtotal || 0;
            dishCounts.set(it.productName, prev);
          });
        });
        const topDish =
          Array.from(dishCounts.values()).sort((a, b) => b.qty - a.qty)[0] || null;

        const ratedOrders = delivered.filter((o) => typeof o.rating === 'number' && o.rating > 0);
        const avgRating =
          ratedOrders.length > 0
            ? (
                ratedOrders.reduce((acc, o) => acc + (o.rating || 5), 0) / ratedOrders.length
              ).toFixed(1)
            : Number(r.rating || 5.0).toFixed(1);

        const conversionRate =
          rOrders.length > 0 ? Math.round((delivered.length / rOrders.length) * 100) : 100;

        return {
          restaurant: r,
          totalOrders: rOrders.length,
          deliveredCount: delivered.length,
          cancelledCount: cancelled.length,
          activeCount: active.length,
          conversionRate,
          totalSales,
          foodSales,
          deliverySales,
          avgTicket,
          appDeliveryCount: appDeliveryOrders.length,
          posLocalCount: posLocalOrders.length,
          posTakeoutCount: posTakeoutOrders.length,
          cashSales,
          digitalSales,
          topDish,
          avgRating,
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales);
  }, [restaurants, periodOrders, statsRestFilter]);

  // Resumen consolidado por canal y método de pago para la vista de Estadísticas
  const analyticsTotals = useMemo(() => {
    const filteredPeriodOrders =
      statsRestFilter === 'TODOS'
        ? periodOrders
        : periodOrders.filter((o) => {
            const r = restaurants.find((rest) => rest.id === statsRestFilter);
            return o.restaurantId === statsRestFilter || (r && o.restaurantName === r.name);
          });
    const delivered = filteredPeriodOrders.filter((o) => o.status === 'DELIVERED');
    const cancelled = filteredPeriodOrders.filter((o) => o.status === 'CANCELLED');

    const appCount = delivered.filter(
      (o) => !o.orderChannel || o.orderChannel === 'delivery_app'
    ).length;
    const mesaCount = delivered.filter((o) => o.orderChannel === 'pos_local').length;
    const llevarCount = delivered.filter((o) => o.orderChannel === 'pos_takeout').length;

    let cashTotal = 0;
    let digitalTotal = 0;
    delivered.forEach((o) => {
      if (o.isSplitPayment) {
        cashTotal += Number(o.cashAmount) || 0;
        digitalTotal += Number(o.transferAmount) || 0;
      } else if (o.paymentMethod === 'EFECTIVO') {
        cashTotal += o.total;
      } else {
        digitalTotal += o.total;
      }
    });

    // Ranking top 8 platos más vendidos
    const dishMap = new Map<
      string,
      { name: string; restaurantName: string; qty: number; revenue: number }
    >();
    delivered.forEach((o) => {
      (o.items || []).forEach((it) => {
        const key = `${o.restaurantName}::${it.productName}`;
        const prev = dishMap.get(key) || {
          name: it.productName,
          restaurantName: o.restaurantName,
          qty: 0,
          revenue: 0,
        };
        prev.qty += it.quantity || 1;
        prev.revenue += it.subtotal || 0;
        dishMap.set(key, prev);
      });
    });
    const topDishes = Array.from(dishMap.values())
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
      .slice(0, 8);

    const gmv = delivered.reduce((acc, o) => acc + o.total, 0);
    const foodGmv = delivered.reduce((acc, o) => acc + o.subtotal, 0);
    const avgTicket = delivered.length > 0 ? Math.round(gmv / delivered.length) : 0;
    const effectiveness =
      filteredPeriodOrders.length > 0
        ? Math.round((delivered.length / filteredPeriodOrders.length) * 100)
        : 100;

    return {
      totalOrders: filteredPeriodOrders.length,
      deliveredCount: delivered.length,
      cancelledCount: cancelled.length,
      gmv,
      foodGmv,
      avgTicket,
      effectiveness,
      appCount,
      mesaCount,
      llevarCount,
      cashTotal,
      digitalTotal,
      topDishes,
    };
  }, [periodOrders, statsRestFilter, restaurants]);

  // Exportar CSV de estadísticas de restaurantes
  const handleExportCSV = () => {
    const headers = [
      'Restaurante',
      'Barrio',
      'PedidosTotales',
      'Entregados',
      'Cancelados',
      'EfectividadPorcentaje',
      'DomiciliosApp',
      'VentasMesaPOS',
      'ParaLlevarPOS',
      'VentasComidaCOP',
      'VentasTotalesGMVCOP',
      'TicketPromedioCOP',
      'RecaudoEfectivoCOP',
      'RecaudoDigitalCOP',
      'PlatoMasVendido',
    ];
    const rows = restaurantStats.map((item) => [
      `"${item.restaurant.name.replace(/"/g, '""')}"`,
      `"${item.restaurant.neighborhood.replace(/"/g, '""')}"`,
      item.totalOrders,
      item.deliveredCount,
      item.cancelledCount,
      `${item.conversionRate}%`,
      item.appDeliveryCount,
      item.posLocalCount,
      item.posTakeoutCount,
      item.foodSales,
      item.totalSales,
      item.avgTicket,
      item.cashSales,
      item.digitalSales,
      `"${(item.topDish ? `${item.topDish.name} (${item.topDish.qty})` : 'Sin ventas').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `dondomi_estadisticas_restaurantes_${period.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotice('📥 Reporte CSV de Estadísticas descargado correctamente');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20 selection:bg-orange-500 selection:text-white">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 px-4 py-3 shadow-md border-b border-slate-800 print:hidden">
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
              <p className="text-[11px] text-slate-400">Valledupar, Cesar · Gestión Integral</p>
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
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
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
        <div className="fixed top-16 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold border border-slate-700 animate-in slide-in-from-top-2 print:hidden">
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
                Ingresa el PIN Maestro para gestionar comercios, pedidos, finanzas y flota en Valledupar.
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
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-lg shadow-slate-900/25 transition text-sm flex items-center justify-center gap-2 cursor-pointer"
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
          {/* Alertas Operativas en Tiempo Real */}
          {(delayedPendingOrders.length > 0 ||
            unassignedReadyOrders.length > 0 ||
            incidentOrders.length > 0) && (
            <div className="bg-red-950 text-white rounded-3xl p-4 border border-red-800 shadow-lg flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-400/30 flex items-center justify-center text-red-300 shrink-0">
                  <AlertCircle className="w-5 h-5 animate-pulse" />
                </div>
                <div className="text-xs space-y-0.5">
                  <span className="font-black text-red-200 uppercase tracking-wider block">
                    Alertas Operativas Activas en Valledupar
                  </span>
                  <div className="flex flex-wrap gap-3 text-slate-200">
                    {delayedPendingOrders.length > 0 && (
                      <span>
                        ⚠️ <strong>{delayedPendingOrders.length}</strong> pedido(s) sin confirmar (&gt;8 min)
                      </span>
                    )}
                    {unassignedReadyOrders.length > 0 && (
                      <span>
                        🛵 <strong>{unassignedReadyOrders.length}</strong> pedido(s) empacado(s) esperando repartidor
                      </span>
                    )}
                    {incidentOrders.length > 0 && (
                      <span>
                        🚨 <strong>{incidentOrders.length}</strong> incidencia(s) reportada(s) en ruta
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveTab('PEDIDOS');
                  setOrderStatusFilter('ACTIVOS');
                }}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl transition cursor-pointer"
              >
                Intervenir en Torre de Control
              </button>
            </div>
          )}

          {/* Filtro Global de Periodo + KPIs Ejecutivos */}
          <div className="space-y-3 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Resumen Ejecutivo de Plataforma
              </span>
              <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 text-[11px] font-bold">
                {(
                  [
                    { id: 'TODAY', label: 'Hoy' },
                    { id: 'YESTERDAY', label: 'Ayer' },
                    { id: 'WEEK', label: '7 Días' },
                    { id: 'MONTH', label: '30 Días' },
                    { id: 'ALL', label: 'Histórico' },
                  ] as { id: SettlementPeriod; label: string }[]
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPeriod(p.id)}
                    className={`px-2.5 py-1 rounded-xl transition cursor-pointer ${
                      period === p.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  GMV Entregado
                </span>
                <span className="text-lg font-black text-emerald-600 mt-1 block">
                  {formatCOP(totalGMV)}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Domicilios: {formatCOP(totalDeliveryFees)}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Pedidos Periodo
                </span>
                <span className="text-lg font-black text-slate-900 mt-1 block">
                  {deliveredInPeriod.length} / {periodOrders.length}
                </span>
                <span className="text-[10px] text-amber-600 font-bold block">
                  {activeOrders.length} activos ahora
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Ticket Promedio
                </span>
                <span className="text-lg font-black text-orange-600 mt-1 block">
                  {formatCOP(avgTicketInPeriod)}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Comida: {formatCOP(totalFoodSubtotal)}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Restaurantes
                </span>
                <span className="text-lg font-black text-slate-900 mt-1 block">
                  {restaurants.filter((r) => (r.accountStatus || 'ACTIVE') === 'ACTIVE' && r.isOpen).length} /{' '}
                  {restaurants.filter((r) => (r.accountStatus || 'ACTIVE') !== 'ARCHIVED').length}
                </span>
                <span className="text-[10px] text-emerald-600 font-bold block">Abiertos hoy</span>
              </div>

              <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Flota en Turno
                </span>
                <span className="text-lg font-black text-blue-600 mt-1 block">
                  {drivers.filter((d) => d.isActive && d.isAvailable !== false).length} / {drivers.length}
                </span>
                <span className="text-[10px] text-slate-400 block">Domiciliarios disponibles</span>
              </div>

              <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Clientes Únicos
                </span>
                <span className="text-lg font-black text-indigo-600 mt-1 block">
                  {customersDirectory.length}
                </span>
                <span className="text-[10px] text-slate-400 block">En directorio Valledupar</span>
              </div>
            </div>
          </div>

          {/* 6-Tab Navigation */}
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-3 sm:grid-cols-6 gap-1 text-xs font-bold print:hidden">
            <button
              onClick={() => setActiveTab('RESTAURANTES')}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'RESTAURANTES'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Restaurantes ({restaurants.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('PEDIDOS')}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'PEDIDOS'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Torre Pedidos ({activeOrders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('FINANZAS')}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'FINANZAS'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Estadísticas</span>
            </button>

            <button
              onClick={() => setActiveTab('DOMICILIARIOS')}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'DOMICILIARIOS'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>Flota ({drivers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('CLIENTES')}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'CLIENTES'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Clientes ({customersDirectory.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('CATEGORIAS')}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'CATEGORIAS'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Catálogo & Ajustes</span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* TAB 1: GESTIÓN COMPLETA DE RESTAURANTES */}
          {/* ============================================================== */}
          {activeTab === 'RESTAURANTES' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Gestión Completa de Restaurantes Afiliados
                  </h3>
                  <p className="text-xs text-slate-500">
                    Crea, edita información, inspecciona menús, pausa cocinas o suspende/archiva comercios.
                  </p>
                </div>

                <button
                  onClick={handleOpenCreateRest}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold px-3.5 py-2 rounded-2xl text-xs transition flex items-center gap-1.5 shadow-md shadow-orange-600/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Afiliar Nuevo Restaurante</span>
                </button>
              </div>

              {/* Barra de Filtros y Búsqueda */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {(
                    [
                      { id: 'TODOS', label: 'Activos en Red' },
                      { id: 'ABIERTOS', label: 'Cocina Abierta' },
                      { id: 'PAUSADOS', label: 'Cocina Cerrada' },
                      { id: 'SUSPENDIDOS', label: 'Suspendidos' },
                      { id: 'ARCHIVADOS', label: 'Archivados' },
                    ] as { id: RestStatusFilter; label: string }[]
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setRestFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        restFilter === f.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={restSearch}
                    onChange={(e) => setRestSearch(e.target.value)}
                    placeholder="Buscar por nombre, barrio o tel..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {filteredRestaurants.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-xs text-slate-400">
                  No se encontraron restaurantes bajo el filtro seleccionado ({restFilter}).
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredRestaurants.map((rest) => {
                    const accStatus = rest.accountStatus || 'ACTIVE';
                    const restProducts = productsByRestaurant[rest.id] || [];
                    const restOrdersCount = orders.filter(
                      (o) => o.restaurantId === rest.id || o.restaurantName === rest.name
                    ).length;

                    return (
                      <div
                        key={rest.id}
                        className={`bg-white rounded-3xl p-4 sm:p-5 border shadow-xs flex flex-col justify-between gap-3 ${
                          accStatus === 'SUSPENDED'
                            ? 'border-amber-300 bg-amber-50/10'
                            : accStatus === 'ARCHIVED'
                            ? 'border-slate-300 opacity-70'
                            : 'border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-black text-base text-slate-900">{rest.name}</h4>
                                {accStatus !== 'ACTIVE' && (
                                  <span
                                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                      accStatus === 'SUSPENDED'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {accStatus === 'SUSPENDED' ? 'Suspendido' : 'Archivado'}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">
                                {rest.neighborhood} · {rest.address}
                              </p>
                            </div>

                            <button
                              onClick={async () => {
                                const res = await toggleRestaurantStatus(rest.id);
                                if (!res.ok) {
                                  showNotice(`❌ ${res.error || 'No se pudo cambiar el estado'}`);
                                } else {
                                  showNotice(
                                    rest.isOpen
                                      ? `⏸️ Cocina de "${rest.name}" pausada`
                                      : `🟢 Cocina de "${rest.name}" abierta`
                                  );
                                }
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                rest.isOpen
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                              title="Abrir o pausar recepción de pedidos"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  rest.isOpen ? 'bg-emerald-600' : 'bg-red-600'
                                }`}
                              ></span>
                              <span>{rest.isOpen ? 'Cocina Abierta' : 'Cocina Cerrada'}</span>
                            </button>
                          </div>

                          <div className="pt-2.5 grid grid-cols-2 gap-2 text-xs text-slate-600">
                            <p>
                              <strong>WhatsApp:</strong> {rest.phone}
                            </p>
                            <p>
                              <strong>Horario:</strong> {rest.openingHours || '11:00 AM - 10:00 PM'}
                            </p>
                            <p>
                              <strong>Pedido mín.:</strong> {formatCOP(rest.minOrderAmount || 0)}
                            </p>
                            <p>
                              <strong>Pedidos totales:</strong> {restOrdersCount} órdenes
                              {restProducts.length > 0 ? ` · ${restProducts.length} platos` : ''}
                            </p>
                            <p className="col-span-2 truncate">
                              <strong>Acceso:</strong> {rest.email || `${rest.slug}@dondomi.com`} (PIN:{' '}
                              <span className="font-mono font-bold">{rest.pin || '1234'}</span>)
                            </p>
                            {(rest.nequiNumber || rest.brebKey || rest.daviplataNumber) && (
                              <p className="col-span-2 text-[11px] text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl">
                                📲 Cuentas:{' '}
                                {rest.nequiNumber ? `Nequi ${rest.nequiNumber} ` : ''}
                                {rest.brebKey ? `· Bre-B ${rest.brebKey} ` : ''}
                                {rest.daviplataNumber ? `· Davi ${rest.daviplataNumber}` : ''}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditRest(rest)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>

                            <button
                              onClick={() => setInspectingRest(rest)}
                              className="px-2.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <UtensilsCrossed className="w-3.5 h-3.5" />
                              <span>Carta & Historial</span>
                            </button>

                            <Link
                              href={`/restaurant/${rest.id}`}
                              target="_blank"
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                              title="Ver tienda pública"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>

                          <div className="flex items-center gap-1">
                            {accStatus !== 'ACTIVE' && (
                              <button
                                onClick={() => handleQuickRestAccountStatus(rest, 'ACTIVE')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px] hover:bg-emerald-100 cursor-pointer"
                              >
                                Reactivar
                              </button>
                            )}
                            {accStatus === 'ACTIVE' && (
                              <button
                                onClick={() => handleQuickRestAccountStatus(rest, 'SUSPENDED')}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold text-[11px] hover:bg-amber-100 cursor-pointer"
                                title="Ocultar temporalmente del catálogo público"
                              >
                                Suspender
                              </button>
                            )}
                            {accStatus !== 'ARCHIVED' && (
                              <button
                                onClick={() => handleQuickRestAccountStatus(rest, 'ARCHIVED')}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold text-[11px] hover:bg-slate-200 cursor-pointer"
                                title="Archivar comercio"
                              >
                                Archivar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: TORRE DE CONTROL DE PEDIDOS E INCIDENCIAS */}
          {/* ============================================================== */}
          {activeTab === 'PEDIDOS' && (
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Torre de Control de Pedidos ({filteredOrders.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Monitorea cada pedido en tiempo real, asigna o libera domiciliarios manualmente y verifica pagos.
                  </p>
                </div>
              </div>

              {/* Filtros de Torre de Pedidos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Buscar #DD, cliente o teléfono..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700"
                >
                  <option value="TODOS">Todos los estados ({orders.length})</option>
                  <option value="ACTIVOS">🔥 Solo Pedidos Activos ({activeOrders.length})</option>
                  <option value="PENDING">Nuevos / Pendientes</option>
                  <option value="PREPARING">En Cocina</option>
                  <option value="READY_FOR_PICKUP">Listos para Recoger</option>
                  <option value="ON_THE_WAY">En Camino</option>
                  <option value="DELIVERED">Entregados</option>
                  <option value="CANCELLED">Cancelados</option>
                </select>

                <select
                  value={orderRestFilter}
                  onChange={(e) => setOrderRestFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700"
                >
                  <option value="TODOS">Todos los restaurantes</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {filteredOrders.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No hay pedidos que coincidan con los filtros seleccionados.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {filteredOrders.map((o) => (
                    <div
                      key={o.id}
                      className="py-3.5 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-sm">{o.orderNumber}</span>
                          <span className="text-slate-400">•</span>
                          <span className="font-bold text-slate-800">{o.restaurantName}</span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(o.createdAt).toLocaleString('es-CO', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        <p className="text-slate-600">
                          Cliente: <strong>{o.customerName}</strong> ({o.customerPhone}) ·{' '}
                          {o.deliveryAddress.street}, {o.deliveryAddress.neighborhood}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                          <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                            Pago: {o.paymentMethod} ({o.paymentStatus === 'COMPLETED' ? 'Verificado' : 'Pendiente'})
                          </span>
                          {o.driverName ? (
                            <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold">
                              🛵 {o.driverName} ({o.deliveryFleet === 'PROPIO' ? 'Flota Propia' : 'DonDomi'})
                            </span>
                          ) : (
                            o.status !== 'CANCELLED' &&
                            o.status !== 'DELIVERED' && (
                              <span className="text-[11px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-bold">
                                Sin repartidor asignado
                              </span>
                            )
                          )}
                          {o.rating && (
                            <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-bold">
                              ★ {o.rating} {o.reviewComment ? `- "${o.reviewComment}"` : ''}
                            </span>
                          )}
                        </div>
                        {o.status === 'CANCELLED' && (
                          <p className="text-red-600 font-semibold text-[11px]">
                            Cancelado por: {o.cancelledBy || 'SISTEMA'}{' '}
                            {o.cancellationReason ? `(${o.cancellationReason})` : ''}
                          </p>
                        )}
                        {o.incidentReason && (
                          <p className="text-amber-600 font-semibold text-[11px]">
                            🚨 Incidencia repartidor: {o.incidentReason}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right mr-1">
                          <span className="font-black text-slate-900 text-sm block">
                            {formatCOP(o.total)}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
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

                        <button
                          onClick={() => {
                            setInspectingOrder(o);
                            setSelectedDriverForOrder(o.driverId || '');
                          }}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                        >
                          Gestionar
                        </button>

                        {o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && (
                          <button
                            onClick={() => {
                              setAdminCancellingOrder(o);
                              setAdminCancelReason('Intervención de soporte administrativo');
                            }}
                            className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-red-200 cursor-pointer"
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
          {/* TAB 3: CENTRO DE ESTADÍSTICAS Y RENDIMIENTO DE RESTAURANTES */}
          {/* ============================================================== */}
          {activeTab === 'FINANZAS' && (
            <div className="space-y-4">
              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-600" />
                    <h3 className="font-extrabold text-base text-slate-900">
                      Centro de Estadísticas de Restaurantes
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Analítica comercial en tiempo real por restaurante: volumen de órdenes, canales (App vs. Caja POS), métodos de pago y platos estrella (0% comisiones).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 print:hidden">
                  <select
                    value={statsRestFilter}
                    onChange={(e) => setStatsRestFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="TODOS">Todos los restaurantes ({restaurants.length})</option>
                    {restaurants.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleExportCSV}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Estadísticas CSV</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Reporte</span>
                  </button>
                </div>
              </div>

              {/* 4 Tarjetas de Resumen Analítico del Periodo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Ventas Entregadas (GMV)
                  </span>
                  <span className="text-xl font-black text-emerald-600 mt-1 block">
                    {formatCOP(analyticsTotals.gmv)}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Comida neta: <strong>{formatCOP(analyticsTotals.foodGmv)}</strong> · Ticket prom:{' '}
                    <strong>{formatCOP(analyticsTotals.avgTicket)}</strong>
                  </p>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Distribución por Canal
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-black text-slate-900">
                      {analyticsTotals.deliveredCount}
                    </span>
                    <span className="text-xs text-slate-500 font-bold">órdenes completadas</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    🛵 App: <strong>{analyticsTotals.appCount}</strong> · 🍽️ Mesa:{' '}
                    <strong>{analyticsTotals.mesaCount}</strong> · 🛍️ Llevar:{' '}
                    <strong>{analyticsTotals.llevarCount}</strong>
                  </p>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Efectividad Operativa
                  </span>
                  <span className="text-xl font-black text-blue-600 mt-1 block">
                    {analyticsTotals.effectiveness}%
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    <strong>{analyticsTotals.deliveredCount}</strong> entregados de{' '}
                    <strong>{analyticsTotals.totalOrders}</strong> ({analyticsTotals.cancelledCount}{' '}
                    cancelados)
                  </p>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Flujo por Método de Pago
                  </span>
                  <span className="text-sm font-black text-amber-700 mt-1.5 block">
                    💵 Efectivo: {formatCOP(analyticsTotals.cashTotal)}
                  </span>
                  <span className="text-sm font-black text-indigo-600 mt-0.5 block">
                    📲 Digital (Nequi/Bre-B/Davi): {formatCOP(analyticsTotals.digitalTotal)}
                  </span>
                </div>
              </div>

              {/* Tabla 1: Rendimiento Detallado por Restaurante */}
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3 overflow-x-auto">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    <span>1. Rendimiento Comparativo por Restaurante ({restaurantStats.length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Ordenado por mayor volumen de ventas entregadas
                  </span>
                </div>

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                      <th className="py-2.5 pr-3">Restaurante</th>
                      <th className="py-2.5 px-2">Pedidos (Entr. / Canc.)</th>
                      <th className="py-2.5 px-2">Canales (App / Mesa / Llevar)</th>
                      <th className="py-2.5 px-2">Ventas Comida</th>
                      <th className="py-2.5 px-2">Ventas Totales (GMV)</th>
                      <th className="py-2.5 px-2">Ticket Promedio</th>
                      <th className="py-2.5 px-2">Efectivo vs Digital</th>
                      <th className="py-2.5 pl-2">Plato Más Vendido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {restaurantStats.map((item, idx) => (
                      <tr key={item.restaurant.id} className="hover:bg-slate-50">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-black text-[10px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <span className="font-black text-slate-900 block">
                                {item.restaurant.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {item.restaurant.neighborhood} · ★ {item.avgRating}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className="font-black text-emerald-700">
                            {item.deliveredCount} entregados
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {item.cancelledCount} canc. · {item.conversionRate}% éxito
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                            <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-md">
                              🛵 App: {item.appDeliveryCount}
                            </span>
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                              🍽️ Mesa: {item.posLocalCount}
                            </span>
                            <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md">
                              🛍️ Llevar: {item.posTakeoutCount}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 font-bold text-slate-800">
                          {formatCOP(item.foodSales)}
                        </td>
                        <td className="py-3 px-2 font-black text-emerald-600">
                          {formatCOP(item.totalSales)}
                        </td>
                        <td className="py-3 px-2 font-bold text-slate-700">
                          {formatCOP(item.avgTicket)}
                        </td>
                        <td className="py-3 px-2 text-[11px]">
                          <span className="text-amber-700 font-bold block">
                            Efec: {formatCOP(item.cashSales)}
                          </span>
                          <span className="text-indigo-600 font-bold block">
                            Dig: {formatCOP(item.digitalSales)}
                          </span>
                        </td>
                        <td className="py-3 pl-2">
                          {item.topDish ? (
                            <div>
                              <span className="font-bold text-slate-900 block">
                                {item.topDish.name}
                              </span>
                              <span className="text-[10px] text-orange-600 font-bold">
                                {item.topDish.qty} unds · {formatCOP(item.topDish.revenue)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Sin ventas en periodo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tabla 2: Ranking de Platos Más Vendidos */}
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900">
                  2. Ranking de Platos Más Vendidos en el Periodo ({analyticsTotals.topDishes.length})
                </h4>

                {analyticsTotals.topDishes.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No se registran platos entregados en el periodo seleccionado.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    {analyticsTotals.topDishes.map((dish, i) => (
                      <div
                        key={`${dish.restaurantName}-${dish.name}-${i}`}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-1"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                            Top #{i + 1}
                          </span>
                          <span className="text-xs font-black text-emerald-600">
                            {dish.qty} unds
                          </span>
                        </div>
                        <p className="font-black text-xs text-slate-900 mt-1 line-clamp-1">
                          {dish.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {dish.restaurantName}
                        </p>
                        <p className="text-xs font-bold text-slate-800 pt-1 border-t border-slate-200/70">
                          Ingresos: {formatCOP(dish.revenue)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: FLOTA DE DOMICILIARIOS Y ESTADOS OPERATIVOS */}
          {/* ============================================================== */}
          {activeTab === 'DOMICILIARIOS' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Flota de Domiciliarios ({drivers.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Administra repartidores, datos de vehículo, disponibilidad de turno, inhabilitación y baja definitiva.
                  </p>
                </div>

                <button
                  onClick={handleOpenAddDriver}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-3.5 py-2 rounded-2xl text-xs transition flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Domiciliario</span>
                </button>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                    placeholder="Buscar domiciliario por nombre, celular o placa..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {filteredDrivers.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-xs text-slate-400">
                  No se encontraron domiciliarios registrados con ese criterio.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredDrivers.map((drv) => {
                    const currentOrder = activeOrders.find(
                      (o) => o.driverId === drv.id || o.driverName === drv.name
                    );
                    const isAvailable = drv.isAvailable !== false;

                    return (
                      <div
                        key={drv.id}
                        className={`bg-white rounded-3xl p-4 sm:p-5 border shadow-xs flex flex-col justify-between gap-3 ${
                          drv.isActive
                            ? 'border-slate-200'
                            : 'border-red-200 bg-red-50/10 opacity-85'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                                  drv.isActive
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-red-100 text-red-600'
                                }`}
                              >
                                <Bike className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-black text-sm text-slate-900">{drv.name}</h4>
                                  {!drv.isActive && (
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                      Inhabilitado
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500">
                                  {drv.phone} · {drv.vehicleType || 'MOTO'}: {drv.plate}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={async () => {
                                  const res = await toggleDriverAvailability(drv.id);
                                  if (res.ok) {
                                    showNotice(
                                      isAvailable
                                        ? `⏸️ Turno de "${drv.name}" pausado`
                                        : `🟢 "${drv.name}" puesto en turno`
                                    );
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                                  isAvailable
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                                title="Cambiar estado de turno"
                              >
                                {isAvailable ? '🟢 En Turno' : '⏸️ Pausado'}
                              </button>

                              <button
                                onClick={() => handleToggleDriverStatus(drv)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                                  drv.isActive
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                                }`}
                                title="Habilitar o inhabilitar cuenta del domiciliario"
                              >
                                {drv.isActive ? 'Habilitado' : 'Inhabilitado'}
                              </button>
                            </div>
                          </div>

                          <div className="pt-2 text-xs text-slate-600 space-y-1">
                            <p>
                              <strong>Correo acceso:</strong> {drv.email} ·{' '}
                              <span className="text-emerald-700 font-medium">Contraseña cifrada (scrypt)</span>
                            </p>
                            <p>
                              <strong>Carreras históricas:</strong> {drv.totalDeliveries} ·{' '}
                              <strong>Calificación:</strong> ★ {drv.rating}
                            </p>
                            {currentOrder ? (
                              <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-bold text-[11px] mt-1">
                                🛵 En carrera activa: {currentOrder.orderNumber} ({currentOrder.restaurantName})
                              </div>
                            ) : (
                              <p className="text-[11px] text-emerald-700 font-semibold">
                                {drv.isActive
                                  ? '✓ Libre para tomar pedido'
                                  : '⛔ Cuenta inhabilitada para tomar pedidos'}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleOpenEditDriver(drv)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>

                            <button
                              onClick={() => handleToggleDriverStatus(drv)}
                              className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition ${
                                drv.isActive
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>{drv.isActive ? 'Inhabilitar' : 'Habilitar'}</span>
                            </button>

                            <button
                              onClick={() => setDriverToDelete(drv)}
                              className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold flex items-center gap-1 cursor-pointer transition"
                              title="Eliminar domiciliario de la flota"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <a
                              href={`https://wa.me/57${drv.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 font-bold hover:underline"
                            >
                              WhatsApp
                            </a>
                            <a
                              href={`tel:${drv.phone}`}
                              className="text-blue-600 font-bold hover:underline"
                            >
                              Llamar
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: DIRECTORIO DE CLIENTES (CON PAGINACIÓN SEGURA) */}
          {/* ============================================================== */}
          {activeTab === 'CLIENTES' && (
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Directorio Consolidado de Clientes ({customersDirectory.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Vista paginada de alto rendimiento ({CUSTOMERS_PER_PAGE} clientes por página) para evitar sobrecarga del navegador.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Buscar cliente, celular o barrio..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Filtro por Nivel de Fidelización + Resumen de Paginación */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1 overflow-x-auto">
                  {(['TODOS', 'VIP', 'Oro', 'Plata', 'Bronce', 'Nuevo'] as const).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setCustomerTierFilter(tier)}
                      className={`px-2.5 py-1 rounded-xl font-bold text-[11px] whitespace-nowrap transition cursor-pointer ${
                        customerTierFilter === tier
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {tier === 'TODOS' ? 'Todos los niveles' : tier}
                    </button>
                  ))}
                </div>

                <span className="text-[11px] font-bold text-slate-500">
                  Mostrando{' '}
                  {customersDirectory.length === 0
                    ? 0
                    : (safeCustomerPage - 1) * CUSTOMERS_PER_PAGE + 1}
                  –
                  {Math.min(safeCustomerPage * CUSTOMERS_PER_PAGE, customersDirectory.length)} de{' '}
                  {customersDirectory.length} clientes
                </span>
              </div>

              {paginatedCustomers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No se encontraron clientes con el criterio de búsqueda o filtro actual.
                </p>
              ) : (
                <>
                  <div className="divide-y divide-slate-100 text-xs">
                    {paginatedCustomers.map((c) => {
                      const loyalty = getCustomerLoyaltyTier(c.phone, orders);
                      return (
                        <div
                          key={c.phone}
                          className="py-3 flex flex-wrap items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-900 text-sm">{c.name}</span>
                              <span className="text-slate-400">•</span>
                              <span className="font-mono font-bold text-blue-600">{c.phone}</span>
                              {loyalty && (
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${loyalty.badgeClass}`}
                                  title={`Cliente con ${loyalty.orderCount} pedidos entregados`}
                                >
                                  <span>{loyalty.icon}</span>
                                  <span>{loyalty.tier}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500 mt-0.5">
                              📍 {c.street}, Barrio {c.neighborhood} · Último pedido:{' '}
                              {new Date(c.lastOrderAt).toLocaleDateString('es-CO')}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-black text-emerald-600 text-sm block">
                                {formatCOP(c.totalSpent)}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {c.deliveredCount} entregados · {c.cancelledCount} cancelados
                              </span>
                            </div>

                            <a
                              href={`https://wa.me/57${c.phone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-xl border border-emerald-200"
                            >
                              WhatsApp
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Controles de Paginación */}
                  {totalCustomerPages > 1 && (
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        disabled={safeCustomerPage <= 1}
                        onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Anterior</span>
                      </button>

                      <span className="font-bold text-slate-700">
                        Página {safeCustomerPage} de {totalCustomerPages}
                      </span>

                      <button
                        type="button"
                        disabled={safeCustomerPage >= totalCustomerPages}
                        onClick={() =>
                          setCustomerPage((p) => Math.min(totalCustomerPages, p + 1))
                        }
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 font-bold flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <span>Siguiente</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: CATEGORÍAS Y CONFIGURACIÓN GLOBAL DE VALLEDUPAR */}
          {/* ============================================================== */}
          {activeTab === 'CATEGORIAS' && (
            <div className="space-y-5">
              {/* Categorías de comida */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">
                      Categorías del Catálogo (&quot;¿Qué se te antoja hoy?&quot;)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Aparecen en el carrusel superior de la tienda para filtrar platos y restaurantes.
                    </p>
                  </div>

                  <button
                    onClick={handleOpenAddCategory}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold px-3.5 py-2 rounded-2xl text-xs transition flex items-center gap-1.5 shadow-md shadow-orange-600/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Categoría</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl">
                          {cat.icon}
                        </div>
                        {cat.badge && (
                          <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-100/80 px-2 py-0.5 rounded-full">
                            {cat.badge}
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-black text-xs text-slate-900">{cat.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">slug: {cat.slug}</p>
                      </div>

                      <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-200/70">
                        <button
                          onClick={() => handleOpenEditCategory(cat)}
                          className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                          title="Editar categoría"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setCategoryToDelete({ id: cat.id, name: cat.name })}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer"
                          title="Eliminar categoría"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parámetros Globales */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Parámetros Globales de Operación en Valledupar
                  </h3>
                  <p className="text-xs text-slate-500">
                    Controla la tarifa plana de domicilio de la ciudad y emite avisos en vivo en el encabezado de la App.
                  </p>
                </div>

                {/* Tarifa fija de Domicilio */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">
                        Tarifa Plana de Domicilio Urbano (Valledupar)
                      </h4>
                      <p className="text-xs text-slate-500">
                        100% para el repartidor que ejecuta la entrega ($0 tarifas ocultas al cliente).
                      </p>
                    </div>
                    <span className="text-xl font-black text-orange-600">
                      {formatCOP(globalDeliveryFee)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      step={500}
                      min={0}
                      value={deliveryFeeInput}
                      onChange={(e) => setDeliveryFeeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveDeliveryFee();
                        }
                      }}
                      className="w-36 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveDeliveryFee()}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition"
                    >
                      Guardar Tarifa
                    </button>

                    <div className="flex items-center gap-1 ml-auto">
                      {[5000, 6000, 7000, 8000, 10000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleSaveDeliveryFee(preset)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                            globalDeliveryFee === preset
                              ? 'bg-orange-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {formatCOP(preset)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Banner de Anuncio Global en la App */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-orange-600" />
                    <h4 className="font-extrabold text-sm text-slate-900">
                      Banner de Comunicado Global (Visible para todos los clientes)
                    </h4>
                  </div>

                  <textarea
                    rows={2}
                    value={announcementInput}
                    onChange={(e) => setAnnouncementInput(e.target.value)}
                    placeholder="Ej: Lluvias en Valledupar: los tiempos de entrega pueden presentar demoras de 10-15 minutos."
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  ></textarea>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveAnnouncement(false)}
                      className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition"
                    >
                      Publicar Comunicado
                    </button>
                    {(globalAnnouncement || announcementInput) && (
                      <button
                        type="button"
                        onClick={() => handleSaveAnnouncement(true)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl cursor-pointer transition"
                      >
                        Quitar Aviso
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ============================================================== */}
      {/* MODAL CREAR / EDITAR RESTAURANTE COMPLETO */}
      {/* ============================================================== */}
      {isRestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="font-black text-base text-slate-900">
                {editingRest ? `Editar Restaurante: ${editingRest.name}` : 'Afiliar Nuevo Restaurante'}
              </h3>
              <button
                onClick={() => setIsRestModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRestaurant} className="space-y-3.5">
              {restFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span className="font-bold">{restFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre del Restaurante *
                  </label>
                  <input
                    type="text"
                    required
                    value={restName}
                    onChange={(e) => setRestName(e.target.value)}
                    placeholder="Ej: Asados del Valle"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Barrio en Valledupar *
                  </label>
                  <input
                    type="text"
                    required
                    value={restNeighborhood}
                    onChange={(e) => setRestNeighborhood(e.target.value)}
                    placeholder="Ej: Novalito, Los Cortijos, Centro"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dirección Exacta (Recogida) *
                  </label>
                  <input
                    type="text"
                    required
                    value={restAddress}
                    onChange={(e) => setRestAddress(e.target.value)}
                    placeholder="Ej: Calle 9 # 6-30"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Celular / WhatsApp (10 dígitos) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={restPhone}
                    onChange={(e) => setRestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="3001234567"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo de Acceso al Panel
                  </label>
                  <input
                    type="email"
                    value={restEmail}
                    onChange={(e) => setRestEmail(e.target.value)}
                    placeholder="mirestaurante@dondomi.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    PIN de Acceso (Cocina)
                  </label>
                  <input
                    type="text"
                    value={restPin}
                    onChange={(e) => setRestPin(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pedido Mín. ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={restMinOrder}
                    onChange={(e) => setRestMinOrder(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tiempo Mín (m)
                  </label>
                  <input
                    type="number"
                    min={10}
                    value={restTimeMin}
                    onChange={(e) => setRestTimeMin(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tiempo Máx (m)
                  </label>
                  <input
                    type="number"
                    min={15}
                    value={restTimeMax}
                    onChange={(e) => setRestTimeMax(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Horario de Atención
                  </label>
                  <input
                    type="text"
                    value={restHours}
                    onChange={(e) => setRestHours(e.target.value)}
                    placeholder="11:00 AM - 10:00 PM"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Estado Administrativo
                  </label>
                  <select
                    value={restAccountStatus}
                    onChange={(e) =>
                      setRestAccountStatus(
                        e.target.value as 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  >
                    <option value="ACTIVE">🟢 Activo en Catálogo</option>
                    <option value="SUSPENDED">⏸️ Suspendido Temporalmente</option>
                    <option value="ARCHIVED">📦 Archivado</option>
                  </select>
                </div>
              </div>

              {/* Categorías / Etiquetas para filtros en catálogo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Categorías en Catálogo (Etiquetas de Búsqueda)
                </label>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl max-h-32 overflow-y-auto">
                  {allAvailableCategoryTags.map((catTag) => {
                    const isSelected = restTags.includes(catTag);
                    return (
                      <button
                        key={catTag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setRestTags(restTags.filter((t) => t !== catTag));
                          } else {
                            setRestTags([...restTags, catTag]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-orange-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{catTag}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Permite a los usuarios filtrar este comercio en la página de inicio al pulsar sobre cada categoría.
                </p>
              </div>

              {/* Métodos de Pago y Cuentas del Restaurante */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-extrabold text-slate-800 block">
                  Métodos de Pago y Cuentas del Negocio
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restAcceptsCash}
                      onChange={(e) => setRestAcceptsCash(e.target.checked)}
                      className="accent-orange-600"
                    />
                    <span>Efectivo</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restAcceptsNequi}
                      onChange={(e) => setRestAcceptsNequi(e.target.checked)}
                      className="accent-orange-600"
                    />
                    <span>Nequi</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restAcceptsBreb}
                      onChange={(e) => setRestAcceptsBreb(e.target.checked)}
                      className="accent-orange-600"
                    />
                    <span>Llave Bre-B</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restAcceptsDaviplata}
                      onChange={(e) => setRestAcceptsDaviplata(e.target.checked)}
                      className="accent-orange-600"
                    />
                    <span>Daviplata</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={restNequiNumber}
                    onChange={(e) => setRestNequiNumber(e.target.value)}
                    placeholder="Cuenta Nequi"
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono"
                  />
                  <input
                    type="text"
                    value={restBrebKey}
                    onChange={(e) => setRestBrebKey(e.target.value)}
                    placeholder="Llave Bre-B"
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono"
                  />
                  <input
                    type="text"
                    value={restDaviplataNumber}
                    onChange={(e) => setRestDaviplataNumber(e.target.value)}
                    placeholder="Cuenta Daviplata"
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md cursor-pointer"
                >
                  {editingRest ? 'Guardar Cambios' : 'Afiliar Restaurante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL INSPECCIONAR CARTA E HISTORIAL DE UN RESTAURANTE */}
      {/* ============================================================== */}
      {inspectingRest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Inspección de Comercio: {inspectingRest.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectingRest.neighborhood} · Tel: {inspectingRest.phone}
                </p>
              </div>
              <button
                onClick={() => setInspectingRest(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platos del restaurante */}
            {(() => {
              const allRestProds = productsByRestaurant[inspectingRest.id] || [];
              const activeProds = allRestProds.filter((p) => !p.isArchived);
              const archivedProds = allRestProds.filter((p) => p.isArchived === true);

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-500">
                      Carta Activa ({activeProds.length} platos)
                    </h4>
                  </div>
                  {activeProds.length === 0 ? (
                    <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-2xl text-center">
                      Este comercio no tiene platos activos en su carta.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl px-3 max-h-56 overflow-y-auto">
                      {activeProds.map((p) => (
                        <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900">{p.name}</span>
                            <span className="text-slate-400 mx-1.5">•</span>
                            <span className="text-orange-600 font-semibold">{p.categoryName}</span>
                            <span className="block font-black text-slate-700">{formatCOP(p.price)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleProductAvailability(inspectingRest.id, p.id)}
                              className={`px-2.5 py-1 rounded-xl font-bold text-[11px] cursor-pointer ${
                                p.isAvailable
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {p.isAvailable ? 'Disponible' : 'Agotado'}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await archiveProduct(inspectingRest.id, p.id);
                                if (res.ok) {
                                  showNotice(`📦 "${p.name}" archivado del menú`);
                                } else {
                                  showNotice(`❌ Error: ${res.error || 'No se pudo archivar'}`);
                                }
                              }}
                              className="px-2.5 py-1 rounded-xl font-bold text-[11px] bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 transition cursor-pointer"
                              title="Archivar plato (ocultar del catálogo sin borrar pedidos pasados)"
                            >
                              Archivar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sección Platos Archivados */}
                  {archivedProds.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                          <span>📦 Platos Archivados ({archivedProds.length})</span>
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          Conservados en Supabase para historial
                        </span>
                      </div>
                      <div className="divide-y divide-amber-200/60 border border-amber-200 bg-amber-50/30 rounded-2xl px-3 max-h-44 overflow-y-auto">
                        {archivedProds.map((p) => (
                          <div key={p.id} className="py-2 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-700 line-through">{p.name}</span>
                              <span className="text-slate-400 mx-1.5">•</span>
                              <span className="text-slate-500">{p.categoryName}</span>
                              <span className="block font-bold text-slate-600">{formatCOP(p.price)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await restoreProduct(inspectingRest.id, p.id);
                                if (res.ok) {
                                  showNotice(`✅ "${p.name}" restaurado a la carta`);
                                } else {
                                  showNotice(`❌ Error: ${res.error || 'No se pudo restaurar'}`);
                                }
                              }}
                              className="px-3 py-1 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer"
                            >
                              Restaurar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Últimos pedidos del restaurante */}
            <div className="space-y-2 pt-2">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-500">
                Historial de Pedidos del Comercio
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl px-3 max-h-56 overflow-y-auto text-xs">
                {orders
                  .filter(
                    (o) =>
                      o.restaurantId === inspectingRest.id ||
                      o.restaurantName === inspectingRest.name
                  )
                  .map((o) => (
                    <div key={o.id} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-black text-slate-900">{o.orderNumber}</span> ·{' '}
                        <span>{o.customerName}</span>
                        <span className="block text-[10px] text-slate-400">
                          {new Date(o.createdAt).toLocaleString('es-CO')} · {o.paymentMethod}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold block">{formatCOP(o.total)}</span>
                        <span className="text-[10px] font-bold text-slate-500">{o.status}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL INTERVENCIÓN Y ASIGNACIÓN DE PEDIDO (TORRE DE CONTROL) */}
      {/* ============================================================== */}
      {inspectingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Gestión de Orden {inspectingOrder.orderNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectingOrder.restaurantName} → {inspectingOrder.customerName} (
                  {inspectingOrder.customerPhone})
                </p>
              </div>
              <button
                onClick={() => setInspectingOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Detalle de Items */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-700 block">Detalle del Pedido:</span>
              {inspectingOrder.items.map((it) => (
                <div key={it.id} className="flex justify-between">
                  <span>
                    {it.quantity}x {it.productName}
                  </span>
                  <span className="font-bold">{formatCOP(it.subtotal)}</span>
                </div>
              ))}
              <div className="pt-1.5 border-t border-slate-200 flex justify-between font-black text-slate-900">
                <span>
                  Total (Comida {formatCOP(inspectingOrder.subtotal)} + Domi{' '}
                  {formatCOP(inspectingOrder.deliveryFee)}):
                </span>
                <span>{formatCOP(inspectingOrder.total)}</span>
              </div>
            </div>

            {/* Verificación de Pago */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold block text-slate-800">
                  Método de Pago: {inspectingOrder.paymentMethod}
                </span>
                <span className="text-[11px] text-slate-500">
                  Estado: {inspectingOrder.paymentStatus === 'COMPLETED' ? '✓ Verificado' : '⏳ Pendiente'}
                </span>
              </div>
              {inspectingOrder.paymentStatus !== 'COMPLETED' && (
                <button
                  onClick={async () => {
                    await confirmOrderPayment(inspectingOrder.id);
                    setInspectingOrder({ ...inspectingOrder, paymentStatus: 'COMPLETED' });
                    showNotice(`✅ Pago de ${inspectingOrder.orderNumber} verificado`);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Marcar Pagado</span>
                </button>
              )}
            </div>

            {/* Asignar o Reasignar Domiciliario Manualmente */}
            {inspectingOrder.status !== 'DELIVERED' &&
              inspectingOrder.status !== 'CANCELLED' && (
                <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2.5 text-xs">
                  <span className="font-extrabold text-blue-950 block">
                    Asignación Manual de Repartidor DonDomi
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedDriverForOrder}
                      onChange={(e) => setSelectedDriverForOrder(e.target.value)}
                      className="flex-1 bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    >
                      <option value="">-- Seleccionar domiciliario --</option>
                      {drivers
                        .filter((d) => d.isActive)
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.plate}) {d.isAvailable === false ? '[Pausado]' : '[En Turno]'}
                          </option>
                        ))}
                    </select>
                    <button
                      disabled={!selectedDriverForOrder}
                      onClick={async () => {
                        const drv = drivers.find((d) => d.id === selectedDriverForOrder);
                        if (!drv) return;
                        await assignDriverByAdmin(inspectingOrder.id, drv);
                        setInspectingOrder({
                          ...inspectingOrder,
                          driverId: drv.id,
                          driverName: drv.name,
                          deliveryFleet: 'DONDOMI',
                        });
                        showNotice(
                          `🛵 Orden ${inspectingOrder.orderNumber} asignada a ${drv.name}`
                        );
                      }}
                      className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-bold px-3.5 py-2 rounded-xl cursor-pointer"
                    >
                      Asignar
                    </button>
                  </div>

                  {inspectingOrder.driverId && (
                    <button
                      onClick={async () => {
                        await unclaimOrder(
                          inspectingOrder.id,
                          'Liberado manualmente por el Administrador para reasignación'
                        );
                        setInspectingOrder({
                          ...inspectingOrder,
                          driverId: undefined,
                          driverName: undefined,
                          status: 'READY_FOR_PICKUP',
                        });
                        showNotice(
                          `🔄 Carrera ${inspectingOrder.orderNumber} liberada y devuelta al radar`
                        );
                      }}
                      className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Liberar domiciliario actual ({inspectingOrder.driverName}) y devolver a disponibles
                    </button>
                  )}
                </div>
              )}

            {/* Cambio de Estado Operativo */}
            {inspectingOrder.status !== 'DELIVERED' &&
              inspectingOrder.status !== 'CANCELLED' && (
                <div className="space-y-2 text-xs">
                  <span className="font-bold text-slate-700 block">
                    Avanzar Estado Operativo:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { st: 'PREPARING', label: 'En Cocina' },
                        { st: 'READY_FOR_PICKUP', label: 'Listo para Recoger' },
                        { st: 'ON_THE_WAY', label: 'En Camino' },
                        { st: 'DELIVERED', label: 'Entregado' },
                      ] as { st: OrderStatus; label: string }[]
                    ).map((btn) => (
                      <button
                        key={btn.st}
                        onClick={async () => {
                          await updateOrderStatus(inspectingOrder.id, btn.st);
                          setInspectingOrder({ ...inspectingOrder, status: btn.st });
                          showNotice(
                            `Estado de ${inspectingOrder.orderNumber} cambiado a ${btn.st}`
                          );
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold border transition cursor-pointer ${
                          inspectingOrder.status === btn.st
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
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
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de la Categoría
                </label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Insignia / Badge (Opcional)
                </label>
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md cursor-pointer"
                >
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL CREAR / EDITAR DOMICILIARIO */}
      {/* ============================================================== */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900">
                {editingDriver ? 'Editar Domiciliario' : 'Registrar Domiciliario'}
              </h3>
              <button
                onClick={() => setIsDriverModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="space-y-3">
              {driverFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span className="font-bold">{driverFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={drvName}
                  onChange={(e) => setDrvName(e.target.value)}
                  placeholder="Ej: Andrés Pardo"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Celular / WhatsApp (10 dígitos) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={drvPhone}
                  onChange={(e) => setDrvPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="3009876543"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vehículo</label>
                  <select
                    value={drvVehicle}
                    onChange={(e) =>
                      setDrvVehicle(e.target.value as 'MOTO' | 'BICICLETA' | 'AUTO')
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900"
                  >
                    <option value="MOTO">Moto</option>
                    <option value="BICICLETA">Bicicleta</option>
                    <option value="AUTO">Auto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Placa</label>
                  <input
                    type="text"
                    value={drvPlate}
                    onChange={(e) => setDrvPlate(e.target.value)}
                    placeholder="Ej: ABC-45D"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo de Acceso
                </label>
                <input
                  type="email"
                  value={drvEmail}
                  onChange={(e) => setDrvEmail(e.target.value)}
                  placeholder="repartidor@dondomi.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editingDriver
                    ? 'Nueva Contraseña (dejar en blanco para conservar actual)'
                    : 'Contraseña Personal de Acceso *'}
                </label>
                <input
                  type="password"
                  value={drvPassword}
                  onChange={(e) => setDrvPassword(e.target.value)}
                  placeholder={
                    editingDriver
                      ? 'Sin cambios (conservar contraseña actual)'
                      : 'Mínimo 6 caracteres'
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Se almacena como hash scrypt en Supabase. Mínimo 6 caracteres; prohibidas claves triviales.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDriverModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md cursor-pointer"
                >
                  {editingDriver ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMAR ELIMINACIÓN DE CATEGORÍA */}
      {/* ============================================================== */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-slate-800 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
              🗑️
            </div>
            <div className="text-center">
              <h4 className="font-black text-slate-900 text-base">¿Eliminar categoría?</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                ¿Deseas retirar permanentemente la categoría{' '}
                <strong>&quot;{categoryToDelete.name}&quot;</strong> de la pantalla principal de DonDomi?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="py-2.5 px-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/25 transition cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMAR ELIMINACIÓN DE DOMICILIARIO */}
      {/* ============================================================== */}
      {driverToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-slate-800 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
              🗑️
            </div>
            <div className="text-center">
              <h4 className="font-black text-slate-900 text-base">¿Eliminar domiciliario?</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                ¿Deseas retirar permanentemente al domiciliario{' '}
                <strong>&quot;{driverToDelete.name}&quot;</strong> ({driverToDelete.plate}) de la flota de DonDomi?
              </p>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Si solo deseas pausar su acceso temporalmente, puedes usar el botón <strong>Inhabilitar</strong>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDriverToDelete(null)}
                className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDriver}
                className="py-2.5 px-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/25 transition cursor-pointer"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CANCELACIÓN FORZOSA ADMINISTRATIVA */}
      {/* ============================================================== */}
      {adminCancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-slate-800 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                  ⚠️
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">
                    Intervención Administrativa
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Cancelación de emergencia para orden #{adminCancellingOrder.orderNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAdminCancellingOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Ingresa el motivo que se registrará en la auditoría del pedido y se notificará al cliente y restaurante:
              </p>
              <textarea
                rows={3}
                required
                value={adminCancelReason}
                onChange={(e) => setAdminCancelReason(e.target.value)}
                placeholder="Describe el motivo de la intervención..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdminCancellingOrder(null)}
                className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Mantener orden
              </button>
              <button
                type="button"
                onClick={async () => {
                  const success = await updateOrderStatus(
                    adminCancellingOrder.id,
                    'CANCELLED',
                    adminCancelReason.trim() || 'Intervención administrativa de emergencia',
                    'ADMINISTRADOR'
                  );
                  if (success) {
                    showNotice(`Pedido ${adminCancellingOrder.orderNumber} cancelado forzosamente`);
                  } else {
                    showNotice('❌ No se pudo cancelar el pedido');
                  }
                  setAdminCancellingOrder(null);
                }}
                className="py-2.5 px-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/25 transition cursor-pointer"
              >
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL ADVERTENCIA: RESTAURANTE CON PEDIDOS PENDIENTES */}
      {/* ============================================================== */}
      {pendingOrdersWarning && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600 pb-2 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 leading-tight">
                  Acción Bloqueada: Pedidos Pendientes
                </h3>
                <p className="text-xs text-slate-500">
                  {pendingOrdersWarning.restaurant.name}
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                No es posible {pendingOrdersWarning.targetStatus === 'SUSPENDED' ? 'suspender' : 'archivar'} este restaurante porque tiene{' '}
                <strong className="text-amber-700">
                  {pendingOrdersWarning.pendingOrders.length} pedido(s) en estado PENDIENTE
                </strong>{' '}
                esperando aceptación.
              </p>
              <p className="text-[11px] text-slate-500">
                Para proteger la experiencia del cliente y la integridad del marketplace, el restaurante o el administrador debe aceptar o rechazar estos pedidos antes de suspender la tienda.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 max-h-40 overflow-y-auto space-y-2">
              {pendingOrdersWarning.pendingOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-black text-slate-900">{o.orderNumber}</span> ·{' '}
                    <span>{o.customerName}</span>
                    <span className="block text-[10px] text-slate-400">{formatCOP(o.total)}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-100 text-amber-800">
                    PENDIENTE
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setOrderRestFilter(pendingOrdersWarning.restaurant.name);
                  setActiveTab('PEDIDOS');
                  setPendingOrdersWarning(null);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Ir a Torre de Control para Gestionar Pedidos</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingOrdersWarning(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Entendido, Volver
                </button>
                <button
                  type="button"
                  onClick={handleForceEmergencySuspension}
                  className="px-3 py-2 rounded-xl text-[11px] font-bold text-red-600 hover:bg-red-50 cursor-pointer"
                  title="Intervención de emergencia con registro"
                >
                  Suspender de Emergencia
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
