import postgres from 'postgres'
import dotenv from 'dotenv'
dotenv.config()

const dbUrl = process.env.DATABASE_URL || "postgres://postgres.ecadncrzvovytifqbvaw:Supabase2026!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

const sqlClient = postgres(dbUrl)

async function run() {
  try {
    await sqlClient.unsafe(`ALTER TABLE bookings DROP CONSTRAINT IF EXISTS restrict_double_booking;`)
    console.log("Constraint dropped successfully!")
  } catch(err) {
    console.error(err)
  } finally {
    await sqlClient.end()
  }
}

run()
