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
