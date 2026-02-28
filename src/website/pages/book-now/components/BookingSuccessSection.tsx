import { Link } from 'react-router-dom';

interface Props {
  bookingResult: { bookingId: string; roomNumber: string; totalPrice: number };
  guestEmail: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  onBookAnother: () => void;
}

export default function BookingSuccessSection({
  bookingResult,
  guestEmail,
  roomName,
  checkIn,
  checkOut,
  nights,
  onBookAnother,
}: Props) {
  const ref = `#${bookingResult.bookingId.slice(-8).toUpperCase()}`;

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <section className="py-20 px-4 bg-white min-h-[70vh] flex items-start justify-center">
      <div className="max-w-lg w-full text-center">
        {/* Animated checkmark */}
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-once">
          <i className="ri-checkbox-circle-fill text-4xl text-emerald-500" />
        </div>

        <h1 className="text-3xl font-bold text-resort-green-900 mb-2">Booking Confirmed!</h1>
        <p className="text-gray-500 mb-6">
          Your reservation at Hobbysky Guest House has been successfully placed.
        </p>

        {/* Reference chip */}
        <div className="inline-flex items-center gap-2 bg-resort-green-50 border border-resort-green-200 px-4 py-2 rounded-full mb-8">
          <i className="ri-file-list-3-line text-resort-green-600" />
          <span className="text-sm font-semibold text-resort-green-800">Booking Reference: </span>
          <span className="font-mono font-bold text-resort-green-900">{ref}</span>
        </div>

        {/* Summary card */}
        <div className="bg-resort-green-900 text-white rounded-2xl p-5 text-left mb-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-white/60">Room</span>
            <span className="font-medium">{roomName} · Room {bookingResult.roomNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Check-in</span>
            <span className="font-medium">{fmt(checkIn)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Check-out</span>
            <span className="font-medium">{fmt(checkOut)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Duration</span>
            <span className="font-medium">{nights} night{nights !== 1 ? 's' : ''}</span>
          </div>
          <div className="border-t border-white/10 pt-3 flex justify-between items-center">
            <span className="font-semibold">Total Due at Check-in</span>
            <span className="text-lg font-bold text-resort-gold-400">
              GH₵ {bookingResult.totalPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Email confirmation notice */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 mb-8 flex items-center gap-3">
          <i className="ri-mail-check-line text-sky-500 text-xl shrink-0" />
          <p className="text-sm text-sky-700 text-left">
            A confirmation email with your pre-invoice has been sent to{' '}
            <strong className="font-semibold">{guestEmail}</strong>.
          </p>
        </div>

        {/* What's next */}
        <div className="text-left border border-gray-200 rounded-xl p-4 mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">What happens next</p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <i className="ri-check-line text-emerald-500 mt-0.5 shrink-0" />
              Check-in from <strong className="mx-1">3:00 PM</strong> on your arrival date
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-check-line text-emerald-500 mt-0.5 shrink-0" />
              Present a valid ID at reception upon arrival
            </li>
            <li className="flex items-start gap-2">
              <i className="ri-check-line text-emerald-500 mt-0.5 shrink-0" />
              Full payment due at check-in — Cash, MoMo & Bank Transfer accepted
            </li>
          </ul>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })}
            className="flex-1 inline-flex items-center justify-center gap-2 border border-resort-green-300 text-resort-green-700 hover:bg-resort-green-50 py-3 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
          >
            <i className="ri-home-line" />
            Return to Home
          </Link>
          <button
            onClick={onBookAnother}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-resort-gold-500 hover:bg-resort-gold-600 text-white py-3 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
          >
            <i className="ri-calendar-add-line" />
            Book Another Room
          </button>
        </div>
      </div>
    </section>
  );
}
