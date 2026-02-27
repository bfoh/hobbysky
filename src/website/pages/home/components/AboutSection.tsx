
export default function AboutSection() {
  return (
    <section className="py-20 px-4 bg-resort-green-50">
      <div className="max-w-6xl mx-auto">
        <div className="prose prose-lg max-w-none text-resort-green-900 leading-relaxed text-center md:text-left">
          <p className="mb-6 text-base md:text-lg">
            Welcome to <strong className="text-resort-green-800">Hobbysky Guest House</strong>, a serene sanctuary in the heart of <strong className="text-resort-green-800">DKC, Abuakwa</strong>, Kumasi. We blend modern comfort with authentic Ghanaian hospitality, offering elegantly appointed rooms, peaceful surroundings, and a dedicated team — the perfect home away from home for leisure and business travelers alike.
          </p>

          <p className="mb-10 text-base md:text-lg">
            Every detail at Hobbysky is crafted with your relaxation in mind. From our warm, personalized service to our inviting accommodations, we invite you to experience the finest hospitality in the Ashanti Region. Discover your perfect getaway with us.
          </p>

          <div className="text-center">
            <a
              href="/book-now"
              className="inline-flex items-center justify-center whitespace-nowrap bg-gradient-to-r from-resort-gold-500 to-resort-gold-600 hover:from-resort-gold-600 hover:to-resort-gold-700 text-white px-10 py-3.5 rounded-md font-semibold transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer text-base"
            >
              BOOK NOW
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
