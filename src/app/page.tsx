import Header from '@/components/common/Header';
import SearchBar from '@/components/home/SearchBar';
import ActiveOrderBanner from '@/components/home/ActiveOrderBanner';
import CategoryChips from '@/components/home/CategoryChips';
import RestaurantList from '@/components/home/RestaurantList';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 space-y-5">
        {/* Banner de pedido activo persistente (si el cliente tiene un pedido en curso) */}
        <ActiveOrderBanner />

        {/* Buscador & Filtros rápidos */}
        <SearchBar />

        {/* Carrusel de categorías de comida con indicador deslizante y Salchipapas */}
        <CategoryChips />

        {/* Lista de restaurantes con filtros y destacados */}
        <RestaurantList />
      </main>
    </div>
  );
}
