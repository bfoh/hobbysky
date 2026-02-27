
import ContactHero from './components/ContactHero';
import ContactInfo from './components/ContactInfo';
import PropertyCards from './components/PropertyCards';
import ContactForm from './components/ContactForm';

export default function ContactPage() {
  return (
    <article>
      <ContactHero />
      <ContactInfo />
      <PropertyCards />
      <ContactForm />
    </article>
  );
}
