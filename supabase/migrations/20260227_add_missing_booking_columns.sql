-- Migration: Add missing columns to bookings table
-- These columns are used by the frontend code but were never defined in migrations.
-- Run this in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/ecadncrzvovytifqbvaw/sql/new

-- 1. source: where the booking came from (reception, online, voice_agent, etc.)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'reception';

-- 2. created_by: UUID/text of the staff member who created the booking
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS created_by TEXT;

-- 3. created_by_name: display name of the staff member who created the booking
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- 4. check_in_by: UUID/text of the staff member who checked the guest in
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS check_in_by TEXT;

-- 5. check_in_by_name: display name of the staff member who checked in
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS check_in_by_name TEXT;

-- 6. check_out_by: UUID/text of the staff member who checked the guest out
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS check_out_by TEXT;

-- 7. check_out_by_name: display name of the staff member who checked out
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS check_out_by_name TEXT;

-- Also add missing columns to guests table (used by booking engine)
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS last_booking_date TIMESTAMPTZ;

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS last_room_number TEXT;

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS last_check_in TEXT;

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS last_check_out TEXT;

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS last_source TEXT DEFAULT 'reception';

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS last_created_by TEXT;

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS last_created_by_name TEXT;

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS last_check_in_by_name TEXT;

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS last_check_out_by_name TEXT;

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(10,2) DEFAULT 0;

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS total_stays INTEGER DEFAULT 0;
