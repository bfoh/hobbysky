import BookNowHero from './components/BookNowHero';
import BookingSearchWidget from './components/BookingSearchWidget';
import OurRoomsSection from './components/OurRoomsSection';
import PropertyInfoSection from './components/PropertyInfoSection';
import AmenitiesSection from './components/AmenitiesSection';
import AddressContactSection from './components/AddressContactSection';
import PoliciesSection from './components/PoliciesSection';
import TermsSection from './components/TermsSection';

export default function BookNowPage() {
  return (
    <article>
      <BookNowHero />
      <BookingSearchWidget />
      <OurRoomsSection />
      <PropertyInfoSection />
      <AmenitiesSection />
      <AddressContactSection />
      <PoliciesSection />
      <TermsSection />
    </article>
  );
}
