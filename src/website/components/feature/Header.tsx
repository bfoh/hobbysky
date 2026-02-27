import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'ROOMS', path: '/#our-rooms' },
    { name: 'GALLERY', path: '/gallery' },
    { name: 'CONTACT US', path: '/contact-us' }
  ];

  const isSolidPage = !['/', '/gallery', '/contact-us'].includes(location.pathname);
  const isHeaderSolid = isScrolled || isSolidPage;

  return (
    <>
      {/* Desktop Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isHeaderSolid ? 'bg-resort-green-900 shadow-md border-b border-resort-green-800' : 'bg-transparent'
          }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center"
              onClick={() => {
                if (location.pathname === '/') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            >
              <img
                src="/logohobbyskydarkmode.png"
                alt="Hobbysky Guest House"
                className="h-16 md:h-20 w-auto mix-blend-lighten drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] transition-transform hover:scale-105"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6 flex-1 justify-center">
              {navLinks.map((link) => (
                link.path.startsWith('/#') ? (
                  <a
                    key={link.path}
                    href={location.pathname === '/' ? link.path.substring(1) : `/${link.path}`}
                    onClick={(e) => {
                      if (location.pathname === '/') {
                        e.preventDefault();
                        const element = document.getElementById(link.path.replace('/#', ''));
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth' });
                        }
                      }
                    }}
                    className={`text-sm font-medium transition-colors duration-300 whitespace-nowrap cursor-pointer ${location.pathname === link.path
                      ? 'text-resort-gold-400'
                      : 'text-gray-100 hover:text-resort-gold-400'
                      }`}
                  >
                    {link.name}
                  </a>
                ) : (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`text-sm font-medium transition-colors duration-300 whitespace-nowrap cursor-pointer ${location.pathname === link.path
                      ? 'text-resort-gold-400'
                      : 'text-gray-100 hover:text-resort-gold-400'
                      }`}
                  >
                    {link.name}
                  </Link>
                )
              ))}
            </nav>

            {/* Book Now Button */}
            <Link
              to="/book-now"
              className="hidden lg:inline-flex items-center justify-center whitespace-nowrap bg-gradient-to-r from-resort-gold-500 to-resort-gold-600 hover:from-resort-gold-600 hover:to-resort-gold-700 text-white px-6 py-2.5 rounded-md font-semibold transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer text-sm"
            >
              BOOK NOW
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 cursor-pointer"
              aria-label="Toggle menu"
            >
              <div className="space-y-1.5">
                <span className="block w-6 h-0.5 transition-colors bg-white"></span>
                <span className="block w-6 h-0.5 transition-colors bg-white"></span>
                <span className="block w-6 h-0.5 transition-colors bg-white"></span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 bg-resort-green-900 z-40 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full border-l border-resort-green-800 shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-resort-green-800">
            <Link
              to="/"
              className="flex items-center"
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (location.pathname === '/') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            >
              <img
                src="/logohobbyskydarkmode.png"
                alt="Hobbysky Guest House"
                className="h-14 w-auto mix-blend-lighten drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"
              />
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 cursor-pointer"
              aria-label="Close menu"
            >
              <i className="ri-close-line text-2xl text-white hover:text-resort-gold-400 transition-colors"></i>
            </button>
          </div>
          <div className="flex flex-col gap-4 p-4">
            {navLinks.map((link) => (
              link.path.startsWith('/#') ? (
                <a
                  key={link.path}
                  href={location.pathname === '/' ? link.path.substring(1) : `/${link.path}`}
                  onClick={(e) => {
                    setIsMobileMenuOpen(false);
                    if (location.pathname === '/') {
                      e.preventDefault();
                      const element = document.getElementById(link.path.replace('/#', ''));
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                      }
                    }
                  }}
                  className={`text-base font-medium py-2 transition-colors cursor-pointer ${location.pathname === link.path
                    ? 'text-resort-gold-400'
                    : 'text-gray-100 hover:text-resort-gold-400'
                    }`}
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-base font-medium py-2 transition-colors cursor-pointer ${location.pathname === link.path
                    ? 'text-resort-gold-400'
                    : 'text-gray-100 hover:text-resort-gold-400'
                    }`}
                >
                  {link.name}
                </Link>
              )
            ))}
            <Link
              to="/book-now"
              onClick={() => setIsMobileMenuOpen(false)}
              className="inline-flex items-center justify-center w-full whitespace-nowrap bg-gradient-to-r from-resort-gold-500 to-resort-gold-600 hover:from-resort-gold-600 hover:to-resort-gold-700 text-white px-6 py-3 rounded-md font-semibold transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer text-base mt-4"
            >
              BOOK NOW
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
