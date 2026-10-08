'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Store,
  Bike,
  Shield,
  KeyRound,
  Phone,
  User,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

type LoginRoleTab = 'RESTAURANTE' | 'DOMICILIARIO' | 'ADMINISTRADOR';

export default function LoginPage() {
  const router = useRouter();
  const {
    restaurants,
    currentUser,
    loginAsAdmin,
    loginAsRestaurant,
    loginAsDriver,
    logout,
  } = useApp();

  const [activeTab, setActiveTab] = useState<LoginRoleTab>('RESTAURANTE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Formulario Restaurante
  const [selectedRestId, setSelectedRestId] = useState<string>(restaurants[0]?.id || 'rest-1');
  const [restaurantPin, setRestaurantPin] = useState<string>('');

  // Formulario Domiciliario
  const [driverName, setDriverName] = useState<string>('Javier Morales');
  const [driverPhone, setDriverPhone] = useState<string>('3001234567');
  const [driverPin, setDriverPin] = useState<string>('');

  // Formulario Administrador
  const [adminPin, setAdminPin] = useState<string>('');

  const handleRestaurantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await loginAsRestaurant(selectedRestId, restaurantPin);
      if (res.success) {
        router.push('/merchant');
      } else {
        setErrorMessage(res.error || 'Credenciales inválidas.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await loginAsDriver(driverName, driverPhone, driverPin);
      if (res.success) {
        router.push('/driver');
      } else {
        setErrorMessage(res.error || 'Credenciales inválidas.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await loginAsAdmin(adminPin);
      if (res.success) {
        router.push('/admin');
      } else {
        setErrorMessage(res.error || 'Credenciales inválidas.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between py-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition group"
        >
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span>Volver a DonDomi</span>
        </Link>

        {currentUser && (
          <button
            onClick={logout}
            className="text-xs text-red-400 hover:text-red-300 font-bold bg-red-950/40 border border-red-800/40 px-3 py-1.5 rounded-full"
          >
            Cerrar sesión activa
          </button>
        )}
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-6">
          {/* Logo & Heading */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-orange-600 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 mx-auto">
              <span className="text-white font-black text-2xl tracking-tighter">DD</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Ingreso Operativo
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Accede a tu panel en la red DonDomi Valledupar
              </p>
            </div>
          </div>

          {/* Current user notification if already logged in */}
          {currentUser && (
            <div className="bg-emerald-950/60 border border-emerald-600/40 rounded-2xl p-3 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  Sesión activa como <strong>{currentUser.name}</strong> ({currentUser.role})
                </span>
              </div>
              <button
                onClick={() => {
                  if (currentUser.role === 'ADMINISTRADOR') router.push('/admin');
                  else if (currentUser.role === 'RESTAURANTE') router.push('/merchant');
                  else router.push('/driver');
                }}
                className="text-[11px] underline font-bold hover:text-white"
              >
                Ir al panel
              </button>
            </div>
          )}

          {/* Role selector tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900/80 rounded-2xl border border-slate-700/60 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('RESTAURANTE');
                setErrorMessage(null);
              }}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === 'RESTAURANTE'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Restaurante</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('DOMICILIARIO');
                setErrorMessage(null);
              }}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === 'DOMICILIARIO'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Domiciliario</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('ADMINISTRADOR');
                setErrorMessage(null);
              }}
              className={`py-2 px-1 rounded-xl transition flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === 'ADMINISTRADOR'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="bg-red-950/60 border border-red-500/50 text-red-300 text-xs p-3 rounded-2xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form 1: Restaurante / Cocina */}
          {activeTab === 'RESTAURANTE' && (
            <form onSubmit={handleRestaurantSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Selecciona tu Restaurante
                </label>
                <select
                  value={selectedRestId}
                  onChange={(e) => setSelectedRestId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3.5 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.neighborhood})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    PIN de Cocina (4 dígitos)
                  </label>
                  <span className="text-[10px] text-slate-400">Prueba: 1234</span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={6}
                    value={restaurantPin}
                    onChange={(e) => setRestaurantPin(e.target.value)}
                    placeholder="••••"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-sm text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 transition transform active:scale-98 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                <Store className="w-4 h-4" />
                <span>{isLoading ? 'Ingresando...' : 'Entrar a Comandas y Cocina'}</span>
              </button>
            </form>
          )}

          {/* Form 2: Domiciliario */}
          {activeTab === 'DOMICILIARIO' && (
            <form onSubmit={handleDriverSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Nombre completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Ej: Javier Morales"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Celular WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="300 123 4567"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    PIN de Domiciliario
                  </label>
                  <span className="text-[10px] text-slate-400">Prueba: 1234</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={6}
                    value={driverPin}
                    onChange={(e) => setDriverPin(e.target.value)}
                    placeholder="••••"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-sm text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 transition transform active:scale-98 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                <Bike className="w-4 h-4" />
                <span>{isLoading ? 'Iniciando turno...' : 'Iniciar Turno de Domicilios'}</span>
              </button>
            </form>
          )}

          {/* Form 3: Administrador Master */}
          {activeTab === 'ADMINISTRADOR' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    PIN Maestro de Administrador
                  </label>
                  <span className="text-[10px] text-slate-400">PIN: 2026</span>
                </div>
                <div className="relative">
                  <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={6}
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="••••"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-sm text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-tight">
                Control de restaurantes afiliados, activación de menús, tarifas y auditoría operativa.
              </p>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 transition transform active:scale-98 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isLoading ? 'Verificando...' : 'Acceder al Panel Maestro'}</span>
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer Credentials Note */}
      <footer className="max-w-md w-full mx-auto text-center py-2 text-[11px] text-slate-500">
        DonDomi Valledupar · Plataforma Operativa Local
      </footer>
    </div>
  );
}
