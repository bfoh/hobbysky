
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { blink } from '@/blink/client';
import { useCurrency } from '@/hooks/use-currency';
import { formatCurrencySync } from '@/lib/utils';
import type { RoomType } from '@/types';

// Fallback data structure
const fallbackRooms = [
  {
    name: 'Standard Room',
    price: 150,
    image: '/room-standard.jpg',
    features: ['Standard Bed', 'Fan', 'Free Wi-Fi'],
  },
  {
    name: 'Executive Room',
    price: 250,
    image: '/room-executive.jpg',
    features: ['King Bed', 'Air Conditioning', 'Flat Screen TV', 'Free Wi-Fi'],
  },
  {
    name: 'Deluxe Room',
    price: 350,
    image: '/room-deluxe.jpg',
    features: ['King Bed', 'Private Balcony', 'Air Conditioning', 'Flat Screen TV', 'Work Desk', 'Free Wi-Fi'],
  },
];

function renderRoomCard(room: any, currency: string, wrapperClass: string = '') {
  return (
    <div
      key={room.id || room.name}
      className={`bg-white/5 border border-resort-gold-500/20 rounded-lg overflow-hidden hover:border-resort-gold-500/50 transition-all duration-300 group flex flex-col ${wrapperClass}`}
    >
      <div className="relative w-full h-56 sm:h-64 overflow-hidden shrink-0">
        <img
          src={room.image}
          alt={`${room.name} at Hobbysky Guest House`}
          title={`${room.name} - Hobbysky Guest House Kumasi Ghana`}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-resort-gold-500 text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-bold shadow-lg">
          {formatCurrencySync(room.price, currency)}
          <span className="text-[10px] sm:text-xs font-normal opacity-90"> / night</span>
        </div>
      </div>

      <div className="p-5 md:p-6 flex flex-col flex-grow">
        <h3 className="text-lg md:text-xl font-bold text-resort-gold-400 mb-3 md:mb-4">{room.name}</h3>

        <div className="flex flex-wrap gap-2 mb-5 md:mb-6">
          {room.features.map((feature: string) => (
            <span
              key={feature}
              className="text-xs text-white/80 bg-white/10 px-3 py-1.5 rounded-full"
            >
              {feature}
            </span>
          ))}
        </div>

        <Link
          to="/book-now"
          onClick={() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })}
          className="mt-auto inline-flex items-center justify-center w-full min-h-[44px] whitespace-nowrap bg-gradient-to-r from-resort-gold-500 to-resort-gold-600 hover:from-resort-gold-600 hover:to-resort-gold-700 text-white px-6 py-3 rounded-md font-semibold transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer text-sm"
        >
          BOOK NOW
        </Link>
      </div>
    </div>
  );
}

export default function OurRoomsSection() {
  const [rooms, setRooms] = useState<any[]>(fallbackRooms);
  const [loading, setLoading] = useState(true);
  const { currency } = useCurrency(); // Make sure currency context works here

  useEffect(() => {
    async function loadLiveRooms() {
      try {
        const types = await (blink.db as any).roomTypes.list({ orderBy: { column: 'createdAt', ascending: true } });

        if (types && types.length > 0) {
          // Try to match the live DB with our presentation data
          // by grabbing the top 3 or specific names
          const presentationRooms = types.slice(0, 3).map((dbRoom: RoomType, index: number) => {
            // Find a fallback room that somewhat matches by name, or just use positional fallback for images/features
            const fallbackMatch = fallbackRooms.find(fb => fb.name.toLowerCase().includes(dbRoom.name.toLowerCase()) || dbRoom.name.toLowerCase().includes(fb.name.toLowerCase()))
              || fallbackRooms[index % fallbackRooms.length];

            return {
              id: dbRoom.id,
              name: dbRoom.name,
              price: dbRoom.basePrice,
              image: fallbackMatch?.image || '/room-standard.jpg',
              features: fallbackMatch?.features || ['Comfortable Bed', 'Free Wi-Fi']
            };
          });

          setRooms(presentationRooms);
        }
      } catch (error) {
        console.error("Failed to load live room prices for Home page:", error);
      } finally {
        setLoading(false);
      }
    }

    loadLiveRooms();
  }, []);

  return (
    <section id="our-rooms" className="py-14 md:py-20 px-4 bg-gradient-to-br from-resort-green-800 to-resort-green-950">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-center text-3xl sm:text-4xl md:text-5xl font-bold text-resort-gold-400 mb-4">
          Our Rooms
        </h2>
        <p className="text-center text-white/70 mb-8 md:mb-14 max-w-2xl mx-auto text-sm md:text-base">
          Experience comfort and luxury at Hobbysky Guest House. Choose from our carefully designed rooms to suit your
          stay.
        </p>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-resort-gold-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Mobile: horizontal swipe carousel */}
            <div className="flex sm:hidden gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-hide">
              {rooms.map((room) => renderRoomCard(room, currency, 'snap-start shrink-0 w-[82%]'))}
            </div>
            {/* Tablet+: grid */}
            <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
              {rooms.map((room) => renderRoomCard(room, currency))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
