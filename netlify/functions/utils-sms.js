const fetch = require('node-fetch');

/**
 * Shared utility to dispatch Arkesel SMS internally inside Netlify Functions
 * without having to do a loopback HTTP fetch.
 */
exports.sendSmsInternal = async function sendSmsInternal({ to, message }) {
    if (!to || !message) {
        console.error('[SMS Util] Missing required fields: to, message');
        return { success: false, error: 'Missing required fields' };
    }

    const apiKey = process.env.ARKESEL_API_KEY ? process.env.ARKESEL_API_KEY.trim() : null;
    const senderId = process.env.ARKESEL_SENDER_ID || 'HobbySky';

    if (!apiKey) {
        console.error('[SMS Util] Arkesel API Key not configured');
        return { success: false, error: 'SMS service not configured' };
    }

    // --- Phone Number Normalization ---
    let recipient = to.replace(/[^\d]/g, '');

    // Handle Leading Zero (Ghana local format 055...)
    if (recipient.startsWith('0')) {
        recipient = '233' + recipient.substring(1);
    }

    // Handle "Missing Prefix" 9-digit numbers (55...) -> 23355...
    if (!recipient.startsWith('233') && recipient.length === 9) {
        recipient = '233' + recipient;
    }

    console.log(`[SMS Util] Sending SMS via Arkesel V1 to ${recipient}`);

    const baseUrl = 'https://sms.arkesel.com/sms/api';
    const params = new URLSearchParams({
        action: 'send-sms',
        api_key: apiKey,
        to: recipient,
        from: senderId,
        sms: message
    });

    const fullUrl = `${baseUrl}?${params.toString()}`;

    try {
        const response = await fetch(fullUrl);
        const responseText = await response.text();
        console.log('[SMS Util] Arkesel V1 Response:', responseText);

        const isSuccess = response.ok && !responseText.toLowerCase().includes('error') && !responseText.toLowerCase().includes('invalid');

        if (isSuccess) {
            return { success: true, raw: responseText };
        } else {
            console.error('[SMS Util] Arkesel Error:', responseText);
            return { success: false, error: responseText };
        }
    } catch (error) {
        console.error('[SMS Util] Network Error:', error);
        return { success: false, error: error.message };
    }
}
