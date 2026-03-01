import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  const { data, error } = await supabase.from('rooms').select('*').limit(1)
  if (error) console.error(error)
  else console.log(Object.keys(data[0]))
  
  // also check bookings table schema
  const { data: bData, error: bError } = await supabase.from('bookings').select('*').limit(1)
  if (bError) console.error(bError)
  else console.log("Bookings columns:", Object.keys(bData[0]))
  
  // also check guests table schema
  const { data: gData, error: gError } = await supabase.from('guests').select('*').limit(1)
  if (gError) console.error(gError)
  else console.log("Guests columns:", Object.keys(gData[0]))
}

checkSchema()
