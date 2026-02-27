
import React from 'react';
import { Link } from 'react-router-dom';

const rooms = [
  {
    name: 'Standard Room',
    price: 150,
    image: '/room-standard.jpg',
    features: ['Standard Bed', 'Fan', 'Free Wi-Fi'],
    description:
      'A cozy and well‑appointed room perfect for solo travelers or couples seeking comfort and convenience during their stay.',
  },
  {
    name: 'Executive Room',
    price: 250,
    image: '/room-executive.jpg',
    features: ['King Bed', 'Air Conditioning', 'Flat Screen TV', 'Free Wi-Fi'],
    description:
      'Spacious and elegant, ideal for business travelers or guests who appreciate extra space and premium amenities.',
  },
  {
    name: 'Deluxe Room',
    price: 350,
    image: '/room-deluxe.jpg',
    features: ['King Bed', 'Private Balcony', 'Air Conditioning', 'Flat Screen TV', 'Work Desk', 'Free Wi-Fi'],
    description:
      'Our finest accommodation featuring a private balcony and a jacuzzi for an unforgettable experience.',
  },
];

export default function OurRoomsSection() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-resort-green-800 to-resort-green-950">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-resort-gold-400 text-xs font-semibold tracking-widest uppercase mb-3">
            Accommodations
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-resort-gold-400 mb-4">
            Our Rooms
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto text-sm">
            Choose from our carefully designed rooms, each offering a unique blend of
            comfort, luxury, and stunning views of the Volta Lake.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {rooms.map((room) => (
            <div
              key={room.name}
              className="bg-white/5 border border-resort-gold-500/20 rounded-lg overflow-hidden hover:border-resort-gold-500/50 transition-all duration-300 group flex flex-col"
            >
              <div className="relative w-full h-64 overflow-hidden shrink-0">
                <img
                  src={room.image}
                  alt={`${room.name} at Hobbysky Guest House`}
                  title={`${room.name} - Hobbysky Guest House Kumasi Ghana`}
                  className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-4 right-4 bg-resort-gold-500 text-white px-4 py-1.5 rounded-md text-sm font-bold shadow-lg">
                  {`GH₵ ${room.price}`}
                  <span className="text-xs font-normal opacity-90"> / night</span>
                </div>
              </div>

              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-resort-gold-400 mb-2">{room.name}</h3>
                <p className="text-white/60 text-xs leading-relaxed mb-4">{room.description}</p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {room.features.map((feature) => (
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
                  className="mt-auto inline-flex items-center justify-center w-full whitespace-nowrap bg-gradient-to-r from-resort-gold-500 to-resort-gold-600 hover:from-resort-gold-600 hover:to-resort-gold-700 text-white px-6 py-3 rounded-md font-semibold transition-all duration-300 shadow-lg hover:shadow-xl text-sm"
                >
                  BOOK NOW
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
