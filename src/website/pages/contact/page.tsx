
import { SEOHead } from '../../components/SEOHead';
import ContactHero from './components/ContactHero';
import ContactInfo from './components/ContactInfo';
import PropertyCards from './components/PropertyCards';
import ContactForm from './components/ContactForm';

export default function ContactPage() {
  return (
    <article>
      <SEOHead
        title="Contact Us"
        description="Get in touch with Hobbysky Guest House in Kumasi, Ghana. Call +233 240 204 079, WhatsApp +233 243 512 529, or email reservations@hobbyskyguesthouse.com. Available 24/7."
        path="/contact-us"
      />
      <ContactHero />
      <ContactInfo />
      <PropertyCards />
      <ContactForm />
    </article>
  );
}
