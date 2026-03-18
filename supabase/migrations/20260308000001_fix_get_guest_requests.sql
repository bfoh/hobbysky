-- Fix ambiguous column reference in get_guest_requests

CREATE OR REPLACE FUNCTION get_guest_requests(token_input uuid)
RETURNS TABLE (
    id uuid,
    type service_request_type,
    status service_request_status,
    details text,
    created_at timestamptz
)
SECURITY DEFINER
AS $$
DECLARE
    target_booking_id uuid;
BEGIN
    -- Resolve token to booking_id
    -- Fix: Use bookings.id instead of id to prevent ambiguity with the OUT parameter 'id'
    SELECT bookings.id INTO target_booking_id
    FROM bookings
    WHERE guest_token = token_input;

    -- If token is invalid or booking not found, return empty
    IF target_booking_id IS NULL THEN
        RETURN;
    END IF;

    -- Return requests for this booking
    RETURN QUERY
    SELECT sr.id, sr.type, sr.status, sr.details, sr.created_at
    FROM service_requests sr
    WHERE sr.booking_id = target_booking_id
    ORDER BY sr.created_at DESC;
END;
$$ LANGUAGE plpgsql;
