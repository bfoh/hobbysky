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

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                    {displayedAmenities.map((amenity) => (
                        <div
                            key={amenity.name}
                            className="group bg-white flex flex-col items-center justify-center gap-3.5 py-7 px-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-[0_12px_40px_-8px_rgba(26,58,42,0.18)] hover:-translate-y-1.5 transition-all duration-300 cursor-default"
                        >
                            <div
                                className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] group-hover:shadow-[0_0_0_4px_rgba(212,160,23,0.18),inset_0_2px_4px_rgba(0,0,0,0.25)]"
                                style={{ background: 'linear-gradient(145deg, #1E3D22, #152d18)' }}
                            >
                                <amenity.icon className="w-6 h-6" style={{ color: '#d4a017' }} />
                            </div>
                            <span className="text-[13.5px] font-semibold text-gray-800 text-center leading-snug">{amenity.name}</span>
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
