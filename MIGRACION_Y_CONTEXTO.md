# DonDomi - Dossier Completo de Contexto, Arquitectura y Migración

> **Propósito**: Este documento contiene el contexto integral, decisiones de arquitectura, reglas de negocio y estado de desarrollo del proyecto DonDomi. Permite a cualquier desarrollador o asistente de IA continuar el proyecto en un nuevo computador exactamente en el punto en que se dejó.

---

## 1. Ficha Técnica del Proyecto

- **Nombre**: DonDomi (Plataforma de Domicilios y Comida para Valledupar, Cesar, Colombia).
- **Repositorio**: `https://github.com/joserubiox8/dondomi.git` (Rama `main`).
- **Framework & Runtime**: Next.js 16.3.8 (App Router, Turbopack, React 19).
- **Lenguaje & Tipado**: TypeScript estricto con modelos tipados en `src/types/index.ts`.
- **Estilos**: Tailwind CSS con paleta cálida (Naranja, Ámbar, Slate).
- **Backend & Base de Datos**: Supabase (PostgreSQL 15 + Supabase Realtime).
- **Despliegue**: Vercel (Producción sincronizada con `main`).

---

## 2. Modelo de Negocio y Reglas Críticas Inviolables

1. **Logística y Tarifas Valledupar**:
   - Tarifa de domicilio plana inicial: **$7.000 COP** para todo el perímetro urbano de Valledupar.
   - Transparencia radical: $0 COP en tarifas de servicio ocultas al cliente y 0% comisión a restaurantes aliados durante el MVP de validación.
2. **Prohibición de Diálogos Nativos**:
   - **Queda estrictamente prohibido usar `window.alert()`, `window.confirm()` o `window.prompt()`**.
   - Cualquier advertencia, confirmación (ej: cambio de restaurante en canasta o cancelar pedido) debe utilizar un modal visualmente integrado con Tailwind.
3. **Imparcialidad y Sin Favoritismos**:
   - Se removieron todas las etiquetas de «Destacado». No existen secciones privilegiadas que alteren la equidad entre restaurantes.
4. **Validación de Contacto**:
   - Todo teléfono/WhatsApp de cliente en el checkout debe tener **exactamente 10 dígitos numéricos** (ej: `3001234567`).
5. **Canasta Persistente**:
   - La canasta se conserva en `localStorage` con una vigencia de **2 horas**. Si expira, se vacía automáticamente.
6. **Autocancelación por Inactividad**:
   - Todo pedido en estado `PENDING` que supere **15 minutos** sin confirmación por parte del restaurante es cancelado automáticamente por el `SISTEMA`.
7. **Autenticación Unificada Limpia**:
   - La pantalla `/login` solo pide correo y contraseña, deduciendo automáticamente el rol (Cliente, Restaurante, Domiciliario o Admin).

---

## 3. Estado de Fases Desarrolladas

### Fase 1: Cohesión del Ciclo de Vida del Pedido (Completada)
- **Matriz de Transiciones de Estado**: `VALID_ORDER_TRANSITIONS` impide estados contradictorios (`PENDING` -> `PREPARING` -> `READY_FOR_PICKUP` -> `ON_THE_WAY` -> `DELIVERED` o `CANCELLED`).
- **Bloqueo por Horario**: Si un restaurante está cerrado (`isOpen === false`), la UI bloquea la adición y confirmación de pedidos.
- **Detección de Agotados**: Validación en checkout que impide pedir platos agotados en cocina.
- **Rechazo y Cancelación con Motivo**: Registro estructurado en notas `[Cancelado por RESTAURANTE: ...]`, `[Cancelado por CLIENTE: ...]`, `[Cancelado por SISTEMA: ...]`.
- **Reclamo Atómico de Carreras**: Prevención de colisiones entre domiciliarios mediante actualización condicional en Supabase (`is('driver_id', null)`).
- **Liberación de Carrera**: Si un domiciliario tiene un pinchazo o percance, puede liberar la carrera (`unclaimOrder`) devolviéndola a `READY_FOR_PICKUP`.
- **Experiencia de Envío**: Animaciones visibles con loaders de 1.5s (envío) y 1.2s (confirmación de éxito).

### Fase 2: Persistencia Compartida, Sincronización y Tolerancia (Completada)
- **Capa Centralizada de Acceso a Datos**: `src/services/dataService.ts` encapsula operaciones CRUD para categorías, flota, configuración, restaurantes, productos y órdenes.
- **Tolerancia a Fallos Offline / Tablas Pendientes**: Si Supabase responde con tabla no encontrada (`42P01`) o hay pérdida de red, conmuta a `localStorage` de forma transparente sin bloquear la aplicación.
- **Sincronización en Tiempo Real Multi-Canal**:
  - `realtime_orders`: Actualización en vivo de estados de pedidos.
  - `realtime_catalog`: Reflejo inmediato de platos agotados o cambios de menú.
  - `realtime_fleet_config`: Difusión inmediata de tarifa global y anuncios.
- **Revalidación Throttled por Foco**: Listeners a `visibilitychange` y `focus` con límite de 15 segundos para refrescar datos cuando el usuario regresa de WhatsApp u otras apps.
- **Motor Unificado de Precios**: `src/lib/pricing.ts` garantiza que el Header, Tarjeta, Carrito y Pedido calculen exactamente la misma cifra sin redondeos divergentes.
- **Idempotencia en Checkout**: `CartDrawer.tsx` preserva `draftOrderId` y `draftOrderNumber` para que reintentos tras errores de red no creen órdenes duplicadas.
- **Migración SQL Preparada**: Archivo `supabase/migrations/20261015_phase2_shared_persistence.sql` listo para ser ejecutado en el panel de Supabase.

---

## 4. Credenciales de Acceso para Pruebas Rápidas

- **Administrador Maestro**:
  - Correo: `admin@dondomi.com`
  - Contraseña: `admin2026` (o PIN `2026`)
- **Restaurantes**:
  - Pollos El Valle: `elvalle@dondomi.com` (PIN: `1234`)
  - Guatapurí Burger House: `guatapuri@dondomi.com` (PIN: `1234`)
  - El Asador de Pedro: `pedro@dondomi.com` (PIN: `1234`)
  - Pizzería La Sirena: `lasirena@dondomi.com` (PIN: `1234`)
  - Arepas & Fritos Cacique Upar: `caciqueupar@dondomi.com` (PIN: `1234`)
  - Donde Chalo: `donchalo@dondomi.com` (PIN: `1234`)
- **Domiciliarios**:
  - Javier Morales: `javier@dondomi.com` (PIN: `1234`)
  - Carlos Mendoza: `carlos@dondomi.com` (PIN: `1234`)

---

## 5. Estructura de Directorios Clave

```
c:\Users\...\DonDomi\
├── src\
│   ├── app\                      # Next.js App Router (Páginas principales)
│   │   ├── page.tsx              # Portal del cliente con categorías y restaurantes
│   │   ├── admin\page.tsx        # Panel administrativo (Tarifas, Anuncios, Categorías)
│   │   ├── driver\page.tsx       # Panel de domiciliario (Radar de pedidos, carreras)
│   │   ├── merchant\page.tsx     # Panel de restaurante (KDS cocina, edición de menú)
│   │   ├── login\page.tsx        # Login universal unificado
│   │   └── restaurant\[id]\      # Vista de restaurante y selección de platos
│   ├── components\
│   │   ├── common\Header.tsx     # Barra superior con logo, barrio, tarifa fija e ingreso
│   │   ├── home\RestaurantCard.tsx # Tarjetas de restaurante con tarifa dinámica
│   │   └── restaurant\CartDrawer.tsx # Carrito persistente, checkout idempotente
│   ├── context\
│   │   └── AppContext.tsx        # Estado global, Realtime multi-canal y revalidación
│   ├── lib\
│   │   ├── delivery.ts           # Estimación de domicilios para Valledupar
│   │   ├── pricing.ts            # Motor matemático unificado de subtotales y totales
│   │   ├── mappers.ts            # Transformadores de tipos (TS <-> Supabase)
│   │   └── supabase.ts           # Cliente Supabase JS
│   ├── services\
│   │   └── dataService.ts        # Capa de datos con fallback tolerante a fallos
│   └── types\
│       └── index.ts              # Modelos TypeScript estrictos
└── supabase\
    └── migrations\
        └── 20261015_phase2_shared_persistence.sql # Script SQL para Supabase
```

---

## 6. Prompt para Reanudar la Conversación en Cualquier Asistente

Si abres una nueva sesión o continúas en otro entorno, puedes pegar directamente este mensaje:

```markdown
Hola. Estamos desarrollando DonDomi, una plataforma de domicilios para Valledupar (Next.js 16 App Router, Turbopack, Tailwind, Supabase).
Las Fases 1 (cohesión del ciclo de vida del pedido, cancelaciones, reclamo atómico, animaciones) y Fase 2 (persistencia compartida con fallback en dataService.ts, motor de precios pricing.ts, sincronización Realtime multi-canal y checkout idempotente) ya están 100% implementadas y desplegadas en GitHub 'main'.
Consulta el archivo MIGRACION_Y_CONTEXTO.md para conocer todas las reglas de negocio (tarifa plana $7.000 COP, prohibido usar alert/confirm nativos, celulares obligatorios de 10 dígitos, canasta persistente de 2 horas).
Vamos a continuar con el siguiente paso de la plataforma. Dime qué información requieres para arrancar.
```
