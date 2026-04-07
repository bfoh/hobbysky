-- Migration: Create hr_weekly_revenue and standalone_sales tables
-- Purpose: Enable staff weekly revenue report submission and standalone sales tracking

-- ─── HR Weekly Revenue Reports ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_weekly_revenue (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL DEFAULT '',
    staff_name TEXT NOT NULL DEFAULT '',
    week_start TEXT NOT NULL DEFAULT '',
    week_end TEXT NOT NULL DEFAULT '',
    total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    booking_count INTEGER NOT NULL DEFAULT 0,
    booking_ids TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT DEFAULT '',
    admin_notes TEXT DEFAULT '',
    reviewed_by TEXT DEFAULT '',
    reviewed_at TEXT DEFAULT '',
    submitted_at TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_hr_weekly_revenue_staff_id ON public.hr_weekly_revenue(staff_id);
CREATE INDEX IF NOT EXISTS idx_hr_weekly_revenue_week_start ON public.hr_weekly_revenue(week_start);
CREATE INDEX IF NOT EXISTS idx_hr_weekly_revenue_status ON public.hr_weekly_revenue(status);

-- Row Level Security
ALTER TABLE public.hr_weekly_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage weekly revenue"
ON public.hr_weekly_revenue
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.hr_weekly_revenue IS 'Tracks weekly revenue reports per staff member';

-- ─── Standalone Sales ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.standalone_sales (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    staff_id TEXT NOT NULL DEFAULT '',
    staff_name TEXT NOT NULL DEFAULT '',
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_standalone_sales_staff_id ON public.standalone_sales(staff_id);
CREATE INDEX IF NOT EXISTS idx_standalone_sales_sale_date ON public.standalone_sales(sale_date);

-- Row Level Security
ALTER TABLE public.standalone_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage standalone sales"
ON public.standalone_sales
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.standalone_sales IS 'Tracks walk-in sales not linked to a booking (bar, restaurant, etc.)';
