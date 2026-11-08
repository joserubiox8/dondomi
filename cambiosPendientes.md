# Cambios Pendientes — DonDomi (Valledupar)

Este archivo actúa como bitácora viva de mejoras, optimizaciones y ajustes identificados durante la revisión de la plataforma. Cada cambio se clasifica con su estado y detalle técnico.

---

## Índice de Estados
- ⏳ **Pendiente**: Identificado y documentado, en espera de ejecución.
- 🚧 **En Progreso**: En proceso de desarrollo o prueba.
- ✅ **Completado**: Implementado, probado y validado con 0 errores.

---

## 1. Rendimiento y Escalabilidad de Catálogo

### ✅ Item 1.1: Carga Progresiva y Ordenamiento Inteligente de Restaurantes
* **Ubicación**: `src/components/home/RestaurantList.tsx` y `src/services/dataService.ts`.
* **Problema resuelto**: Se eliminó el renderizado masivo y se implementó ordenamiento por conveniencia natural y carga por lotes.
* **Solución implementada**:
  1. **Ordenamiento Inteligente**:
     - Restaurantes abiertos (`isOpen: true`) aparecen siempre de primero, ordenados por menor tiempo estimado de entrega y mejor calificación.
     - Restaurantes cerrados (`isOpen: false`) se desplazan automáticamente al final de la lista.
     - Cumplimiento 100% de la regla de imparcialidad (sin etiquetas engañosas de "Destacado").
  2. **Carga Progresiva por Lotes**:
     - Lote inicial de 12 comercios (`PAGE_SIZE = 12`).
     - Detección automática de proximidad con `IntersectionObserver` y botón de respaldo *"Cargar más restaurantes (X restantes)"*.
* **Estado**: ✅ **Completado** (2026-11-08).

### ✅ Item 1.2: Carga Bajo Demanda de Menús por Restaurante (On-Demand / Lazy Loading)
* **Ubicación**: `src/context/AppContext.tsx`, `src/services/dataService.ts`, `src/app/restaurant/[id]/RestaurantView.tsx`, `src/app/merchant/page.tsx` y `src/app/admin/page.tsx`.
* **Problema resuelto**: Se eliminó la descarga masiva de la tabla de productos al inicio de la aplicación, evitando transferencias pesadas en redes móviles 4G de Valledupar.
* **Solución implementada**:
  1. Se removió `dataService.getProducts()` de la carga inicial global (`AppContext.tsx`).
  2. Se creó el método `dataService.getProductsByRestaurant(restaurantId)` que consulta únicamente los platos no archivados del comercio seleccionado (`.eq('restaurant_id', id)`).
  3. Se incorporó caché en memoria por sesión en `AppContext` (`fetchProductsForRestaurant`) para evitar repetir peticiones de red si el cliente regresa al mismo restaurante.
  4. En `RestaurantView.tsx` se diseñó un elegante esqueleto de carga (*skeleton loader*) pulsante mientras se obtienen los platos.
  5. En `/merchant` y `/admin` se integró la carga bajo demanda para asegurar disponibilidad inmediata en Caja POS y gestión de cartas.
* **Estado**: ✅ **Completado** (2026-11-08).

---

## 2. Simplificación de Interfaz y Experiencia de Usuario (Home / Header)

### ✅ Item 2.1: Depuración del Filtro "Abiertos Ahora" en Home
* **Ubicación**: `src/components/home/SearchBar.tsx`.
* **Problema resuelto**: Se eliminó el botón redundante "Abiertos ahora" en el buscador superior.
* **Solución implementada**:
  - Al posicionar los restaurantes abiertos siempre arriba de forma automática, el botón manual resultaba innecesario.
  - La barra ahora solo muestra la píldora de filtro de categoría cuando el usuario selecciona una especialidad (Pizza, Hamburguesas, Pollo, etc.), permitiéndole cerrarla con 1 clic.
* **Estado**: ✅ **Completado** (2026-11-08).

### ✅ Item 2.2: Eliminación del Historial de Clientes ("Mis Pedidos") en el Menú Principal
* **Ubicación**: `src/components/common/Header.tsx`.
* **Problema resuelto**: Enfoque de compra directa (*"pedido hecho, pedido muerto"*).
* **Solución implementada**:
  - Se retiró el botón "Mis Pedidos" y su modal del encabezado público del cliente.
  - Se preservó el banner flotante de pedido activo (`ActiveOrderBanner.tsx`) para seguimiento de pedidos en curso.
  - El historial contable y trazabilidad completa de órdenes se mantiene 100% activo y protegido para el Restaurante (`/merchant`) y el Administrador (`/admin`).
* **Estado**: ✅ **Completado** (2026-11-08).

### ✅ Item 2.3: Rediseño del Header: Protagonismo del Logo y Acceso Administrativo Oculto ("Easter Egg Login")
* **Ubicación**: `src/components/common/Header.tsx`.
* **Problema resuelto**: Mayor presencia de marca y eliminación del botón explícito "Ingresar".
* **Solución implementada**:
  1. Isotipo `DD` y tipografía `DonDomi Valledupar` ampliados con mayor escala, contraste y sombras cálidas.
  2. **Acceso Oculto (*Easter Egg*)**: Al hacer clic o tocar el logo de DonDomi, se redirige directamente a la pantalla `/login`, permitiendo a dueños de restaurantes, repartidores y administradores autenticarse sin ensuciar la interfaz del consumidor final.
* **Estado**: ✅ **Completado** (2026-11-08).

---

## 3. Experiencia de Compra y Selección de Platos (Carta / Modal)

### ✅ Item 3.1: Reseteo Automático del Formulario de Plato al Abrir el Modal ("Instrucciones a la Cocina")
* **Ubicación**: `src/components/restaurant/ProductModal.tsx` y `src/app/restaurant/[id]/RestaurantView.tsx`.
* **Problema resuelto**: Los comentarios e instrucciones especiales escritas para un plato ya no se quedan pegados en el siguiente plato que el cliente selecciona.
* **Solución implementada**:
  1. En `ProductModal.tsx`, se implementó un `useEffect` sincronizado con `product?.id` que reinicializa `notes = ''`, `quantity = 1`, `selectedByGroup = {}` y `modalError = null`.
  2. En `RestaurantView.tsx`, se forzó el ciclo de vida de React mediante `key={activeModalProduct?.id || 'product-modal-closed'}` para garantizar que el modal nazca completamente limpio al abrir un nuevo producto.
### ✅ Item 3.2: Restauración Fiel de la Estructura Original de Portada y Perfil del Restaurante
* **Ubicación**: `src/app/restaurant/[id]/RestaurantView.tsx`.
* **Problema resuelto**: Se restauró la distribución original exacta de la cabecera del restaurante solicitada por el usuario (portada de ancho completo, logo centrado superpuesto sobre el borde inferior, información centrada y diseño visual intacto).
* **Solución implementada**:
  1. Portada *full-width* de borde a borde con gradiente cinematográfico y ocultamiento suave al hacer scroll.
  2. Logo/foto de perfil en tarjeta blanca centrada (`-mt-12 flex flex-col items-center text-center`) sobre el borde inferior de la portada.
  3. Insignia de estado "Abierto ahora" / "Cerrado", nombre, tags, descripción y píldoras de dirección y horarios centrados.
  4. Barra fija de categorías en negro (`bg-slate-950`) con píldoras de navegación.
* **Estado**: ✅ **Completado** (2026-11-08).

### ✅ Item 3.3: Respaldo Íntegro de Platos y Menús Completos sin Omisiones
* **Ubicación**: `src/context/AppContext.tsx`, `src/services/dataService.ts` y `src/app/restaurant/[id]/RestaurantView.tsx`.
* **Problema resuelto**: Al entrar a un restaurante cargaba menos platos o quedaba en blanco debido a discrepancias entre la base de datos en nube y el catálogo integral inicial.
* **Solución implementada**:
  1. Se unificó el estado inicial de `productsByRestaurant` con `INITIAL_PRODUCTS`, combinando transparentemente las adiciones de Supabase sin anular los menús ricos existentes.
  2. En `fetchProductsForRestaurant` y `RestaurantView.tsx` se garantizó fallback bidireccional a los platos activos de cada restaurante.
* **Estado**: ✅ **Completado** (2026-11-08).

### ✅ Item 1.3: Carga Inmediata y Persistente de Imágenes al Retroceder (Back Navigation)
* **Ubicación**: `src/components/home/RestaurantList.tsx` y `src/components/home/RestaurantCard.tsx`.
* **Problema resuelto**: Al volver atrás desde la página de un restaurante a la página principal, las imágenes de los comercios fallaban en mostrarse.
* **Solución implementada**:
  1. Se eliminó la paginación por cortes (`visibleCount`) y el `IntersectionObserver` que desmontaba tarjetas en la transición de ruta/bfcache.
  2. Todos los restaurantes se renderizan de forma directa y estable, respetando la regla: abiertos de primero y cerrados al final.
  3. Se aseguraron URLs de respaldo (*fallback*) tanto para el banner como para el logo en `RestaurantCard.tsx`.
* **Estado**: ✅ **Completado** (2026-11-08).

---
