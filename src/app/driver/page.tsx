'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bike,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  Clock,
  ArrowLeft,
  DollarSign,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { formatCOP } from '@/lib/utils';

export default function DriverPage() {
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [activeStep, setActiveStep] = useState<'OFFER' | 'PICKING_UP' | 'ON_WAY' | 'DELIVERED'>('OFFER');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 px-4 py-3 shadow-md border-b border-slate-800">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight">Portal Domiciliario</span>
                <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-1.5 py-0.2 rounded-sm border border-blue-500/30">
                  Valledupar
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Javier Morales · Moto</p>
            </div>
          </div>

          {/* Toggle de Disponibilidad */}
          <button
            onClick={() => setIsAvailable(!isAvailable)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
              isAvailable
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-400 animate-ping' : 'bg-red-400'}`}
            ></span>
            <span>{isAvailable ? 'En Servicio' : 'Pausado'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Info card arquitectura futura */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] leading-tight">
            <strong>Arquitectura preparada:</strong> En la primera etapa cada restaurante despacha sus propios domicilios. Esta sección está lista para cuando asocies tu propia flota de domiciliarios DonDomi.
          </p>
        </div>

        {/* Resumen de Métricas del Domiciliario */}
        <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-3xl border border-slate-200 shadow-2xs text-center">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Carreras Hoy</span>
            <span className="text-lg font-black text-slate-900 mt-0.5 block">6</span>
          </div>
          <div className="border-x border-slate-100">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Ganancia</span>
            <span className="text-lg font-black text-emerald-600 mt-0.5 block">{formatCOP(30000)}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Calificación</span>
            <span className="text-lg font-black text-amber-500 mt-0.5 block">★ 4.9</span>
          </div>
        </div>

        {/* Sección: Carrera Activa / Disponible */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Bike className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {activeStep === 'OFFER' ? 'Carrera Disponible' : 'Entrega en Curso'}
                </h3>
                <p className="text-[11px] text-slate-400">Orden #DD-1042</p>
              </div>
            </div>

            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              +{formatCOP(5000)} Ganancia
            </span>
          </div>

          {/* Ruta: Recogida & Entrega en Valledupar */}
          <div className="space-y-3 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {/* Punto A: Recogida */}
            <div className="relative">
              <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-orange-600 border-2 border-white shadow-xs"></span>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                1. Recoger en restaurante
              </span>
              <p className="text-xs font-bold text-slate-900">Pollos El Valle</p>
              <p className="text-[11px] text-slate-500">Cra 9 # 12-40, Centro Histórico</p>
            </div>

            {/* Punto B: Entrega */}
            <div className="relative pt-2">
              <span className="absolute -left-6 top-3 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white shadow-xs"></span>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                2. Entregar al cliente
              </span>
              <p className="text-xs font-bold text-slate-900">Carlos Gutiérrez</p>
              <p className="text-[11px] text-slate-500">Calle 8 # 6-30, Novalito (Reja blanca)</p>
            </div>
          </div>

          {/* Información del pedido */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Método de cobro:</span>
              <span className="font-bold text-slate-900">Pagado por Nequi</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Distancia estimada:</span>
              <span className="font-semibold text-slate-800">1.8 km (8 min)</span>
            </div>
          </div>

          {/* Botones de acción según el estado */}
          <div className="pt-2 space-y-2">
            {activeStep === 'OFFER' && (
              <button
                onClick={() => setActiveStep('PICKING_UP')}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 text-white font-extrabold py-3 rounded-2xl shadow-md shadow-orange-500/25 transition text-sm"
              >
                Aceptar Carrera
              </button>
            )}

            {activeStep === 'PICKING_UP' && (
              <button
                onClick={() => setActiveStep('ON_WAY')}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3 rounded-2xl shadow-md shadow-blue-600/25 transition text-sm flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Pedido Recogido</span>
              </button>
            )}

            {activeStep === 'ON_WAY' && (
              <button
                onClick={() => setActiveStep('DELIVERED')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-2xl shadow-md shadow-emerald-600/25 transition text-sm flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Entrega al Cliente</span>
              </button>
            )}

            {activeStep === 'DELIVERED' && (
              <div className="space-y-2">
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-2xl text-center text-xs font-bold border border-emerald-200">
                  🎉 ¡Entrega finalizada con éxito! +$5.000 COP acreditados.
                </div>
                <button
                  onClick={() => setActiveStep('OFFER')}
                  className="w-full bg-slate-900 text-white text-xs font-bold py-2.5 rounded-2xl"
                >
                  Buscar nuevas carreras
                </button>
              </div>
            )}

            {activeStep !== 'OFFER' && activeStep !== 'DELIVERED' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href="tel:3001234567"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 transition"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-600" />
                  <span>Llamar Cliente</span>
                </a>
                <a
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 border border-slate-200 transition"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span>Abrir GPS</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
