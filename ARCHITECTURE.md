# DonDomi - Arquitectura y Documentación Técnica (Fase 1 - MVP)

## 1. Visión General
**DonDomi** es una plataforma web de comida y domicilios enfocada inicialmente en **Valledupar, Cesar, Colombia**. Está diseñada como una **Web App responsive mobile-first** orientada a validar el negocio con una primera cohorte de **15–20 restaurantes locales**.

---

## 2. Decisiones de Arquitectura y Stack Tecnológico

### ¿Por qué este Stack?
1. **Next.js (App Router) + React + TypeScript:**
   - **Cero sobreingeniería:** No usamos microservicios. Next.js permite tener en un único proyecto tanto el frontend móvil como las rutas de backend API (`/api/...`) protegidas.
   - **Rendimiento móvil:** Carga casi instantánea con SSR/Server Components en redes móviles (3G/4G) de Valledupar.
   - **Tipado estricto:** TypeScript garantiza que los modelos de datos (Restaurantes, Platos, Pedidos, Tarifas) sean consistentes antes de conectar la base de datos real.

2. **Tailwind CSS v4:**
   - Diseño mobile-first con sensación de aplicación nativa (bottom navigation bar, modales tipo bottom-sheet, microinteracciones táctiles).
   - Estilo visual cálido, apetitoso, rápido y confiable (sin parecer plantilla genérica).

3. **Lucide React:**
   - Iconografía moderna, consistente y liviana para navegación táctil con una sola mano.

---

## 3. Modelo de Entidades y Base de Datos (Preparado para Fase 2)

Las entidades están modeladas en `src/types/index.ts` y listas para migrarse a **PostgreSQL (Supabase o Prisma)**:

- **Users:** Roles `CLIENTE`, `RESTAURANTE`, `ADMINISTRADOR`, `DOMICILIARIO`.
- **Addresses:** Barrios de Valledupar (Novalito, Los Cortijos, Centro, San Joaquín, etc.), referencias y coordenadas.
- **Restaurants:** Datos del comercio, horarios, rating, comisión pactada (12-15%), estado abierto/cerrado.
- **Categories & Products:** Menús categorizados, precios en pesos colombianos (COP), fotos y modificadores opcionales (términos de carne, bebidas, adicionales).
- **Orders & OrderItems:** Ciclo completo: `PENDING` → `CONFIRMED` → `PREPARING` → `READY_FOR_PICKUP` → `ON_THE_WAY` → `DELIVERED`.
- **Payments:** Efectivo contraentrega, Nequi, Daviplata.
- **Drivers & DeliveryAssignments:** Preparado para asignación y rastreo de domiciliarios de plataforma.
- **Commissions & Settlements:** Cálculo de ganancias de la plataforma y liquidaciones quincenales para restaurantes.

---

## 4. Estructura de Rutas y Módulos

```
src/
├── app/
│   ├── page.tsx                      # App Cliente (Inicio mobile-first Valledupar)
│   ├── layout.tsx                    # Shell global con Provider y Navegación
│   ├── globals.css                   # Tailwind v4 y estilos base
│   ├── restaurant/
│   │   └── [id]/
│   │       ├── page.tsx              # Página del restaurante
│   │       └── RestaurantView.tsx    # Menú interactivo, categorías y personalización
│   ├── merchant/
│   │   └── page.tsx                  # Portal del Restaurante (gestión de pedidos en cocina)
│   ├── driver/
│   │   └── page.tsx                  # Portal del Domiciliario (carreras y entregas)
│   └── admin/
│       └── page.tsx                  # Panel de Administración de DonDomi
├── components/
│   ├── common/                       # Header, BottomNav, LocationModal
│   ├── home/                         # SearchBar, CategoryChips, PromoBanner, RestaurantCard, RestaurantList
│   └── restaurant/                   # ProductModal, CartDrawer, CartFloatBar
├── data/
│   └── mockData.ts                   # Datos de 15+ restaurantes reales de Valledupar
├── lib/
│   ├── delivery.ts                   # Motor de cálculo dinámico de domicilios en Valledupar
│   └── utils.ts                      # Formateador de moneda COP ($ XX.XXX)
└── types/
    └── index.ts                      # Definición de tipos y entidades
```

---

## 5. Lógica de Negocio: Cálculo de Domicilios en Valledupar
El costo de domicilio varía de forma inteligente según la distancia entre barrios:
- **Mismo sector / Sector central (Novalito, Los Cortijos, Centro):** $4.500 - $5.000 COP (20-30 min).
- **Sectores intermedios (San Joaquín, Cinco de Noviembre):** +$1.000 a $1.500 COP (25-35 min).
- **Sectores periféricos (La Nevada, Don Alberto, Villa Ligia):** +$2.500 a $3.500 COP (35-50 min).

---

## 6. Próximos Pasos (Fase 2)
1. **Base de Datos y Autenticación:** Configurar Supabase / PostgreSQL con autenticación por WhatsApp / SMS OTP o correo.
2. **Formulario de Registro y Menú para Restaurantes:** Permitir al administrador afiliar y configurar fácilmente los 15-20 restaurantes.
3. **Flujo de Notificaciones de Pedidos:** Alertas en tiempo real (WebSockets / Supabase Realtime) para que la cocina escuche una campana cuando entre un pedido.
4. **Checkout e Integración de Pagos:** Integración de Nequi / Daviplata / Wompi o confirmación directa a WhatsApp del restaurante.
