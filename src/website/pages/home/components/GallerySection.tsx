import { useState } from 'react';
import { Link } from 'react-router-dom';

const galleryImages = [
  '/room-standard.jpg',
  '/standard-enhanced.jpeg',
  '/room-executive.jpg',
  '/executive-enhanced.jpeg',
  '/room-deluxe.jpg',
  '/deluxe-enhanced.jpeg',
  '/exec1-enhanced.jpeg',
  '/exec2-enhanced.jpeg',
  '/stand1-enhanced.jpeg',
  '/corridor-enhanced.png',
  '/hotelview-enhanced.png',
  '/livingarearecep-enhanced.jpeg',
  '/Car_parking_left_storey_building_0831b9e5ad.jpeg',
  '/Please_make_the_ceiling_perfectly_smooth_54295b0e58.jpeg',
  '/gallery-livingarea.jpg',
  '/gallery-bedroom.jpg',
  '/gallery-rooms-bathroom.jpg',
];

export default function GallerySection() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % galleryImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + galleryImages.length) % galleryImages.length);
  };

  return (
    <section className="py-20 px-4 bg-resort-green-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Image Slider */}
          <div className="relative h-[500px] rounded-lg overflow-hidden shadow-2xl border-2 border-resort-gold-300/30">
            <img
              src={galleryImages[currentImageIndex]}
              alt="Hobbysky Guest House Gallery"
              className="w-full h-full object-cover"
            />

            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-resort-green-900/60 hover:bg-resort-green-900/80 text-white p-3 rounded-full transition-all duration-300 cursor-pointer"
              aria-label="Previous image"
            >
              <i className="ri-arrow-left-s-line text-2xl"></i>
            </button>

            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-resort-green-900/60 hover:bg-resort-green-900/80 text-white p-3 rounded-full transition-all duration-300 cursor-pointer"
              aria-label="Next image"
            >
              <i className="ri-arrow-right-s-line text-2xl"></i>
            </button>
          </div>

          {/* Content */}
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-resort-green-900 mb-6">
              OUR GALLERY
            </h2>
            <div className="w-20 h-1 bg-resort-gold-500 mb-6"></div>
            <p className="text-resort-green-800 text-lg leading-relaxed mb-8">
              A serene sanctuary in the Ashanti Region - Immerse yourself in the authentic Ghanaian hospitality and modern comfort at Hobbysky Guest House. Perfectly situated in the vibrant heart of DKC, Abuakwa, Kumasi, we offer the perfect location for family getaways, private retreats, and celebrations.
            </p>
            <Link
              to="/gallery"
              className="inline-flex items-center justify-center whitespace-nowrap bg-gradient-to-r from-resort-gold-500 to-resort-gold-600 hover:from-resort-gold-600 hover:to-resort-gold-700 text-white px-8 py-3 rounded-md font-semibold transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer text-base"
            >
              GO TO GALLERY
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
