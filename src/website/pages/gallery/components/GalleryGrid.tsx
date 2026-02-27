
import { useState, useCallback } from 'react';
import { galleryImages } from '../../../mocks/galleryImages';
import LightboxModal from './LightboxModal';

const INITIAL_COUNT = 48;
const LOAD_MORE_COUNT = 24;

export default function GalleryGrid() {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visibleImages = galleryImages.slice(0, visibleCount);
  const hasMore = visibleCount < galleryImages.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + LOAD_MORE_COUNT, galleryImages.length));
  };

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const goToPrev = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + galleryImages.length) % galleryImages.length : null
    );
  }, []);

  const goToNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % galleryImages.length : null
    );
  }, []);

  return (
    <section className="w-full bg-white">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
        {visibleImages.map((img, index) => (
          <button
            key={index}
            onClick={() => openLightbox(index)}
            className="relative w-full aspect-square overflow-hidden group cursor-pointer border-0 p-0 bg-transparent"
            aria-label={`View gallery image ${index + 1}`}
          >
            <img
              src={img}
              alt={`Hobbysky Guest House gallery ${index + 1}`}
              title={`Hobbysky Guest House Kumasi Ghana gallery image ${index + 1}`}
              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-resort-green-900/0 group-hover:bg-resort-green-900/20 transition-all duration-300" />
          </button>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center py-10">
          <button
            onClick={handleLoadMore}
            className="w-full sm:w-auto inline-flex items-center justify-center whitespace-nowrap cursor-pointer px-10 py-3 bg-gradient-to-r from-resort-gold-500 to-resort-gold-600 hover:from-resort-gold-600 hover:to-resort-gold-700 text-white font-semibold rounded-md transition-all duration-300 shadow-lg hover:shadow-xl text-sm mx-auto"
          >
            View More
          </button>
        </div>
      )}

      {lightboxIndex !== null && (
        <LightboxModal
          images={galleryImages}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onPrev={goToPrev}
          onNext={goToNext}
        />
      )}
    </section>
  );
}
