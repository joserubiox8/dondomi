# Cambios Pendientes — DonDomi (Valledupar)

Este archivo actúa como bitácora viva de mejoras, optimizaciones y ajustes identificados durante la revisión de la plataforma. Cada cambio se clasifica con su estado y detalle técnico.

---

## Índice de Estados
- ⏳ **Pendiente**: Identificado y documentado, en espera de ejecución.
- 🚧 **En Progreso**: En proceso de desarrollo o prueba.
- ✅ **Completado**: Implementado, probado y validado con 0 errores.

---

## 1. Experiencia de Navegación y Scroll del Cliente

### ✅ Item 1.1: Restauración de Posición de Scroll al Retroceder (Back Navigation)
* **Ubicación**: `src/components/home/RestaurantList.tsx`, `src/components/home/RestaurantCard.tsx`, `src/app/restaurant/[id]/RestaurantView.tsx`.
* **Problema reportado**: Al entrar al menú de un restaurante y luego presionar el botón "Atrás" del navegador o el botón de regresar, el cliente volvía a la parte superior de la página principal en lugar de conservar la posición exacta de la lista en la que se encontraba.
* **Solución implementada**:
  1. Se registra continuamente y al hacer clic sobre cualquier tarjeta de restaurante la posición vertical de scroll (`dondomi_home_scroll_y` + flag `dondomi_home_restore_scroll = 'true'`) en `sessionStorage`.
  2. Al regresar al catálogo principal (`/`), `RestaurantList.tsx` restaura instantáneamente (`behavior: 'instant'`) el scroll exacto donde quedó el usuario.
* **Estado**: ✅ **Completado**

---

## 2. Catálogo y Datos de Prueba para Validación

### ✅ Item 2.1: Expansión del Catálogo a 30 Restaurantes y Población Completa de Menús
* **Ubicación**: `src/data/mockData.ts`.
* **Problema reportado**: Existían pocos comercios de prueba y algunos restaurantes tenían la carta vacía sin platos disponibles para ordenar.
* **Solución implementada**:
  1. Se amplió `RESTAURANTS` en `src/data/mockData.ts` a **30 restaurantes** (`rest-1` a `rest-30`) distribuidos por barrios reales de Valledupar (Novalito, Los Cortijos, San Vicente, Las Flores, Centro, Pontevedra, Guatapuri, etc.) y abarcando todas las categorías gastronómicas.
  2. Se pobló `PRODUCTS_BY_RESTAURANT` con menús completos de **4 a 5 platos por restaurante** para los 30 comercios, garantizando 0 cartas vacías.
* **Estado**: ✅ **Completado**

### ✅ Item 2.2: WhatsApp Global de Pruebas Unificado (3053004882)
* **Ubicación**: `src/data/mockData.ts`, `src/lib/mappers.ts`, `src/components/restaurant/CartDrawer.tsx`.
* **Problema reportado**: Se necesitaba enviar todos los pedidos de prueba al número activo de WhatsApp del usuario (`3053004882`).
* **Solución implementada**:
  1. Se configuró `TEST_WHATSAPP_PHONE = '3053004882'` en los 30 restaurantes de `src/data/mockData.ts`.
  2. Se actualizó `dbToRestaurant` en `src/lib/mappers.ts` y el generador de WhatsApp en `src/components/restaurant/CartDrawer.tsx` para que incluso los restaurantes cargados desde Supabase utilicen `3053004882` por defecto.
* **Estado**: ✅ **Completado**

---

## 3. Experiencia y Operación de Cocina / KDS (/merchant)

### ✅ Item 3.1: Organización de Comandas en Cocina por Pestañas Claras de Flujo Operativo
* **Ubicación**: `src/app/merchant/page.tsx` (Módulo KDS).
* **Problema reportado**: Se requería organizar los pedidos de cocina en una cantidad adecuada de pestañas operativas con nombres claros y diferenciados.
* **Solución implementada**:
  - Se organizó la vista de cocina en **5 pestañas operativas dedicadas** con contadores en vivo y filtro adicional por modalidad (`Todos`, `🍽️ En Mesa`, `🛍️ Para Llevar`, `🛵 Domicilios`):
    1. **🔔 Por Aceptar** (`PENDING`): Nuevas órdenes entrantes por confirmar.
    2. **👨‍🍳 En Preparación** (`PREPARING`): Comandas aceptadas cocinándose en fogones.
    3. **🛵 Listos / Despacho** (`READY_FOR_PICKUP` / `ON_THE_WAY`): Pedidos listos en barra o en camino con el domiciliario.
    4. **✅ Completados** (`DELIVERED`): Pedidos servidos en mesa o entregados al cliente.
    5. **❌ Cancelados** (`CANCELLED`): Pedidos rechazados o anulados con motivo.
* **Estado**: ✅ **Completado**

### ✅ Item 3.2: Rediseño Sutil y No Invasivo del Acceso a "Modo Pantalla Cocina"
* **Ubicación**: `src/app/merchant/page.tsx`.
* **Problema reportado**: La tarjeta oscura gigante de "Modo Pantalla Cocina (KDS Fullscreen)" era sumamente invasiva para la vista diaria del cajero.
* **Solución implementada**:
  - Se eliminó por completo la tarjeta gigante y se reemplazó por un botón compacto y discreto (`Modo Monitor` + botón de timbre `🔊`) integrado sutilmente en la barra de búsqueda y filtros de cocina.
* **Estado**: ✅ **Completado**

---

## 4. Auditoría Integral y Blindaje Operativo del Sistema POS

### ✅ Item 4.1: Segregación Estricta de Órdenes POS de Consumo Local vs. Domicilios
* **Ubicación**: `src/lib/pricing.ts`, `src/app/driver/page.tsx`, `src/context/AppContext.tsx`, `src/app/merchant/page.tsx`, `src/app/admin/page.tsx`.
* **Problema reportado**: Si el cajero recibía una orden para comer en el restaurante (`pos_local` / En Mesa) o para llevar en mostrador (`pos_takeout`), dicha orden le aparecía en el radar a los domiciliarios (`/driver`), lo cual era un error grave de flujo operativo.
* **Solución implementada**:
  1. **Funciones de segregación en `src/lib/pricing.ts`**: Se crearon `isPosInStoreOrder(order)` e `isDondomiFleetDeliveryOrder(order)` para identificar de manera inequívoca las órdenes de salón (`pos_local`) y mostrador (`pos_takeout`).
  2. **Bloqueo total en el panel de Domiciliarios (`/driver`) y `AppContext.tsx`**:
     - `availableOrders`, `activeOrder` y `allDriverDeliveredOrders` en `/driver` excluyen estrictamente cualquier orden con `!isPosInStoreOrder(o)`.
     - `claimOrder`, `dispatchWithOwnDriver` y `assignDriverByAdmin` en `AppContext.tsx` rechazan cualquier intento de reclamar o asignar un repartidor a órdenes `pos_local` o `pos_takeout`.
  3. **Flujo diferenciado en Caja POS, Cocina (`/merchant`) y Admin (`/admin`)**:
     - Las órdenes `pos_local` muestran claramente `🍽️ Servicio en Salón: Mesa X (Consumo local · Sin domiciliario)` y se completan con el botón **"Servir en Mesa (Completar)"**.
     - Las órdenes `pos_takeout` muestran `🛍️ Entrega en Mostrador: Para Llevar` y se completan con **"Entregar en Mostrador (Completar)"**.
     - En Caja POS, al elegir `🛵 Domicilio`, el cajero puede elegir si despacha con **Flota DonDomi** o **Domiciliario Propio**, usando la tarifa global sincronizada.
     - En `/admin`, las alertas de "Sin repartidor asignado" y el selector de asignación manual de domiciliario solo aplican a órdenes a domicilio (`delivery_app`).
* **Estado**: ✅ **Completado**

---

## 5. Experiencia de Catálogo y Vista del Restaurante

### ✅ Item 5.1: Barra de Categorías y Encabezado 100% Opacos y Acoplados
* **Ubicación**: `src/app/restaurant/[id]/RestaurantView.tsx`.
* **Problema reportado**: Al desplazarse hacia abajo en la carta de un restaurante, los platos pasaban detrás de la barra de categorías y continuaban mostrándose por encima de ella en el espacio superior transparente, cortando visualmente los productos.
* **Solución implementada**:
  1. **Encabezado superior sólido (`sticky top-0 z-40 h-14 bg-white`)**: Barra blanca 100% opaca con botón de retorno al catálogo, logo, nombre del restaurante y barrio.
  2. **Barra de categorías acoplada sin espacios (`sticky top-14 z-30 bg-white`)**: Fondo blanco sólido acoplado exactamente al borde inferior del encabezado superior (56px / `top-14`) sin márgenes superiores (`mt-0`) que dejen huecos.
  3. **Comportamiento visual estricto**: Al hacer scroll hacia abajo, los platos se deslizan exclusivamente por debajo de la barra de categorías (`z-30`) y del encabezado (`z-40`), sin ser visibles por encima ni detrás de ellos.
* **Estado**: ✅ **Completado**

---

## 6. Identidad Visual y Paleta de Colores

### ✅ Item 6.1: Migración de Paleta de Página Principal a Amarillo (Remoción Total del Naranja)
* **Ubicación**: `src/components/common/Header.tsx`, `src/components/home/CategoryChips.tsx`, `src/components/home/SearchBar.tsx`, `src/components/home/RestaurantCard.tsx`, `src/components/home/RestaurantList.tsx`, `src/components/home/ActiveOrderBanner.tsx`, `src/components/home/PromoBanner.tsx`, `src/components/common/LocationModal.tsx`, `src/components/common/PwaInstallPrompt.tsx`, `src/components/restaurant/CartFloatBar.tsx`, `src/components/restaurant/CartDrawer.tsx`, `src/app/globals.css`, `src/app/layout.tsx`.
* **Problema reportado**: Se solicitó cambiar la paleta de colores de la página principal por amarillo y remover completamente el color naranja.
* **Solución implementada**:
  1. **Variables y Tema**: Se actualizaron `--brand-primary: #eab308;` y `--brand-primary-hover: #ca8a04;` en `globals.css`, así como `themeColor: '#EAB308'` y `selection:bg-yellow-400 selection:text-slate-950` en `layout.tsx`.
  2. **Encabezado y Logo**: Logo 'DD' en degradado amarillo vibrante (`from-yellow-400 to-amber-400` con texto `slate-950`), nombre `Don<span className="text-yellow-500">Domi</span>`, botón de domicilio e indicador de canasta en amarillo.
  3. **Categorías y Búsqueda**: Botones de categorías seleccionadas con anillo y fondo amarillo (`ring-yellow-400 bg-yellow-400`), textos activos en `text-yellow-700`, y borde/anillo del buscador en `focus:border-yellow-400`.
  4. **Tarjetas de Restaurantes**: Pines de barrio, hover sobre títulos de comercios e íconos de tiempo/domicilio en amarillo (`text-yellow-400` / `text-yellow-600`).
  5. **Banner de Pedido Activo y Canasta Flotante**: Banner de entrega en camino y barra de canasta inferior rediseñados en degradado amarillo de alto contraste con texto oscuro y pastillas contrastantes.
  6. **Modal de Barrios y PWA**: Indicadores de barrio seleccionado y botones de instalación PWA migrados a amarillo.
* **Estado**: ✅ **Completado**


