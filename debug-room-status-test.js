import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRooms() {
    const { data: types, error } = await supabase.from('room_types').select('id, name');
    if (error) {
        console.error("Error fetching rooms:", error);
        return;
    }

    console.log("Types:", types);
}

checkRooms();
