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
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4 pt-16 md:pt-8 md:pb-24">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 md:mb-6 drop-shadow-xl tracking-tight leading-tight transition-transform duration-700 hover:scale-[1.02]">
            Experience Serenity & <br className="hidden md:block" />
            <span className="text-resort-gold-400">Unmatched Comfort</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-100 max-w-3xl drop-shadow-lg font-medium leading-relaxed">
            Discover a perfect blend of luxury and tranquility at Hobbysky Guest House. Your premier destination for relaxation.
          </p>
        </div>

        {/* Booking Widget (Glassmorphic) */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full px-4 max-w-5xl z-20 pb-4 md:pb-6">
          <div className="bg-white/[0.03] backdrop-blur-lg rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] p-5 md:p-8 flex flex-col md:flex-row gap-4 md:gap-5 items-end border border-white/10">
            <div className="flex-1 w-full relative">
              <label className="block text-xs font-bold tracking-widest text-white/90 mb-2 uppercase drop-shadow-sm">Check-In</label>
              <input
                type="date"
                value={checkInDate}
                min={today}
                onClick={(e) => {
                  try { (e.target as HTMLInputElement).showPicker(); } catch (err) { }
                }}
                onChange={(e) => setCheckInDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full px-4 py-3.5 md:py-4 border border-white/10 rounded-2xl focus:ring-2 focus:ring-white/50 focus:border-transparent text-white font-medium text-sm md:text-base bg-black/10 hover:bg-black/20 backdrop-blur-sm relative z-10 cursor-pointer transition-all outline-none shadow-inner"
              />
            </div>
            <div className="flex-1 w-full relative">
              <label className="block text-xs font-bold tracking-widest text-white/90 mb-2 uppercase drop-shadow-sm">Check-Out</label>
              <input
                type="date"
                value={checkOutDate}
                min={checkInDate || today}
                onClick={(e) => {
                  try { (e.target as HTMLInputElement).showPicker(); } catch (err) { }
                }}
                onChange={(e) => setCheckOutDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full px-4 py-3.5 md:py-4 border border-white/10 rounded-2xl focus:ring-2 focus:ring-white/50 focus:border-transparent text-white font-medium text-sm md:text-base bg-black/10 hover:bg-black/20 backdrop-blur-sm relative z-10 cursor-pointer transition-all outline-none shadow-inner"
              />
            </div>
            <button
              onClick={handleCheckAvailability}
              className="w-full md:w-auto whitespace-nowrap bg-gradient-to-r from-[#ce8823] to-[#e0a240] hover:from-[#b8761a] hover:to-[#ce8823] active:scale-[0.98] text-white px-8 md:px-10 py-3.5 md:py-4 rounded-2xl font-bold tracking-wide transition-all duration-300 shadow-[0_4px_14px_0_rgba(206,136,35,0.39)] hover:shadow-[0_6px_20px_rgba(206,136,35,0.23)] cursor-pointer text-sm md:text-base h-auto flex items-center justify-center border border-white/10"
            >
              CHECK AVAILABILITY
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
