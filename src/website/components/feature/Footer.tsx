import { Link } from 'react-router-dom';

export default function Footer() {
  const navLinks = [
    { name: 'ROOMS', path: '/#our-rooms' },
    { name: 'GALLERY', path: '/gallery' },
    { name: 'CONTACT US', path: '/contact-us' },
    { name: 'BOOK NOW', path: '/book-now' }
  ];

  return (
    <footer className="bg-emerald-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo and Description */}
          <div className="md:col-span-1">
            <Link
              to="/"
              className="inline-block"
              onClick={() => {
                if (window.location.pathname === '/') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            >
              <img
                src="/logohobbyskydarkmode.png"
                alt="Hobbysky Guest House"
                className="h-20 w-auto mb-4 mix-blend-lighten drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] transition-transform hover:scale-105"
              />
            </Link>
            <Link
              to="/book-now"
              className="inline-flex w-full sm:w-auto items-center justify-center whitespace-nowrap bg-gradient-to-r from-resort-gold-500 to-resort-gold-600 hover:from-resort-gold-600 hover:to-resort-gold-700 text-white px-8 py-3 rounded-md font-semibold transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer text-base"
            >
              BOOK NOW
            </Link>
          </div>

          {/* Property Information */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-resort-gold-400 mb-4">PROPERTY INFORMATION</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-resort-gold-300">Hobbysky Guest House</p>
                <p>DKC, Abuakwa, Kumasi</p>
                <p>Ashanti Region, Ghana</p>
              </div>
              <div className="pt-4">
                <a href="mailto:reservations@hobbysky.com" className="hover:text-resort-gold-400 transition-colors cursor-pointer">
                  reservations@hobbysky.com
                </a>
              </div>
              <div>
                <a href="https://web.whatsapp.com/send?phone=+233240204029" target="_blank" rel="noopener noreferrer" className="hover:text-resort-gold-400 transition-colors cursor-pointer">
                  +233 240 204 029 (WhatsApp)
                </a>
                <span> | </span>
                <a href="tel:+233243512529" className="hover:text-resort-gold-400 transition-colors cursor-pointer">
                  +233 243 512 529
                </a>
              </div>
              <div>
                <a href="tel:+233552515787" className="hover:text-resort-gold-400 transition-colors cursor-pointer">
                  +233 552 515 787
                </a>
              </div>
            </div>
          </div>

          {/* Property Hours */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-resort-gold-400 mb-4">Property Hours</h3>
            <div className="space-y-2 text-sm mb-6">
              <p><strong>Reception Hours:</strong> 24 Hours</p>
              <p><strong>Check-In:</strong> 3:00 PM</p>
              <p><strong>Check-Out:</strong> 12:00 PM</p>
            </div>

            {/* Social Media */}
            <div className="flex justify-center gap-4">
              <a href="#" onClick={(e) => e.preventDefault()} className="w-10 h-10 flex items-center justify-center bg-resort-gold-500/20 hover:bg-resort-gold-500/40 rounded-full transition-all cursor-pointer" aria-label="Facebook">
                <i className="ri-facebook-fill text-xl text-resort-gold-400"></i>
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} className="w-10 h-10 flex items-center justify-center bg-resort-gold-500/20 hover:bg-resort-gold-500/40 rounded-full transition-all cursor-pointer" aria-label="Instagram">
                <i className="ri-instagram-fill text-xl text-resort-gold-400"></i>
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} className="w-10 h-10 flex items-center justify-center bg-resort-gold-500/20 hover:bg-resort-gold-500/40 rounded-full transition-all cursor-pointer" aria-label="Twitter">
                <i className="ri-twitter-fill text-xl text-resort-gold-400"></i>
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} className="w-10 h-10 flex items-center justify-center bg-resort-gold-500/20 hover:bg-resort-gold-500/40 rounded-full transition-all cursor-pointer" aria-label="TikTok">
                <i className="ri-tiktok-fill text-xl text-resort-gold-400"></i>
              </a>
              <a href="https://wa.me/+233240204029" target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-resort-gold-500/20 hover:bg-resort-gold-500/40 rounded-full transition-all cursor-pointer" aria-label="WhatsApp">
                <i className="ri-whatsapp-fill text-xl text-resort-gold-400"></i>
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} className="w-10 h-10 flex items-center justify-center bg-resort-gold-500/20 hover:bg-resort-gold-500/40 rounded-full transition-all cursor-pointer" aria-label="YouTube">
                <i className="ri-youtube-fill text-xl text-resort-gold-400"></i>
              </a>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="border-t border-resort-gold-500/20 pt-8 mb-8">
          <nav className="flex flex-wrap justify-center gap-4 text-sm">
            {navLinks.map((link, index) => (
              <span key={link.path} className="flex items-center">
                <Link
                  to={link.path}
                  className="hover:text-resort-gold-400 transition-colors cursor-pointer"
                >
                  {link.name}
                </Link>
                {index < navLinks.length - 1 && <span className="ml-4 text-white/40">&bull;</span>}
              </span>
            ))}
          </nav>
        </div>

        {/* Copyright */}
        <div className="text-center text-sm text-white/80">
          <p>
            &copy; 2026 All Rights Reserved | Hobbysky Guest House |
            <Link to="/terms-and-conditions" className="hover:text-resort-gold-400 transition-colors cursor-pointer ml-1">Terms &amp; Conditions</Link> |
            <Link to="/privacy" className="hover:text-resort-gold-400 transition-colors cursor-pointer ml-1">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
