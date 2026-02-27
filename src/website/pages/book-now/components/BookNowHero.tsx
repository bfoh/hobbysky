
import { useState, useEffect } from 'react';
import { slideshowImages } from '../../../mocks/bookNowData';

export default function BookNowHero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!Array.isArray(slideshowImages) || slideshowImages.length === 0) {
      console.warn('slideshowImages is empty or not an array.');
      return;
    }

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideshowImages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="pt-28 pb-16 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
          {/* Left - Text Content */}
          <div className="flex flex-col justify-center">
            <h2 className="text-2xl md:text-3xl text-resort-green-900 leading-snug mb-6">
              Welcome to Hobbysky Guest House, Kumasi.
            </h2>
            <div className="space-y-5 text-resort-green-800 text-[15px] leading-relaxed">
              <p>
                Indulge in cozy accommodations and personalized service at{' '}
                <strong>Hobbysky Guest House,</strong> located in the vibrant heart of DKC, Abuakwa.
              </p>
              <p>
                Our guest house offers a perfect blend of modern comfort and authentic Ghanaian hospitality, creating a home away from home for both leisure and business travelers.
              </p>
            </div>
          </div>

          {/* Right - Image Slideshow */}
          <div className="relative w-full h-[480px] lg:h-auto min-h-[480px] rounded-lg overflow-hidden">
            {Array.isArray(slideshowImages) &&
              slideshowImages.map((img, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                  <img
                    src={img}
                    alt={`Hobbysky Guest House ${index + 1}`}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
