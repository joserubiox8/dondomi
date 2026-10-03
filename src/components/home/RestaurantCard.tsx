'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Bike, MapPin, ChevronRight } from 'lucide-react';
import { Restaurant } from '@/types';
import { useApp } from '@/context/AppContext';
import { calculateDeliveryEstimate } from '@/lib/delivery';
import { formatCOP } from '@/lib/utils';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const { currentNeighborhood } = useApp();

  // Calcular tarifa y tiempo estimado dinámicamente según el barrio actual del cliente
  const deliveryInfo = calculateDeliveryEstimate(
    restaurant.neighborhood,
    currentNeighborhood,
    restaurant.deliveryFeeBase,
    restaurant.estimatedTimeMin,
    restaurant.estimatedTimeMax
  );

  return (
    <Link
      href={`/restaurant/${restaurant.id}`}
      className="group block bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 active:scale-[0.99]"
    >
      {/* Banner Image Container */}
      <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
        <Image
          src={restaurant.bannerUrl}
          alt={restaurant.name}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

        {/* Top badges: Status & Featured */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {restaurant.isOpen ? (
              <span className="bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                Abierto
              </span>
            ) : (
              <span className="bg-slate-800/90 text-slate-300 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-xs">
                Cerrado
              </span>
            )}

            {restaurant.featured && (
              <span className="bg-amber-500 text-slate-900 text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-full shadow-sm">
                ★ Destacado
              </span>
            )}
          </div>

          {/* Barrio Pill (muestra ubicación sin sesgo de calificaciones) */}
          <div className="bg-slate-950/80 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1 border border-white/20">
            <MapPin className="w-3 h-3 text-orange-400" />
            <span className="truncate max-w-[120px]">{restaurant.neighborhood}</span>
          </div>
        </div>

        {/* Bottom banner info: Restaurant Name & Tags */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl text-white drop-shadow-sm leading-tight group-hover:text-orange-200 transition">
                {restaurant.name}
              </h3>
              <p className="text-xs text-slate-200 font-medium line-clamp-1 mt-0.5">
                {restaurant.tags.join(' · ')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white p-0.5 shadow-md flex-shrink-0 relative overflow-hidden border border-white">
              <Image
                src={restaurant.logoUrl}
                alt={`${restaurant.name} logo`}
                fill
                sizes="40px"
                className="object-cover rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card Content & Logistics info */}
      <div className="p-4 space-y-3">
        {/* Description brief */}
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {restaurant.description}
        </p>

        {/* Logistics metrics row */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-700">
          {/* Estimated time */}
          <div className="flex items-center gap-1.5 font-medium">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <Clock className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <div>
              <span className="font-bold text-slate-900">
                {deliveryInfo.timeMin}–{deliveryInfo.timeMax} min
              </span>
            </div>
          </div>

          <span className="text-slate-300">•</span>

          {/* Delivery Fee */}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <Bike className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block leading-none">Domicilio</span>
              <span className="font-bold text-slate-900">
                {formatCOP(deliveryInfo.fee)}
              </span>
            </div>
          </div>

          <span className="text-slate-300">•</span>

          {/* Location note */}
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span className="truncate max-w-[80px]">{restaurant.neighborhood}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
