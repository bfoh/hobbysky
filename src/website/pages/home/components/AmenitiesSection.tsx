import { useState } from 'react';
import { amenitiesList } from '../../../mocks/bookNowData';

// Defensive check – ensure we have an array to work with
const safeAmenities = Array.isArray(amenitiesList) ? amenitiesList : [];

export default function AmenitiesSection() {
    const [showAll, setShowAll] = useState(false);
    // Show 8 on load, then expand to all
    const displayedAmenities = showAll ? safeAmenities : safeAmenities.slice(0, 8);

    return (
        <section className="py-24 px-4 bg-[#f3faf6]">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-14">
                    <span className="inline-block text-resort-gold-600 text-xs font-semibold tracking-widest uppercase mb-3">
                        At Your Service
                    </span>
                    <h2 className="text-center text-4xl md:text-5xl font-bold text-resort-green-900">
                        Our Amenities
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {displayedAmenities.map((amenity) => (
                        <div
                            key={amenity.name}
                            className="bg-white px-6 py-5 rounded-[14px] shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 border border-resort-green-50 flex items-center gap-4 transition-all duration-300"
                        >
                            <div className="w-12 h-12 rounded-full bg-[#e8f5ed] flex items-center justify-center flex-shrink-0">
                                <amenity.icon className="text-[#88c5a2] w-6 h-6" />
                            </div>
                            <span className="text-[15px] font-semibold text-gray-800">{amenity.name}</span>
                        </div>
                    ))}
                </div>

                {safeAmenities.length > 8 && (
                    <div className="mt-12 text-center">
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="inline-flex items-center gap-2 text-sm font-bold text-resort-gold-600 hover:text-resort-gold-700 transition-colors uppercase tracking-widest cursor-pointer group"
                        >
                            {showAll ? 'Show Less Amenities' : 'View All Amenities'}
                            <i className={`ri-arrow-${showAll ? 'up' : 'right'}-line text-lg group-hover:translate-x-1 transition-transform`}></i>
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
