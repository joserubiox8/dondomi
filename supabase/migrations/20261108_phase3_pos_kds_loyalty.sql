-- ============================================================================
-- DonDomi - Fase 3: Sistema POS Híbrido, Fidelización VIP y Cierre Inteligente
-- Archivo de migración manual para ejecutar en el SQL Editor de Supabase:
-- supabase/migrations/20261108_phase3_pos_kds_loyalty.sql
-- ============================================================================

-- 1. TABLA: ORDERS (Soporte de canales POS, número de mesa y pagos divididos)
ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS order_channel TEXT NOT NULL DEFAULT 'delivery_app',
  ADD COLUMN IF NOT EXISTS table_number TEXT,
  ADD COLUMN IF NOT EXISTS is_split_payment BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfer_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfer_platform TEXT;

-- Restricción de verificación para canales válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_channel'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT chk_orders_channel
      CHECK (order_channel IN ('delivery_app', 'pos_local', 'pos_takeout'));
  END IF;
END $$;

-- 2. ÍNDICES DE RENDIMIENTO PARA POS Y FIDELIZACIÓN
CREATE INDEX IF NOT EXISTS idx_orders_channel
  ON public.orders (order_channel);

CREATE INDEX IF NOT EXISTS idx_orders_customer_phone
  ON public.orders (customer_phone);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created_at
  ON public.orders (restaurant_id, created_at DESC);
