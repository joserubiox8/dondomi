'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Check } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosModal, setShowIosModal] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    // 1. Registrar Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    }

    // 2. Verificar si ya está corriendo en modo standalone (instalada)
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;

      if (isStandalone) return;

      const dismissed = sessionStorage.getItem('dondomi_pwa_dismissed');
      if (dismissed === 'true') {
        setIsDismissed(true);
      }

      // Detectar iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isAppleIos = /iphone|ipad|ipod/.test(userAgent);
      setIsIos(isAppleIos);

      // Evento Android/Chrome
      const handleBeforeInstall = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosModal(true);
    }
  };

  const handleClose = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dondomi_pwa_dismissed', 'true');
    }
  };

  if (isDismissed || (!isInstallable && !isIos)) return null;

  return (
    <>
      {/* Botón flotante discreto de instalación */}
      <div className="fixed bottom-4 left-4 z-40 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl p-2 sm:p-2.5 shadow-2xl flex items-center gap-2.5">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 hover:opacity-90 transition px-1"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-xs">
              <Download className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block leading-none">
                App Móvil
              </span>
              <span className="text-xs font-black text-white leading-tight block">
                Instalar DonDomi
              </span>
            </div>
          </button>

          <button
            onClick={handleClose}
            className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
            title="Cerrar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modal instructivo para iPhone / Safari */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-slate-900 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-orange-600" />
                <h3 className="font-black text-sm">Instalar DonDomi en iPhone</h3>
              </div>
              <button
                onClick={() => setShowIosModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              En Safari para iPhone no requiere App Store. Sigue estos 2 pasos:
            </p>

            <ol className="text-xs space-y-2.5 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                  1
                </span>
                <span>
                  Toca el botón <strong>Compartir</strong> (ícono del cuadrado con la flecha hacia arriba) en la barra inferior de Safari.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                  2
                </span>
                <span>
                  Desliza hacia abajo y selecciona <strong>&quot;Añadir a la pantalla de inicio&quot;</strong>.
                </span>
              </li>
            </ol>

            <button
              onClick={() => setShowIosModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-2xl text-xs transition"
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
