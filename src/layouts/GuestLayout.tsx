import { Outlet, useLocation, useParams } from "react-router-dom";
import { User, Phone, MapPin, Coffee } from '@/components/icons';
import { Link } from "react-router-dom";
import { useGuestStatusUpdates } from "@/hooks/use-guest-status-updates";

export default function GuestLayout() {
    const { token } = useParams<{ token: string }>()
    const { requests, loading, refreshRequests } = useGuestStatusUpdates(token)

    return (
        <div className="min-h-screen bg-[#0c1a12] flex flex-col font-sans">
            {/* Header */}
            <header className="bg-[#162019] border-b border-[#2a3a2e] px-6 py-4 flex items-center justify-center sticky top-0 z-10 shadow-lg">
                <img src="/logohobbyskydarkmode.png" alt="Hobbysky Guest House" className="h-12 w-auto object-contain" />
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-md mx-auto p-4 pb-24">
                <Outlet context={{ requests, loading, refreshRequests, token }} />
            </main>

            {/* Fixed Bottom Navigation - Premium App Style */}
            <nav className="fixed bottom-0 left-0 right-0 bg-[#162019]/95 backdrop-blur-md border-t border-[#2a3a2e] p-2 pb-safe z-20">
                <div className="max-w-md mx-auto flex justify-around items-center">
                    <NavLink to="" icon={<User className="w-5 h-5" />} label="My Stay" />
                    <NavLink to="concierge" icon={<MapPin className="w-5 h-5" />} label="Concierge" />
                    <NavLink to="services" icon={<Coffee className="w-5 h-5" />} label="Services" />
                    <NavLink to="help" icon={<Phone className="w-5 h-5" />} label="Help" />
                </div>
            </nav>
        </div>
    );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
    const location = useLocation();
    // Determine if this is the active link
    const pathParts = location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1] || '';
    const isActive = to === '' ? !['concierge', 'services', 'help'].includes(lastPart) : lastPart === to;

    return (
        <Link
            to={to}
            className={`flex flex-col items-center gap-1 p-2 transition-colors duration-200 ${isActive
                ? 'text-amber-400'
                : 'text-neutral-400 hover:text-neutral-200'
                }`}
        >
            {icon}
            <span className={`text-xs font-semibold ${isActive ? 'text-amber-400' : ''}`}>{label}</span>
        </Link>
    )
}
