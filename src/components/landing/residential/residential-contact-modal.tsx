'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';

export function ResidentialContactModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [planType, setPlanType] = useState('General');
  const [submitting, setSubmitting] = useState(false);

  const close = useCallback(() => {
    setIsOpen(false);
    document.body.style.overflow = 'auto';
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setPlanType(detail?.planType || 'General');
      setIsOpen(true);
      document.body.style.overflow = 'hidden';
    };

    window.addEventListener('openContactForm', handler);
    return () => window.removeEventListener('openContactForm', handler);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [close]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Simulate form submission - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert(
        "Message sent successfully! We'll get back to you within 24 hours.",
      );
      close();
    } catch {
      alert(
        'Failed to send message. Please try again or email us directly at mflsupport@mpowero.com',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const description =
    planType === 'Enterprise'
      ? "Interested in our Enterprise plan for communities? Let's discuss your needs."
      : "Get in touch with our team. We'll respond within 24 hours.";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[rgba(0,0,0,0.5)] backdrop-blur-[4px]"
        onClick={close}
      />

      {/* Content */}
      <div className="relative bg-white rounded-lg w-full max-w-[500px] max-h-[90vh] overflow-y-auto shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)] max-[640px]:mx-4 max-[640px]:max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e5e7eb]">
          <h3 className="m-0 text-[1.25rem] font-semibold text-[#1A2B4A]">
            Contact MFL Support
          </h3>
          <button
            onClick={close}
            className="bg-none border-none text-2xl cursor-pointer text-[#6b7280] p-1 rounded transition-colors duration-200 hover:bg-[#f3f4f6]"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="mb-6 text-[#6b7280] text-[0.875rem]">{description}</p>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block mb-2 font-medium text-[#1A2B4A] text-[0.875rem]">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-3 py-3 border border-[#d1d5db] rounded text-[0.875rem] transition-colors duration-200 font-['DM_Sans',sans-serif] focus:outline-none focus:border-[#0F6E56] focus:shadow-[0_0_0_1px_#0F6E56]"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2 font-medium text-[#1A2B4A] text-[0.875rem]">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-3 py-3 border border-[#d1d5db] rounded text-[0.875rem] transition-colors duration-200 font-['DM_Sans',sans-serif] focus:outline-none focus:border-[#0F6E56] focus:shadow-[0_0_0_1px_#0F6E56]"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2 font-medium text-[#1A2B4A] text-[0.875rem]">
                Community/Society Name
              </label>
              <input
                type="text"
                name="company"
                placeholder="Your community/society name"
                className="w-full px-3 py-3 border border-[#d1d5db] rounded text-[0.875rem] transition-colors duration-200 font-['DM_Sans',sans-serif] focus:outline-none focus:border-[#0F6E56] focus:shadow-[0_0_0_1px_#0F6E56]"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2 font-medium text-[#1A2B4A] text-[0.875rem]">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                placeholder="+91 98765 43210"
                className="w-full px-3 py-3 border border-[#d1d5db] rounded text-[0.875rem] transition-colors duration-200 font-['DM_Sans',sans-serif] focus:outline-none focus:border-[#0F6E56] focus:shadow-[0_0_0_1px_#0F6E56]"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2 font-medium text-[#1A2B4A] text-[0.875rem]">
                Plan Interest
              </label>
              <select
                name="planInterest"
                defaultValue={planType}
                className="w-full px-3 py-3 border border-[#d1d5db] rounded text-[0.875rem] transition-colors duration-200 font-['DM_Sans',sans-serif] focus:outline-none focus:border-[#0F6E56] focus:shadow-[0_0_0_1px_#0F6E56]"
              >
                <option value="General">General Inquiry</option>
                <option value="Starter">Starter Plan (Up to 40 people)</option>
                <option value="Growth">Growth Plan (40-150 people)</option>
                <option value="Enterprise">
                  Enterprise Plan (150+ people)
                </option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block mb-2 font-medium text-[#1A2B4A] text-[0.875rem]">
                Message *
              </label>
              <textarea
                name="message"
                rows={4}
                required
                placeholder="Tell us about your community size, goals, and any specific requirements..."
                className="w-full px-3 py-3 border border-[#d1d5db] rounded text-[0.875rem] transition-colors duration-200 font-['DM_Sans',sans-serif] resize-y min-h-[100px] focus:outline-none focus:border-[#0F6E56] focus:shadow-[0_0_0_1px_#0F6E56]"
              />
            </div>
            <div className="flex gap-3 mt-6 max-[640px]:flex-col">
              <button
                type="button"
                onClick={close}
                className="flex-1 px-4 py-3 rounded font-semibold text-[0.875rem] cursor-pointer transition-all duration-200 font-['DM_Sans',sans-serif] bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-3 rounded font-semibold text-[0.875rem] cursor-pointer transition-all duration-200 font-['DM_Sans',sans-serif] bg-[#0F6E56] border border-[#0F6E56] text-white hover:bg-[#0d5a47] hover:border-[#0d5a47] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
          <div className="mt-6 pt-4 border-t border-[#e5e7eb] text-center">
            <p className="m-0 text-[0.875rem] text-[#6b7280]">
              Or email us directly at{' '}
              <a
                href="mailto:mflsupport@mpowero.com"
                className="text-[#0F6E56] no-underline font-medium hover:underline"
              >
                mflsupport@mpowero.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
