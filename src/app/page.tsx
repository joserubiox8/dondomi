import Header from '@/components/common/Header';
import SearchBar from '@/components/home/SearchBar';
import PromoBanner from '@/components/home/PromoBanner';
import CategoryChips from '@/components/home/CategoryChips';
import RestaurantList from '@/components/home/RestaurantList';
import { Utensils, HeartHandshake, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 space-y-6">
        {/* Buscador & Filtros rápidos */}
        <SearchBar />

        {/* Banner promocional vallenato */}
        <PromoBanner />

        {/* Carrusel de categorías de comida */}
        <CategoryChips />

        {/* Lista de restaurantes con filtros y destacados */}
        <RestaurantList />

        {/* Confianza local DonDomi Valledupar */}
        <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-1.5 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">Menús 100% Locales</h4>
            <p className="text-[11px] text-slate-500">
              Restaurantes tradicionales y marcas queridas de Valledupar.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-1.5 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">Tarifa Justa & Cercana</h4>
            <p className="text-[11px] text-slate-500">
              Cálculo transparente según la distancia en Valledupar.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-1.5 shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">Pagos Seguros</h4>
            <p className="text-[11px] text-slate-500">
              Paga con Nequi, Daviplata o Efectivo contraentrega.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
