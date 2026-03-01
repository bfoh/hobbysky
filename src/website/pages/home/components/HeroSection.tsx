import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HeroSection() {
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const navigate = useNavigate();

  const handleCheckAvailability = () => {
    const params = new URLSearchParams();
    if (checkInDate) params.append('checkIn', checkInDate);
    if (checkOutDate) params.append('checkOut', checkOutDate);

    navigate(`/book-now${params.toString() ? '?' + params.toString() : ''}`);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      <section className="relative h-screen w-full overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-[25%_center] md:object-center"
          >
            <source src="/hotelone_optimized.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50"></div>
        </div>

        {/* Hero Text Overlay */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4 pt-16 pb-36 md:pt-8 md:pb-24">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 md:mb-6 drop-shadow-xl tracking-tight leading-tight transition-transform duration-700 hover:scale-[1.02]">
            Experience Serenity & <br className="hidden md:block" />
            <span className="text-resort-gold-400">Unmatched Comfort</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-100 max-w-3xl drop-shadow-lg font-medium leading-relaxed">
            Discover a perfect blend of luxury and tranquility at Hobbysky Guest House. Your premier destination for relaxation.
          </p>
        </div>

        {/* Booking Widget (Glassmorphic) */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full px-3 md:px-4 max-w-5xl z-20">
          <div className="bg-white/[0.08] backdrop-blur-2xl rounded-t-2xl md:rounded-t-3xl shadow-[0_-4px_40px_0_rgba(0,0,0,0.2)] p-4 md:p-8 grid grid-cols-2 md:flex md:flex-row gap-3 md:gap-5 md:items-end border border-white/20 border-b-0">
            {/* Check-In */}
            <div className="col-span-1 md:flex-1 w-full relative">
              <label className="block text-xs font-bold tracking-widest text-white/90 mb-1.5 md:mb-2 uppercase drop-shadow-sm">Check-In</label>
              <input
                type="date"
                value={checkInDate}
                min={today}
                onClick={(e) => {
                  try { (e.target as HTMLInputElement).showPicker(); } catch (err) { }
                }}
                onChange={(e) => setCheckInDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full px-3 md:px-4 py-3 md:py-4 border border-white/20 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-white/40 focus:border-transparent text-white font-medium text-sm md:text-base bg-white/10 hover:bg-white/15 relative z-10 cursor-pointer transition-all outline-none"
              />
            </div>
            {/* Check-Out */}
            <div className="col-span-1 md:flex-1 w-full relative">
              <label className="block text-xs font-bold tracking-widest text-white/90 mb-1.5 md:mb-2 uppercase drop-shadow-sm">Check-Out</label>
              <input
                type="date"
                value={checkOutDate}
                min={checkInDate || today}
                onClick={(e) => {
                  try { (e.target as HTMLInputElement).showPicker(); } catch (err) { }
                }}
                onChange={(e) => setCheckOutDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full px-3 md:px-4 py-3 md:py-4 border border-white/20 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-white/40 focus:border-transparent text-white font-medium text-sm md:text-base bg-white/10 hover:bg-white/15 relative z-10 cursor-pointer transition-all outline-none"
              />
            </div>
            {/* Button — full width below on mobile, auto-width beside on desktop */}
            <button
              onClick={handleCheckAvailability}
              className="col-span-2 md:col-auto md:w-auto w-full whitespace-nowrap bg-gradient-to-r from-[#ce8823] to-[#e0a240] hover:from-[#b8761a] hover:to-[#ce8823] active:scale-[0.98] text-white px-8 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold tracking-wide transition-all duration-300 shadow-[0_4px_20px_rgba(206,136,35,0.5)] hover:shadow-[0_6px_24px_rgba(206,136,35,0.4)] cursor-pointer text-sm md:text-base flex items-center justify-center"
            >
              CHECK AVAILABILITY
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
