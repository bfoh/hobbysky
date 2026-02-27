-- Migration: Create housekeeping_tasks table
-- Purpose: Adds the missing table for the housekeeping dashboard

CREATE TABLE IF NOT EXISTS public.housekeeping_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id TEXT,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    room_number TEXT NOT NULL,
    assigned_to TEXT REFERENCES public.staff(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;

-- Staff can view all tasks
CREATE POLICY "Staff can view all housekeeping tasks"
ON public.housekeeping_tasks FOR SELECT
TO authenticated
USING (true);

-- Staff can insert housekeeping tasks
CREATE POLICY "Staff can insert housekeeping tasks"
ON public.housekeeping_tasks FOR INSERT
TO authenticated
WITH CHECK (true);

-- Staff can update housekeeping tasks
CREATE POLICY "Staff can update housekeeping tasks"
ON public.housekeeping_tasks FOR UPDATE
TO authenticated
USING (true);

-- Staff can delete housekeeping tasks
CREATE POLICY "Staff can delete housekeeping tasks"
ON public.housekeeping_tasks FOR DELETE
TO authenticated
USING (true);
