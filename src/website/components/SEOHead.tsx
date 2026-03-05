import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
}

export function SEOHead({
  title,
  description,
  path = '',
  image = '/hotelview-enhanced.png',
}: SEOHeadProps) {
  const url = `https://hobbyskyguesthouse.com${path}`;
  const fullTitle = `${title} | Hobbysky Guest House`;
  const absoluteImage = `https://hobbyskyguesthouse.com${image}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={absoluteImage} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
    </Helmet>
  );
}
