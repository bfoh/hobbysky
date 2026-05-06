-- Migration: Create inventory tables and link to sales
-- Purpose: Enable real-time stock tracking and accountability

-- ─── Inventory Items ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'other',
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_threshold INTEGER NOT NULL DEFAULT 5,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage inventory items"
ON public.inventory_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ─── Inventory Logs (Traceability) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    staff_id TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'sale', 'restock', 'adjustment', 'damage'
    quantity_change INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view inventory logs"
ON public.inventory_logs
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ─── Update Standalone Sales ──────────────────────────────────────────────────
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='standalone_sales' AND column_name='item_id') THEN
        ALTER TABLE public.standalone_sales ADD COLUMN item_id TEXT REFERENCES public.inventory_items(id);
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_item_id ON public.inventory_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON public.inventory_logs(created_at);

COMMENT ON TABLE public.inventory_items IS 'Tracks products, their prices and current stock levels';
COMMENT ON TABLE public.inventory_logs IS 'Audit trail for all stock movements';
