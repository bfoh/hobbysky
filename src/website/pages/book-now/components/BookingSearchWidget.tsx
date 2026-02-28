
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AvailableRoom, SearchParams } from './AvailableRoomsSection';

interface Props {
  onResults: (rooms: AvailableRoom[], params: SearchParams) => void;
}

export default function BookingSearchWidget({ onResults }: Props) {
  const [searchParamsUrl] = useSearchParams();
  const initCheckIn = searchParamsUrl.get('checkIn') || '';
  const initCheckOut = searchParamsUrl.get('checkOut') || '';

  const [checkIn, setCheckIn] = useState(initCheckIn);
  const [checkOut, setCheckOut] = useState(initCheckOut);
  const [guests, setGuests] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [showPromo, setShowPromo] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Today's date in YYYY-MM-DD for the min attribute
  const today = new Date().toISOString().split('T')[0];

  const handleSearch = async (overrideCheckIn = checkIn, overrideCheckOut = checkOut) => {
    setError('');

    // Validate
    if (!overrideCheckIn || !overrideCheckOut) {
      setError('Please select both check-in and check-out dates.');
      return;
    }

    const checkInDate = new Date(overrideCheckIn);
    const checkOutDate = new Date(overrideCheckOut);
    const todayDate = new Date(today);

    if (checkInDate < todayDate) {
      setError('Check-in date cannot be in the past.');
      return;
    }
    if (checkOutDate <= checkInDate) {
      setError('Check-out date must be after check-in date.');
      return;
    }

    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    setLoading(true);
    try {
      const url = `/.netlify/functions/rooms-availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        console.error('[BookingSearchWidget] Availability check failed:', data);
        const detailedError = data.details ? `${data.error} (${data.details})` : (data.error || 'Failed to check availability. Please try again.');
        setError(detailedError);
        return;
      }

      const roomList = Array.isArray(data) ? data : (data.data || []);
      const rooms: AvailableRoom[] = roomList.map((r: any) => ({
        roomTypeId: r.roomTypeId,
        name: r.name,
        price: r.price,
        availableCount: r.availableCount,
      }));

      const params: SearchParams = { checkIn: overrideCheckIn, checkOut: overrideCheckOut, nights, guests };
      onResults(rooms, params);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-12 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-6 items-end">

            {/* Check‑in */}
            <div className="lg:col-span-3 w-full">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-calendar-line text-resort-green-700"></i>
                </div>
                <label className="text-sm font-medium text-resort-green-800">Check‑in</label>
              </div>
              <input
                type="date"
                value={checkIn}
                min={today}
                onClick={(e) => {
                  try { (e.target as HTMLInputElement).showPicker(); } catch (err) { }
                }}
                onChange={(e) => { setCheckIn(e.target.value); setError(''); }}
                className="w-full px-4 py-3 border border-[#446554] rounded-lg focus:ring-2 focus:ring-resort-green-500 focus:border-transparent text-gray-800 font-semibold text-sm bg-white cursor-pointer transition-colors hover:border-[#2a4034]"
              />
            </div>

            {/* Check‑out */}
            <div className="lg:col-span-3 w-full">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-calendar-check-line text-resort-green-700"></i>
                </div>
                <label className="text-sm font-medium text-resort-green-800">Check‑out</label>
              </div>
              <input
                type="date"
                value={checkOut}
                min={checkIn || today}
                onClick={(e) => {
                  try { (e.target as HTMLInputElement).showPicker(); } catch (err) { }
                }}
                onChange={(e) => { setCheckOut(e.target.value); setError(''); }}
                className="w-full px-4 py-3 border border-[#446554] rounded-lg focus:ring-2 focus:ring-resort-green-500 focus:border-transparent text-gray-800 font-semibold text-sm bg-white cursor-pointer transition-colors hover:border-[#2a4034]"
              />
            </div>

            {/* Guests */}
            <div className="relative w-full lg:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-team-line text-resort-green-700"></i>
                </div>
                <label className="text-sm font-medium text-resort-green-800">Guests</label>
              </div>
              <button
                onClick={() => setShowGuestDropdown(!showGuestDropdown)}
                className="w-full px-4 py-3 border border-resort-green-200 bg-resort-green-50/50 rounded-xl flex items-center justify-between gap-3 cursor-pointer hover:border-resort-green-400 hover:bg-resort-green-50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-resort-green-800 leading-none tabular-nums">{guests}</span>
                  <span className="text-sm text-resort-green-700 font-medium">Guest{guests > 1 ? 's' : ''}</span>
                </div>
                <i className={`ri-arrow-down-s-line text-resort-green-500 transition-transform ${showGuestDropdown ? 'rotate-180' : ''}`}></i>
              </button>

              {showGuestDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-20 p-5 min-w-[220px]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-resort-green-700 mb-4">Number of Guests</p>
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={() => setGuests(Math.max(1, guests - 1))}
                      className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 hover:border-resort-green-500 hover:bg-resort-green-50 hover:text-resort-green-700 cursor-pointer text-lg font-bold text-gray-500 transition-colors shadow-sm"
                    >
                      −
                    </button>
                    <div className="text-center w-12">
                      <span className="text-3xl font-bold text-resort-green-900 tabular-nums">{guests}</span>
                    </div>
                    <button
                      onClick={() => setGuests(Math.min(10, guests + 1))}
                      className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 hover:border-resort-green-500 hover:bg-resort-green-50 hover:text-resort-green-700 cursor-pointer text-lg font-bold text-gray-500 transition-colors shadow-sm"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => setShowGuestDropdown(false)}
                    className="mt-6 w-full py-2.5 bg-resort-green-700 hover:bg-resort-green-800 text-white text-sm font-semibold rounded-lg cursor-pointer transition-colors shadow-sm"
                  >
                    Confirm Selection
                  </button>
                </div>
              )}
            </div>

            {/* Promo Code */}
            <div className="w-full lg:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-price-tag-3-line text-resort-green-700"></i>
                </div>
                <label className="text-sm font-medium text-resort-green-800">Promo</label>
              </div>
              {!showPromo ? (
                <button
                  onClick={() => setShowPromo(true)}
                  className="w-full px-4 py-3 border border-gray-200 border-dashed rounded-xl text-sm text-gray-500 hover:text-resort-green-700 hover:border-resort-green-400 hover:bg-resort-green-50/30 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <i className="ri-add-line"></i> Add Code
                </button>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter code"
                    className="w-full px-4 py-3 pr-8 border border-resort-green-300 rounded-xl focus:ring-2 focus:ring-resort-green-500 focus:border-transparent text-sm bg-resort-green-50/30"
                    autoFocus
                  />
                  <button
                    onClick={() => { setPromoCode(''); setShowPromo(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 cursor-pointer p-1"
                  >
                    <i className="ri-close-line"></i>
                  </button>
                </div>
              )}
            </div>

            {/* Search Button */}
            <div className="w-full md:col-span-2 lg:col-span-2 mt-4 md:mt-0">
              <button
                onClick={() => handleSearch()}
                disabled={loading}
                className="w-full bg-resort-gold-500 hover:bg-resort-gold-600 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 text-white h-[46px] rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <span className="hidden xl:inline">Check Availability</span>
                    <span className="xl:hidden">Search</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Inline error */}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              <i className="ri-error-warning-line shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
