const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { requestId, status } = JSON.parse(event.body);
        const authHeader = event.headers.authorization;

        if (!requestId || !status) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing requestId or status' }) };
        }

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Verify staff auth
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            if (authError || !user) {
                return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
            }
        } else {
            return { statusCode: 401, body: JSON.stringify({ error: 'Missing Authorization header' }) };
        }

        // 1. Update the request
        const { error: updateError } = await supabase
            .from('service_requests')
            .update({ status })
            .eq('id', requestId);

        if (updateError) {
            throw updateError;
        }

        // 2. Fetch Guest Phone and Request Type
        const { data: requestData } = await supabase
            .from('service_requests')
            .select(`
                type,
                bookings (
                    guests (
                        name,
                        phone
                    )
                )
            `)
            .eq('id', requestId)
            .single();

        if (requestData && requestData.bookings && requestData.bookings.guests && requestData.bookings.guests.phone) {
            const guestPhone = requestData.bookings.guests.phone;
            const guestName = requestData.bookings.guests.name ? requestData.bookings.guests.name.split(' ')[0] : 'Guest';
            const reqType = requestData.type ? requestData.type.replace('_', ' ') : 'service';

            let message = '';
            if (status === 'in_progress') {
                message = `Hi ${guestName}, your request for ${reqType} is now being worked on by our team.`;
            } else if (status === 'completed') {
                message = `Hi ${guestName}, your request for ${reqType} has been completed. Enjoy your stay at HobbySky!`;
            }

            if (message) {
                // Directly call the internal utility function instead of making a recursive HTTP request
                const { sendSmsInternal } = require('./utils-sms.js');
                await sendSmsInternal({
                    to: guestPhone,
                    message: message
                });
                console.log(`[Update Request Status] SMS sent to ${guestPhone} for status ${status}`);
            }
        }

        return { statusCode: 200, body: JSON.stringify({ success: true }) };

    } catch (err) {
        console.error("Update Request Status Handler Error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
