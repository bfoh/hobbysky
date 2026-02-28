import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import BookNowHero from './components/BookNowHero';
import BookingSearchWidget from './components/BookingSearchWidget';
import OurRoomsSection from './components/OurRoomsSection';
import PropertyInfoSection from './components/PropertyInfoSection';
import AmenitiesSection from './components/AmenitiesSection';
import AddressContactSection from './components/AddressContactSection';
import PoliciesSection from './components/PoliciesSection';
import TermsSection from './components/TermsSection';
import AvailableRoomsSection, { type AvailableRoom, type SearchParams } from './components/AvailableRoomsSection';
import GuestDetailsForm, { type GuestDetails } from './components/GuestDetailsForm';
import BookingReviewSection from './components/BookingReviewSection';
import BookingSuccessSection from './components/BookingSuccessSection';

type Step = 'search' | 'select-room' | 'guest-details' | 'review' | 'success';

const STEPS = ['Search', 'Select Room', 'Your Details', 'Review'];

export default function BookNowPage() {
  const [searchParamsUrl] = useSearchParams();
  const initCheckIn = searchParamsUrl.get('checkIn') || '';
  const initCheckOut = searchParamsUrl.get('checkOut') || '';
  const hasAutoSearched = useRef(false);

  const [step, setStep] = useState<Step>('search');
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null);
  const [guestDetails, setGuestDetails] = useState<GuestDetails | null>(null);
  const [bookingResult, setBookingResult] = useState<{
    bookingId: string;
    roomNumber: string;
    totalPrice: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const stepIndex = { search: 0, 'select-room': 1, 'guest-details': 2, review: 3, success: 4 }[step];
  const stepContainerRef = useRef<HTMLDivElement>(null);

  const scrollToStepContainer = () => {
    if (stepContainerRef.current) {
      // Small delay to allow react to render the new step before scrolling
      setTimeout(() => {
        stepContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (initCheckIn && initCheckOut && !hasAutoSearched.current) {
      hasAutoSearched.current = true;

      const doAutoSearch = async () => {
        try {
          const guestsStr = searchParamsUrl.get('guests') || '1';
          const guests = parseInt(guestsStr, 10);
          const checkInDate = new Date(initCheckIn);
          const checkOutDate = new Date(initCheckOut);
          const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

          const url = `/.netlify/functions/rooms-availability?checkIn=${initCheckIn}&checkOut=${initCheckOut}&guests=${guests}`;
          const res = await fetch(url);
          const data = await res.json();

          if (res.ok) {
            const roomList = Array.isArray(data) ? data : (data.data || []);
            const rooms: AvailableRoom[] = roomList.map((r: any) => ({
              roomTypeId: r.roomTypeId,
              name: r.name,
              price: r.price,
              availableCount: r.availableCount,
            }));

            const params: SearchParams = { checkIn: initCheckIn, checkOut: initCheckOut, nights, guests };
            handleSearchResults(rooms, params);
          }
        } catch (err) {
          console.error('[BookNowPage] Auto-search failed on mount:', err);
        }
      };

      doAutoSearch();
    }
  }, [initCheckIn, initCheckOut, searchParamsUrl]);

  const handleSearchResults = (rooms: AvailableRoom[], params: SearchParams) => {
    setAvailableRooms(rooms);
    setSearchParams(params);
    setStep('select-room');
    scrollToStepContainer();
  };

  const handleSelectRoom = (room: AvailableRoom) => {
    setSelectedRoom(room);
    setStep('guest-details');
    scrollToStepContainer();
  };

  const handleGuestDetails = (details: GuestDetails) => {
    setGuestDetails(details);
    setStep('review');
    scrollToStepContainer();
  };

  const handleConfirm = async () => {
    if (!selectedRoom || !searchParams || !guestDetails) return;
    setSubmitting(true);
    setSubmitError(null);

    let specialRequests = guestDetails.specialRequests || '';
    if (guestDetails.promoCode) {
      specialRequests = specialRequests
        ? `${specialRequests}\nPromo code entered: ${guestDetails.promoCode}`
        : `Promo code entered: ${guestDetails.promoCode}`;
    }

    try {
      const res = await fetch('/.netlify/functions/create-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn: searchParams.checkIn,
          checkOut: searchParams.checkOut,
          roomTypeId: selectedRoom.roomTypeId,
          guestName: guestDetails.name,
          guestEmail: guestDetails.email,
          guestPhone: guestDetails.phone,
          numGuests: searchParams.guests,
          specialRequests,
          source: 'online',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Unable to complete your booking. Please try again.');
        return;
      }

      setBookingResult({
        bookingId: data.data.bookingId,
        roomNumber: data.data.roomNumber,
        totalPrice: data.data.totalPrice,
      });
      setStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookAnother = () => {
    setStep('search');
    setSearchParams(null);
    setAvailableRooms([]);
    setSelectedRoom(null);
    setGuestDetails(null);
    setBookingResult(null);
    setSubmitError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <article>
      <BookNowHero />

      {/* Step progress indicator (shown on steps 1–4, hidden on success) */}
      {step !== 'success' && (
        <div ref={stepContainerRef} className="bg-white border-b border-gray-100 sticky top-20 z-30 shadow-sm scroll-mt-20">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-center justify-center py-3 gap-0">
              {STEPS.map((label, i) => {
                const isActive = i === stepIndex;
                const isDone = i < stepIndex;
                return (
                  <div key={label} className="flex items-center">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isDone
                          ? 'bg-emerald-500 text-white'
                          : isActive
                            ? 'bg-resort-gold-500 text-white'
                            : 'bg-gray-100 text-gray-400'
                          }`}
                      >
                        {isDone ? <i className="ri-check-line text-sm" /> : i + 1}
                      </div>
                      <span
                        className={`text-xs font-medium hidden sm:block transition-colors ${isActive ? 'text-resort-green-900' : isDone ? 'text-emerald-600' : 'text-gray-400'
                          }`}
                      >
                        {label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`w-8 sm:w-12 h-0.5 mx-2 transition-colors ${i < stepIndex ? 'bg-emerald-400' : 'bg-gray-200'
                          }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step: Search — show full static page */}
      {step === 'search' && (
        <>
          <BookingSearchWidget onResults={handleSearchResults} />
          <OurRoomsSection />
          <PropertyInfoSection />
          <AmenitiesSection />
          <AddressContactSection />
          <PoliciesSection />
          <TermsSection />
        </>
      )}

      {/* Step: Select Room */}
      {step === 'select-room' && searchParams && (
        <AvailableRoomsSection
          rooms={availableRooms}
          searchParams={searchParams}
          onSelect={handleSelectRoom}
          onBack={() => setStep('search')}
        />
      )}

      {/* Step: Guest Details */}
      {step === 'guest-details' && selectedRoom && searchParams && (
        <GuestDetailsForm
          selectedRoom={selectedRoom}
          searchParams={searchParams}
          onBack={() => setStep('select-room')}
          onContinue={handleGuestDetails}
        />
      )}

      {/* Step: Review */}
      {step === 'review' && selectedRoom && searchParams && guestDetails && (
        <BookingReviewSection
          selectedRoom={selectedRoom}
          searchParams={searchParams}
          guestDetails={guestDetails}
          onBack={() => setStep('guest-details')}
          onConfirm={handleConfirm}
          loading={submitting}
          error={submitError}
        />
      )}

      {/* Step: Success */}
      {step === 'success' && bookingResult && searchParams && selectedRoom && guestDetails && (
        <BookingSuccessSection
          bookingResult={bookingResult}
          guestEmail={guestDetails.email}
          roomName={selectedRoom.name}
          checkIn={searchParams.checkIn}
          checkOut={searchParams.checkOut}
          nights={searchParams.nights}
          onBookAnother={handleBookAnother}
        />
      )}
    </article>
  );
}
