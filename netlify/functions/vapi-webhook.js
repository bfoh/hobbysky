import fetch from 'node-fetch';

/**
 * Vapi Webhook Handler
 * Endpoint: /.netlify/functions/vapi-webhook
 * 
 * Handles Server-Side Tool Calls from Vapi.
 * Receives the function name and arguments, processes the booking logic by 
 * calling our existing internal Netlify functions, and returns the result to Vapi.
 */
export const handler = async (event) => {
    // 1. Validate the Request
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const payload = JSON.parse(event.body);
        console.log('[VAPI Webhook] Received payload type:', payload.message?.type);

        // We only care about tool calls (function calls)
        if (payload.message?.type !== 'tool-calls') {
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: "Webhook received, not a tool call." })
            };
        }

        const toolCalls = payload.message.toolCalls;
        const results = [];

        // 2. Process each tool call
        for (const toolCall of toolCalls) {
            const { id, function: func } = toolCall;
            const { name, arguments: args } = func;

            console.log(`[VAPI Webhook] Executing tool: ${name}`, args);

            let toolResult = {};

            try {
                // Route the tool call to the appropriate internal logic
                if (name === "checkRoomAvailability") {
                    toolResult = await handleCheckAvailability(args);
                }
                else if (name === "bookRoom") {
                    toolResult = await handleBookRoom(args);
                }
                else {
                    toolResult = { error: `Unknown function: ${name}` };
                }
            } catch (err) {
                console.error(`[VAPI Webhook] Error executing ${name}:`, err);
                toolResult = { error: `Execution failed: ${err.message}` };
            }

            // 3. Format the result for Vapi
            results.push({
                toolCallId: id,
                result: JSON.stringify(toolResult)
            });
        }

        // 4. Return the results back to Vapi
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results })
        };

    } catch (error) {
        console.error('[VAPI Webhook] Critical Error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};

/**
 * Handles 'checkRoomAvailability' tool call
 */
async function handleCheckAvailability(args) {
    const { checkIn, checkOut, guests } = args;

    // Call our existing function locally via HTTP
    // In Netlify functions, we might need the full URL or we can extract the logic. 
    // Since we are running on the server, we'll fetch against the local lambda URL if possible, 
    // or deploy URL. Let's use the absolute URL based on the environment.

    const baseUrl = process.env.URL || 'http://localhost:9999';
    const url = `${baseUrl}/.netlify/functions/check-availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`;

    console.log('[VAPI Webhook] Fetching availability from:', url);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Availability check failed with status ${response.status}`);
    }

    return await response.json();
}

/**
 * Handles 'bookRoom' tool call
 */
async function handleBookRoom(args) {
    const baseUrl = process.env.URL || 'http://localhost:9999';
    const url = `${baseUrl}/.netlify/functions/submit-booking`;

    console.log('[VAPI Webhook] Submitting booking to:', url);
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
    });

    if (!response.ok) {
        throw new Error(`Booking submission failed with status ${response.status}`);
    }

    return await response.json();
}
