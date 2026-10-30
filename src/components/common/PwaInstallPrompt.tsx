'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, MoreVertical, Share } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);

    // 1. Registrar Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    }

    if (typeof window !== 'undefined') {
      // Limpiar bloqueo permanente anterior si existía
      sessionStorage.removeItem('dondomi_pwa_dismissed');

      // 2. Verificar si ya está corriendo como App instalada (standalone)
      const standaloneMatch =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;

      if (standaloneMatch) {
        setIsStandalone(true);
        return;
      }

      // Restaurar si el usuario solo lo minimizó a pastilla compacta
      const minimizedPref = sessionStorage.getItem('dondomi_pwa_minimized');
      if (minimizedPref === 'true') {
        setIsMinimized(true);
      }

      // Detectar iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isAppleIos = /iphone|ipad|ipod/.test(userAgent);
      setIsIos(isAppleIos);

      // Capturar evento nativo de instalación en Android/Chrome/Edge
      const handleBeforeInstall = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      const handleAppInstalled = () => {
        setIsStandalone(true);
        setDeferredPrompt(null);
        setShowGuideModal(false);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
      } catch {
        setShowGuideModal(true);
      }
    } else {
      // Si el navegador no disparó beforeinstallprompt aún o es iOS, mostramos guía clara
      setShowGuideModal(true);
    }
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dondomi_pwa_minimized', 'true');
    }
  };

  if (!mounted || isStandalone) return null;

  return (
    <>
      {/* Versión Minimizada: Pastilla flotante discreta que SIEMPRE permite recuperar la instalación */}
      {isMinimized ? (
        <div className="fixed bottom-4 left-4 z-40 print:hidden animate-in fade-in duration-200">
          <button
            type="button"
            onClick={handleInstallClick}
            className="bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 rounded-full px-3.5 py-2 shadow-xl flex items-center gap-2 transition transform active:scale-95 cursor-pointer"
            title="Instalar aplicación DonDomi"
          >
            <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-xs">
              <Download className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-extrabold text-white tracking-tight">
              Instalar App
            </span>
          </button>
        </div>
      ) : (
        /* Versión Expandida: Banner flotante con alto contraste y botón claro */
        <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-40 print:hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-slate-900 text-white border border-slate-700 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-black text-sm shadow-md flex-shrink-0">
                DD
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-wider block leading-none">
                  App Oficial Valledupar
                </span>
                <span className="text-xs sm:text-sm font-black text-white truncate block mt-0.5">
                  Instalar DonDomi
                </span>
                <span className="text-[11px] text-slate-300 truncate block">
                  Pide más rápido desde tu inicio
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-orange-600/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Instalar</span>
              </button>

              <button
                type="button"
                onClick={handleMinimize}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Minimizar a botón pequeño"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Instructivo de Instalación (Android / iPhone) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-slate-900 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm text-slate-900">
                  {isIos ? 'Instalar DonDomi en iPhone' : 'Instalar App DonDomi'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIos ? (
              <>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Agrega <strong>DonDomi</strong> a tu pantalla de inicio en iPhone en 2 pasos rápidos:
                </p>
                <ol className="text-xs space-y-3 text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                      1
                    </span>
                    <span>
                      Toca el botón <strong>Compartir</strong>{' '}
                      <Share className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> en la barra de Safari.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                      2
                    </span>
                    <span>
                      Selecciona <strong>&quot;Agregar a inicio&quot;</strong> (Add to Home Screen) y toca <strong>Agregar</strong>.
                    </span>
                  </li>
                </ol>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Para instalar la aplicación oficial de <strong>DonDomi</strong> en tu teléfono Android:
                </p>
                <ol className="text-xs space-y-3 text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                      1
                    </span>
                    <span>
                      Toca el menú de opciones de tu navegador{' '}
                      <MoreVertical className="w-3.5 h-3.5 inline text-slate-800 mx-0.5" /> (arriba a la derecha en Chrome).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                      2
                    </span>
                    <span>
                      Elige <strong>&quot;Instalar aplicación&quot;</strong> o{' '}
                      <strong>&quot;Agregar a la pantalla principal&quot;</strong>.
                    </span>
                  </li>
                </ol>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-extrabold py-2.5 rounded-2xl text-xs transition shadow-md cursor-pointer"
            >
              ¡Listo, entendido!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
