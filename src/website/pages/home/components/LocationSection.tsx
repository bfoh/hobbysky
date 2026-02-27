
export default function LocationSection() {
  return (
    <section className="py-20 px-4 bg-resort-green-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center text-resort-green-900 mb-6">
          OUR LOCATION
        </h2>
        <div className="w-20 h-1 bg-resort-gold-500 mx-auto mb-6"></div>
        <p className="text-center text-resort-green-800 text-lg mb-12 max-w-3xl mx-auto">
          A world away from the bustling streets of Ghana&#39;s urban cities, Hobbysky Guest House effortlessly blends into the tranquility of nature.
        </p>

        {/* Google Map */}
        <div className="rounded-lg overflow-hidden shadow-2xl border-2 border-resort-gold-300/30">
          <iframe
            src="https://maps.google.com/maps?q=Hobbysky%20Guest%20House,%20Kumasi&t=&z=15&ie=UTF8&iwloc=&output=embed"
            width="100%"
            height="550"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Hobbysky Guest House Location"
          ></iframe>
        </div>
      </div>
    </section>
  );
}
