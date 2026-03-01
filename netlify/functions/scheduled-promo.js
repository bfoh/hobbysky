const { schedule } = require('@netlify/functions');
const { createClient } = require('@supabase/supabase-js');

// Constants - Premium, engaging promotional messages
const SMS_MESSAGE = "Hi! ✨ Hobbysky Guest House misses you. Escape to comfort & serenity in Cape Coast. Exclusive rates for returning guests. Book now: https://hobbyskyguesthouse.com";
const EMAIL_SUBJECT = "We'd Love to Welcome You Back — Hobbysky Guest House";
const EMAIL_HTML = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #1a3a2a 0%, #2d5a3e 100%); padding: 40px 30px; text-align: center; border-radius: 0 0 24px 24px;">
            <h1 style="color: #d4a017; font-size: 28px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">We Miss You!</h1>
            <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin-top: 8px;">Your next getaway is just a click away</p>
        </div>
        
        <div style="padding: 30px;">
            <p style="font-size: 16px; line-height: 1.6;">Hello,</p>
            <p style="font-size: 16px; line-height: 1.6;">It's been a while since your last visit to <strong style="color: #1a3a2a;">Hobbysky Guest House</strong>. We've been busy making your next stay even more memorable.</p>
            
            <div style="background: linear-gradient(135deg, #f8f6f0 0%, #f0ebe0 100%); padding: 24px; border-left: 4px solid #d4a017; margin: 24px 0; border-radius: 0 12px 12px 0;">
                <p style="margin: 0; font-size: 18px; font-weight: 700; color: #1a3a2a;">Experience Premium Comfort</p>
                <p style="margin: 8px 0 0; color: #666; font-size: 14px; line-height: 1.5;">Discover our refined rooms, exceptional dining, and the serene atmosphere that makes Hobbysky your home away from home in Cape Coast.</p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6;">You deserve a break. Let us take care of you with our signature hospitality.</p>
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="https://hobbyskyguesthouse.com" style="background: linear-gradient(135deg, #d4a017 0%, #b8860b 100%); color: white; padding: 14px 36px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: 700; font-size: 15px; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(212,160,23,0.3);">Book Your Stay Now →</a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">Hobbysky Guest House Ltd, Cape Coast, Ghana<br/>If you no longer wish to receive updates, please reply to this email.</p>
        </div>
    </div>
`;

// Helper: Send SMS
async function sendSms(to, message, apiKey) {
    try {
        let recipient = to.replace(/[^\d]/g, '');
        if (recipient.startsWith('0')) recipient = '233' + recipient.substring(1);
        else if (!recipient.startsWith('233') && recipient.length === 9) recipient = '233' + recipient;

        const url = `https://sms.arkesel.com/sms/api?action=send-sms&api_key=${apiKey}&to=${recipient}&from=HobbySky&sms=${encodeURIComponent(message)}`;

        const res = await fetch(url);
        const text = await res.text();
        console.log(`[SMS] To: ${recipient}, Response: ${text}`);
    } catch (e) {
        console.error(`[SMS ERROR] Failed to send to ${to}:`, e.message);
    }
}

// Helper: Send Email
async function sendEmail(to, subject, html, apiKey) {
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                from: 'Hobbysky Guest House <noreply@hobbyskyguesthouse.com>',
                to: [to],
                subject: subject,
                html: html
            })
        });
        const data = await res.json();
        if (res.ok) {
            console.log(`[EMAIL] To: ${to}, ID: ${data.id}`);
        } else {
            console.error(`[EMAIL ERROR] Failed to send to ${to}:`, data);
        }
    } catch (e) {
        console.error(`[EMAIL ERROR] Failed to send to ${to}:`, e.message);
    }
}

// Main Handler
const handler = async (event) => {
    console.log('[Scheduled Promo] Starting execution...');

    // Environment Variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const arkeselApiKey = process.env.ARKESEL_API_KEY;
    const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials');
        return { statusCode: 500 };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch Guests
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('guest_id');

    if (error) {
        console.error('Error fetching bookings:', error);
        return { statusCode: 500 };
    }

    const guestIds = [...new Set(bookings.map(b => b.guest_id))];
    console.log(`Found ${guestIds.length} unique guests.`);

    if (guestIds.length === 0) return { statusCode: 200 };

    // 2. Fetch Guest Details
    const { data: guests, error: guestError } = await supabase
        .from('guests')
        .select('id, name, email, phone')
        .in('id', guestIds);

    if (guestError) {
        console.error('Error fetching guests:', guestError);
        return { statusCode: 500 };
    }

    // 3. Send Messages
    let smsCount = 0;
    let emailCount = 0;

    for (const guest of guests) {
        // SMS
        if (guest.phone && arkeselApiKey) {
            await sendSms(guest.phone, SMS_MESSAGE, arkeselApiKey);
            smsCount++;
        }

        // Email (with validation)
        if (guest.email && guest.email.includes('@') && guest.email.includes('.') && resendApiKey) {
            await sendEmail(guest.email, EMAIL_SUBJECT, EMAIL_HTML, resendApiKey);
            emailCount++;
        }
    }

    console.log(`[Scheduled Promo] Finished. SMS: ${smsCount}, Email: ${emailCount}`);

    return {
        statusCode: 200,
    };
};

// Schedule: Run at 9:00 AM on the 1st day of every month
exports.handler = schedule('0 9 1 * *', handler);
