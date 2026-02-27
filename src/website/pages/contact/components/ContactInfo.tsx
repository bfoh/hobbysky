
export default function ContactInfo() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-resort-green-800 to-resort-green-950 text-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Get In Touch
        </h2>
        <div className="w-20 h-1 bg-resort-gold-500 mx-auto mb-14"></div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* General Inquiries */}
          <div className="text-center">
            <div className="w-16 h-16 flex items-center justify-center bg-resort-gold-500/20 rounded-full mx-auto mb-5">
              <i className="ri-customer-service-2-fill text-3xl text-resort-gold-400"></i>
            </div>
            <h3 className="text-lg font-bold text-resort-gold-400 mb-3">
              General Inquiries
            </h3>
            <div className="space-y-2 text-sm text-white/90">
              <a
                href="mailto:reservations@hobbysky.com"
                className="block hover:text-resort-gold-400 transition-colors cursor-pointer"
              >
                reservations@hobbysky.com
              </a>
              <a
                href="tel:+233240204029"
                className="block hover:text-resort-gold-400 transition-colors cursor-pointer"
              >
                +233 240 204 029
              </a>
              <a
                href="tel:+233243512529"
                className="block hover:text-resort-gold-400 transition-colors cursor-pointer"
              >
                +233 243 512 529
              </a>
              <a
                href="tel:+233552515787"
                className="block hover:text-resort-gold-400 transition-colors cursor-pointer"
              >
                +233 552 515 787
              </a>
            </div>
          </div>

          {/* Reservations */}
          <div className="text-center">
            <div className="w-16 h-16 flex items-center justify-center bg-resort-gold-500/20 rounded-full mx-auto mb-5">
              <i className="ri-calendar-check-fill text-3xl text-resort-gold-400"></i>
            </div>
            <h3 className="text-lg font-bold text-resort-gold-400 mb-3">
              Reservations
            </h3>
            <div className="space-y-2 text-sm text-white/90">
              <a
                href="mailto:reservations@hobbysky.com"
                className="block hover:text-resort-gold-400 transition-colors cursor-pointer"
              >
                reservations@hobbysky.com
              </a>
              <a
                href="https://wa.me/+233240204029"
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:text-resort-gold-400 transition-colors cursor-pointer"
              >
                WhatsApp: +233 240 204 029
              </a>
              <p className="text-white/70">Available 24/7</p>
            </div>
          </div>

          {/* Events & Weddings */}
          <div className="text-center">
            <div className="w-16 h-16 flex items-center justify-center bg-resort-gold-500/20 rounded-full mx-auto mb-5">
              <i className="ri-goblet-fill text-3xl text-resort-gold-400"></i>
            </div>
            <h3 className="text-lg font-bold text-resort-gold-400 mb-3">
              Events &amp; Weddings
            </h3>
            <div className="space-y-2 text-sm text-white/90">
              <a
                href="mailto:reservations@hobbysky.com"
                className="block hover:text-resort-gold-400 transition-colors cursor-pointer"
              >
                reservations@hobbysky.com
              </a>
              <a
                href="tel:+233243512529"
                className="block hover:text-resort-gold-400 transition-colors cursor-pointer"
              >
                +233 243 512 529
              </a>
              <a
                href="tel:+233552515787"
                className="block hover:text-resort-gold-400 transition-colors cursor-pointer"
              >
                +233 552 515 787
              </a>
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="mt-16 text-center">
          <h3 className="text-lg font-bold text-resort-gold-400 mb-5">
            Follow Us
          </h3>
          <div className="flex justify-center gap-4">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="w-12 h-12 flex items-center justify-center bg-resort-gold-500/20 hover:bg-resort-gold-500/40 rounded-full transition-all cursor-pointer"
              aria-label="Facebook"
            >
              <i className="ri-facebook-fill text-xl text-resort-gold-400"></i>
            </a>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="w-12 h-12 flex items-center justify-center bg-resort-gold-500/20 hover:bg-resort-gold-500/40 rounded-full transition-all cursor-pointer"
              aria-label="Instagram"
            >
              <i className="ri-instagram-fill text-xl text-resort-gold-400"></i>
            </a>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="w-12 h-12 flex items-center justify-center bg-resort-gold-500/20 hover:bg-resort-gold-500/40 rounded-full transition-all cursor-pointer"
              aria-label="Twitter"
            >
              <i className="ri-twitter-fill text-xl text-resort-gold-400"></i>
            </a>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="w-12 h-12 flex items-center justify-center bg-resort-gold-500/20 hover:bg-resort-gold-500/40 rounded-full transition-all cursor-pointer"
              aria-label="TikTok"
            >
              <i className="ri-tiktok-fill text-xl text-resort-gold-400"></i>
            </a>
            <a
              href="https://wa.me/+233240204029"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 flex items-center justify-center bg-resort-gold-500/20 hover:bg-resort-gold-500/40 rounded-full transition-all cursor-pointer"
              aria-label="WhatsApp"
            >
              <i className="ri-whatsapp-fill text-xl text-resort-gold-400"></i>
            </a>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="w-12 h-12 flex items-center justify-center bg-resort-gold-500/20 hover:bg-resort-gold-500/40 rounded-full transition-all cursor-pointer"
              aria-label="YouTube"
            >
              <i className="ri-youtube-fill text-xl text-resort-gold-400"></i>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
