import { useState } from 'react';
import type { AvailableRoom, SearchParams } from './AvailableRoomsSection';

export interface GuestDetails {
  name: string;
  email: string;
  phone: string;
  specialRequests: string;
  promoCode: string;
}

interface Props {
  selectedRoom: AvailableRoom;
  searchParams: SearchParams;
  onBack: () => void;
  onContinue: (details: GuestDetails) => void;
}

export default function GuestDetailsForm({ selectedRoom, searchParams, onBack, onContinue }: Props) {
  const { checkIn, checkOut, nights, guests } = searchParams;

  const [form, setForm] = useState<GuestDetails>({
    name: '',
    email: '',
    phone: '',
    specialRequests: '',
    promoCode: '',
  });
  const [errors, setErrors] = useState<Partial<GuestDetails>>({});
  const [showPromo, setShowPromo] = useState(false);

  const total = selectedRoom.price * nights;

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const validate = () => {
    const errs: Partial<GuestDetails> = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onContinue(form);
  };

  const field = (key: keyof GuestDetails, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  return (
    <section className="py-14 px-4 bg-white min-h-[60vh]">
      <div className="max-w-5xl mx-auto">
        {/* Back link */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-resort-green-700 hover:text-resort-green-900 font-medium mb-8 cursor-pointer transition-colors"
        >
          <i className="ri-arrow-left-line" />
          Back to Rooms
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-resort-green-900 mb-1">Your Details</h2>
            <p className="text-gray-500 text-sm mb-8">Please enter your details to complete the booking.</p>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-resort-green-800 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => field('name', e.target.value)}
                  placeholder="e.g. Kwame Mensah"
                  className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-resort-green-500 transition-colors ${
                    errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-resort-green-800 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => field('email', e.target.value)}
                  placeholder="you@example.com"
                  className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-resort-green-500 transition-colors ${
                    errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-resort-green-800 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => field('phone', e.target.value)}
                  placeholder="+233 XX XXX XXXX"
                  className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-resort-green-500 transition-colors ${
                    errors.phone ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>

              {/* Special Requests */}
              <div>
                <label className="block text-sm font-semibold text-resort-green-800 mb-1.5">
                  Special Requests <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.specialRequests}
                  onChange={(e) => field('specialRequests', e.target.value)}
                  placeholder="Early check-in, dietary requirements, accessibility needs..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-resort-green-500 resize-none"
                />
              </div>

              {/* Promo Code */}
              <div>
                {!showPromo ? (
                  <button
                    type="button"
                    onClick={() => setShowPromo(true)}
                    className="text-sm text-resort-green-600 hover:text-resort-green-800 underline underline-offset-2 cursor-pointer transition-colors"
                  >
                    + Add promo code
                  </button>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-resort-green-800 mb-1.5">
                      Promo Code <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.promoCode}
                      onChange={(e) => field('promoCode', e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      autoFocus
                      className="w-full md:w-48 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-resort-green-500 uppercase tracking-wider"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-resort-gold-500 hover:bg-resort-gold-600 text-white py-3 rounded-lg font-semibold text-sm transition-colors cursor-pointer mt-2"
              >
                Continue to Review
              </button>
            </form>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-resort-green-900 text-white rounded-2xl overflow-hidden sticky top-28">
              <div className="p-5 border-b border-white/10">
                <p className="text-xs uppercase tracking-widest text-resort-gold-400 font-semibold mb-1">Your Selection</p>
                <h3 className="text-lg font-bold">{selectedRoom.name}</h3>
              </div>
              <div className="p-5 space-y-3 text-sm">
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
                <div className="flex justify-between">
                  <span className="text-white/60">Guests</span>
                  <span className="font-medium">{guests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Price / night</span>
                  <span className="font-medium">GH₵ {selectedRoom.price.toLocaleString()}</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-resort-gold-400">GH₵ {total.toLocaleString()}</span>
                </div>
              </div>
              <div className="px-5 pb-5">
                <p className="text-[11px] text-white/50 text-center">
                  Payment due at check-in · Cash, MoMo & Bank Transfer accepted
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
