import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

export interface GuestServiceRequest {
    id: string;
    type: string;
    details: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    created_at: string;
    updated_at: string;
}

function playSoftChime() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime); // C6
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
        setTimeout(() => ctx.close(), 1000);
    } catch (e) { }
}

export function useGuestStatusUpdates(token: string | undefined) {
    const [requests, setRequests] = useState<GuestServiceRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const previousStatusRef = useRef<Record<string, string>>({});
    const isFirstLoadRef = useRef(true);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        const fetchRequests = async () => {
            if (!token || token === 'undefined') return;
            try {
                const res = await fetch(`/.netlify/functions/get-guest-requests?token=${token}`);
                if (!res.ok) return;

                const data = await res.json();
                if (data.success && data.requests) {
                    const newRequests = data.requests as GuestServiceRequest[];

                    if (!isFirstLoadRef.current) {
                        newRequests.forEach(req => {
                            const oldStatus = previousStatusRef.current[req.id];
                            if (oldStatus && oldStatus !== req.status) {
                                // Status changed!
                                const typeName = req.type.replace('_', ' ');
                                playSoftChime();

                                if (req.status === 'in_progress') {
                                    toast.info(`🛎️ Your ${typeName} request is being worked on!`, { duration: 10000 });
                                } else if (req.status === 'completed') {
                                    toast.success(`✅ Your ${typeName} request is complete!`, { duration: 10000 });
                                }
                            }
                        });
                    }

                    // Update refs
                    isFirstLoadRef.current = false;
                    newRequests.forEach(req => {
                        previousStatusRef.current[req.id] = req.status;
                    });

                    setRequests(newRequests);
                }
            } catch (err) {
                console.error("Failed to poll guest requests", err);
            } finally {
                setLoading(false);
            }
        };

        // Initial fetch
        fetchRequests();

        // Poll every 15 seconds
        const intervalId = setInterval(fetchRequests, 15000);

        return () => clearInterval(intervalId);
    }, [token]);

    const refreshRequests = async () => {
        if (!token || token === 'undefined') return;
        try {
            const res = await fetch(`/.netlify/functions/get-guest-requests?token=${token}`);
            const data = await res.json();
            if (data.success && data.requests) {
                setRequests(data.requests);
                data.requests.forEach((req: GuestServiceRequest) => {
                    previousStatusRef.current[req.id] = req.status;
                });
            }
        } catch (err) { }
    };

    return { requests, loading, refreshRequests };
}
