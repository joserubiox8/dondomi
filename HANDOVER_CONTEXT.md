# Documento de Traspaso y Contexto Integral de Proyecto — DonDomi (Valledupar)

Este documento ha sido generado para que cualquier agente de Inteligencia Artificial u operador técnico pueda retomar el desarrollo de **DonDomi** con pleno entendimiento de la arquitectura, reglas de negocio, estado actual del código, decisiones tomadas y siguientes pasos.

---

## 1. Visión General del Producto

**DonDomi** es una plataforma multicomercio y marketplace local de domicilios diseñada a la medida para la ciudad de **Valledupar, Cesar, Colombia**.

### Filosofía y Modelo de Negocio Inicial:
- **Captación prioritaria**: Afiliación gratuita para restaurantes aliados, publicación de menús sin costo y recepción de pedidos sin cobro inicial.
- **Comisión predeterminada**: **0%** de comisión por venta (`commissionRate = 0`). El código preserva la capacidad de configurar y liquidar comisiones pactadas individuales o globales para el futuro, pero actualmente opera en 0%.
- **Tarifa de servicio oculta**: **$0 COP** (`serviceFee = 0`). Transparencia radical hacia el cliente final.
- **Tarifa de domicilio urbana plana**: **$7.000 COP** para todo el perímetro urbano de Valledupar (configurable globalmente desde `platform_config` / `globalDeliveryFee`).
- **Monetización futura**: Se basará en posicionamiento patrocinado, ofertas destacadas y banners publicitarios cuando la plataforma alcance volumen de tráfico, sin perjudicar la operación básica de los comercios afiliados.

---

## 2. Entorno de Ejecución: Migración a Google Antigravity Remote Mode (Cloud)

> [!NOTE]
> **Evolución del Entorno**: El desarrollo inicial se realizó en Android (Termux / ARM64), donde existían severas restricciones de binarios nativos SWC y bindings WASM. El proyecto ha sido migrado al **Modo Remoto de Google Antigravity (`antigravity.google.com/remote`)**, ejecutándose en contenedores dedicados en la nube de Google enlazados directamente al repositorio de GitHub (`joserubiox8/dondomi`).

### Ventajas y Cambios Operativos en la Nube:
1. **Desaparición de las limitaciones de Termux**:
   - Disponibilidad de un entorno Linux x86_64 completo con Node.js nativo y capacidad multi-hilo.
   - Ya no existe la obligación estricta de forzar `--webpack`; se pueden utilizar tanto el motor estándar de Next.js como Turbopack (`npm run dev` / `npx next dev`) sin riesgo de bloqueos por binarios no soportados en ARM64 móvil.
2. **Persistencia y Ejecución en Segundo Plano 24/7**:
   - Los agentes de Antigravity, subagentes y tareas en background continúan ejecutándose de forma autónoma en la nube de Google aunque el usuario cierre el navegador o su dispositivo móvil.
3. **Flujo de Trabajo Git Centralizado**:
   - Todo cambio debe integrarse mediante commits y pushes directos al repositorio remoto en GitHub (`origin/main`).
4. **Reglas de Negocio Inmutables**:
   - Aunque el entorno técnico ahora sea mucho más potente y sin las trabas de Termux, las **reglas de negocio de DonDomi** (detalladas a continuación) son **100% obligatorias e inviolables** en la nube.

---

## 3. Reglas de Negocio Críticas y de Diseño UI

1. **Prohibición Absoluta de Diálogos Nativos del Navegador**:
   - **Queda estrictamente prohibido usar `window.alert()`, `window.confirm()` o `window.prompt()`**.
   - Toda interacción destructiva, aviso de error, advertencia de pedidos pendientes o confirmación de canasta debe implementarse mediante **modales inline o componentes Tailwind** estilizados según la identidad visual de DonDomi.
2. **Unificación de Cálculos Matemáticos**:
   - Todos los subtotales, tarifas de entrega, liquidaciones y balances deben procesarse exclusivamente a través de [`src/lib/pricing.ts`](src/lib/pricing.ts).
3. **Validación de Teléfono en Checkout**:
   - El número celular / WhatsApp del cliente debe contener **exactamente 10 dígitos numéricos** (ej. `3001234567`).
4. **Ciclo de Vida Estricto del Pedido**:
   - `PENDING` → `PREPARING` → `READY_FOR_PICKUP` → `ON_THE_WAY` → `DELIVERED` (o `CANCELLED`).
   - La reversión de `ON_THE_WAY` a `READY_FOR_PICKUP` solo se permite mediante `unclaimOrder` cuando un repartidor reporta una incidencia o avería en ruta.
5. **Autocancelación SLA de 15 Minutos**:
   - Los pedidos en `PENDING` que superen 15 minutos sin ser aceptados por el restaurante son cancelados automáticamente por el sistema (`cancelledBy: 'SISTEMA'`), registrando el motivo en notas sin eliminar el registro histórico.
6. **Canasta y Banner Activo**:
   - La canasta se persiste en `localStorage` (`dondomi_cart_v1`) con expiración de 2 horas.
   - El banner de pedidos activos (`ActiveOrderBanner.tsx`) **no tiene botón de cierre ('X')**; permanece visible durante el ciclo activo.
7. **Tolerancia a Fallos y Persistencia Híbrida**:
   - Lecturas y escrituras pasan por [`src/services/dataService.ts`](src/services/dataService.ts). Si Supabase no responde o alguna tabla nueva aún no ha sido migrada (error `42P01`), existe un fallback transparente a `localStorage` para garantizar la continuidad del servicio local.

---

## 4. Los 4 Perfiles de Usuario

1. **Cliente (`CLIENTE`)**:
   - Explora restaurantes, navega menús por categorías, arma su carrito, realiza checkout con 10 dígitos y monitorea el estado del pedido en tiempo real con redirección opcional a WhatsApp.
2. **Restaurante / Aliado (`RESTAURANTE`)**:
   - Panel en `/merchant`. Gestiona estado de cocina (abierto/pausado), atiende comandas en tiempo real con alertas auditivas, administra su menú (crear, editar disponibilidad, categorías personalizadas y archivado de platos) y consulta liquidaciones de cuadre de caja diaria.
3. **Domiciliario (`DOMICILIARIO`)**:
   - Panel en `/driver`. Ingreso seguro mediante credenciales individuales (celular/correo + contraseña cifrada con scrypt), alternar turno (en turno / pausado; bloqueado si está en carrera activa), visualización de pedidos en estado `READY_FOR_PICKUP`, reclamo atómico de pedidos (previniendo colisiones), confirmación de recogida, reporte de incidencias y entrega final.
4. **Administrador (`ADMINISTRADOR`)**:
   - Panel en `/admin`. Torre de control en tiempo real, gestión y afiliación de restaurantes (con asignación de categorías/tags), gestión de domiciliarios y credenciales, visualización y restauración de platos archivados de cualquier comercio, suspensión de emergencia de comercios y configuración de tarifas globales.

---

## 5. Estado Actual: Trabajo Culminado en Fase 1

La Fase 1 de auditoría y saneamiento funcional se implementó y validó exitosamente con **0 errores de TypeScript y compilación Webpack aprobada**:

### A. Aislamiento de Pedidos del Cliente («Mis Pedidos»)
- **Problema corregido**: Anteriormente existía un fallback demo que mostraba pedidos de otros clientes de Valledupar en la cabecera cuando el dispositivo no tenía compras registradas.
- **Solución implementada**: [`src/components/common/Header.tsx`](src/components/common/Header.tsx) ahora filtra estrictamente los pedidos contra los identificadores locales del dispositivo almacenados en `dondomi_my_order_ids_v1` y `dondomi_active_orders`. Si no hay coincidencias, retorna `[]`.
- **Límite de seguridad documentado**: Este filtrado es a nivel de interfaz de usuario. El aislamiento criptográfico total requerirá la implementación de políticas RLS en Supabase en la Fase 2 (ver sección 7).

### B. Autenticación y Credenciales Seguras de Domiciliarios
- **Problema corregido**: Existía un selector desplegable público con todos los repartidores y contraseñas fijas de prueba (`domi1234`, `1234`).
- **Solución implementada**:
  - Eliminado el selector público en `/driver`. Ahora exige identificación individual (correo, celular de 10 dígitos o ID) y contraseña personal.
  - Implementado [`src/lib/passwordPolicy.ts`](src/lib/passwordPolicy.ts): Contraseñas mínimas de 6 caracteres con lista negra de credenciales triviales.
  - Implementado [`src/lib/passwordHash.ts`](src/lib/passwordHash.ts): Hashing del lado servidor con algoritmo `scrypt` (salt aleatorio criptográfico + derivación de 64 bytes) y comparación resistente a timing attacks con `timingSafeEqual`.
  - Creada la ruta de API segura [`src/app/api/driver-auth/route.ts`](src/app/api/driver-auth/route.ts): Permite verificar credenciales y generar hashes de contraseñas sin exponer datos sensibles al bundle del cliente.
  - La columna plana `pin` en `drivers` ha sido reemplazada por `password_hash`.
  - El modal de administración en `/admin` valida la política antes de crear o actualizar un repartidor.

### C. Persistencia Real sin Falsos Positivos (`MutationResult`)
- **Problema corregido**: La UI reportaba éxito al guardar incluso si la base de datos Supabase arrojaba errores o carecía de columnas.
- **Solución implementada**:
  - Creada la interfaz `MutationResult = { ok: boolean; error?: string; persistedInSupabase: boolean; }` en [`src/types/index.ts`](src/types/index.ts).
  - Todas las operaciones de escritura en [`src/services/dataService.ts`](src/services/dataService.ts) y [`src/context/AppContext.tsx`](src/context/AppContext.tsx) retornan un `Promise<MutationResult>`. La UI solo confirma el éxito si `res.ok === true`; en caso contrario, muestra el error descriptivo inline.

### D. Archivado Lógico de Platos (`is_archived`) y Restauración
- **Problema corregido**: Eliminar un plato borraba su registro o rompía la integridad referencial con los pedidos históricos.
- **Solución implementada**:
  - Los platos no se eliminan físicamente de la base de datos si tienen historial. Se marcan lógicamente con `is_archived: true`.
  - Los platos archivados desaparecen automáticamente del catálogo público del restaurante y no pueden agregarse a nuevos carritos.
  - En [`src/app/merchant/page.tsx`](src/app/merchant/page.tsx) y en [`src/app/admin/page.tsx`](src/app/admin/page.tsx), se incorporó una sección colapsable de «Platos Archivados» que permite a los restaurantes y administradores **restaurar** (`restoreProduct`) cualquier plato archivado de vuelta a la carta pública con un solo clic.
  - Las órdenes pasadas conservan íntegramente el nombre, precio y opciones del plato original tal como se compró.

### E. Verificación Pre-Checkout en Vivo
- Al confirmar un pedido en `addOrder` ([`src/context/AppContext.tsx`](src/context/AppContext.tsx)):
  1. Se verifica en Supabase que el restaurante esté abierto y activo.
  2. Para cada producto en la canasta, se valida que pertenezca al comercio, que `isArchived !== true` y que `isAvailable === true`.
  3. Se compara el precio del carrito contra el precio vigente en base de datos. Si el precio cambió mientras el cliente tenía la canasta abierta, el sistema ajusta el valor, actualiza el carrito y alerta al cliente antes de procesar el pedido.

### F. Protección contra Cierre y Suspensión con Pedidos Pendientes
- Tanto en el panel del restaurante (`/merchant`) al cerrar cocina como en el de administración (`/admin`) al suspender o archivar un restaurante:
  - Si existen pedidos en estado `PENDING`, el sistema **bloquea la acción** y despliega un modal advirtiendo que los pedidos deben ser aceptados o cancelados previamente.
  - Los pedidos ya aceptados (`PREPARING`, `READY_FOR_PICKUP`, `ON_THE_WAY`) continúan su ciclo normal independientemente de si el restaurante cierra.

---

## 6. Migración SQL de Supabase (Pendiente de Ejecución Manual)

Para aplicar las columnas e índices requeridos por la Fase 1 en Supabase, se preparó el siguiente script SQL idempotente:
📁 **[`supabase/migrations/20261101_phase1_persistence_and_archive.sql`](supabase/migrations/20261101_phase1_persistence_and_archive.sql)**

### Instrucciones para el Operador Humano:
1. Abrir la consola de Supabase del proyecto.
2. Ir a **SQL Editor** → **New Query**.
3. Copiar y pegar el contenido de dicho archivo y pulsar **Run**.

### Contenido resumido de la migración:
- `ALTER TABLE products ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;`
- `CREATE INDEX IF NOT EXISTS idx_products_active ON products(restaurant_id, is_archived, is_available);`
- `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS password_hash TEXT;`
- `ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;`
- `ALTER TABLE drivers DROP COLUMN IF EXISTS pin;`
- `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'ACTIVE';`
- `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS custom_categories TEXT[] DEFAULT '{}';`
- Configuración de `DEFAULT 0` para `commission_rate` y `service_fee`.

---

## 7. Límites de Seguridad Conocidos y Hoja de Ruta (Fase 2)

### A. Aislamiento Criptográfico Definitivo de Clientes (Supabase RLS)
Actualmente, el cliente web no tiene autenticación obligatoria para realizar pedidos rápidos (flujo de compra ágil mediante teléfono). El aislamiento de pedidos en `Header.tsx` se basa en `localStorage`.
**Objetivo Fase 2**: Implementar Supabase Auth con autenticación OTP (por SMS/WhatsApp) o correo electrónico para clientes y activar Row Level Security (RLS) en la tabla `orders`:
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clientes solo leen sus propios pedidos"
ON orders FOR SELECT
TO authenticated
USING (customer_id = auth.uid());
```

### B. Infraestructura de Posicionamiento y Publicidad Patrocinada
- Crear los campos en base de datos para `is_sponsored: boolean`, `sponsor_expires_at: timestamptz` y `sponsor_tier: text`.
- Asegurar que toda publicidad esté rotulada explícitamente como **«Patrocinado»** para cumplir con la imparcialidad del marketplace.
- Mantener la monetización desactivada hasta alcanzar el umbral de visitas acordado con la gerencia.

### C. Torre de Control y Métricas de Rendimiento
- Métricas de tiempo de ciclo por restaurante (tiempo promedio de preparación vs. tiempo estimado).
- Reporte de incidencias y cancelaciones con filtro por actor (`CLIENTE`, `RESTAURANTE`, `SISTEMA`, `ADMINISTRADOR`).
- Liquidaciones masivas periódicas y exportación a formatos contables.

---

## 8. Mapa de Archivos Clave del Repositorio

| Archivo | Responsabilidad / Descripción |
| :--- | :--- |
| [`src/context/AppContext.tsx`](src/context/AppContext.tsx) | Estado global de la aplicación (React Context), sincronización de canasta, autenticación de sesiones, orquestador de pedidos y validación de checkout. |
| [`src/services/dataService.ts`](src/services/dataService.ts) | Capa de abstracción de datos. Comunicación con cliente Supabase y fallback transparente a `localStorage`. Retorna `MutationResult`. |
| [`src/lib/pricing.ts`](src/lib/pricing.ts) | Única fuente de verdad para cálculos monetarios: subtotales, costo de domicilio ($7.000 COP), tarifas de servicio ($0), comisiones (0%) y liquidaciones. |
| [`src/lib/passwordPolicy.ts`](src/lib/passwordPolicy.ts) | Reglas de validación de contraseñas de domiciliarios (mínimo 6 chars, lista negra de credenciales de prueba). Seguro para bundling en cliente. |
| [`src/lib/passwordHash.ts`](src/lib/passwordHash.ts) | Hashing seguro del lado servidor con `scryptSync` y `timingSafeEqual`. Importa de módulo `crypto` de Node.js. |
| [`src/app/api/driver-auth/route.ts`](src/app/api/driver-auth/route.ts) | Endpoint de servidor Next.js (`POST`) para verificar y hashear contraseñas de domiciliarios contra Supabase. |
| [`src/lib/mappers.ts`](src/lib/mappers.ts) | Mapeo de entidades entre formato relacional SQL snake_case y TypeScript camelCase (`is_archived` ↔ `isArchived`, etc.). |
| [`src/types/index.ts`](src/types/index.ts) | Definiciones de tipos TypeScript centrales: `Product`, `Restaurant`, `Order`, `Driver`, `MutationResult`, etc. |
| [`src/app/admin/page.tsx`](src/app/admin/page.tsx) | Panel de administración de plataforma. Torre de control de órdenes, liquidaciones, categorías globales, afiliación de comercios con tags y flota de repartidores. |
| [`src/app/merchant/page.tsx`](src/app/merchant/page.tsx) | Panel operativo de restaurante aliado. Comandas en tiempo real, gestión de categorías, menú y archivado de platos. |
| [`src/app/driver/page.tsx`](src/app/driver/page.tsx) | Panel del repartidor. Control de turno, reclamo atómico de pedidos, gestión de entregas y reporte de averías. |
| [`src/app/login/page.tsx`](src/app/login/page.tsx) | Pantalla de inicio de sesión unificada. Deduce automáticamente el rol (`CLIENTE`, `RESTAURANTE`, `DOMICILIARIO`, `ADMINISTRADOR`). |
| [`src/components/common/Header.tsx`](src/components/common/Header.tsx) | Cabecera principal, canasta de compras y modal «Mis Pedidos» con filtrado estricto por dispositivo. |
| [`src/components/restaurant/CartDrawer.tsx`](src/components/restaurant/CartDrawer.tsx) | Carrito lateral y checkout con validaciones de disponibilidad y persistencia de teléfono y dirección. |

---

## 9. Comandos Operativos de Referencia

```bash
# Instalación de dependencias (respetando package-lock.json)
npm install

# Servidor de desarrollo (OBLIGATORIO usar --webpack en Termux)
npx next dev --webpack

# Compilación de producción (OBLIGATORIO usar --webpack en Termux)
npx next build --webpack

# Verificación de TypeScript
npx tsc --noEmit
```

---
*Documento preparado y certificado para continuidad de desarrollo en DonDomi.*
