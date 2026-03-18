const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { token, type, details } = JSON.parse(event.body);

        if (!token || !type) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
        }

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseKey) {
            console.error("Server Error: Missing Service Key");
            return { statusCode: 500, body: JSON.stringify({ error: 'Server Configuration Error' }) };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Call the Database Function to securely insert the request
        const { data, error } = await supabase.rpc('submit_guest_request', {
            token_input: token,
            req_type: type,
            req_details: details || ''
        });

        if (error) {
            console.error("RPC Error:", error);
            return { statusCode: 500, body: JSON.stringify({ error: 'Database operations failed', details: error.message }) };
        }

        // The RPC returns a JSON object with { success: true/false }
        if (data && data.success) {

            // --- SMS DISPATCH TO STAFF ---
            try {
                // Get guest details for the SMS
                const { data: bookingData } = await supabase.rpc('get_booking_by_token', { token_input: token });
                if (bookingData && bookingData.length > 0) {
                    const booking = bookingData[0];
                    const guestName = booking.guest_name || 'A Guest';
                    const roomNumber = booking.room_number || '?';
                    const typeLabel = type.replace('_', ' ');

                    const staffMessage = `New Request [${roomNumber} - ${guestName}]: Needs ${typeLabel}. Details: ${details || 'None'}`;
                    const staffPhone = '+233240204079'; // Reception number

                    // Call our internal send-sms endpoint directly to prevent Netlify loopback fetch failures
                    const { sendSmsInternal } = require('./utils-sms.js');
                    await sendSmsInternal({
                        to: staffPhone,
                        message: staffMessage
                    });
                    console.log(`[Submit Request] Staff SMS sent for Room ${roomNumber}`);
                }
            } catch (smsError) {
                console.error("[Submit Request] Failed to send SMS to staff:", smsError);
                // We don't fail the whole request if SMS fails
            }

            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        } else {
            return { statusCode: 400, body: JSON.stringify(data || { error: 'Request rejected' }) };
        }

    } catch (err) {
        console.error("Submit Request Handler Error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
