import React from "react";

const propertyData = [
  {
    name: "Hobbysky Guest House",
    image: "/hotelview-enhanced.png",
    address: "DKC, Abuakwa, Kumasi, Ashanti Region, Ghana",
    phone: ["+233 240 204 029", "+233 243 512 529", "+233 552 515 787"],
    email: "reservations@hobbysky.com",
    whatsapp: "+233240204029",
    mapSrc:
      "https://maps.google.com/maps?q=Hobbysky%20Guest%20House,%20Kumasi&t=&z=15&ie=UTF8&iwloc=&output=embed",
  },
];

export default function PropertyCards() {
  return (
    <section className="py-20 px-4 bg-resort-green-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-resort-green-900 mb-4">
          Our Properties
        </h2>
        <div className="w-20 h-1 bg-resort-gold-500 mx-auto mb-14"></div>

        <div className="grid grid-cols-1 max-w-lg mx-auto gap-8">
          {propertyData.map((property, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-xl overflow-hidden border border-resort-green-100 hover:shadow-2xl transition-shadow duration-300"
            >
              {/* Property Image */}
              <div className="relative w-full h-56 overflow-hidden">
                <img
                  src={property.image}
                  alt={property.name}
                  onError={(e) => {
                    // Fallback to a placeholder image if the original fails to load
                    (e.currentTarget as HTMLImageElement).src =
                      "https://via.placeholder.com/600x400?text=Image+Unavailable";
                  }}
                  className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <h3 className="absolute bottom-4 left-4 right-4 text-white text-xl font-bold">
                  {property.name}
                </h3>
              </div>

              {/* Property Details */}
              <div className="p-6 space-y-4">
                {/* Address */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="ri-map-pin-fill text-resort-gold-500 text-lg"></i>
                  </div>
                  <p className="text-resort-green-800 text-sm leading-relaxed">
                    {property.address}
                  </p>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="ri-phone-fill text-resort-gold-500 text-lg"></i>
                  </div>
                  <div className="text-sm space-y-1">
                    {property.phone.map((num, i) => (
                      <a
                        key={i}
                        href={`tel:${num.replace(/\s/g, "")}`}
                        className="block text-resort-green-800 hover:text-resort-gold-600 transition-colors cursor-pointer"
                      >
                        {num}
                      </a>
                    ))}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="ri-mail-fill text-resort-gold-500 text-lg"></i>
                  </div>
                  <a
                    href={`mailto:${property.email}`}
                    className="text-resort-green-800 hover:text-resort-gold-600 transition-colors text-sm cursor-pointer"
                  >
                    {property.email}
                  </a>
                </div>

                {/* WhatsApp */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="ri-whatsapp-fill text-resort-gold-500 text-lg"></i>
                  </div>
                  <a
                    href={`https://wa.me/${property.whatsapp.replace(
                      /[^0-9]/g,
                      ""
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-resort-green-800 hover:text-resort-gold-600 transition-colors text-sm cursor-pointer"
                  >
                    WhatsApp Us
                  </a>
                </div>
              </div>

              {/* Map */}
              <div className="w-full h-48 border-t border-resort-green-100">
                {/* Using a self‑closing iframe to avoid JSX parsing issues */}
                <iframe
                  src={property.mapSrc}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${property.name} Map`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
