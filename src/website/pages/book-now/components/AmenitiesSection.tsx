
import { useState } from 'react';
import { amenitiesList } from '../../../mocks/bookNowData';

// Defensive check – ensure we have an array to work with
const safeAmenities = Array.isArray(amenitiesList) ? amenitiesList : [];

export default function AmenitiesSection() {
  const [showAll, setShowAll] = useState(false);
  const displayedAmenities = showAll ? safeAmenities : safeAmenities.slice(0, 16);

  return (
    <section className="py-12 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="border-t border-gray-200 pt-10">
          <h3 className="text-xl font-bold text-resort-green-900 mb-8">
            Property Amenities
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
            {displayedAmenities.map((amenity) => (
              <div key={amenity.name} className="flex items-center gap-3 py-1">
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <amenity.icon className="text-resort-green-700 w-5 h-5" />
                </div>
                <span className="text-sm text-resort-green-800">{amenity.name}</span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <button
              onClick={() => setShowAll((prev) => !prev)}
              className="whitespace-nowrap inline-flex items-center gap-2 text-sm font-medium text-resort-green-800 border border-resort-green-300 rounded-full px-5 py-2 hover:bg-resort-green-50 transition-colors cursor-pointer"
            >
              {showAll ? 'Show Less' : `View All (${safeAmenities.length})`}
              <i
                className={`ri-arrow-${showAll ? 'up' : 'right'}-s-line text-base`}
              ></i>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
