-- Clean up old DB constraints preventing Push
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS restrict_double_booking;

-- Add a constraint ensuring that for a given room_id, no two bookings with active statuses can have overlapping check_in/check_out date ranges.
ALTER TABLE bookings                                                                                                                            
ADD CONSTRAINT restrict_double_booking                                                                                                          
EXCLUDE USING gist (                                                                                                                            
    room_id WITH =,                                                                                                                             
    daterange(check_in, check_out) WITH &&                                                                                                      
)                                                                                                                                               
WHERE (status != 'cancelled');

-- Update RPC function to authenticate guest by Room Number and FIRST Name
-- Fix column references: rooms.room_number (not rooms.number), bookings.check_out (not bookings.check_out_date), bookings.check_in (not bookings.check_in_date)

DROP FUNCTION IF EXISTS login_guest(text, text);

CREATE OR REPLACE FUNCTION login_guest(p_room_num text, p_name_input text)
RETURNS json
SECURITY DEFINER
AS $$
DECLARE
    found_token uuid;
    found_name text;
BEGIN
    -- Input normalization: trim whitespace
    p_room_num := trim(p_room_num);
    p_name_input := trim(p_name_input);

    SELECT b.guest_token, g.name
    INTO found_token, found_name
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN guests g ON b.guest_id = g.id
    WHERE r.room_number = p_room_num
    AND b.status IN ('confirmed', 'checked-in')
    AND b.check_out >= CURRENT_DATE 
    AND g.name ILIKE p_name_input || '%'
    ORDER BY b.check_in DESC
    LIMIT 1;

    IF found_token IS NOT NULL THEN
        RETURN json_build_object(
            'success', true, 
            'token', found_token,
            'guest_name', found_name
        );
    ELSE
        RETURN json_build_object(
            'success', false, 
            'error', 'No active booking found for this Room and Name combination.'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION login_guest(text, text) TO postgres, anon, authenticated, service_role;
