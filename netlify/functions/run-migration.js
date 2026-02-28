/**
 * Cumulative database migration runner.
 * Safe to run multiple times — all statements use IF NOT EXISTS / DROP IF EXISTS.
 *
 * To use:
 *   1. Get your Supabase Access Token from: https://supabase.com/dashboard/account/tokens
 *   2. Add it to Netlify env vars as SUPABASE_ACCESS_TOKEN
 *   3. Redeploy, then visit: https://hobbysky-guest-house-official.netlify.app/.netlify/functions/run-migration
 *
 * OR: paste the SQL directly in the Supabase SQL Editor at:
 *     https://supabase.com/dashboard/project/ecadncrzvovytifqbvaw/sql/new
 */

const PROJECT_REF = 'ecadncrzvovytifqbvaw';

const MIGRATION_SQL = `
-- ── Migration 1: Missing booking tracking columns ────────────────────────────
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'reception';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS check_in_by TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS check_in_by_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS check_out_by TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS check_out_by_name TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_booking_date TIMESTAMPTZ;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_room_number TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_check_in TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_check_out TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_source TEXT DEFAULT 'reception';
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_created_by TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_created_by_name TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_check_in_by_name TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS last_check_out_by_name TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS total_stays INTEGER DEFAULT 0;

-- ── Migration 2: Fix status constraint + discount columns ────────────────────
-- The frontend uses hyphenated values ('checked-in', 'checked-out', 'reserved')
-- but the original schema used underscores. Recreate to accept both forms.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'pending', 'reserved', 'confirmed',
    'checked-in', 'checked-out', 'cancelled',
    'checked_in', 'checked_out'
  ));
-- discount_amount: amount deducted at check-in
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
-- final_amount: total after discount
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS final_amount DECIMAL(10,2);
-- discounted_by: staff user ID who approved the discount
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discounted_by TEXT;
`;

export const handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

    if (!accessToken) {
        // No token — return instructions + SQL to paste manually
        return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'text/html' },
            body: `<!DOCTYPE html>
<html>
<head><title>Run Database Migration</title>
<style>body{font-family:system-ui;max-width:800px;margin:40px auto;padding:20px;background:#111;color:#eee}
h1{color:#f59e0b}pre{background:#1a1a1a;padding:16px;border-radius:8px;overflow:auto;font-size:13px;color:#7ee787}
.btn{display:inline-block;background:#f59e0b;color:#000;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;margin:8px 0}
.warn{background:#2d1b00;border:1px solid #f59e0b;padding:12px;border-radius:6px;margin:16px 0}</style>
</head>
<body>
<h1>⚠️ Database Migration Required</h1>
<div class="warn">
  <b>SUPABASE_ACCESS_TOKEN</b> is not set in Netlify environment variables.<br>
  Please follow the manual steps below to fix the booking error.
</div>
<h2>Option 1 — Run in Supabase SQL Editor (2 minutes)</h2>
<p>Click this link to open the Supabase SQL Editor for your project:</p>
<a class="btn" href="https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new" target="_blank">
  Open Supabase SQL Editor →
</a>
<p>Then paste and run this SQL:</p>
<pre>${MIGRATION_SQL.trim()}</pre>
<h2>Option 2 — Automated (requires token)</h2>
<ol>
  <li>Get your token: <a href="https://supabase.com/dashboard/account/tokens" target="_blank">https://supabase.com/dashboard/account/tokens</a></li>
  <li>Add <code>SUPABASE_ACCESS_TOKEN</code> to Netlify env vars</li>
  <li>Redeploy, then revisit this page</li>
</ol>
</body>
</html>`,
        };
    }

    // Has access token — run via Supabase Management API
    try {
        const response = await fetch(
            `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: MIGRATION_SQL }),
            }
        );

        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch {
            result = text;
        }

        if (!response.ok) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'Migration failed',
                    status: response.status,
                    details: result,
                }),
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: '✅ All migrations completed! Status constraint fixed, discount columns added, tracking columns added. Check-in/check-out workflows should now work correctly.',
                result,
            }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message }),
        };
    }
};
