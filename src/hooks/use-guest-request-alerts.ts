import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

/**
 * Plays an alert beep using the Web Audio API.
 * Uses two tones for a pleasant but attention-grabbing "ding-dong" sound.
 */
function playAlertBeep() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

        // First tone — higher pitch "ding"
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = 'sine'
        osc1.frequency.setValueAtTime(880, ctx.currentTime) // A5
        gain1.gain.setValueAtTime(0.3, ctx.currentTime)
        gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc1.connect(gain1)
        gain1.connect(ctx.destination)
        osc1.start(ctx.currentTime)
        osc1.stop(ctx.currentTime + 0.3)

        // Second tone — lower pitch "dong"
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15) // E5
        gain2.gain.setValueAtTime(0, ctx.currentTime)
        gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15)
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.start(ctx.currentTime + 0.15)
        osc2.stop(ctx.currentTime + 0.5)

        // Third tone — repeat higher for urgency
        const osc3 = ctx.createOscillator()
        const gain3 = ctx.createGain()
        osc3.type = 'sine'
        osc3.frequency.setValueAtTime(880, ctx.currentTime + 0.4) // A5
        gain3.gain.setValueAtTime(0, ctx.currentTime)
        gain3.gain.setValueAtTime(0.25, ctx.currentTime + 0.4)
        gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7)
        osc3.connect(gain3)
        gain3.connect(ctx.destination)
        osc3.start(ctx.currentTime + 0.4)
        osc3.stop(ctx.currentTime + 0.7)

        // Clean up the context after the sounds finish
        setTimeout(() => ctx.close(), 1000)
    } catch (err) {
        console.error('[Alert] Failed to play beep:', err)
    }
}

/**
 * Formats the service request type for display.
 */
function formatType(type: string): string {
    switch (type) {
        case 'housekeeping': return '🧹 Housekeeping'
        case 'food': return '🍽️ In-Room Dining'
        case 'transport': return '🚕 Transport'
        case 'problem': return '⚠️ Issue Report'
        case 'amenity': return '🧴 Amenity'
        default: return '🛎️ ' + type.charAt(0).toUpperCase() + type.slice(1)
    }
}

/**
 * Sends a browser notification (for when the tab is in the background).
 */
function sendBrowserNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body,
            icon: '/logohobbyskydarkmode.png',
            tag: 'guest-request', // prevents duplicate notifications
        })
    }
}

/**
 * Hook that subscribes to new guest service requests via Supabase Realtime.
 * When a new request is inserted:
 * - Plays an audible alert beep
 * - Shows a toast notification
 * - Sends a browser push notification (if tab is backgrounded)
 */
export function useGuestRequestAlerts() {
    const mountedRef = useRef(true)

    // Request browser notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(perm => {
                console.log('[Alert] Browser notification permission:', perm)
            })
        }
    }, [])

    const handleNewRequest = useCallback(async (payload: any) => {
        if (!mountedRef.current) return

        const record = payload.new
        if (!record) return

        console.log('[Alert] New guest request received:', record)

        // Play the beep
        playAlertBeep()

        // Fetch additional context (guest name + room number)
        let guestName = 'A guest'
        let roomNumber = ''

        try {
            if (record.booking_id) {
                const { data } = await supabase
                    .from('bookings')
                    .select('guests(name), rooms(room_number)')
                    .eq('id', record.booking_id)
                    .single()

                if (data) {
                    guestName = (data as any).guests?.name || 'A guest'
                    roomNumber = (data as any).rooms?.room_number || ''
                }
            }
        } catch (err) {
            console.error('[Alert] Failed to fetch booking context:', err)
        }

        const typeLabel = formatType(record.type || 'other')
        const roomText = roomNumber ? ` in Room ${roomNumber}` : ''

        // Show toast notification
        toast.info(`🔔 New Request: ${typeLabel}`, {
            description: `${guestName}${roomText} — ${record.details || 'No details'}`,
            duration: 10000, // 10 seconds — important alerts should stay visible
            action: {
                label: 'View',
                onClick: () => {
                    window.location.href = '/staff/requests'
                }
            }
        })

        // Browser notification (for background tabs)
        sendBrowserNotification(
            `New Guest Request: ${typeLabel}`,
            `${guestName}${roomText}\n${record.details || 'No details provided'}`
        )
    }, [])

    useEffect(() => {
        mountedRef.current = true

        const channel = supabase
            .channel('global_guest_request_alerts')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'service_requests'
                },
                handleNewRequest
            )
            .subscribe((status) => {
                console.log('[Alert] Realtime subscription status:', status)
            })

        return () => {
            mountedRef.current = false
            supabase.removeChannel(channel)
        }
    }, [handleNewRequest])
}
