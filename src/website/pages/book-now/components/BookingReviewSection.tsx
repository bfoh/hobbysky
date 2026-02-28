import type { AvailableRoom, SearchParams } from './AvailableRoomsSection';
import type { GuestDetails } from './GuestDetailsForm';

interface Props {
  selectedRoom: AvailableRoom;
  searchParams: SearchParams;
  guestDetails: GuestDetails;
  onBack: () => void;
  onConfirm: () => void;
  loading: boolean;
  error: string | null;
}

const roomImages: Record<string, string> = {
  standard: '/room-standard.jpg',
  executive: '/room-executive.jpg',
  deluxe: '/room-deluxe.jpg',
};

function getRoomImage(name: string) {
  const key = Object.keys(roomImages).find((k) => name.toLowerCase().includes(k));
  return roomImages[key || 'standard'];
}

export default function BookingReviewSection({
  selectedRoom,
  searchParams,
  guestDetails,
  onBack,
  onConfirm,
  loading,
  error,
}: Props) {
  const { checkIn, checkOut, nights, guests } = searchParams;
  const total = selectedRoom.price * nights;

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <section className="py-14 px-4 bg-white min-h-[60vh]">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-resort-green-700 hover:text-resort-green-900 font-medium mb-8 cursor-pointer transition-colors"
        >
          <i className="ri-arrow-left-line" />
          Edit Details
        </button>

        <h2 className="text-2xl font-bold text-resort-green-900 mb-1">Review Your Booking</h2>
        <p className="text-gray-500 text-sm mb-8">Please confirm everything looks correct before submitting.</p>

        {/* Room card */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden mb-6">
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-48 h-40 sm:h-auto shrink-0 overflow-hidden">
              <img
                src={getRoomImage(selectedRoom.name)}
                alt={selectedRoom.name}
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="p-5 flex-1">
              <p className="text-xs uppercase tracking-widest text-resort-gold-600 font-semibold mb-1">Selected Room</p>
              <h3 className="text-xl font-bold text-resort-green-900 mb-1">{selectedRoom.name}</h3>
              <p className="text-sm text-gray-500">
                GH₵ {selectedRoom.price.toLocaleString()} / night
              </p>
            </div>
          </div>
        </div>

        {/* Booking details */}
        <div className="bg-resort-green-50 border border-resort-green-100 rounded-2xl p-5 mb-6">
          <h4 className="text-sm font-bold text-resort-green-800 uppercase tracking-wider mb-4">Booking Details</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-resort-green-600 text-xs mb-0.5">Check-in</p>
              <p className="font-semibold text-resort-green-900">{fmt(checkIn)}</p>
              <p className="text-xs text-gray-400">From 3:00 PM</p>
            </div>
            <div>
              <p className="text-resort-green-600 text-xs mb-0.5">Check-out</p>
              <p className="font-semibold text-resort-green-900">{fmt(checkOut)}</p>
              <p className="text-xs text-gray-400">By 12:00 PM</p>
            </div>
            <div>
              <p className="text-resort-green-600 text-xs mb-0.5">Duration</p>
              <p className="font-semibold text-resort-green-900">{nights} night{nights !== 1 ? 's' : ''}</p>
              <p className="text-xs text-gray-400">{guests} guest{guests !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="border-t border-resort-green-200 mt-4 pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>GH₵ {selectedRoom.price.toLocaleString()} × {nights} night{nights !== 1 ? 's' : ''}</span>
              <span>GH₵ {total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-resort-green-900 text-base pt-1.5 border-t border-resort-green-200">
              <span>Total</span>
              <span className="text-resort-gold-600">GH₵ {total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Guest details */}
        <div className="border border-gray-200 rounded-2xl p-5 mb-6">
          <h4 className="text-sm font-bold text-resort-green-800 uppercase tracking-wider mb-4">Guest Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <span className="text-gray-400 w-28 shrink-0">Full Name</span>
              <span className="font-medium text-gray-800">{guestDetails.name}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-400 w-28 shrink-0">Email</span>
              <span className="font-medium text-gray-800">{guestDetails.email}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-400 w-28 shrink-0">Phone</span>
              <span className="font-medium text-gray-800">{guestDetails.phone}</span>
            </div>
            {guestDetails.specialRequests && (
              <div className="flex gap-3">
                <span className="text-gray-400 w-28 shrink-0 mt-0.5">Requests</span>
                <span className="font-medium text-gray-800">{guestDetails.specialRequests}</span>
              </div>
            )}
            {guestDetails.promoCode && (
              <div className="flex gap-3">
                <span className="text-gray-400 w-28 shrink-0">Promo Code</span>
                <span className="font-medium text-gray-800 font-mono">{guestDetails.promoCode}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <i className="ri-information-line text-amber-600 text-lg mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-0.5">Payment Due at Check-in</p>
            <p className="text-xs text-amber-700">
              Full payment of <strong>GH₵ {total.toLocaleString()}</strong> is required upon arrival.
              We accept Cash, Mobile Money (MoMo), and Bank Transfer.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-start gap-3">
            <i className="ri-error-warning-line text-red-500 text-lg mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={onConfirm}
          disabled={loading}
          className="w-full bg-resort-gold-500 hover:bg-resort-gold-600 disabled:opacity-60 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-base transition-colors cursor-pointer flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Confirming your booking...
            </>
          ) : (
            <>
              <i className="ri-check-line text-lg" />
              Confirm Booking
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          By confirming, you agree to our{' '}
          <span className="underline cursor-pointer">cancellation policy</span>.
          You will receive a confirmation email with your pre-invoice.
        </p>
      </div>
    </section>
  );
}
