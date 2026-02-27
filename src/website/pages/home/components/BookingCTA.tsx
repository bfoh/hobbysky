
export default function BookingCTA() {
  return (
    <section
      className="relative py-32 px-4 bg-cover bg-center"
      style={{
        backgroundImage: 'url(/room-deluxe.jpg)'
      }}
    >
      <div className="absolute inset-0 bg-resort-green-950/60"></div>
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <h2 className="text-resort-gold-400 text-4xl md:text-5xl font-bold mb-8">
          Book Your Next Stay Today
        </h2>
        <a
          href="/book-now"
          className="inline-flex w-full sm:w-auto items-center justify-center whitespace-nowrap bg-gradient-to-r from-resort-gold-500 to-resort-gold-600 hover:from-resort-gold-600 hover:to-resort-gold-700 text-white px-10 py-4 rounded-md font-semibold transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer text-lg mx-auto"
        >
          BOOK NOW
        </a>
      </div>
    </section>
  );
}
