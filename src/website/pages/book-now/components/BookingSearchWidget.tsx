
import { useState } from 'react';

export default function BookingSearchWidget() {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [promoCode, setPromoCode] = useState('');
  const [showPromo, setShowPromo] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);

  return (
    <section className="py-12 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row items-end gap-4">
            {/* Check‑in */}
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-calendar-line text-resort-green-700"></i>
                </div>
                <label className="text-sm font-medium text-resort-green-800">Check‑in</label>
              </div>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-resort-green-500 focus:border-transparent text-sm cursor-pointer"
              />
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center w-8 h-12">
              <i className="ri-arrow-right-line text-gray-400 text-lg"></i>
            </div>

            {/* Check‑out */}
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-calendar-line text-resort-green-700"></i>
                </div>
                <label className="text-sm font-medium text-resort-green-800">Check‑out</label>
              </div>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-resort-green-500 focus:border-transparent text-sm cursor-pointer"
              />
            </div>

            {/* Guests */}
            <div className="relative flex-shrink-0 w-full md:w-auto">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-user-line text-resort-green-700"></i>
                </div>
                <label className="text-sm font-medium text-resort-green-800">Guests</label>
              </div>
              <button
                onClick={() => setShowGuestDropdown(!showGuestDropdown)}
                className="whitespace-nowrap w-full md:w-auto px-4 py-3 border border-gray-200 rounded-lg text-sm flex items-center gap-2 cursor-pointer hover:border-resort-green-400 transition-colors"
              >
                <span>{guests} Guest{guests > 1 ? 's' : ''}</span>
                <i className="ri-arrow-down-s-line text-gray-400"></i>
              </button>

              {showGuestDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4 min-w-[160px]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-resort-green-800">Guests</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setGuests(Math.max(1, guests - 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:border-resort-green-500 cursor-pointer text-sm"
                      >
                        -
                      </button>
                      <span className="text-sm font-medium w-4 text-center">{guests}</span>
                      <button
                        onClick={() => setGuests(Math.min(10, guests + 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:border-resort-green-500 cursor-pointer text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowGuestDropdown(false)}
                    className="whitespace-nowrap mt-3 w-full text-center text-xs text-resort-green-600 hover:text-resort-green-800 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>

            {/* Promo Code */}
            <div className="relative flex-shrink-0 w-full md:w-auto">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-price-tag-3-line text-resort-green-700"></i>
                </div>
                <label className="text-sm font-medium text-resort-green-800">Promo</label>
              </div>
              {!showPromo ? (
                <button
                  onClick={() => setShowPromo(true)}
                  className="whitespace-nowrap w-full md:w-auto px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-500 hover:border-resort-green-400 transition-colors cursor-pointer"
                >
                  Add Code
                </button>
              ) : (
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter code"
                  className="w-full md:w-32 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-resort-green-500 focus:border-transparent text-sm"
                  autoFocus
                />
              )}
            </div>

            {/* Search Button */}
            <button className="whitespace-nowrap bg-resort-gold-500 hover:bg-resort-gold-600 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer text-sm w-full md:w-auto">
              Search
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
