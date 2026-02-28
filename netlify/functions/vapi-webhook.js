import { createClient } from '@supabase/supabase-js';

/**
 * Vapi Webhook Handler
 * Endpoint: /.netlify/functions/vapi-webhook
 *
 * Handles Server-Side Tool Calls from Vapi.
 * Directly queries Supabase for availability and booking instead of
 * making internal HTTP calls (which can fail on Netlify).
 */
export const handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const payload = JSON.parse(event.body);
        const messageType = payload.message?.type;
        console.log('[VAPI Webhook] Received message type:', messageType);
        console.log('[VAPI Webhook] Full payload keys:', JSON.stringify(Object.keys(payload.message || {})));

        // We only care about tool-calls
        if (messageType !== 'tool-calls') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Webhook received, not a tool call.' })
            };
        }

        // Vapi uses "toolCallList" for the array of tool calls
        const toolCallList = payload.message.toolCallList || payload.message.toolCalls || [];
        // Also check toolWithToolCallList for the nested structure
        const toolWithToolCallList = payload.message.toolWithToolCallList || [];

        console.log('[VAPI Webhook] toolCallList length:', toolCallList.length);
        console.log('[VAPI Webhook] toolWithToolCallList length:', toolWithToolCallList.length);

        const results = [];

        // Process from toolCallList (primary)
        for (const toolCall of toolCallList) {
            const callId = toolCall.id;
            const funcName = toolCall.name || toolCall.function?.name;
            const args = toolCall.arguments || toolCall.function?.arguments || toolCall.function?.parameters || {};

            console.log(`[VAPI Webhook] Processing tool: ${funcName}`, JSON.stringify(args));

            let toolResult = {};
            try {
                if (funcName === 'checkRoomAvailability') {
                    toolResult = await handleCheckAvailability(args);
                } else if (funcName === 'bookRoom') {
                    toolResult = await handleBookRoom(args);
                } else {
                    toolResult = { error: `Unknown function: ${funcName}` };
                }
            } catch (err) {
                console.error(`[VAPI Webhook] Error executing ${funcName}:`, err);
                toolResult = { error: `Execution failed: ${err.message}` };
            }

            results.push({
                toolCallId: callId,
                result: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
            });
        }

        // Fallback: also try toolWithToolCallList if no results yet
        if (results.length === 0 && toolWithToolCallList.length > 0) {
            for (const item of toolWithToolCallList) {
                const tc = item.toolCall;
                if (!tc) continue;
                const callId = tc.id;
                const funcName = tc.function?.name || item.name;
                const args = tc.function?.parameters || tc.function?.arguments || {};

                console.log(`[VAPI Webhook] Processing from toolWithToolCallList: ${funcName}`, JSON.stringify(args));

                let toolResult = {};
                try {
                    if (funcName === 'checkRoomAvailability') {
                        toolResult = await handleCheckAvailability(args);
                    } else if (funcName === 'bookRoom') {
                        toolResult = await handleBookRoom(args);
                    } else {
                        toolResult = { error: `Unknown function: ${funcName}` };
                    }
                } catch (err) {
                    console.error(`[VAPI Webhook] Error executing ${funcName}:`, err);
                    toolResult = { error: `Execution failed: ${err.message}` };
                }

                results.push({
                    toolCallId: callId,
                    result: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
                });
            }
        }

        console.log('[VAPI Webhook] Returning results count:', results.length);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ results })
        };

    } catch (error) {
        console.error('[VAPI Webhook] Critical Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};

/**
 * Initialize Supabase client
 */
function getSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables');
    }
    return createClient(supabaseUrl, supabaseKey);
}

/**
 * Handles 'checkRoomAvailability' tool call
 * Directly queries Supabase (no internal HTTP hop)
 */
async function handleCheckAvailability(args) {
    const supabase = getSupabase();
    const { checkIn, checkOut, guests } = args;
    const guestCount = parseInt(guests) || 1;

    console.log('[VAPI Webhook] Checking availability:', { checkIn, checkOut, guestCount });

    // 1. Get all room types
    const { data: allTypes, error: typesError } = await supabase.from('room_types').select('*');
    if (typesError) throw typesError;

    // 2. Build availability map
    const availabilityByType = {};
    allTypes.forEach(t => {
        availabilityByType[t.id] = {
            roomTypeId: t.id,
            name: t.name,
            price: t.base_price,
            currency: 'GHS',
            maxOccupancy: t.max_occupancy,
            availableCount: 0
        };
    });

    // 3. Get all rooms (exclude maintenance)
    const { data: allRooms, error: roomsError } = await supabase
        .from('rooms')
        .select('id, room_type_id, status')
        .neq('status', 'maintenance');
    if (roomsError) throw roomsError;

    // 4. Get overlapping bookings
    const { data: busyBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('room_id')
        .neq('status', 'cancelled')
        .lt('check_in', checkOut)
        .gt('check_out', checkIn);
    if (bookingsError) throw bookingsError;

    const busyRoomIds = new Set(busyBookings.map(b => b.room_id));

    // 5. Filter available rooms
    allRooms.forEach(room => {
        const typeId = room.room_type_id;
        if (!typeId || !availabilityByType[typeId]) return;
        if (availabilityByType[typeId].maxOccupancy < guestCount) return;
        if (busyRoomIds.has(room.id)) return;
        availabilityByType[typeId].availableCount++;
    });

    // 6. Return only rooms with availability
    const available = Object.values(availabilityByType).filter(r => r.availableCount > 0);

    console.log('[VAPI Webhook] Available room types:', available.length);

    return {
        success: true,
        checkIn,
        checkOut,
        guests: guestCount,
        availableRooms: available
    };
}

/**
 * Handles 'bookRoom' tool call
 * Calls the existing submit-booking endpoint via internal fetch
 */
async function handleBookRoom(args) {
    // For booking, we'll use the existing endpoint since it has complex logic
    // (guest creation, room assignment, email notifications, etc.)
    const baseUrl = process.env.URL || 'https://www.hobbyskyguesthouse.com';
    const url = `${baseUrl}/.netlify/functions/submit-booking`;

    // Inject voice agent source
    args.source = 'voice agent';

    console.log('[VAPI Webhook] Submitting booking to:', url, 'Args:', JSON.stringify(args));
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[VAPI Webhook] Booking failed:', response.status, errorText);
        throw new Error(`Booking failed (${response.status}): ${errorText}`);
    }

    return await response.json();
}
