import fetch from 'node-fetch'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function runSQL() {
    const rawSql = `
        DROP FUNCTION IF EXISTS login_guest(text, text);

        CREATE OR REPLACE FUNCTION login_guest(p_room_num text, p_name_input text)
        RETURNS json
        SECURITY DEFINER
        AS $$
        DECLARE
            found_token uuid;
            found_name text;
        BEGIN
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
    `
    // Wait, the REST API doesn't allow raw SQL execution unless you call a function that executes SQL.
    console.log("Postgrest API doesn't allow arbitrary SQL.")
}
runSQL()
