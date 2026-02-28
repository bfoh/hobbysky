import { Link } from 'react-router-dom';

// Image + feature fallback map keyed by room name fragment
const roomFallbacks: Record<string, { image: string; features: string[] }> = {
  standard: {
    image: '/room-standard.jpg',
    features: ['Standard Bed', 'Fan', 'Free Wi-Fi'],
  },
  executive: {
    image: '/room-executive.jpg',
    features: ['King Bed', 'Air Conditioning', 'Flat Screen TV', 'Free Wi-Fi'],
  },
  deluxe: {
    image: '/room-deluxe.jpg',
    features: ['King Bed', 'Private Balcony', 'Air Conditioning', 'Flat Screen TV', 'Work Desk', 'Free Wi-Fi'],
  },
};

function getRoomPresentation(name: string) {
  const key = Object.keys(roomFallbacks).find((k) => name.toLowerCase().includes(k));
  return roomFallbacks[key || 'standard'];
}

export interface AvailableRoom {
  roomTypeId: string;
  name: string;
  price: number;
  availableCount: number;
}

export interface SearchParams {
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
}

interface Props {
  rooms: AvailableRoom[];
  searchParams: SearchParams;
  onSelect: (room: AvailableRoom) => void;
  onBack: () => void;
}

export default function AvailableRoomsSection({ rooms, searchParams, onSelect, onBack }: Props) {
  const { checkIn, checkOut, nights, guests } = searchParams;

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <section className="py-14 px-4 bg-white min-h-[60vh]">
      <div className="max-w-5xl mx-auto">
        {/* Back link */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-resort-green-700 hover:text-resort-green-900 font-medium mb-8 cursor-pointer transition-colors"
        >
          <i className="ri-arrow-left-line" />
          Change Dates
        </button>

        {/* Search summary banner */}
        <div className="bg-resort-green-50 border border-resort-green-200 rounded-xl px-5 py-3 mb-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-resort-green-800">
          <span className="font-semibold">Availability for</span>
          <span>
            <i className="ri-calendar-check-line mr-1 text-resort-green-600" />
            {fmt(checkIn)}
          </span>
          <span className="text-resort-green-400">→</span>
          <span>
            <i className="ri-calendar-line mr-1 text-resort-green-600" />
            {fmt(checkOut)}
          </span>
          <span className="mx-1 text-resort-green-300">·</span>
          <span>
            <i className="ri-moon-line mr-1 text-resort-green-600" />
            {nights} night{nights !== 1 ? 's' : ''}
          </span>
          <span className="mx-1 text-resort-green-300">·</span>
          <span>
            <i className="ri-user-line mr-1 text-resort-green-600" />
            {guests} guest{guests !== 1 ? 's' : ''}
          </span>
        </div>

        {rooms.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-hotel-bed-line text-2xl text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No rooms available for these dates</h3>
            <p className="text-gray-500 text-sm mb-6">All rooms are booked for your selected period. Please try different dates.</p>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 bg-resort-gold-500 hover:bg-resort-gold-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
            >
              <i className="ri-calendar-line" />
              Change Dates
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-resort-green-900 mb-1">Select Your Room</h2>
            <p className="text-gray-500 text-sm mb-8">
              {rooms.length} room type{rooms.length !== 1 ? 's' : ''} available for your dates
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => {
                const { image, features } = getRoomPresentation(room.name);
                const total = room.price * nights;

                return (
                  <div
                    key={room.roomTypeId}
                    className="border border-gray-200 rounded-2xl overflow-hidden hover:border-resort-gold-400 hover:shadow-lg transition-all duration-300 flex flex-col group"
                  >
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden shrink-0">
                      <img
                        src={image}
                        alt={room.name}
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* Availability chip */}
                      <span className="absolute top-3 right-3 bg-white/90 text-resort-green-800 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
                        {room.availableCount} room{room.availableCount !== 1 ? 's' : ''} left
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-grow">
                      <h3 className="text-lg font-bold text-resort-green-900 mb-3">{room.name}</h3>

                      {/* Features */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {features.map((f) => (
                          <span key={f} className="text-[11px] bg-resort-green-50 text-resort-green-700 px-2.5 py-1 rounded-full border border-resort-green-100">
                            {f}
                          </span>
                        ))}
                      </div>

                      {/* Price */}
                      <div className="mt-auto">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-2xl font-bold text-resort-green-900">
                            GH₵ {room.price.toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-400">/ night</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">
                          Total for {nights} night{nights !== 1 ? 's' : ''}:{' '}
                          <span className="font-semibold text-resort-green-800">GH₵ {total.toLocaleString()}</span>
                        </p>

                        <button
                          onClick={() => onSelect(room)}
                          className="w-full bg-resort-gold-500 hover:bg-resort-gold-600 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
                        >
                          Select This Room
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
