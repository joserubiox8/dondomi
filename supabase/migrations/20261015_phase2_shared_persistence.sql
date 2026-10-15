-- ============================================================================
-- DonDomi - Fase 2: Persistencia Compartida y Sincronización en Tiempo Real
-- Migración SQL para Supabase (PostgreSQL)
-- Fecha: 2026-10-15
-- 
-- Tablas introducidas:
-- 1. 'categories' (Categorías de comida para "¿Qué se te antoja hoy?")
-- 2. 'drivers' (Flota de domiciliarios y repartidores)
-- 3. 'platform_config' (Ajustes globales: tarifa plana de envío, anuncios)
-- ============================================================================

-- 1. TABLA: CATEGORÍAS DE COMIDA
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL,
    image_url TEXT,
    badge TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories (display_order);

-- 2. TABLA: FLOTA DE DOMICILIARIOS
CREATE TABLE IF NOT EXISTS public.drivers (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    plate TEXT NOT NULL,
    vehicle_type TEXT DEFAULT 'MOTO',
    is_active BOOLEAN DEFAULT true,
    rating NUMERIC(2,1) DEFAULT 5.0,
    total_deliveries INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de domiciliarios
CREATE INDEX IF NOT EXISTS idx_drivers_phone ON public.drivers (phone);
CREATE INDEX IF NOT EXISTS idx_drivers_is_active ON public.drivers (is_active);

-- 3. TABLA: CONFIGURACIÓN GLOBAL DE LA PLATAFORMA (Singleton)
CREATE TABLE IF NOT EXISTS public.platform_config (
    id TEXT PRIMARY KEY DEFAULT 'global_valledupar',
    global_delivery_fee NUMERIC(10,2) DEFAULT 7000,
    global_announcement TEXT,
    service_fee NUMERIC(10,2) DEFAULT 0,
    is_open BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Políticas para categories
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Permitir lectura publica categories') THEN
        CREATE POLICY "Permitir lectura publica categories" ON public.categories FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Permitir insercion categories') THEN
        CREATE POLICY "Permitir insercion categories" ON public.categories FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Permitir actualizacion categories') THEN
        CREATE POLICY "Permitir actualizacion categories" ON public.categories FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Permitir borrado categories') THEN
        CREATE POLICY "Permitir borrado categories" ON public.categories FOR DELETE USING (true);
    END IF;

    -- Políticas para drivers
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'drivers' AND policyname = 'Permitir lectura publica drivers') THEN
        CREATE POLICY "Permitir lectura publica drivers" ON public.drivers FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'drivers' AND policyname = 'Permitir insercion drivers') THEN
        CREATE POLICY "Permitir insercion drivers" ON public.drivers FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'drivers' AND policyname = 'Permitir actualizacion drivers') THEN
        CREATE POLICY "Permitir actualizacion drivers" ON public.drivers FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'drivers' AND policyname = 'Permitir borrado drivers') THEN
        CREATE POLICY "Permitir borrado drivers" ON public.drivers FOR DELETE USING (true);
    END IF;

    -- Políticas para platform_config
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'platform_config' AND policyname = 'Permitir lectura publica platform_config') THEN
        CREATE POLICY "Permitir lectura publica platform_config" ON public.platform_config FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'platform_config' AND policyname = 'Permitir actualizacion platform_config') THEN
        CREATE POLICY "Permitir actualizacion platform_config" ON public.platform_config FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'platform_config' AND policyname = 'Permitir insercion platform_config') THEN
        CREATE POLICY "Permitir insercion platform_config" ON public.platform_config FOR INSERT WITH CHECK (true);
    END IF;
END
$$;

-- 5. AGREGAR A PUBLICACIÓN DE SUPABASE REALTIME
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
EXCEPTION WHEN duplicate_object THEN
    -- Ya suscrito previamente
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
EXCEPTION WHEN duplicate_object THEN
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_config;
EXCEPTION WHEN duplicate_object THEN
END $$;

-- 6. DATOS SEMILLA (SEED DATA) DE VALLEDUPAR
-- Categorías
INSERT INTO public.categories (id, name, slug, icon, badge, display_order)
VALUES
    ('cat-salchipapas', 'Salchipapas', 'salchipapas', '🍟', 'Top Valle', 1),
    ('cat-1', 'Pollo Asado', 'pollo-asado', '🍗', 'Popular', 2),
    ('cat-2', 'Hamburguesas', 'hamburguesas', '🍔', 'Top', 3),
    ('cat-3', 'Parrilla & Carnes', 'parrilla', '🥩', NULL, 4),
    ('cat-4', 'Pizzas', 'pizzas', '🍕', NULL, 5),
    ('cat-5', 'Arepas & Fritos', 'arepas-fritos', '🫓', 'Típico', 6),
    ('cat-6', 'Comida Rápida', 'comida-rapida', '🌭', NULL, 7),
    ('cat-7', 'Costeña Criolla', 'costena', '🍲', NULL, 8),
    ('cat-8', 'Postres & Dulces', 'postres', '🍰', NULL, 9),
    ('cat-9', 'Bebidas & Jugos', 'bebidas', '🥤', NULL, 10)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    icon = EXCLUDED.icon,
    badge = EXCLUDED.badge;

-- Domiciliarios
INSERT INTO public.drivers (id, name, phone, email, plate, vehicle_type, is_active, total_deliveries, rating)
VALUES
    ('drv-1', 'Javier Morales', '300 123 4567', 'javier@dondomi.com', 'ABC-12D', 'MOTO', true, 142, 4.9),
    ('drv-2', 'Carlos Mendoza', '310 987 6543', 'carlos@dondomi.com', 'XYZ-89F', 'MOTO', true, 98, 4.8)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    plate = EXCLUDED.plate;

-- Configuración Inicial
INSERT INTO public.platform_config (id, global_delivery_fee, global_announcement, service_fee, is_open)
VALUES ('global_valledupar', 7000, NULL, 0, true)
ON CONFLICT (id) DO NOTHING;
