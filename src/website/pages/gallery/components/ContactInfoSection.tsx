export default function ContactInfoSection() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-resort-green-800 to-resort-green-950">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Call Us */}
          <div className="border border-resort-gold-500/30 rounded-lg p-8 text-center hover:border-resort-gold-500/60 transition-all">
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <i className="ri-phone-line text-5xl text-resort-gold-400"></i>
            </div>
            <h3 className="text-xl font-bold text-resort-gold-400 mb-6">Call Us</h3>
            <div className="space-y-3 text-white/90">
              <a
                href="tel:+233240204029"
                className="block hover:text-resort-gold-400 transition-colors cursor-pointer"
              >
                +233 240 204 029
              </a>
              <p className="text-sm text-white/70">(WhatsApp)</p>
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

          {/* Hours */}
          <div className="border border-resort-gold-500/30 rounded-lg p-8 text-center hover:border-resort-gold-500/60 transition-all">
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <i className="ri-time-line text-5xl text-resort-gold-400"></i>
            </div>
            <h3 className="text-xl font-bold text-resort-gold-400 mb-6">Hours</h3>
            <div className="space-y-3 text-white/90">
              <p className="font-medium">Reception Hours: 24 Hrs</p>
              <p className="text-sm">Check-In: 3:00 PM</p>
              <p className="text-sm">Check-Out: 12:00 PM</p>
            </div>
          </div>

          {/* Email Us */}
          <div className="border border-resort-gold-500/30 rounded-lg p-8 text-center hover:border-resort-gold-500/60 transition-all">
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <i className="ri-mail-line text-5xl text-resort-gold-400"></i>
            </div>
            <h3 className="text-xl font-bold text-resort-gold-400 mb-6">Email Us</h3>
            <div className="space-y-3 text-white/90">
              <p className="text-sm">For general inquiries &amp; questions,</p>
              <p className="text-sm">contact us via email.</p>
              <a
                href="mailto:reservations@hobbysky.com"
                className="block hover:text-resort-gold-400 transition-colors cursor-pointer break-all"
              >
                reservations@hobbysky.com
              </a>
            </div>
          </div>

          {/* Visit Us */}
          <div className="border border-resort-gold-500/30 rounded-lg p-8 text-center hover:border-resort-gold-500/60 transition-all">
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6">
              <i className="ri-map-pin-line text-5xl text-resort-gold-400"></i>
            </div>
            <h3 className="text-xl font-bold text-resort-gold-400 mb-6">Visit Us</h3>
            <div className="space-y-3 text-white/90">
              <p className="font-medium">Hobbysky Guest House</p>
              <p className="text-sm">DKC, Abuakwa</p>
              <p className="text-sm">Kumasi,</p>
              <p className="text-sm">Ashanti Region,</p>
              <p className="text-sm">Ghana</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
