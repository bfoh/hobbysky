import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function getGuests() {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, status, room_id, guest_id')
    .in('status', ['confirmed', 'checked_in'])
    .limit(3)
  
  if (error) console.error(error)
  else {
    for (const b of data) {
       const {data: room} = await supabase.from('rooms').select('number').eq('id', b.room_id).single()
       const {data: guest} = await supabase.from('guests').select('name').eq('id', b.guest_id).single()
       console.log(`Booking: ${b.id}, Room: ${room?.number}, Guest Name: ${guest?.name}`)
    }
  }
}

getGuests()
