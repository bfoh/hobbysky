// --- Helper: Dark-mode Email Template ---
const C = {
    outerBg:   '#141F16',
    cardBg:    '#0F1A11',
    headerBg:  '#09110A',
    infoBg:    '#162019',
    borderGold:'#C9963C',
    borderSub: '#2B3E2E',
    gold:      '#C9963C',
    goldLight: '#DEB96A',
    text:      '#EDE9E0',
    textMuted: '#8CA48E',
    textDark:  '#0F1A11',
};

const EMAIL_STYLES = {
    body:      `margin:0;padding:0;background-color:${C.outerBg};`,
    container: `max-width:600px;margin:0 auto;background-color:${C.cardBg};`,
    header:    `background-color:${C.headerBg};padding:36px 32px 28px;text-align:center;`,
    logo:      `display:block;margin:0 auto 16px;height:auto;width:110px;max-width:110px;`,
    headerTitle:    `color:${C.text};font-size:22px;font-weight:700;margin:0;letter-spacing:1px;font-family:Georgia,serif;`,
    headerSubtitle: `color:${C.gold};font-size:10px;margin:8px 0 0;font-weight:700;letter-spacing:4px;text-transform:uppercase;font-family:Arial,sans-serif;`,
    content:   `padding:36px 32px;background-color:${C.cardBg};`,
    contentTitle: `color:${C.goldLight};font-size:20px;margin:0 0 28px;text-align:center;font-family:Georgia,serif;font-weight:700;`,
    footer:    `background-color:${C.headerBg};border-top:1px solid ${C.borderSub};padding:28px 32px;text-align:center;`,
    infoBox:   `background-color:${C.infoBg};border-left:3px solid ${C.borderGold};padding:20px 22px;margin:20px 0;border-radius:0 6px 6px 0;`,
    infoRow:   `margin-bottom:10px;font-size:15px;color:${C.text};font-family:Arial,sans-serif;`,
    infoLabel: `font-weight:600;color:${C.textMuted};display:inline-block;min-width:120px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;`,
};

function generateEmailHtml({ title, preheader, content }) {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.outerBg};">
  ${preheader ? `<div style="display:none;font-size:1px;color:${C.outerBg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.outerBg};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:${C.cardBg};border-radius:8px;overflow:hidden;border:1px solid ${C.borderSub};">
        <!-- Gold top bar -->
        <tr><td style="height:3px;background-color:${C.borderGold};font-size:0;line-height:0;">&nbsp;</td></tr>
        <!-- Header -->
        <tr>
          <td style="background-color:${C.headerBg};padding:36px 32px 28px;text-align:center;">
            <img src="https://hobbyskyguesthouse.com/logohobbyskydarkmode.png" alt="Hobbysky Guest House" width="110" height="auto" style="display:block;margin:0 auto 16px;width:110px;height:auto;" />
            <h1 style="margin:0;color:${C.text};font-size:22px;font-weight:700;font-family:Georgia,serif;letter-spacing:1px;">Hobbysky Guest House</h1>
            <p style="margin:8px 0 0;color:${C.gold};font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase;font-family:Arial,sans-serif;">Premium Hospitality</p>
          </td>
        </tr>
        <!-- Gold divider -->
        <tr><td style="height:2px;background-color:${C.borderGold};font-size:0;line-height:0;">&nbsp;</td></tr>
        <!-- Title -->
        <tr>
          <td style="background-color:${C.infoBg};padding:22px 32px;text-align:center;">
            <h2 style="margin:0;color:${C.goldLight};font-size:20px;font-weight:700;font-family:Georgia,serif;">${title}</h2>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background-color:${C.cardBg};padding:36px 32px;color:${C.text};font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:${C.headerBg};border-top:1px solid ${C.borderSub};padding:28px 32px;text-align:center;">
            <p style="margin:0 0 6px;color:${C.textMuted};font-size:12px;font-family:Arial,sans-serif;">&copy; ${year} Hobbysky Guest House &middot; DKC Abuakwa, Kumasi, Ghana</p>
            <p style="margin:0;color:#2B3E2E;font-size:11px;font-family:Arial,sans-serif;">This is an automated notification &mdash; please do not reply to this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
// --- Helper End ---

// --- Helper End ---

// Initialize Supabase client
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import { Buffer } from 'node:buffer';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Helper: Generate PDF Buffer ---
async function generatePreInvoicePdfBuffer(bookingContext) {
    // PDF generation via PDFKit is not available in this environment.
    // Return null so the caller skips the attachment gracefully.
    return null;
}
// --- Helper End ---

export const handler = async (event, context) => {

    // CORS Headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { checkIn, checkOut, roomTypeId, guestName, guestEmail, guestPhone,
            numGuests = 1, specialRequests = '', source = 'online' } = body;

        // Validation
        if (!checkIn || !checkOut || !roomTypeId || !guestName || !guestEmail) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }

        // Date Validation - Reject past dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        if (checkInDate < today) {
            console.warn('[CreateBooking] Rejected: Check-in date is in the past', { checkIn, today: today.toISOString() });
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: `Check-in date (${checkIn}) cannot be in the past. Today is ${today.toISOString().split('T')[0]}.`
                })
            };
        }

        if (checkOutDate <= checkInDate) {
            console.warn('[CreateBooking] Rejected: Check-out must be after check-in', { checkIn, checkOut });
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: `Check-out date (${checkOut}) must be after check-in date (${checkIn}).`
                })
            };
        }

        // 1. Find or Create Guest
        let guestId;
        const { data: existingGuest, error: guestError } = await supabase
            .from('guests')
            .select('id')
            .eq('email', guestEmail)
            .single();

        if (existingGuest) {
            guestId = existingGuest.id;
            // Optional: Update phone/name if needed
            if (guestName || guestPhone) {
                await supabase.from('guests').update({
                    name: guestName,
                    phone: guestPhone
                }).eq('id', guestId);
            }
        } else {
            const { data: newGuest, error: createError } = await supabase
                .from('guests')
                .insert({
                    name: guestName,
                    email: guestEmail,
                    phone: guestPhone
                })
                .select('id')
                .single();

            if (createError) throw createError;
            guestId = newGuest.id;
        }

        // 2. Find an available Room of the requested Type
        // Re-using availability logic basically
        // IMPLEMENTING FUZZY MATCH for Agent Hallucination Fix
        let validRoomTypeId = roomTypeId;

        // Check if type exists exactly first
        const { data: exactType } = await supabase
            .from('room_types')
            .select('id')
            .eq('id', roomTypeId)
            .single();

        if (!exactType) {
            console.warn(`[CreateBooking] Room Type ID ${roomTypeId} not found (Possible hallucination). Attempting fuzzy match...`);
            // Fetch all room types and fuzzy match
            const { data: allTypes } = await supabase.from('room_types').select('id, name');

            if (allTypes) {
                // Match first 8 chars (UUID prefix)
                const prefix = roomTypeId.substring(0, 8);
                const relativeMatch = allTypes.find(t => t.id.startsWith(prefix));

                if (relativeMatch) {
                    console.log(`[CreateBooking] Fuzzy match found: Provided ${roomTypeId} -> Matched ${relativeMatch.id} (${relativeMatch.name})`);
                    validRoomTypeId = relativeMatch.id;
                } else {
                    console.warn('[CreateBooking] No fuzzy match found.');
                }
            }
        }

        const { data: roomsOfType, error: roomsError } = await supabase
            .from('rooms')
            .select('id, room_number, price, room_types(base_price)')
            .eq('room_type_id', validRoomTypeId) // Use validated ID
            .neq('status', 'maintenance');

        if (roomsError) {
            console.error('[CreateBooking] Rooms Fetch Error:', roomsError);
            throw roomsError;
        }

        if (!roomsOfType || roomsOfType.length === 0) {
            console.log('[CreateBooking] No rooms found for type:', validRoomTypeId);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: `No rooms of this type found (ID: ${validRoomTypeId})` })
            };
        }

        // Check conflicts for these specific rooms
        const candidateRoomIds = roomsOfType.map(r => r.id);
        const { data: busyBookings, error: busyError } = await supabase
            .from('bookings')
            .select('room_id')
            .in('room_id', candidateRoomIds)
            .neq('status', 'cancelled')
            .lt('check_in', checkOut)
            .gt('check_out', checkIn);

        if (busyError) {
            console.error('[CreateBooking] Busy Bookings Error:', busyError);
            throw busyError;
        }

        const busyRoomIds = new Set(busyBookings.map(b => b.room_id));
        const availableRoom = roomsOfType.find(r => !busyRoomIds.has(r.id));

        if (!availableRoom) {
            console.log('[CreateBooking] All rooms busy for dates:', { checkIn, checkOut });
            return {
                statusCode: 409, // Conflict / No availability
                headers,
                body: JSON.stringify({ error: 'No rooms available for these dates' })
            };
        }

        console.log('[CreateBooking] Selected Room:', availableRoom.room_number);

        // Calculate price (simplified: base_price * nights)
        // ALIGNMENT FIX: Always use room_types.base_price to match the availability endpoint
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        const pricePerNight = availableRoom.room_types ? availableRoom.room_types.base_price : 0;

        if (!pricePerNight) {
            console.warn('[CreateBooking] No base_price found for room type');
        }

        const totalPrice = pricePerNight * nights;

        // 2.5 Resolve "System User" (Admin) to own the booking
        // Optimization: Query 'staff' table instead of slow auth.admin.listUsers()
        let systemUserId = null;
        try {
            const adminEmail = process.env.VITE_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
            if (adminEmail) {
                // Try finding in 'staff' table first (Much faster)
                const { data: staffMember, error: staffError } = await supabase
                    .from('staff')
                    .select('user_id')
                    .eq('email', adminEmail) // Ensure 'email' column exists in 'staff'
                    .single();

                if (staffMember) {
                    systemUserId = staffMember.user_id;
                    console.log('[CreateBooking] Found Admin ID in staff table:', systemUserId);
                } else {
                    // Fallback: Check 'users' table if you have access or stick to null
                    console.warn('[CreateBooking] Admin email not found in staff table');
                }
            }
        } catch (authError) {
            console.warn('[CreateBooking] Failed to resolve system user:', authError);
            // Non-blocking
        }

        // 3. Create Booking
        console.log('[CreateBooking] Creating booking record...');
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert({
                guest_id: guestId,
                user_id: systemUserId, // Assign ownership
                room_id: availableRoom.id,
                check_in: checkIn,
                check_out: checkOut,
                status: 'confirmed',
                total_price: totalPrice,
                num_guests: numGuests,
                special_requests: `[${source === 'online' ? 'Online Booking' : 'Voice Agent Booking'}]${specialRequests ? '\n' + specialRequests : ''}`,
                source: source,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (bookingError) {
            console.error('[CreateBooking] Booking Insert Error:', bookingError);

            // Catch PostgreSQL `EXCLUDE USING gist` double-booking constraint violation
            if (bookingError.code === '23P01') {
                console.log(`[CreateBooking] Conflict constraint triggered for Room ${availableRoom.room_number}.`);
                return {
                    statusCode: 409,
                    headers,
                    body: JSON.stringify({ error: "We're sorry, this room was just booked moments ago by another guest! Please search again to see updated availability." })
                };
            }

            throw bookingError;
        }

        console.log('[CreateBooking] Success:', booking.id);

        // --- Notification Trigger Start (Parallelized) ---
        // We use Promise.all to run these concurrently (faster) and await them
        // so the function doesn't freeze before sending.
        try {
            const baseUrl = process.env.URL || 'https://hobbyskyguesthouse.com';
            const notificationPromises = [];

            // 1. Send SMS
            if (guestPhone) {
                const smsMessage = `Dear ${guestName}, your booking at Hobbysky Guest House (Room ${availableRoom.room_number}) from ${checkIn} to ${checkOut} is confirmed. Check email for details.`;
                console.log('[CreateBooking] Queueing SMS...');
                notificationPromises.push(
                    fetch(`${baseUrl}/.netlify/functions/send-sms`, {
                        method: 'POST',
                        body: JSON.stringify({ to: guestPhone, message: smsMessage })
                    }).then(res => {
                        if (!res.ok) console.error('[CreateBooking] SMS Failed:', res.status);
                        else console.log('[CreateBooking] SMS Sent');
                    }).catch(err => console.error('[CreateBooking] SMS Error:', err))
                );
            }

            // 2. Send Email
            if (guestEmail) {
                const htmlContent = generateEmailHtml({
                    title: 'Booking Confirmed!',
                    preheader: `Reservation for Room ${availableRoom.room_number}`,
                    content: `
                    <p style="color:${C.text};font-family:Arial,sans-serif;">Dear <strong style="color:${C.goldLight};">${guestName}</strong>,</p>
                    <p style="color:${C.text};font-family:Arial,sans-serif;">Thank you for booking with <strong>Hobbysky Guest House</strong>${source === 'online' ? ' via our website' : ' via our Voice Concierge'}. Your reservation is confirmed!</p>

                    <div style="${EMAIL_STYLES.infoBox}">
                        <div style="${EMAIL_STYLES.infoRow}"><span style="${EMAIL_STYLES.infoLabel}">Room</span><span style="color:${C.text};">${availableRoom.room_number} &mdash; ${availableRoom.room_types?.name || 'Standard'}</span></div>
                        <div style="${EMAIL_STYLES.infoRow}"><span style="${EMAIL_STYLES.infoLabel}">Check-In</span><span style="color:${C.text};">${checkIn}</span></div>
                        <div style="${EMAIL_STYLES.infoRow}"><span style="${EMAIL_STYLES.infoLabel}">Check-Out</span><span style="color:${C.text};">${checkOut}</span></div>
                        <div style="${EMAIL_STYLES.infoRow}"><span style="${EMAIL_STYLES.infoLabel}">Nights</span><span style="color:${C.text};">${nights}</span></div>
                        <div style="${EMAIL_STYLES.infoRow}"><span style="${EMAIL_STYLES.infoLabel}">Guests</span><span style="color:${C.text};">${numGuests}</span></div>
                    </div>

                    <!-- PRE-INVOICE -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;background-color:${C.infoBg};border:1px solid ${C.borderGold};border-radius:6px;overflow:hidden;">
                        <tr><td style="padding:16px 20px;border-bottom:1px solid ${C.borderSub};">
                            <p style="margin:0;color:${C.goldLight};font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Payment Summary</p>
                        </td></tr>
                        <tr>
                            <td style="padding:14px 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td style="color:${C.textMuted};font-size:14px;font-family:Arial,sans-serif;padding-bottom:8px;">Room Charge (${nights} night${nights > 1 ? 's' : ''})</td>
                                        <td style="color:${C.text};font-size:14px;font-family:Arial,sans-serif;text-align:right;padding-bottom:8px;">GHS ${totalPrice}</td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" style="height:1px;background-color:${C.borderSub};font-size:0;padding:0;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td style="color:${C.gold};font-size:15px;font-weight:700;font-family:Arial,sans-serif;padding-top:10px;">Total Due at Check-in</td>
                                        <td style="color:${C.gold};font-size:18px;font-weight:700;font-family:Arial,sans-serif;text-align:right;padding-top:10px;">GHS ${totalPrice}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr><td style="padding:12px 20px;background-color:#162019;border-top:1px solid ${C.borderSub};text-align:center;">
                            <p style="margin:0;color:${C.textMuted};font-size:12px;font-family:Arial,sans-serif;letter-spacing:0.5px;">We accept Cash &middot; Mobile Money &middot; Bank Transfer</p>
                        </td></tr>
                    </table>

                    <p style="margin:28px 0 10px;color:${C.goldLight};font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Check-in Information</p>
                    <ul style="margin:0;padding-left:20px;color:${C.textMuted};font-family:Arial,sans-serif;font-size:14px;line-height:1.8;">
                        <li>Check-in time is from 2:00 PM</li>
                        <li>Please present a valid ID upon arrival</li>
                        <li>Full payment is due upon check-in</li>
                    </ul>

                    <p style="margin:32px 0 8px;color:${C.text};font-family:Arial,sans-serif;">We look forward to welcoming you.</p>
                    <p style="margin:0;color:${C.textMuted};font-family:Arial,sans-serif;font-size:14px;">The Hobbysky Guest House Team</p>
                `
                });

                // Generate PDF attachment
                const bookingContext = {
                    guestName,
                    guestPhone,
                    guestEmail,
                    roomNumber: availableRoom.room_number,
                    checkIn,
                    checkOut,
                    nights,
                    totalPrice
                };

                let pdfAttachment = null;
                try {
                    const pdfBase64 = await generatePreInvoicePdfBuffer(bookingContext);
                    if (pdfBase64) {
                        pdfAttachment = {
                            filename: `Pre-Invoice-${booking.id.substring(0, 8)}.pdf`,
                            content: pdfBase64,
                            contentType: 'application/pdf'
                        };
                        console.log('[CreateBooking] PDF attachment generated.');
                    } else {
                        console.log('[CreateBooking] Skipping PDF attachment — sending email without it.');
                    }
                } catch (pdfError) {
                    console.error('[CreateBooking] Failed to generate PDF attachment:', pdfError);
                    // Continue without attachment
                }

                console.log('[CreateBooking] Queueing Email...');
                const emailPayload = {
                    to: guestEmail,
                    subject: `Booking Confirmation - Room ${availableRoom.room_number}`,
                    html: htmlContent
                };

                if (pdfAttachment) {
                    emailPayload.attachments = [pdfAttachment];
                }

                notificationPromises.push(
                    fetch(`${baseUrl}/.netlify/functions/send-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(emailPayload)
                    }).then(async res => {
                        const txt = await res.text();
                        if (!res.ok) console.error('[CreateBooking] Email Failed:', res.status, txt);
                        else console.log('[CreateBooking] Email Sent:', txt);
                    }).catch(err => console.error('[CreateBooking] Email Error:', err))
                );
            }

            // 3. Hotel alert for online bookings
            if (source === 'online') {
                const alertHtml = generateEmailHtml({
                    title: '🌐 New Online Booking',
                    preheader: `New online booking from ${guestName}`,
                    content: `
                    <p>A new booking has been placed via the <strong>Hobbysky Guest House website</strong>.</p>
                    <div style="${EMAIL_STYLES.infoBox}">
                        <div style="${EMAIL_STYLES.infoRow}"><span style="${EMAIL_STYLES.infoLabel}">Source:</span> 🌐 Online Website</div>
                        <div style="${EMAIL_STYLES.infoRow}"><span style="${EMAIL_STYLES.infoLabel}">Guest:</span> ${guestName}</div>
                        <div style="${EMAIL_STYLES.infoRow}"><span style="${EMAIL_STYLES.infoLabel}">Email:</span> ${guestEmail}</div>
                        ${guestPhone ? `<div style="${EMAIL_STYLES.infoRow}"><span style="${EMAIL_STYLES.infoLabel}">Phone:</span> ${guestPhone}</div>` : ''}
                        <div style="${EMAIL_STYLES.infoRow}"><span style="${EMAIL_STYLES.infoLabel}">Room:</span> ${availableRoom.room_number}</div>
                        <div style="${EMAIL_STYLES.infoRow}"><span style="${EMAIL_STYLES.infoLabel}">Check-In:</span> ${checkIn}</div>
                        <div style="${EMAIL_STYLES.infoRow}"><span style="${EMAIL_STYLES.infoLabel}">Check-Out:</span> ${checkOut}</div>
                        <div style="${EMAIL_STYLES.infoRow}"><span style="${EMAIL_STYLES.infoLabel}">Nights:</span> ${nights}</div>
                        <div style="${EMAIL_STYLES.infoRow}"><span style="${EMAIL_STYLES.infoLabel}">Guests:</span> ${numGuests}</div>
                        <div style="${EMAIL_STYLES.infoRow}"><span style="${EMAIL_STYLES.infoLabel}">Total:</span> GHS ${totalPrice}</div>
                        <div style="${EMAIL_STYLES.infoRow}"><span style="${EMAIL_STYLES.infoLabel}">Booking ID:</span> ${booking.id}</div>
                    </div>
                    <p>Please ensure the room is prepared for the guest's arrival.</p>
                    `
                });
                notificationPromises.push(
                    fetch(`${baseUrl}/.netlify/functions/send-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: 'hobbyskyguesthouse@gmail.com',
                            subject: `🌐 New Online Booking — ${guestName} | Room ${availableRoom.room_number} | ${checkIn}`,
                            html: alertHtml
                        })
                    }).then(async res => {
                        const txt = await res.text();
                        if (!res.ok) console.error('[CreateBooking] Hotel alert Failed:', res.status, txt);
                        else console.log('[CreateBooking] Hotel alert Sent:', txt);
                    }).catch(err => console.error('[CreateBooking] Hotel alert Error:', err))
                );
            }

            // Await all notifications with a small timeout fallback?
            // For now, just await them. They should be fast enough.
            if (notificationPromises.length > 0) {
                await Promise.all(notificationPromises);
                console.log('[CreateBooking] All notifications triggers completed');
            }

        } catch (notifyError) {
            console.error('[CreateBooking] Notification Logic Error:', notifyError);
            // Don't fail the request if notifications fail
        }
        // --- Notification Trigger End ---

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Booking created successfully. Total: GHS ${totalPrice}`,
                data: {
                    bookingId: booking.id,
                    roomNumber: availableRoom.room_number,
                    totalPrice,
                    currency: 'GHS', // Explicitly state currency
                    status: 'confirmed'
                }
            })
        };

    } catch (error) {
        console.error('Create Booking Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
        };
    }
};
