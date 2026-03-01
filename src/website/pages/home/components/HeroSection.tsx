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
      <section className="relative h-screen w-full overflow-hidden flex flex-col">
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

        {/* Hero Text Overlay — padding adjusted for mobile since widget is moved below */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4 pt-16 md:pt-8 md:pb-24">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 md:mb-6 drop-shadow-xl tracking-tight leading-tight transition-transform duration-700 hover:scale-[1.02]">
            Experience Serenity & <br className="hidden md:block" />
            <span className="text-resort-gold-400">Unmatched Comfort</span>
          </h1>
          <p className="text-sm sm:text-base md:text-xl lg:text-2xl text-gray-100 max-w-3xl drop-shadow-lg font-medium leading-relaxed">
            Discover a perfect blend of luxury and tranquility at Hobbysky Guest House. Your premier destination for relaxation.
          </p>
        </div>

        {/* Booking Widget (Desktop) — Increased transparency for elegant glassmorphism */}
        <div className="hidden md:block absolute bottom-6 left-1/2 -translate-x-1/2 w-full px-4 max-w-5xl z-20">
          <div className="bg-[#3a3935]/30 backdrop-blur-2xl rounded-3xl shadow-[0_8px_40px_0_rgba(0,0,0,0.3)] p-8 border border-white/20">
            <div className="flex flex-nowrap gap-5 items-end">
              <div className="flex-1 relative">
                <label className="block text-xs font-bold tracking-widest text-white/80 mb-2 uppercase">Check-In</label>
                <input
                  type="date" value={checkInDate} min={today} onChange={(e) => setCheckInDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full px-4 py-4 border border-white/20 rounded-2xl focus:ring-2 focus:ring-white/40 focus:border-transparent text-white font-medium text-base bg-white/5 hover:bg-white/10 cursor-pointer transition-all outline-none"
                />
              </div>
              <div className="flex-1 relative">
                <label className="block text-xs font-bold tracking-widest text-white/80 mb-2 uppercase">Check-Out</label>
                <input
                  type="date" value={checkOutDate} min={checkInDate || today} onChange={(e) => setCheckOutDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full px-4 py-4 border border-white/20 rounded-2xl focus:ring-2 focus:ring-white/40 focus:border-transparent text-white font-medium text-base bg-white/5 hover:bg-white/10 cursor-pointer transition-all outline-none"
                />
              </div>
              <button
                onClick={handleCheckAvailability}
                className="flex-none w-auto whitespace-nowrap bg-gradient-to-r from-[#ce8823] to-[#e0a240] hover:from-[#b8761a] hover:to-[#ce8823] active:scale-[0.98] text-white px-10 py-4 rounded-2xl font-bold tracking-wide transition-all duration-300 shadow-[0_4px_20px_rgba(206,136,35,0.5)] hover:shadow-[0_6px_24px_rgba(206,136,35,0.4)] cursor-pointer text-base flex items-center justify-center"
              >
                CHECK AVAILABILITY
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Widget (Mobile) — Re-sized, higher transparency */}
      <div className="block md:hidden w-full bg-[#111111] px-4 py-8">
        <div className="bg-[#3a3935]/30 backdrop-blur-3xl rounded-3xl p-5 border border-white/20 shadow-2xl">
          <div className="flex flex-col gap-4">
            <div className="flex flex-row justify-between gap-2.5">
              <div className="flex-1 min-w-0 relative">
                <label className="block text-[10px] sm:text-xs font-bold tracking-wider text-white/70 mb-1.5 uppercase pl-1">Check-In</label>
                <input
                  type="date" value={checkInDate} min={today} onChange={(e) => setCheckInDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full px-2 sm:px-4 py-2.5 border border-white/15 rounded-xl focus:ring-1 focus:ring-resort-gold-300 focus:border-resort-gold-300 text-white font-medium text-[11px] sm:text-sm bg-white/5 hover:bg-white/10 cursor-pointer outline-none"
                />
              </div>
              <div className="flex-1 min-w-0 relative">
                <label className="block text-[10px] sm:text-xs font-bold tracking-wider text-white/70 mb-1.5 uppercase pl-1">Check-Out</label>
                <input
                  type="date" value={checkOutDate} min={checkInDate || today} onChange={(e) => setCheckOutDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full px-2 sm:px-4 py-2.5 border border-white/15 rounded-xl focus:ring-1 focus:ring-resort-gold-300 focus:border-resort-gold-300 text-white font-medium text-[11px] sm:text-sm bg-white/5 hover:bg-white/10 cursor-pointer outline-none"
                />
              </div>
            </div>
            <button
              onClick={handleCheckAvailability}
              className="w-full bg-[#ce8823] hover:bg-[#b8761a] active:bg-[#a36817] text-white px-6 py-3.5 rounded-xl font-bold tracking-wide transition-colors duration-200 text-sm flex items-center justify-center shadow-lg"
            >
              CHECK AVAILABILITY
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
