
import { useState } from 'react';

export default function TermsSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="py-12 pb-20 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="border-t border-gray-200 pt-10">
          <h3 className="text-xl font-bold text-resort-green-900 mb-6">
            Terms and Conditions
          </h3>

          <div
            className={`text-sm text-resort-green-800 leading-relaxed space-y-6 ${!expanded ? 'max-h-[320px] overflow-hidden relative' : ''
              }`}
          >
            {/* Room Policy */}
            <div>
              <h4 className="text-lg font-bold text-resort-green-900 underline mb-3">
                <a href="#room-policy" className="cursor-pointer">
                  Room Policy
                </a>
              </h4>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  We want you to thoroughly enjoy every moment of your stay! However, should any damage occur to hotel property or if room items go missing, we abide by a strict replacement policy, and any resulting costs will be billed to your account at current market rates.
                </li>
                <li>
                  Feel free to socialize and make merry during the day. To ensure a peaceful environment for all guests, a mandatory quiet time is observed across the entire property between 11:00 p.m. and 7:00 a.m.
                </li>
                <li>
                  Room cleaning is provided strictly upon request. If you require fresh linens or extra towels, kindly reach out to our front desk team.
                </li>
              </ul>
            </div>

            {/* Guest Safety Policy */}
            <div>
              <h4 className="text-lg font-bold text-resort-green-900 underline mb-3">
                <a href="#guest-safety" className="cursor-pointer">
                  Guest Safety Policy
                </a>
              </h4>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  For your security and privacy, our staff will never share your room number, presence, or personal details with third parties, including handling messages or forwarding calls. Guests must proactively inform their expected visitors of their room details.
                </li>
                <li>
                  For overall security, CCTV cameras actively monitor the property. Please be advised that Hobbysky Guest House is not liable for personal injuries sustained while utilizing our amenities, such as the swimming pools. Guests engaging in recreational activities do so entirely at their own risk.
                </li>
                <li>The hotel bears no liability for any valuables or belongings left unattended inside your parked vehicles.</li>
              </ul>
            </div>

            {/* Cancellation Policy */}
            <div>
              <h4 className="text-lg font-bold text-resort-green-900 underline mb-3">
                <a href="#cancellation" className="cursor-pointer">
                  Cancellation Policy
                </a>
              </h4>
              <p className="mb-2">
                Kindly review our cancellation terms below. To prevent any misunderstandings, our staff firmly adheres to these guidelines, and exceptions are rarely granted:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Cancellations made at least 14 days prior to your scheduled arrival will receive a full refund.
                </li>
                <li>For cancellations made within 14 days of the arrival date, the booking fee is strictly non-refundable.</li>
                <li>
                  Failure to arrive (no-show) will result in a 100% charge of the total reservation cost with no refund.
                </li>
                <li>
                  Full payment is processed immediately upon booking confirmation, entirely subject to these cancellation terms.
                </li>
              </ul>
            </div>

            {/* Check-in / Check-out / Business Hours */}
            <div>
              <h4 className="text-lg font-bold text-resort-green-900 underline mb-3">
                <a href="#checkin-checkout" className="cursor-pointer">
                  Check-in / Check-out / Business Hours
                </a>
              </h4>
              <ul className="list-disc pl-5 space-y-2">
                <li>Standard check-in begins at 3:00 PM local time.</li>
                <li>
                  Check-in procedures will only be completed once your full payment has been successfully processed and verified.
                </li>
                <li>
                  Upon arrival, our reception team is happy to guide you on available amenities, spa treatments, local attractions, and nightlife. Feel free to ask anytime to maximize your experience!
                </li>
                <li>
                  Check-out is firmly set at 12:00 PM (Noon). While late check-outs can be requested, they are entirely subject to room availability and our current occupancy levels.
                </li>
                <li>Please remember to return your room key card to the front desk when departing.</li>
                <li>
                  A comprehensive room inspection occurs post check-out. We reserve the right to bill you for any discovered property damage before the next guest arrives.
                </li>
                <li>
                  All provided towels and bed linens belong to the guest house and must remain in the room upon your departure.
                </li>
              </ul>
            </div>

            {/* Smoking Policy */}
            <div>
              <h4 className="text-lg font-bold text-resort-green-900 underline mb-3">
                <a href="#smoking" className="cursor-pointer">
                  Smoking Policy
                </a>
              </h4>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  All our rooms are strictly non-smoking zones. This prohibition covers all traditional smoking methods and electronic alternatives, including vapes, e-cigarettes, hookah pens, and similar devices. Evidence of smoking or lingering smoke odors will incur an automatic GH₵ 50 room recovery and deep-cleaning fee.
                </li>
              </ul>
            </div>

            {/* Gradient overlay when collapsed */}
            {!expanded && (
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={() => setExpanded(!expanded)}
              className="whitespace-nowrap inline-flex items-center gap-2 text-sm font-medium text-resort-green-800 border border-resort-green-300 rounded-full px-5 py-2 hover:bg-resort-green-50 transition-colors cursor-pointer"
            >
              {expanded ? 'Show Less' : 'Read More'}
              <i className={`ri-arrow-${expanded ? 'up' : 'right'}-s-line text-base`}></i>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
