
import { useState } from 'react';

const testimonials = [
  {
    rating: 5,
    text: "Wonderful place to be in a lifetime, attention to details is number one, awesome customer relation and service number two, great communication with customers, I had a great time there with my family. You all should go there and experience amazing treatment from them. Come to think of it they have a form that collects guest reviews and they work to get things more better every day. This December that is the place to be!!! \u{1F60A}\u{1F929}\u{1F60D}",
    author: "Kukubor V. (Tripadvisor)"
  },
  {
    rating: 5,
    text: "A beautiful lunch experience for the family. Kids loved the pool, food was great, drinks was awesome (Tangerine Lemonade) and the service was very good. We love the time and would consider doing this again",
    author: "Bernard N. (Google Reviews)"
  },
  {
    rating: 5,
    text: "Went over for breakfast buffet. It was delicious, tasted fresh, the ladies @ the buffet were very helpful and friendly. I remember Jessica and Gladys. And oh I misplaced my new airpods on the compound which I reported and the receptionist was very helpful and later facility manager, Terry helped me search for it for several minutes and later it found for me. Thank you so much for that. I&#39;m coming back!",
    author: "Dede K. (Google Reviews)"
  },
  {
    rating: 5,
    text: "This place is outstanding in every respect. I have no complaints... Well maybe the steep steps but they ARE WORTH IT. The attention to detail is something rarely seen in this country. Simply beautiful. We&#39;ll be back as soon as we can. Staff, room, facilities, food... all amazingly good.",
    author: "Caroline C. (Google Reviews)"
  },
  {
    rating: 5,
    text: "Great customer service! The staff were very attentive. I didn&#39;t particularly like one cocktail and it was changed for free. The manager personally apologised the next day and offered a free meal. The room was very clean and comfortable and the view was AMAZING! I will definitely go back!",
    author: "SueShimmers K. (Google Reviews)"
  },
  {
    rating: 5,
    text: "Every member of the team was friendly, helpful, and went above and beyond to ensure my stay was perfect. Their dedication to guest satisfaction was evident in every interaction, and I felt truly valued as a guest.",
    author: "Ivan O. (Google Reviews)"
  }
];

export default function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-resort-green-800 to-resort-green-900">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center text-resort-gold-400 mb-16">
          What Our Guests Say
        </h2>

        <div className="relative">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 md:p-12 text-center border border-resort-gold-500/20">
            <div className="flex justify-center mb-6">
              {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                <i key={i} className="ri-star-fill text-resort-gold-400 text-2xl"></i>
              ))}
            </div>
            
            <p className="text-white text-lg md:text-xl leading-relaxed mb-8 min-h-[200px] flex items-center justify-center">
              {testimonials[currentIndex].text}
            </p>
            
            <p className="text-resort-gold-300 font-semibold text-lg">
              {testimonials[currentIndex].author}
            </p>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevTestimonial}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 bg-resort-gold-500/20 hover:bg-resort-gold-500/40 text-white p-3 rounded-full transition-all duration-300 cursor-pointer"
            aria-label="Previous testimonial"
          >
            <i className="ri-arrow-left-s-line text-2xl"></i>
          </button>
          
          <button
            onClick={nextTestimonial}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 bg-resort-gold-500/20 hover:bg-resort-gold-500/40 text-white p-3 rounded-full transition-all duration-300 cursor-pointer"
            aria-label="Next testimonial"
          >
            <i className="ri-arrow-right-s-line text-2xl"></i>
          </button>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center gap-2 mt-8">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 cursor-pointer ${
                index === currentIndex ? 'bg-resort-gold-400 w-8' : 'bg-white/40'
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            ></button>
          ))}
        </div>
      </div>
    </section>
  );
}
