-- ==============================================================================
-- DONDOMI - ESQUEMA DE BASE DE DATOS POSTGRESQL (SUPABASE)
-- Plataforma de Comida y Domicilios - Valledupar, Cesar, Colombia
-- ==============================================================================

-- 1. TABLA: RESTAURANTES
CREATE TABLE IF NOT EXISTS public.restaurants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    rating NUMERIC(2,1) DEFAULT 5.0,
    reviews_count INT DEFAULT 0,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    address TEXT NOT NULL,
    neighborhood TEXT NOT NULL, -- Barrio en Valledupar
    phone TEXT NOT NULL,        -- WhatsApp de pedidos
    is_open BOOLEAN DEFAULT true,
    opening_hours TEXT DEFAULT '11:00 AM - 10:00 PM',
    estimated_time_min INT DEFAULT 25,
    estimated_time_max INT DEFAULT 40,
    delivery_fee_base NUMERIC(10,2) DEFAULT 5000,
    min_order_amount NUMERIC(10,2) DEFAULT 15000,
    commission_rate NUMERIC(4,1) DEFAULT 15.0,
    accepts_cash BOOLEAN DEFAULT true,
    accepts_nequi BOOLEAN DEFAULT true,
    accepts_daviplata BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: PRODUCTOS / PLATOS (100% textuales con adiciones)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_name TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    original_price NUMERIC(10,2),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    is_popular BOOLEAN DEFAULT false,
    preparation_time_min INT DEFAULT 20,
    options JSONB, -- Grupos de adiciones y modificadores
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: PEDIDOS
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    restaurant_id TEXT REFERENCES public.restaurants(id) ON DELETE SET NULL,
    restaurant_name TEXT NOT NULL,
    driver_id TEXT,
    driver_name TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    items JSONB NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    delivery_fee NUMERIC(10,2) NOT NULL,
    service_fee NUMERIC(10,2) NOT NULL DEFAULT 1500,
    total NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'PENDING',
    delivery_address JSONB NOT NULL,
    customer_notes TEXT,
    estimated_delivery_time TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE LECTURA PÚBLICA (Para que clientes y restaurantes puedan ver)
CREATE POLICY "Permitir lectura publica de restaurantes" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Permitir lectura publica de productos" ON public.products FOR SELECT USING (true);
CREATE POLICY "Permitir lectura publica de pedidos" ON public.orders FOR SELECT USING (true);

-- POLÍTICAS DE INSERCIÓN Y EDICIÓN PÚBLICA (Para administración de MVP)
CREATE POLICY "Permitir insercion de restaurantes" ON public.restaurants FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizacion de restaurantes" ON public.restaurants FOR UPDATE USING (true);

CREATE POLICY "Permitir insercion de productos" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizacion de productos" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminacion de productos" ON public.products FOR DELETE USING (true);

CREATE POLICY "Permitir insercion de pedidos" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizacion de pedidos" ON public.orders FOR UPDATE USING (true);

-- Habilitar tiempo real en pedidos para sonido de cocina
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
