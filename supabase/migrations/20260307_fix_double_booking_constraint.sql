-- Fix: restrict_double_booking constraint was too broad
-- Previously: WHERE (status != 'cancelled') — this blocked bookings even when existing booking was checked-out
-- Now: WHERE (status IN ('reserved', 'confirmed', 'checked-in', 'checked_in')) — only truly active bookings block

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS restrict_double_booking;

ALTER TABLE bookings
ADD CONSTRAINT restrict_double_booking
EXCLUDE USING gist (
    room_id WITH =,
    daterange(check_in, check_out) WITH &&
)
WHERE (status IN ('reserved', 'confirmed', 'checked-in', 'checked_in'));
