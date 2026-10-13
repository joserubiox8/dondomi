'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Lock,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, loginWithEmail, logout } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showDemoHelpers, setShowDemoHelpers] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await loginWithEmail(email, password);
      if (res.success) {
        if (res.role === 'ADMINISTRADOR') {
          router.push('/admin');
        } else if (res.role === 'RESTAURANTE') {
          router.push('/merchant');
        } else if (res.role === 'DOMICILIARIO') {
          router.push('/driver');
        } else {
          router.push('/');
        }
      } else {
        setErrorMessage(res.error || 'Credenciales inválidas. Verifica tu correo y contraseña.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 selection:bg-orange-600 selection:text-white">
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between py-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition group"
        >
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span>Volver al inicio</span>
        </Link>

        {currentUser && (
          <button
            onClick={logout}
            className="text-xs text-red-400 hover:text-red-300 font-bold bg-red-950/40 border border-red-800/40 px-3 py-1.5 rounded-full transition"
          >
            Cerrar sesión activa
          </button>
        )}
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto my-auto py-4">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
          {/* Brand Heading */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-orange-600 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 mx-auto">
              <span className="text-white font-black text-2xl tracking-tighter">DD</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Ingresar a DonDomi
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Escribe tu correo y contraseña para acceder a tu cuenta
              </p>
            </div>
          </div>

          {/* Aviso si ya hay sesión activa */}
          {currentUser && (
            <div className="bg-emerald-950/60 border border-emerald-600/40 rounded-2xl p-3 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2 min-w-0 truncate">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="truncate">
                  Sesión activa: <strong>{currentUser.name}</strong> ({currentUser.role})
                </span>
              </div>
              <button
                onClick={() => {
                  if (currentUser.role === 'ADMINISTRADOR') router.push('/admin');
                  else if (currentUser.role === 'RESTAURANTE') router.push('/merchant');
                  else if (currentUser.role === 'DOMICILIARIO') router.push('/driver');
                  else router.push('/');
                }}
                className="text-[11px] underline font-bold hover:text-white flex-shrink-0 ml-2"
              >
                Ir a mi panel
              </button>
            </div>
          )}

          {/* Error notice */}
          {errorMessage && (
            <div className="bg-red-950/60 border border-red-500/50 text-red-300 text-xs p-3.5 rounded-2xl flex items-start gap-2.5 animate-in shake">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <span className="leading-tight">{errorMessage}</span>
            </div>
          )}

          {/* Clean Form: Only Email and Password */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@dondomi.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 transition transform active:scale-98 disabled:opacity-50 text-sm flex items-center justify-center gap-2 mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Verificando...' : 'Iniciar Sesión'}</span>
            </button>
          </form>

          {/* Desplegable de Cuentas de Demostración Rápida */}
          <div className="pt-2 border-t border-slate-700/60">
            <button
              type="button"
              onClick={() => setShowDemoHelpers(!showDemoHelpers)}
              className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 hover:text-slate-200 py-1 transition"
            >
              <span className="flex items-center gap-1.5 text-orange-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cuentas de prueba rápida (1 clic)</span>
              </span>
              {showDemoHelpers ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>

            {showDemoHelpers && (
              <div className="mt-2.5 p-3 bg-slate-900/90 rounded-2xl border border-slate-700/80 space-y-2 animate-in fade-in duration-200 text-xs">
                <p className="text-[10px] text-slate-400">
                  Toca un rol para rellenar los datos de prueba automáticamente:
                </p>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin@dondomi.com', 'admin2026')}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition"
                  >
                    <span className="text-[10px] font-bold text-orange-400 block">🛡️ Administrador</span>
                    <span className="text-[11px] text-white font-mono block">admin@dondomi.com</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('elvalle@dondomi.com', 'cocina1234')}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition"
                  >
                    <span className="text-[10px] font-bold text-amber-400 block">🍳 Pollos El Valle</span>
                    <span className="text-[11px] text-white font-mono block">elvalle@dondomi.com</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('pedro@dondomi.com', 'cocina1234')}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition"
                  >
                    <span className="text-[10px] font-bold text-amber-400 block">🍳 Asador de Pedro</span>
                    <span className="text-[11px] text-white font-mono block">pedro@dondomi.com</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('javier@dondomi.com', 'domi1234')}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition"
                  >
                    <span className="text-[10px] font-bold text-blue-400 block">🛵 Domiciliario</span>
                    <span className="text-[11px] text-white font-mono block">javier@dondomi.com</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto text-center py-2 text-[11px] text-slate-500">
        DonDomi Valledupar · Plataforma Operativa Local
      </footer>
    </div>
  );
}
