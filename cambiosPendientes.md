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
