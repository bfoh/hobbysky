
import { useState } from 'react';
import { propertyGalleryImages } from '../../../mocks/bookNowData';

export default function PropertyInfoSection() {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  const goNext = () =>
    setLightboxIndex((prev) => (prev + 1) % propertyGalleryImages.length);
  const goPrev = () =>
    setLightboxIndex(
      (prev) => (prev - 1 + propertyGalleryImages.length) % propertyGalleryImages.length
    );

  // Guard against empty image array
  if (!Array.isArray(propertyGalleryImages) || propertyGalleryImages.length === 0) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-resort-green-900 mb-8">
            Property Information
          </h2>
          <p className="text-gray-600">No images available.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-2xl font-bold text-resort-green-900 mb-8">
          Property Information
        </h2>

        {/* Photo Gallery Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {propertyGalleryImages.map((img, index) => (
            <button
              key={index}
              onClick={() => openLightbox(index)}
              className="relative w-full h-40 rounded-lg overflow-hidden group cursor-pointer"
            >
              <img
                src={img}
                alt={`Property ${index + 1}`}
                className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>
            </button>
          ))}
        </div>

        {/* Lightbox */}
        {lightboxOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeLightbox();
              }}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center text-white hover:text-resort-gold-400 cursor-pointer z-10"
              aria-label="Close"
            >
              <i className="ri-close-line text-3xl"></i>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white hover:text-resort-gold-400 cursor-pointer z-10"
              aria-label="Previous"
            >
              <i className="ri-arrow-left-s-line text-4xl"></i>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white hover:text-resort-gold-400 cursor-pointer z-10"
              aria-label="Next"
            >
              <i className="ri-arrow-right-s-line text-4xl"></i>
            </button>

            <div
              className="max-w-5xl max-h-[85vh] px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={propertyGalleryImages[lightboxIndex]}
                alt={`Property ${lightboxIndex + 1}`}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm">
              {lightboxIndex + 1} / {propertyGalleryImages.length}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
