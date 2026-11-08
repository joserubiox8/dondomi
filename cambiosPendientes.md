# Cambios Pendientes — DonDomi (Valledupar)

Este archivo actúa como bitácora viva de mejoras, optimizaciones y ajustes identificados durante la revisión de la plataforma. Cada cambio se clasifica con su estado y detalle técnico.

---

## Índice de Estados
- ⏳ **Pendiente**: Identificado y documentado, en espera de ejecución.
- 🚧 **En Progreso**: En proceso de desarrollo o prueba.
- ✅ **Completado**: Implementado, probado y validado con 0 errores.

---

## 1. Rendimiento y Escalabilidad de Catálogo

### ⏳ Item 1.1: Carga Progresiva y Ordenamiento Inteligente de Restaurantes
* **Ubicación**: `src/components/home/RestaurantList.tsx` y `src/services/dataService.ts`.
* **Problema identificado**: Actualmente la página principal carga todos los restaurantes de una sola vez (`select('*')`) y los renderiza simultáneamente en el DOM. Si el catálogo escala a cientos o miles de comercios, provocará alto consumo de datos móviles, descarga masiva de imágenes y congelamiento en celulares de gama media/baja al abrir la app.
* **Solución a implementar**:
  1. **Carga Progresiva por Lotes (Scroll Infinito / Lotes de 12)**:
     - Renderizar inicialmente un lote de 12 a 16 restaurantes (suficiente para cubrir la vista inicial y los primeros scrolls).
     - Incorporar un detector de proximidad (`IntersectionObserver`) o botón de expansión suave para ir cargando los siguientes lotes progresivamente a medida que el cliente baja en la lista.
     - Paginación/rangos a nivel de consulta en Supabase (`.range(from, to)`) cuando el volumen de base de datos lo requiera.
  2. **Criterio de Ordenamiento Imparcial y de Conveniencia**:
     - Descartar orden alfabético puro (evita priorizar comercios cerrados o lejanos solo por la letra inicial).
     - Priorizar restaurantes abiertos (`isOpen: true`) en las primeras posiciones.
     - Agrupar por tiempo estimado de entrega más rápido y valoración de clientes, enviando los comercios cerrados al final con distintivo visual claro ("Cerrado").
     - Mantener estricto apego a la regla de imparcialidad (cero etiquetas engañosas de "Destacado").
* **Fecha de registro**: 2026-11-07.

### ⏳ Item 1.2: Carga Bajo Demanda de Menús por Restaurante (On-Demand / Lazy Loading)
* **Ubicación**: `src/context/AppContext.tsx`, `src/services/dataService.ts` y `src/app/restaurant/[id]/RestaurantView.tsx`.
* **Problema identificado**: Actualmente `AppContext` descarga la tabla completa de productos de todos los restaurantes de la ciudad (`supabase.from('products').select('*')`) al abrir la página principal. Además, el estado inicial carga en memoria un objeto estático (`INITIAL_PRODUCTS`) con los menús de todos los comercios. Cuando la plataforma escale a decenas o cientos de restaurantes en Valledupar, provocará la descarga innecesaria de miles de platos, saturando los datos móviles (4G/LTE) del usuario y ralentizando el inicio de la app.
* **Solución a implementar**:
  1. **Remover la descarga global de productos en el arranque de la app**:
     - El Home y `AppContext` solo deben cargar restaurantes y categorías de la ciudad; nunca platos.
  2. **Consulta puntual al entrar al comercio**:
     - Al abrir `/restaurant/[id]`, realizar una consulta filtrada y eficiente en Supabase:
       `supabase.from('products').select('*').eq('restaurant_id', id).eq('is_archived', false)`.
  3. **Caché en memoria por sesión**:
     - Almacenar los menús ya consultados en memoria (`Record<restaurantId, Product[]>`) para que si el cliente regresa al mismo restaurante en la misma visita, no vuelva a consultar la red ni a consumir datos móviles.
  4. **Feedback visual de carga**:
     - Mostrar un esqueleto de carga (*skeleton loader*) sobrio mientras se obtienen los platos del restaurante seleccionado.
* **Fecha de registro**: 2026-11-08.

---

## 2. Simplificación de Interfaz y Experiencia de Usuario (Home / Header)

### ⏳ Item 2.1: Depuración del Filtro "Abiertos Ahora" en Home
* **Ubicación**: `src/components/home/CategoryBar.tsx` / `src/app/page.tsx`.
* **Problema / Justificación**: El botón de filtro rápido "Abiertos ahora" resulta redundante y recarga innecesariamente la barra de navegación superior. Dado que el catálogo principal aplicará la regla de ordenamiento por conveniencia donde los restaurantes abiertos encabezan la lista y los comercios cerrados son desplazados automáticamente al fondo del listado, el usuario siempre ve primero las opciones disponibles sin requerir un botón de filtrado adicional.
* **Solución a implementar**:
  - Remover el botón/píldora "Abiertos ahora" del selector de filtros en la página principal.
  - Asegurar que la grilla mantenga la regla de ordenamiento natural: abiertos arriba, cerrados abajo.
* **Fecha de registro**: 2026-11-07.

### ⏳ Item 2.2: Eliminación del Historial de Clientes ("Mis Pedidos") en el Menú Principal
* **Ubicación**: `src/components/common/Header.tsx`, navegación pública y modales de órdenes pasadas del cliente.
* **Problema / Justificación**: Para el cliente final, la filosofía de DonDomi en Valledupar es compra rápida y directa ("pedido hecho, pedido muerto"). Conservar un botón y vista de histórico de pedidos para clientes anónimos/ocasionales genera fricción visual, complejidad innecesaria en el header y no aporta valor práctico inmediato en la experiencia de pedir comida.
* **Regla de integridad y seguridad**:
  - El historial y registro de auditoría de pedidos **se mantiene 100% intacto y accesible para el Restaurante (`/merchant`) y para el Administrador (`/admin`)**, garantizando cuadre de caja, seguridad contable y trazabilidad.
  - El banner flotante del pedido activo en curso (`ActiveOrderBanner.tsx`) continuará funcionando para que el cliente rastree su pedido actual mientras esté en curso. Lo que se elimina es la opción/botón público de consultar pedidos antiguos finalizados.
* **Solución a implementar**:
  - Retirar el enlace/botón "Mis pedidos" de la barra de navegación del cliente.
  - Limpiar componentes y modales huérfanos asociados exclusivamente al histórico de pedidos del cliente público, preservando las tablas y consultas de Supabase para los paneles internos.
* **Fecha de registro**: 2026-11-07.

### ⏳ Item 2.3: Rediseño del Header: Protagonismo del Logo y Acceso Administrativo Oculto ("Easter Egg Login")
* **Ubicación**: `src/components/common/Header.tsx`.
* **Problema / Justificación**: Al retirar los botones "Abiertos ahora" y "Mis pedidos", el header queda mucho más limpio y minimalista. Esto brinda la oportunidad perfecta para que la identidad de marca (logo de DonDomi) gane mayor jerarquía visual y presencia en pantalla, eliminando además la necesidad de mostrar un botón explícito de "Ingresar" que confunda a los clientes finales (quienes no necesitan crear cuenta para pedir).
* **Solución a implementar**:
  1. **Mayor Presencia de Marca**:
     - Incrementar las dimensiones, contraste y escala tipográfica del isotipo/logotipo de DonDomi en el encabezado, dándole protagonismo central o dominante en dispositivos móviles y de escritorio.
  2. **Acceso Oculto mediante el Logo (Easter Egg Login)**:
     - En lugar de mantener un botón visible de "Ingresar" o "Iniciar sesión" en la barra de navegación principal de los clientes, convertir el logotipo en el punto de entrada inteligente.
     - Al hacer clic o tocar el logo de DonDomi (o mediante una interacción táctil sutil y fluida), redirigir directamente a la pantalla unificada de autenticación `/login` (donde dueños de restaurantes, domiciliarios y administradores pueden ingresar con sus credenciales).
     - Mantener el cursor tipo pointer y feedback visual discreto para que el equipo operativo del restaurante o repartidor pueda acceder con facilidad sin ensuciar la navegación pública del consumidor.
* **Fecha de registro**: 2026-11-07.

---

## 3. Experiencia de Compra y Selección de Platos (Carta / Modal)

### ⏳ Item 3.1: Reseteo Automático del Formulario de Plato al Abrir el Modal ("Instrucciones a la Cocina")
* **Ubicación**: `src/components/restaurant/ProductModal.tsx` y `src/app/restaurant/[id]/RestaurantView.tsx`.
* **Problema identificado**: Al agregar un plato con notas especiales (ej. "sin cebolla") y luego tocar otro plato diferente, el modal conserva el texto anterior en el campo *"Instrucciones especiales para la cocina"*. Esto sucede porque el componente `ProductModal` mantiene su estado interno persistente en memoria (`useState` de `notes`, `quantity`, `selectedByGroup` y `modalError`) y no se reinicializa al cambiar de plato (`activeModalProduct`).
* **Riesgo operativo**: El cliente puede enviar accidentalmente observaciones de un plato anterior al nuevo producto, causando confusiones graves en la cocina del restaurante.
* **Solución a implementar**:
  - Añadir un efecto `useEffect` en `ProductModal.tsx` indexado al identificador del producto (`product?.id`) que limpie y reinicialice todos los estados locales a sus valores por defecto cada vez que se abra o cambie el plato:
    - `setQuantity(1)`
    - `setSelectedByGroup({})`
    - `setNotes('')`
    - `setModalError(null)`
  - O bien, forzar la recreación del ciclo de vida del componente mediante `key={activeModalProduct?.id}` desde `RestaurantView.tsx`.
* **Fecha de registro**: 2026-11-08.

---

