-- Migration: Fix check-in/check-out workflow
-- 1. Fix status constraint — the frontend uses hyphenated values ('checked-in', 'checked-out', 'reserved')
--    but the original schema used underscores. Drop and recreate to accept both.
-- 2. Add missing discount columns required by the check-in dialog.
--
-- Run in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/ecadncrzvovytifqbvaw/sql/new

-- ── Part 1: Fix bookings status check constraint ──────────────────────────────
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'pending',
    'reserved',
    'confirmed',
    'checked-in',
    'checked-out',
    'cancelled',
    'checked_in',   -- legacy underscore form (backwards compat)
    'checked_out'   -- legacy underscore form (backwards compat)
  ));

-- ── Part 2: Add missing discount/payment columns ──────────────────────────────
-- discount_amount: what was actually deducted at check-in
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- final_amount: total price after discount is applied
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS final_amount DECIMAL(10,2);

-- discounted_by: user ID of the staff member who approved the discount
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS discounted_by TEXT;
