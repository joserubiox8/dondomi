# Reglas de Proyecto y Contexto Técnico — DonDomi (Valledupar)

Este documento define las **reglas de negocio inviolables** y las **directrices técnicas del entorno Google Antigravity Remote Mode (Cloud Linux x86_64)** que todo agente de IA debe cumplir estrictamente al modificar o compilar este repositorio.

---

## 1. Reglas de Negocio Críticas Inviolables

1. **Logística y Tarifas en Valledupar**:
   - **Tarifa de domicilio plana inicial**: **$7.000 COP** para todo el perímetro urbano de Valledupar, Cesar, Colombia (configurable globalmente desde `platform_config` / `globalDeliveryFee`).
   - **Transparencia radical**: **$0 COP** en tarifas de servicio ocultas al cliente (`serviceFee = 0`) y **0% comisión** a restaurantes aliados durante la etapa inicial de validación MVP (aunque el modelo soporta cálculo de comisiones pactadas).
   - **Unificación matemática**: Todo cálculo de subtotales, tarifas de domicilio y totales debe pasar exclusivamente por [`src/lib/pricing.ts`](src/lib/pricing.ts).

2. **Prohibición Absoluta de Diálogos Nativos del Navegador**:
   - **Queda estrictamente prohibido usar `window.alert()`, `window.confirm()` o `window.prompt()`** en cualquier parte de la aplicación.
   - Toda advertencia, confirmación destructiva (ej. cambio de restaurante en canasta, eliminación de plato/categoría, rechazo o cancelación de pedido) o ingreso de motivos debe utilizar modales o banners inline integrados visualmente con el diseño de DonDomi en Tailwind CSS.

3. **Imparcialidad y Equidad en el Catálogo (Sin Favoritismos)**:
   - **Prohibido incluir etiquetas de «Destacado» (`★ Destacado`) o secciones privilegiadas** que alteren la equidad entre los restaurantes afiliados. Todos los comercios se presentan de manera neutral e imparcial.

4. **Validación Estricta de Contacto en Checkout**:
   - El número de teléfono celular / WhatsApp del cliente debe tener **obligatoriamente y exactamente 10 dígitos numéricos** (ej. `3001234567`).

5. **Canasta Persistente con Caducidad Automática**:
   - La canasta de compras se persiste en `localStorage` (`dondomi_cart_v1`) con una vigencia de **2 horas** (`CART_EXPIRATION_MS`). Si supera ese tiempo, se limpia automáticamente.

6. **Persistencia de Pedidos Activos y Soporte Multi-Pedido**:
   - El banner de pedido activo (`ActiveOrderBanner.tsx`) **no debe tener botón de cierre ('X')**; permanece visible durante todo el ciclo activo del pedido (`PENDING`, `PREPARING`, `READY_FOR_PICKUP`, `ON_THE_WAY`).
   - Soporta múltiples pedidos simultáneos mediante la colección `dondomi_active_orders: string[]`.

7. **Autocancelación por Inactividad (SLA de 15 Minutos)**:
   - Todo pedido en estado `PENDING` que supere **15 minutos** sin ser confirmado por el restaurante se cancela automáticamente con `cancelledBy: 'SISTEMA'` y registro del motivo sin borrar el historial.

8. **Integridad del Ciclo de Vida del Pedido**:
   - Las transiciones de estado deben respetar `VALID_ORDER_TRANSITIONS` (`PENDING` → `PREPARING` → `READY_FOR_PICKUP` → `ON_THE_WAY` → `DELIVERED` o `CANCELLED`, permitiendo devolver de `ON_THE_WAY` a `READY_FOR_PICKUP` solo mediante `unclaimOrder` ante incidencia del domiciliario).
   - Ninguna cancelación o rechazo debe eliminar el registro histórico del pedido; el actor y motivo se conservan serializados en `customer_notes` (`[Cancelado por RESTAURANTE/CLIENTE/SISTEMA/ADMINISTRADOR: ...]`).
   - Bloqueo estricto de compras cuando el restaurante está cerrado (`isOpen === false`) o cuando un plato está marcado como agotado (`isAvailable === false`).
   - Reclamo atómico de carreras por domiciliarios (`is('driver_id', null)`) para impedir colisiones.

9. **Autenticación Unificada Limpia**:
   - La pantalla `/login` solo solicita correo y contraseña (o PIN), deduciendo automáticamente el rol (`CLIENTE`, `RESTAURANTE`, `DOMICILIARIO` o `ADMINISTRADOR`) y redirigiendo al panel correspondiente. Los clientes no ven enlaces a paneles internos en su navegación principal.

10. **Tolerancia a Fallos y Persistencia Compartida**:
    - Todas las operaciones de lectura/escritura pasan por [`src/services/dataService.ts`](src/services/dataService.ts), manteniendo fallback transparente a `localStorage` si alguna tabla nueva (`categories`, `drivers`, `platform_config`) aún no ha sido creada en Supabase (`42P01`) o si falla la conexión móvil.

---

## 2. Entorno de Ejecución: Google Antigravity Remote Mode (Cloud Linux x86_64)

El proyecto ha sido completamente migrado desde el entorno móvil previo (Android Termux) a **Google Antigravity Remote Mode (`antigravity.google.com/remote`)**, ejecutándose en contenedores dedicados en la nube de Google sobre **Linux x86_64** y conectado directamente al repositorio GitHub (`joserubiox8/dondomi`).

### Directrices Técnicas del Entorno Remoto:

1. **Soporte Completo de Turbopack y Motor Nativo**:
   - Ya no existen restricciones de binarios nativos SWC o bindings WASM. Turbopack es el motor predeterminado y recomendado para desarrollo y compilación en Next.js 16:
     ```bash
     # Iniciar servidor de desarrollo (Turbopack nativo)
     npm run dev
     # o bien: npx next dev

     # Compilación optimizada para producción (Turbopack nativo)
     npm run build
     # o bien: npx next build

     # Validación de tipos TypeScript sin emisión
     npm run type-check
     # o bien: npx tsc --noEmit
     ```

2. **Estabilidad del Toolchain y TypeScript**:
   - Se mantiene `typescript` en versión `5.8.3` y React 19 / Next.js 16.3.8 con App Router.
   - Todo cambio debe mantener `npm run type-check` y `npm run build` con 0 errores de tipado y compilación exitosa.

3. **Flujo de Trabajo y Persistencia en la Nube**:
   - Todo cambio de código debe integrarse con commits atómicos y descriptivos en GitHub (`origin/main`).
   - El entorno persiste las sesiones y ejecución en segundo plano sin depender del dispositivo cliente.

4. **Reglas de Negocio 100% Inmutables**:
   - Las reglas de negocio de DonDomi (Sección 1) continúan siendo obligatorias y estrictas en todos los entornos.
