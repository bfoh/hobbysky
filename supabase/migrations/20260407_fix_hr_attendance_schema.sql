-- Migration: Ensure hr_attendance table exists with all required columns
-- Fixes clock-in/out failures caused by missing columns

-- ─── Create table if it doesn't exist ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_attendance (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL DEFAULT '',
    staff_name TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL DEFAULT '',
    clock_in TEXT NOT NULL DEFAULT '',
    clock_out TEXT NOT NULL DEFAULT '',
    clock_in_date TEXT DEFAULT '',
    clock_out_date TEXT DEFAULT '',
    clock_in_lat DOUBLE PRECISION,
    clock_in_lng DOUBLE PRECISION,
    clock_in_accuracy DOUBLE PRECISION,
    clock_out_lat DOUBLE PRECISION,
    clock_out_lng DOUBLE PRECISION,
    hours_worked DECIMAL(6,2) NOT NULL DEFAULT 0,
    is_overnight_shift BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'init',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Add missing columns if table already exists ─────────────────────────────
-- These columns were added after the initial table creation and may be missing.

DO $$
BEGIN
    -- clock_in_date / clock_out_date (for cross-day shifts)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hr_attendance' AND column_name='clock_in_date') THEN
        ALTER TABLE public.hr_attendance ADD COLUMN clock_in_date TEXT DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hr_attendance' AND column_name='clock_out_date') THEN
        ALTER TABLE public.hr_attendance ADD COLUMN clock_out_date TEXT DEFAULT '';
    END IF;

    -- GPS columns for clock-in
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hr_attendance' AND column_name='clock_in_lat') THEN
        ALTER TABLE public.hr_attendance ADD COLUMN clock_in_lat DOUBLE PRECISION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hr_attendance' AND column_name='clock_in_lng') THEN
        ALTER TABLE public.hr_attendance ADD COLUMN clock_in_lng DOUBLE PRECISION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hr_attendance' AND column_name='clock_in_accuracy') THEN
        ALTER TABLE public.hr_attendance ADD COLUMN clock_in_accuracy DOUBLE PRECISION;
    END IF;

    -- GPS columns for clock-out
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hr_attendance' AND column_name='clock_out_lat') THEN
        ALTER TABLE public.hr_attendance ADD COLUMN clock_out_lat DOUBLE PRECISION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hr_attendance' AND column_name='clock_out_lng') THEN
        ALTER TABLE public.hr_attendance ADD COLUMN clock_out_lng DOUBLE PRECISION;
    END IF;

    -- Overnight shift flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hr_attendance' AND column_name='is_overnight_shift') THEN
        ALTER TABLE public.hr_attendance ADD COLUMN is_overnight_shift BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ─── Indexes for common queries ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hr_attendance_staff_id ON public.hr_attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_date ON public.hr_attendance(date);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_status ON public.hr_attendance(status);

-- ─── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE public.hr_attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then create
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow authenticated users to manage attendance" ON public.hr_attendance;
    CREATE POLICY "Allow authenticated users to manage attendance"
    ON public.hr_attendance
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

COMMENT ON TABLE public.hr_attendance IS 'Tracks staff clock-in/out attendance records with GPS verification';
