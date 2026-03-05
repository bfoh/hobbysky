import { Link } from 'react-router-dom';
import { SEOHead } from '../../components/SEOHead';

const stats = [
  { value: '24/7', label: 'Reception' },
  { value: '3', label: 'Room Types' },
  { value: '100%', label: 'Ghanaian Hospitality' },
  { value: '0%', label: 'Compromise on Comfort' },
];

const whyUs = [
  {
    icon: 'ri-map-pin-line',
    title: 'Prime Location',
    body: 'Situated in Abuakwa-Manhyia, Kumasi — a peaceful neighbourhood with easy access to the city centre, markets, and major landmarks.',
  },
  {
    icon: 'ri-heart-line',
    title: 'Genuine Hospitality',
    body: 'We treat every guest like family. From arrival to departure, our staff are on hand to make your stay effortless and memorable.',
  },
  {
    icon: 'ri-hotel-bed-line',
    title: 'Comfortable Rooms',
    body: 'Each room is thoughtfully furnished — clean, quiet, and equipped with everything you need for a restful stay.',
  },
  {
    icon: 'ri-shield-check-line',
    title: 'Safe & Secure',
    body: '24-hour security, CCTV throughout the property, and key-card access so you can relax with total peace of mind.',
  },
];

export default function AboutPage() {
  return (
    <article>
      <SEOHead
        title="About Us"
        description="Learn about Hobbysky Guest House — our story, our team, and our commitment to authentic Ghanaian hospitality in the heart of Kumasi, Ashanti Region."
        path="/about"
      />

      {/* Hero — min-h accounts for mobile header (h-20) */}
      <section className="relative min-h-[260px] md:min-h-[360px] overflow-hidden">
        <img
          src="/hotelview-enhanced.png"
          alt="Hobbysky Guest House exterior"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/50" />
        <div className="relative z-10 min-h-[260px] md:min-h-[360px] flex flex-col items-center justify-center text-center px-4 pt-20 pb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            About <span className="text-resort-gold-400">Hobbysky</span>
          </h1>
          <p className="mt-3 text-gray-200 text-sm sm:text-base md:text-lg max-w-xl">
            A home away from home in the heart of Kumasi, Ghana.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="bg-resort-green-50 py-10 md:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl md:text-3xl font-bold text-resort-green-900 mb-4 md:mb-6">Our Story</h2>
          <div className="space-y-4 text-resort-green-800 leading-relaxed text-sm md:text-lg">
            <p>
              Hobbysky Guest House was born from a simple belief: that every traveller deserves a clean, comfortable,
              and welcoming place to rest — without paying hotel prices. Nestled in Abuakwa-Manhyia, one of Kumasi's
              most accessible neighbourhoods, we opened our doors to provide exactly that.
            </p>
            <p>
              The name "Hobbysky" reflects our founders' vision — a place where the sky is the limit for the quality
              of experience we offer, built with the passion and personal touch that only a family-run property can
              provide. Unlike large hotels, we know our guests by name, remember their preferences, and take pride in
              every detail of their stay.
            </p>
            <p>
              Whether you are visiting Kumasi for business, family, or exploration, Hobbysky is your base camp — a
              peaceful retreat with modern amenities, 24-hour security, and staff who genuinely care about your comfort.
            </p>
          </div>
        </div>
      </section>

      {/* Why Stay With Us */}
      <section className="bg-white py-10 md:py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl md:text-3xl font-bold text-resort-green-900 text-center mb-6 md:mb-10">
            Why Stay With Us?
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {whyUs.map((item) => (
              <div
                key={item.title}
                className="flex flex-col items-center text-center p-4 md:p-6 rounded-xl border border-resort-green-100 bg-resort-green-50 hover:border-resort-gold-300 transition-colors"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-resort-green-700 to-resort-green-900 flex items-center justify-center mb-3 md:mb-4 shadow-md">
                  <i className={`${item.icon} text-xl md:text-2xl text-resort-gold-400`} />
                </div>
                <h3 className="font-semibold text-resort-green-900 mb-1 md:mb-2 text-sm md:text-base">{item.title}</h3>
                <p className="text-xs md:text-sm text-resort-green-700 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* By the Numbers */}
      <section className="bg-gradient-to-br from-resort-green-800 to-resort-green-950 py-10 md:py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl md:text-3xl font-bold text-white mb-6 md:mb-10">Hobbysky by the Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <span className="text-3xl md:text-5xl font-extrabold text-resort-gold-400">{stat.value}</span>
                <span className="mt-1 md:mt-2 text-xs md:text-base text-gray-300">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What to Expect */}
      <section className="bg-resort-green-50 py-10 md:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl md:text-3xl font-bold text-resort-green-900 mb-4 md:mb-6">What to Expect</h2>
          <ul className="space-y-3 text-resort-green-800 text-sm md:text-lg">
            {[
              'Check-in from 3:00 PM — flexible early check-in when available',
              'Check-out by 12:00 PM — late check-out requests welcome',
              'Free WiFi throughout the property',
              'Free on-site parking',
              'Air-conditioned rooms (Executive and Deluxe)',
              '24-hour front desk and security',
              'Payment at check-in — Cash, Mobile Money (MoMo), Bank Transfer',
              'Free cancellation up to 48 hours before arrival',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <i className="ri-checkbox-circle-fill text-resort-gold-500 text-lg md:text-xl mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-10 md:py-14 px-4 text-center">
        <h2 className="text-xl md:text-3xl font-bold text-resort-green-900 mb-2 md:mb-3">
          Ready to Experience Hobbysky?
        </h2>
        <p className="text-sm md:text-base text-resort-green-700 mb-6 md:mb-8 max-w-md mx-auto">
          Book directly with us for the best rate — no middleman, no OTA fees.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link
            to="/book-now"
            onClick={() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })}
            className="inline-flex w-full sm:w-auto items-center justify-center bg-gradient-to-r from-resort-gold-500 to-resort-gold-600 hover:from-resort-gold-600 hover:to-resort-gold-700 text-white px-8 py-3.5 rounded-md font-semibold transition-all duration-300 shadow-lg hover:shadow-xl text-base"
          >
            Book a Room
          </Link>
          <Link
            to="/contact-us"
            onClick={() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })}
            className="inline-flex w-full sm:w-auto items-center justify-center border-2 border-resort-green-700 text-resort-green-800 hover:bg-resort-green-50 px-8 py-3.5 rounded-md font-semibold transition-all duration-300 text-base"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </article>
  );
}
