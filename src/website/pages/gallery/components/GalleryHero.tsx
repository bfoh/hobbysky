import { useState, useEffect } from 'react';
import { heroSlideImages } from '../../../mocks/galleryImages';

export default function GalleryHero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlideImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {heroSlideImages.map((img, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
        >
          <img
            src={img}
            alt={`Hobbysky Guest House slide ${index + 1}`}
            className="w-full h-full object-cover object-top"
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/40" />
      <div className="absolute inset-0 flex items-center justify-center">
        <h1 className="text-white text-5xl md:text-6xl font-bold tracking-wide text-center">
          <strong>Photo Gallery</strong>
        </h1>
      </div>
    </section>
  );
}
