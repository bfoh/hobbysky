

import HeroSection from './components/HeroSection';
import AboutSection from './components/AboutSection';
import OurRoomsSection from './components/OurRoomsSection';
import AmenitiesSection from './components/AmenitiesSection';
import GallerySection from './components/GallerySection';
import ImageGalleryGrid from './components/ImageGalleryGrid';
import LocationSection from './components/LocationSection';

export default function HomePage() {
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
