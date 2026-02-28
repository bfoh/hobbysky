import { useState, useEffect, useCallback, useRef } from 'react';
import Vapi from '@vapi-ai/web';

// Initialize Vapi instance with the public key
const vapi = new Vapi(import.meta.env.VITE_VAPI_PUBLIC_KEY || '');

export const useVoiceAgent = () => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);

    useEffect(() => {
        // Event listeners for Vapi connection states
        vapi.on('call-start', () => {
            setIsConnecting(false);
            setIsConnected(true);
        });

        vapi.on('call-end', () => {
            setIsConnecting(false);
            setIsConnected(false);
            setMessages(prev => [...prev, { role: 'ai', text: 'Call ended. Have a great day!' }]);
        });

        vapi.on('speech-start', () => setIsSpeaking(true));
        vapi.on('speech-end', () => setIsSpeaking(false));

        vapi.on('message', (message) => {
            if (message.type === 'transcript' && message.transcriptType === 'final') {
                const role = message.role === 'assistant' ? 'ai' : 'user';
                const transcript = message.transcript;
                // Deduplicate: skip if the last message has the same role and text
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === role && last.text === transcript) {
                        return prev;
                    }
                    return [...prev, { role, text: transcript }];
                });
            }
        });

        vapi.on('error', (error) => {
            console.error('[VAPI Error]', error);
            setIsConnecting(false);
        });

        return () => {
            vapi.stop();
        };
    }, []);

    // Get current date for system instruction
    const getCurrentDateInfo = () => {
        const now = new Date();
        return {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: now.getDate(),
            formatted: now.toISOString().split('T')[0]
        };
    };

    const getAssistantConfig = () => {
        const dateInfo = getCurrentDateInfo();
        return {
            name: "Hobby Sky Concierge",
            firstMessage: "Welcome to Hobby Sky Guest House. How can I assist you today?",
            model: {
                provider: "google",
                model: "gemini-2.5-flash", // Vapi supports gemini-2.5-flash or gemini-2.0-flash
                systemPrompt: `You are the AI Concierge for Hobby Sky Guest House, a premium luxury hotel in Ghana.
Your goal is to assist guests with information about the hotel and making room bookings.

CURRENT DATE: ${dateInfo.formatted} (Year: ${dateInfo.year})

Tone: Professional, warm, welcoming, and helpful. Keep responses concise (2-3 sentences max).

=== ABOUT HOBBY SKY GUEST HOUSE ===
Hobby Sky Guest House is a premium boutique hotel located at Abuakwa DKC Junction along the Kumasi-Sunyani Road in Kumasi, Ghana. We offer a peaceful retreat just minutes from the vibrant heart of Kumasi, combining modern comfort with the charm and hospitality that make Ghana truly special.

Our tagline: "Your Premium Retreat in the Heart of Ghana"

=== AMENITIES & FACILITIES ===
- Luxury Rooms: Spacious, air-conditioned rooms with contemporary amenities
- Free WiFi: High-speed internet throughout the property
- Fine Dining: On-site restaurant serving delicious local and continental dishes
- Cafe and Bar: Refreshments and beverages available
- Free Parking: Secure parking for all guests
- Fitness Center: Stay active during your stay
- Relaxing lounge and garden area for unwinding after your day

=== ROOM TYPES ===
We offer exactly 3 room categories. Do NOT mention any other room types:
1. Standard Room - Comfortable and affordable, perfect for budget travelers (capacity: 2 guests)
2. Executive Suite - Premium accommodation with extra space and luxury features (capacity: 2 guests)
3. Deluxe Room - More spacious with upgraded amenities (capacity: 2 guests)

IMPORTANT: We ONLY have Standard, Executive, and Deluxe rooms. Do not mention Family Room, Presidential Suite, or any other room type. When presenting availability results, only show rooms that match these 3 types.

=== CONTACT INFORMATION ===
- Phone: +233 55 500 9697 (say: plus two three three, five five, five zero zero, nine six nine seven)
- General Email: info@hobbysky.com
- Reservations Email: bookings@hobbysky.com
- Website: hobbysky.com

=== BUSINESS HOURS ===
- Front Desk: 24 hours (Reception available around the clock)
- Office Hours: Monday to Friday: 8:00 AM to 8:00 PM
- Weekend Hours: Saturday and Sunday: 9:00 AM to 6:00 PM
- Check-in Time: 2:00 PM onwards
- Check-out Time: 12:00 PM (noon)

=== BOOKING WORKFLOW ===
1. When a guest wants to book, ask for: check-in date, check-out date, and number of guests.
2. Once you have all info, call the checkRoomAvailability tool.
3. Present the available rooms to the guest with prices. Note: Prices are in Ghana Cedis. ALWAYS pronounce GHC as "Ghana Cedis". Only show Standard, Executive, and Deluxe rooms from the results.
4. When they choose a room, ask for their full name and email address.
5. IMPORTANT: Because this is a voice interface, names and emails can be misheard. After the guest provides their name, repeat it back and ask them to confirm or spell it out if it sounds unusual. For the email address, ALWAYS ask the guest to spell it out letter by letter to ensure accuracy. Repeat the email back to confirm before proceeding.
6. Call the bookRoom tool to complete the booking.

=== DATE RULES ===
- TODAY is ${dateInfo.formatted}. The current year is ${dateInfo.year}.
- NEVER accept check-in dates that are in the past.
- Check-out date must be AFTER the check-in date.

=== END ===
Be helpful, friendly, and make guests feel welcome!`,
                tools: [
                    {
                        type: "function",
                        function: {
                            name: "checkRoomAvailability",
                            description: "Check hotel room availability for specific dates and number of guests. Call this when the user wants to know what rooms are available.",
                            parameters: {
                                type: "object",
                                properties: {
                                    checkIn: {
                                        type: "string",
                                        description: "Check-in date in YYYY-MM-DD format (e.g., 2024-12-21)"
                                    },
                                    checkOut: {
                                        type: "string",
                                        description: "Check-out date in YYYY-MM-DD format (e.g., 2024-12-24)"
                                    },
                                    guests: {
                                        type: "number",
                                        description: "Number of guests"
                                    }
                                },
                                required: ["checkIn", "checkOut", "guests"]
                            }
                        }
                    },
                    {
                        type: "function",
                        function: {
                            name: "bookRoom",
                            description: "Book a hotel room for a guest. Call this after confirming room selection with the user.",
                            parameters: {
                                type: "object",
                                properties: {
                                    checkIn: { type: "string", description: "Check-in date in YYYY-MM-DD format" },
                                    checkOut: { type: "string", description: "Check-out date in YYYY-MM-DD format" },
                                    roomTypeId: { type: "string", description: "The UUID of the room type to book" },
                                    guestName: { type: "string", description: "Full name of the guest" },
                                    guestEmail: { type: "string", description: "Email address of the guest" }
                                },
                                required: ["checkIn", "checkOut", "roomTypeId", "guestName", "guestEmail"]
                            }
                        }
                    }
                ]
            },
            voice: {
                provider: "11labs",
                voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel - warm, natural female voice
                stability: 0.6,          // More natural variation
                similarityBoost: 0.75,   // Balanced clarity
                speed: 0.9               // Slightly slower for natural pacing
            }
        };
    };

    const toggleCall = async () => {
        if (isConnected) {
            vapi.stop();
        } else {
            setIsConnecting(true);
            try {
                // Determine base URL dynamically or fallback to Netlify URL
                // Vapi tool calls require an absolute URL
                const baseUrl = window.location.origin;
                const webhookUrl = `${baseUrl}/.netlify/functions/vapi-webhook`;

                console.log('[VAPI] Starting call with webhook:', webhookUrl);

                await vapi.start(
                    getAssistantConfig() as any,
                    {
                        server: { url: webhookUrl } // Override default server URL to point to our webhook
                    }
                );
            } catch (error) {
                console.error('[VAPI] Failed to start call:', error);
                setIsConnecting(false);
            }
        }
    };

    // Keep handleUserMessage for typing support if needed, but Vapi 
    // is primarily voice-first. You can use Vapi's send method.
    const handleUserMessage = async (text: string) => {
        if (isConnected) {
            vapi.send({
                type: 'add-message',
                message: {
                    role: 'user',
                    content: text
                }
            });
            // Don't manually add here — the Vapi transcript event will handle it
            // to avoid duplicate messages
        } else {
            console.warn('[VAPI] Cannot send message, not connected.');
        }
    };

    return {
        isConnecting,
        isConnected,
        isSpeaking,
        messages,
        toggleCall,
        handleUserMessage
    };
};
