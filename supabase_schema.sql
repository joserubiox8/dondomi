-- ============================================================================
-- DonDomi - Migración y Estructura Completa de Supabase (Valledupar)
-- Ejecuta este script en el SQL Editor de tu panel de Supabase:
-- https://supabase.com/dashboard/project/axnpjyjyziehwwvykrex/sql
-- ============================================================================

-- 1. Asegurar columnas necesarias en la tabla 'restaurants'
ALTER TABLE IF EXISTS restaurants ADD COLUMN IF NOT EXISTS pin text DEFAULT '1234';
ALTER TABLE IF EXISTS restaurants ADD COLUMN IF NOT EXISTS accepts_breb boolean DEFAULT true;
ALTER TABLE IF EXISTS restaurants ADD COLUMN IF NOT EXISTS accepts_card boolean DEFAULT false;

-- 2. Asegurar que las políticas de RLS permitan lectura y escritura pública para el MVP
ALTER TABLE IF EXISTS restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Políticas para restaurants
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurants' AND policyname = 'Permitir lectura publica restaurants') THEN
        CREATE POLICY "Permitir lectura publica restaurants" ON restaurants FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurants' AND policyname = 'Permitir insercion restaurants') THEN
        CREATE POLICY "Permitir insercion restaurants" ON restaurants FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurants' AND policyname = 'Permitir actualizacion restaurants') THEN
        CREATE POLICY "Permitir actualizacion restaurants" ON restaurants FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurants' AND policyname = 'Permitir borrado restaurants') THEN
        CREATE POLICY "Permitir borrado restaurants" ON restaurants FOR DELETE USING (true);
    END IF;

    -- Políticas para products
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Permitir lectura publica products') THEN
        CREATE POLICY "Permitir lectura publica products" ON products FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Permitir insercion products') THEN
        CREATE POLICY "Permitir insercion products" ON products FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Permitir actualizacion products') THEN
        CREATE POLICY "Permitir actualizacion products" ON products FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Permitir borrado products') THEN
        CREATE POLICY "Permitir borrado products" ON products FOR DELETE USING (true);
    END IF;

    -- Políticas para orders
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Permitir lectura publica orders') THEN
        CREATE POLICY "Permitir lectura publica orders" ON orders FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Permitir insercion orders') THEN
        CREATE POLICY "Permitir insercion orders" ON orders FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Permitir actualizacion orders') THEN
        CREATE POLICY "Permitir actualizacion orders" ON orders FOR UPDATE USING (true);
    END IF;
END
$$;

-- 3. Habilitar Supabase Realtime para recibir alertas de pedidos en vivo
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- 4. Insertar o actualizar los restaurantes insignia de Valledupar (incluyendo Salchipapas Donde Chalo)
INSERT INTO restaurants (
    id, name, slug, description, logo_url, banner_url, tags, address, neighborhood, phone, 
    is_open, opening_hours, estimated_time_min, estimated_time_max, delivery_fee_base, 
    min_order_amount, commission_rate, pin, accepts_cash, accepts_nequi, accepts_breb, accepts_daviplata, accepts_card, featured
) VALUES
(
    'rest-1', 'Pollos El Valle', 'pollos-el-valle', 
    'El auténtico pollo asado y broaster con sazón vallenata tradicional. Acompañado de papas a la francesa, arepas y miel mostaza especial.',
    'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=1000&q=80',
    ARRAY['Pollo Asado', 'Broaster', 'Combos Familiares'],
    'Cra 9 # 12-40, Centro', 'Centro Histórico', '300 456 7890',
    true, '10:30 AM - 10:00 PM', 25, 35, 7000, 15000, 0, '1234', true, true, true, true, false, true
),
(
    'rest-2', 'Guatapurí Burger House', 'guatapuri-burger-house',
    'Hamburguesas 100% artesanales con carne premium a la brasa, pan brioche sellado con mantequilla y salsas de la casa.',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1000&q=80',
    ARRAY['Hamburguesas', 'Salchipapas', 'Artesanal'],
    'Calle 16 # 19B-12, Los Cortijos', 'Los Cortijos', '312 889 0012',
    true, '5:00 PM - 11:30 PM', 30, 45, 7000, 20000, 0, '1234', true, true, true, true, false, true
),
(
    'rest-3', 'El Asador de Pedro', 'el-asador-de-pedro',
    'Los mejores cortes de carne al carbón, punta de anca, churrasco tierno y baby beef servidos con patacón con queso costeño.',
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1000&q=80',
    ARRAY['Parrilla', 'Carnes', 'Asados'],
    'Calle 9 # 6-25, Novalito', 'Novalito', '315 223 3445',
    true, '11:30 AM - 10:00 PM', 35, 50, 7000, 28000, 0, '1234', true, true, true, true, false, true
),
(
    'rest-4', 'Pizzería La Sirena Vallenata', 'pizzeria-la-sirena',
    'Pizza artesanal en horno de piedra con masa madre fina y crocante, quesos gratinados e ingredientes frescos de la región.',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1000&q=80',
    ARRAY['Pizzas', 'Pastas', 'Italiana'],
    'Calle 14 # 7-18, Centro Histórico', 'Centro Histórico', '317 654 3210',
    true, '4:00 PM - 11:00 PM', 30, 45, 7000, 22000, 0, '1234', true, true, true, true, false, false
),
(
    'rest-5', 'Arepas & Fritos Cacique Upar', 'arepas-fritos-cacique',
    'Arepas rellenas asadas al carbón, carimañolas de carne, empanadas y patacones con queso costeño rallado y suero atollabuey.',
    'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1000&q=80',
    ARRAY['Arepas', 'Fritos', 'Típico Costeño'],
    'Cra 19 # 9-80, Los Cortijos', 'Los Cortijos', '318 901 2345',
    true, '6:30 AM - 10:00 PM', 20, 30, 7000, 12000, 0, '1234', true, true, true, true, false, true
),
(
    'rest-6', 'Donde Chalo - Comida Rápida', 'donde-chalo',
    'Las salchipapas más monstruosas de Valledupar con tocineta, queso costeño, maíz dulce, ripio de papa y salsa tártara artesanal.',
    'https://images.unsplash.com/photo-1627054234594-55417b165992?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=1000&q=80',
    ARRAY['Salchipapas', 'Perros Calientes', 'Desgranados'],
    'Calle 16B # 15-42, San Joaquín', 'San Joaquín', '311 345 6789',
    true, '5:30 PM - 12:00 AM', 25, 40, 7000, 18000, 0, '1234', true, true, true, true, false, false
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    address = EXCLUDED.address,
    neighborhood = EXCLUDED.neighborhood,
    phone = EXCLUDED.phone,
    pin = EXCLUDED.pin,
    commission_rate = EXCLUDED.commission_rate,
    accepts_breb = EXCLUDED.accepts_breb,
    accepts_card = EXCLUDED.accepts_card;

-- 5. Platos estrella (incluyendo la Salchipapa Brutal de Donde Chalo)
INSERT INTO products (id, restaurant_id, category_name, name, description, price, is_available, is_popular, preparation_time_min, options)
VALUES
(
    'prod-601', 'rest-6', 'Salchipapas Especiales', 'Salchipapa Salvaje Donde Chalo',
    'Papas francesas crocantes, doble salchicha americana, carne desmechada en su jugo, pechuga deshilachada, abundante queso costeño gratinado, tocineta ahumada, maíz tierno y salsa tártara casera.',
    28000, true, true, 25,
    '[{"id":"grp-1","name":"Adiciones extras (opcional)","required":false,"minSelect":0,"maxSelect":3,"items":[{"id":"opt-1","name":"Extra Queso Costeño Gratinado","additionalPrice":4000},{"id":"opt-2","name":"Extra Tocineta Ahumada","additionalPrice":4500},{"id":"opt-3","name":"Porción de Suero Costeño","additionalPrice":2500}]}]'::jsonb
),
(
    'prod-602', 'rest-6', 'Salchipapas Especiales', 'Salchipapa Clásica Costeña',
    'Papas a la francesa con salchicha ranchera seleccionada, queso costeño rallado, ripio de papa y salsas tradicionales.',
    19000, true, false, 20,
    NULL
),
(
    'prod-401', 'rest-4', 'Pizzas Artesanales', 'Pizza Sirena Especial Familiar (8 Porciones)',
    'Masa madre crocante, salsa pomodoro casera, queso mozzarella gratinado, tocineta, pollo barbecue y maíz tierno.',
    38000, true, true, 30,
    NULL
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    description = EXCLUDED.description;
