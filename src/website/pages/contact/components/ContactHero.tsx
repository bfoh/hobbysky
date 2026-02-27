
import { useState, useEffect } from 'react';

const heroImages = [
  '/room-deluxe.jpg',
  '/deluxe-enhanced.jpeg',
  '/room-executive.jpg',
  '/executive-enhanced.jpeg',
  '/room-standard.jpg',
  '/standard-enhanced.jpeg',
  '/corridor-enhanced.png',
  '/hotelview-enhanced.png',
  '/livingarearecep-enhanced.jpeg',
  '/Car_parking_left_storey_building_0831b9e5ad.jpeg',
];

export default function ContactHero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    // Guard against an empty image list
    if (heroImages.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 4000);

    // Clean‑up on unmount
    return () => clearInterval(interval);
  }, []);

  // If there are no images, render a simple placeholder
  if (heroImages.length === 0) {
    return (
      <section className="relative w-full h-screen flex items-center justify-center bg-black">
        <h1 className="text-white text-5xl md:text-6xl font-bold">
          Contact Us
        </h1>
      </section>
    );
  }

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {heroImages.map((img, index) => (
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
          <strong>Contact Us</strong>
        </h1>
      </div>
    </section>
  );
}
