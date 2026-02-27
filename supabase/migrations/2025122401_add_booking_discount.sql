-- Migration: Add discount fields to bookings
-- Purpose: Allow staff to apply discounts to bookings

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_reason TEXT;