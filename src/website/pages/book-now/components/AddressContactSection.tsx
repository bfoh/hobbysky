
export default function AddressContactSection() {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="border-t border-gray-200 pt-10">
          <h3 className="text-xl font-bold text-resort-green-900 mb-6">
            Address and Contact
          </h3>

          <div className="space-y-1 text-sm text-resort-green-800">
            <p>DKC, Abuakwa, Kumasi</p>
            <p>Ashanti Region</p>
            <p>GH</p>
            <p>Hobbysky Guest House</p>
            <p>
              <a
                href="tel:+233240204029"
                className="hover:text-resort-gold-600 transition-colors cursor-pointer"
              >
                +233 240 204 029
              </a>
            </p>
            <p>
              <a
                href="mailto:reservations@hobbysky.com"
                className="text-resort-green-700 underline hover:text-resort-gold-600 transition-colors cursor-pointer"
              >
                reservations@hobbysky.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
