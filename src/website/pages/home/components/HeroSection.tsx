import { useState } from 'react';

export default function HeroSection() {
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');

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
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4 pt-16 md:pt-20">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 md:mb-6 drop-shadow-xl tracking-tight leading-tight transition-transform duration-700 hover:scale-[1.02]">
            Experience Serenity & <br className="hidden md:block" />
            <span className="text-resort-gold-400">Unmatched Comfort</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-100 max-w-3xl drop-shadow-lg font-medium leading-relaxed">
            Discover a perfect blend of luxury and tranquility at Hobbysky Guest House. Your premier destination for relaxation.
          </p>
        </div>
      </section>

      {/* Booking Widget */}
      <div className="w-full flex justify-center px-4 relative z-20 py-8 bg-[#f5f7f5]">
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-10 flex flex-col md:flex-row gap-6 items-stretch md:items-end max-w-5xl w-full border border-gray-100">
          <div className="flex-1 w-full relative">
            <label className="block text-sm md:text-base font-semibold text-resort-green-800 mb-2">CHECK-IN</label>
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              className="w-full px-5 py-3 border border-resort-green-200 rounded-md focus:ring-2 focus:ring-resort-green-500 focus:border-transparent text-base md:text-lg appearance-none bg-transparent relative z-10"
            />
          </div>
          <div className="flex-1 w-full relative">
            <label className="block text-sm md:text-base font-semibold text-resort-green-800 mb-2">CHECK-OUT</label>
            <input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className="w-full px-5 py-3 border border-resort-green-200 rounded-md focus:ring-2 focus:ring-resort-green-500 focus:border-transparent text-base md:text-lg appearance-none bg-transparent relative z-10"
            />
          </div>
          <button className="w-full md:w-auto whitespace-nowrap bg-[#ce8823] hover:bg-[#b8761a] text-white px-8 py-3.5 rounded-md font-semibold transition-colors duration-300 shadow-md cursor-pointer text-base md:text-lg h-auto flex items-center justify-center">
            CHECK AVAILABILITY
          </button>
        </div>
      </div>
    </>
  );
}
