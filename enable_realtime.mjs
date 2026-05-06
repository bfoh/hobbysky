import postgres from 'postgres'

const dbUrl = "postgres://postgres.ecadncrzvovytifqbvaw:Supabase2026!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
const sqlClient = postgres(dbUrl)

async function run() {
    try {
        await sqlClient.unsafe(`ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;`)
        console.log("Realtime enabled for service_requests table successfully!")
    } catch (err) {
        // If it's already added, it will error, which is fine
        console.error("Error (might be already added):", err.message)

        try {
            // Fallback: if publication doesn't exist or other error, create and add
            await sqlClient.unsafe(`
            BEGIN;
            DROP PUBLICATION IF EXISTS supabase_realtime;
            CREATE PUBLICATION supabase_realtime;
            COMMIT;
            ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;
        `)
            console.log("Fallback succeeded: recreated publication and enabled realtime.")
        } catch (err2) {
            console.error("Fallback failed:", err2.message)
        }
    } finally {
        await sqlClient.end()
    }
}

run()
