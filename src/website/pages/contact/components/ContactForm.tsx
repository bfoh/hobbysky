
import { useState } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    property: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.firstName || !formData.email || !formData.message) {
      setSubmitStatus('error');
      return;
    }
    if (formData.message.length > 500) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const body = new URLSearchParams();
      body.append('firstName', formData.firstName);
      body.append('lastName', formData.lastName);
      body.append('email', formData.email);
      body.append('phone', formData.phone);
      body.append('property', formData.property);
      body.append('subject', formData.subject);
      body.append('message', formData.message);

      const res = await fetch(
        'https://readdy.ai/api/form/d6f25eiohb161tfd9cag',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        },
      );

      if (res.ok) {
        setSubmitStatus('success');
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          property: '',
          subject: '',
          message: '',
        });
      } else {
        setSubmitStatus('error');
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-resort-green-900 mb-4">
          Send Us a Message
        </h2>
        <div className="w-20 h-1 bg-resort-gold-500 mx-auto mb-6"></div>
        <p className="text-center text-resort-green-700 mb-12 text-base">
          Have a question or want to make a reservation? Fill out the form below
          and our team will get back to you shortly.
        </p>

        <form
          id="hobbysky-contact-form"
          data-readdy-form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* Name Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-resort-green-800 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-resort-green-200 rounded-md focus:ring-2 focus:ring-resort-green-500 focus:border-transparent text-sm bg-white transition-all"
                placeholder="Your first name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-resort-green-800 mb-2">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-resort-green-200 rounded-md focus:ring-2 focus:ring-resort-green-500 focus:border-transparent text-sm bg-white transition-all"
                placeholder="Your last name"
              />
            </div>
          </div>

          {/* Email & Phone Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-resort-green-800 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-resort-green-200 rounded-md focus:ring-2 focus:ring-resort-green-500 focus:border-transparent text-sm bg-white transition-all"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-resort-green-800 mb-2">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-resort-green-200 rounded-md focus:ring-2 focus:ring-resort-green-500 focus:border-transparent text-sm bg-white transition-all"
                placeholder="+233 XXX XXX XXX"
              />
            </div>
          </div>

          {/* Property Select */}
          <div>
            <label className="block text-sm font-semibold text-resort-green-800 mb-2">
              Property of Interest
            </label>
            <select
              name="property"
              value={formData.property}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-resort-green-200 rounded-md focus:ring-2 focus:ring-resort-green-500 focus:border-transparent text-sm bg-white transition-all cursor-pointer"
            >
              <option value="">Select an option</option>
              <option value="Standard Room">Standard Room</option>
              <option value="Executive Room">Executive Room</option>
              <option value="Deluxe Room">Deluxe Room</option>
              <option value="General Inquiry">General Inquiry</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold text-resort-green-800 mb-2">
              Subject
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-resort-green-200 rounded-md focus:ring-2 focus:ring-resort-green-500 focus:border-transparent text-sm bg-white transition-all"
              placeholder="What is this regarding?"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-resort-green-800 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              maxLength={500}
              rows={6}
              className="w-full px-4 py-3 border border-resort-green-200 rounded-md focus:ring-2 focus:ring-resort-green-500 focus:border-transparent text-sm bg-white transition-all resize-none"
              placeholder="Tell us how we can help you..."
            ></textarea>
            <p className="text-xs text-resort-green-500 mt-1 text-right">
              {formData.message.length}/500 characters
            </p>
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="whitespace-nowrap bg-gradient-to-r from-resort-gold-500 to-resort-gold-600 hover:from-resort-gold-600 hover:to-resort-gold-700 disabled:opacity-60 text-white px-12 py-3.5 rounded-md font-semibold transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer text-sm"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="ri-loader-4-line animate-spin"></i>
                  SENDING...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <i className="ri-send-plane-fill"></i>
                  SEND MESSAGE
                </span>
              )}
            </button>
          </div>

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div className="bg-resort-green-50 border border-resort-green-200 rounded-md p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-resort-green-700">
                <i className="ri-check-double-line text-xl"></i>
                <p className="font-medium text-sm">
                  Thank you! Your message has been sent successfully. We'll get
                  back to you soon.
                </p>
              </div>
            </div>
          )}
          {submitStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-red-600">
                <i className="ri-error-warning-line text-xl"></i>
                <p className="font-medium text-sm">
                  Something went wrong. Please try again or contact us directly.
                </p>
              </div>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
