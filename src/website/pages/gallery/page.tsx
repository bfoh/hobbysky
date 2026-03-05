
import { SEOHead } from '../../components/SEOHead';
import GalleryHero from './components/GalleryHero';
import GalleryGrid from './components/GalleryGrid';

export default function GalleryPage() {
  return (
    <article>
      <SEOHead
        title="Photo Gallery"
        description="Browse photos of Hobbysky Guest House — rooms, common areas, and the property grounds in Abuakwa-Manhyia, Kumasi, Ghana."
        path="/gallery"
        image="/gallery-bedroom.jpg"
      />
      <GalleryHero />
      <GalleryGrid />
    </article>
  );
}
