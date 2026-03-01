import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Loader2, Moon, Utensils, Wifi, CalendarCheck, MapPin } from '@/components/icons';
import { toast } from "sonner";
import { SubmitRequestDialog } from "@/components/guest/SubmitRequestDialog";

export default function GuestDashboard() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
    const [data, setData] = useState<{ guest: any; booking: any } | null>(null);

    useEffect(() => {
        if (!token) return;

        const fetchBooking = async () => {
            try {
                // Query bookings directly instead of using broken RPC
                const { data: bookingData, error } = await supabase
                    .from('bookings')
                    .select('id, check_in, check_out, status, guest_token, room_id, guest_id, rooms(room_number), guests(name)')
                    .eq('guest_token', token)
                    .limit(1)
                    .single();

                if (error) throw error;

                if (bookingData) {
                    const guestName = (bookingData.guests as any)?.name || 'Guest';
                    const roomNumber = (bookingData.rooms as any)?.room_number || '';
                    setData({
                        guest: {
                            name: guestName,
                            room: roomNumber
                        },
                        booking: {
                            id: bookingData.id,
                            checkIn: bookingData.check_in,
                            checkOut: bookingData.check_out,
                            status: bookingData.status
                        }
                    });
                } else {
                    toast.error("Invalid Link. Please contact the front desk.");
                    navigate('/guest');
                }
            } catch (err) {
                console.error("Dashboard Load Error:", err);
                toast.error("Connection Error");
            } finally {
                setLoading(false);
            }
        };

        fetchBooking();
    }, [token, navigate]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Loading your stay...</p>
            </div>
        );
    }

    if (!data) return <div className="p-4 text-center">Invalid Access Link</div>;

    const { guest, booking } = data;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Welcome Card */}
            <section className="text-center space-y-2 py-4">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Welcome, {guest.name.split(' ')[0]}!</h1>
                <p className="text-base text-gray-600 font-medium">We hope you enjoy your stay at Hobbysky Guest House.</p>
            </section>

            {/* Room Card */}
            <Card className="bg-[#1a3a2a] text-white border-0 shadow-[0_20px_50px_-12px_rgba(26,58,42,0.5)] overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Moon className="w-32 h-32" />
                </div>
                <CardContent className="p-6 relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-[#d4a017] text-[11px] uppercase tracking-widest font-bold mb-1">Room</p>
                            <p className="text-6xl font-black tracking-tighter">{guest.room}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[#d4a017] text-[11px] uppercase tracking-widest font-bold mb-1">Check Out</p>
                            <p className="text-2xl font-bold">{new Date(booking.checkOut).toLocaleDateString()}</p>
                            <p className="text-white/60 text-sm font-medium">11:00 AM</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <Button variant="secondary" className="bg-white/5 hover:bg-[#d4a017] text-white hover:text-[#1a3a2a] border border-white/10 hover:border-[#d4a017] h-auto py-4 flex-col gap-2 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(212,160,23,0.3)]">
                            <Wifi className="w-6 h-6" />
                            <span className="text-sm font-bold">Wi-Fi</span>
                        </Button>
                        <Button variant="secondary" className="bg-white/5 hover:bg-[#d4a017] text-white hover:text-[#1a3a2a] border border-white/10 hover:border-[#d4a017] h-auto py-4 flex-col gap-2 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(212,160,23,0.3)]">
                            <Utensils className="w-6 h-6" />
                            <span className="text-sm font-bold">Dining</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="group bg-white hover:bg-[#1a3a2a] border border-gray-200 hover:border-[#1a3a2a] shadow-sm hover:shadow-[0_10px_40px_-10px_rgba(26,58,42,0.6)] hover:-translate-y-1 transition-all duration-300 cursor-pointer" onClick={() => navigate('concierge')}>
                    <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gray-50 group-hover:bg-[#d4a017]/15 flex items-center justify-center transition-colors duration-300">
                            <MapPin className="w-7 h-7 text-[#1a3a2a] group-hover:text-[#d4a017] transition-colors duration-300" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-[15px] text-gray-900 group-hover:text-white transition-colors duration-300">Local Guide</h3>
                            <p className="text-[12px] text-gray-500 group-hover:text-white/70 font-medium transition-colors duration-300 mt-1">Discover nearby gems</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="group bg-white hover:bg-[#1a3a2a] border border-gray-200 hover:border-[#1a3a2a] shadow-sm hover:shadow-[0_10px_40px_-10px_rgba(26,58,42,0.6)] hover:-translate-y-1 transition-all duration-300 cursor-pointer" onClick={() => setIsRequestDialogOpen(true)}>
                    <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gray-50 group-hover:bg-[#d4a017]/15 flex items-center justify-center transition-colors duration-300">
                            <CalendarCheck className="w-7 h-7 text-[#1a3a2a] group-hover:text-[#d4a017] transition-colors duration-300" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-[15px] text-gray-900 group-hover:text-white transition-colors duration-300">Book Services</h3>
                            <p className="text-[12px] text-gray-500 group-hover:text-white/70 font-medium transition-colors duration-300 mt-1">Shuttle, Spa, Cleaning</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {token && (
                <SubmitRequestDialog
                    open={isRequestDialogOpen}
                    onOpenChange={setIsRequestDialogOpen}
                    bookingToken={token}
                />
            )}
        </div>
    );
}
