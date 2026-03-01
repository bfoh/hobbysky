
import { useState } from 'react';
import { amenitiesList } from '../../../mocks/bookNowData';

// Defensive check – ensure we have an array to work with
const safeAmenities = Array.isArray(amenitiesList) ? amenitiesList : [];

export default function AmenitiesSection() {
  const [showAll, setShowAll] = useState(false);
  const displayedAmenities = showAll ? safeAmenities : safeAmenities.slice(0, 16);

  return (
    <section className="py-20 bg-[#f4faf6]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="text-xs font-bold tracking-widest text-[#ce8823] uppercase mb-3 block">
            At Your Service
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#0A2A1A]">
            Our Amenities
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {displayedAmenities.map((amenity) => (
            <div key={amenity.name} className="flex flex-col items-center justify-center p-6 md:p-8 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-transparent hover:border-[#0A2A1A]/5 gap-4">
              <div className="w-14 h-14 bg-[#11311f] rounded-full flex items-center justify-center mb-1">
                <amenity.icon color="#ce8823" size={24} className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-[#11311f] text-center">{amenity.name}</span>
            </div>
          ))}
        </div>

        {safeAmenities.length > 16 && (
          <div className="mt-10 text-center">
            <button
              onClick={() => setShowAll((prev) => !prev)}
              className="whitespace-nowrap inline-flex items-center gap-2 text-sm font-bold text-[#11311f] border-2 border-[#11311f] rounded-full px-8 py-3 hover:bg-[#11311f] hover:text-white transition-colors cursor-pointer"
            >
              {showAll ? 'Show Less' : `View All`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
