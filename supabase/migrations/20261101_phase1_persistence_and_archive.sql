-- ============================================================================
-- DonDomi - Fase 1: Persistencia Real, Seguridad de Domiciliarios y Archivado Lógico
-- Archivo de migración manual para ejecutar en el SQL Editor de Supabase:
-- supabase/migrations/20261101_phase1_persistence_and_archive.sql
-- ============================================================================

-- 1. TABLA: RESTAURANTS (Persistencia de estado de cuenta, llaves de pago, categorías y comisión 0%)
ALTER TABLE IF EXISTS public.restaurants
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS nequi_number TEXT,
  ADD COLUMN IF NOT EXISTS daviplata_number TEXT,
  ADD COLUMN IF NOT EXISTS breb_key TEXT,
  ADD COLUMN IF NOT EXISTS accepts_breb BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accepts_card BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_categories TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pin TEXT;

-- Eliminar cualquier valor predeterminado inseguro ('1234') y fijar comisión 0% y featured false por defecto
ALTER TABLE IF EXISTS public.restaurants ALTER COLUMN pin DROP DEFAULT;
ALTER TABLE IF EXISTS public.restaurants ALTER COLUMN commission_rate SET DEFAULT 0;
ALTER TABLE IF EXISTS public.restaurants ALTER COLUMN featured SET DEFAULT false;

-- 2. TABLA: DRIVERS (Disponibilidad real y almacenamiento de hash criptográfico sin PIN en texto plano)
ALTER TABLE IF EXISTS public.drivers
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT NOT NULL DEFAULT 'MOTO',
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Asegurar que no exista columna de PIN en texto plano en domiciliarios
ALTER TABLE IF EXISTS public.drivers DROP COLUMN IF EXISTS pin;

-- 3. TABLA: PRODUCTS (Archivado lógico sin eliminar historial de pedidos)
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_restaurant_archived
  ON public.products (restaurant_id, is_archived);

-- 4. TABLA: ORDERS (Garantizar tarifa de servicio $0 COP por defecto)
ALTER TABLE IF EXISTS public.orders ALTER COLUMN service_fee SET DEFAULT 0;
