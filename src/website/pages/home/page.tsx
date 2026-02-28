
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import HeroSection from './components/HeroSection';
import AboutSection from './components/AboutSection';
import OurRoomsSection from './components/OurRoomsSection';
import AmenitiesSection from './components/AmenitiesSection';
import GallerySection from './components/GallerySection';
import ImageGalleryGrid from './components/ImageGalleryGrid';
import LocationSection from './components/LocationSection';

export default function HomePage() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      // Delay slightly so React finishes rendering all sections before scrolling
      const timer = setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <AboutSection />
      <OurRoomsSection />
      <AmenitiesSection />
      <GallerySection />
      <ImageGalleryGrid />
      <LocationSection />
    </div>
  );
}
