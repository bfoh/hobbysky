-- Enable the btree_gist extension (required for exclusion constraints involving scalar types like room_id)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add a constraint ensuring that for a given room_id, no two bookings with active statuses can have overlapping check_in/check_out date ranges.
ALTER TABLE bookings
ADD CONSTRAINT restrict_double_booking
EXCLUDE USING gist (
    room_id WITH =,
    daterange(check_in, check_out) WITH &&
)
WHERE (status != 'cancelled');
