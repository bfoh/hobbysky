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
            <Card className="bg-black text-white border-0 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Moon className="w-32 h-32" />
                </div>
                <CardContent className="p-6 relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-white/70 text-sm uppercase tracking-widest font-semibold">Room</p>
                            <p className="text-5xl font-black">{guest.room}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-white/70 text-sm uppercase tracking-widest font-semibold">Check Out</p>
                            <p className="text-2xl font-bold">{new Date(booking.checkOut).toLocaleDateString()}</p>
                            <p className="text-white/50 text-sm font-medium">11:00 AM</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <Button variant="secondary" className="bg-white/10 hover:bg-white/30 text-white border border-white/10 hover:border-white/30 h-auto py-4 flex-col gap-2 transition-all duration-200 hover:scale-[1.03]">
                            <Wifi className="w-6 h-6" />
                            <span className="text-sm font-semibold">Wi-Fi</span>
                        </Button>
                        <Button variant="secondary" className="bg-white/10 hover:bg-white/30 text-white border border-white/10 hover:border-white/30 h-auto py-4 flex-col gap-2 transition-all duration-200 hover:scale-[1.03]">
                            <Utensils className="w-6 h-6" />
                            <span className="text-sm font-semibold">Dining</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-white hover:bg-orange-50 hover:shadow-lg hover:scale-[1.03] transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-orange-200" onClick={() => navigate('concierge')}>
                    <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-gray-900">Local Guide</h3>
                            <p className="text-sm text-gray-600 font-medium">Discover nearby gems</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white hover:bg-blue-50 hover:shadow-lg hover:scale-[1.03] transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-blue-200" onClick={() => setIsRequestDialogOpen(true)}>
                    <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <CalendarCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-gray-900">Book Services</h3>
                            <p className="text-sm text-gray-600 font-medium">Shuttle, Spa, Cleaning</p>
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
