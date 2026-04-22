'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';

export function CorporateContactModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [planType, setPlanType] = useState('General');
  const [pageType, setPageType] = useState('Corporate');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openForm = useCallback((plan = 'General', page = 'Corporate') => {
    setPlanType(plan);
    setPageType(page);
    setIsOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeForm = useCallback(() => {
    setIsOpen(false);
    document.body.style.overflow = 'auto';
  }, []);

  // Expose openContactForm globally for button onclick handlers
  useEffect(() => {
    (window as any).openContactForm = openForm;
    return () => {
      delete (window as any).openContactForm;
    };
  }, [openForm]);

  // Close with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeForm();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeForm]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Simulate form submission
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert(
        "Message sent successfully! We'll get back to you within 24 hours.",
      );
      closeForm();
    } catch {
      alert(
        'Failed to send message. Please try again or email us directly at mflsupport@mpowero.com',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const description =
    planType === 'Enterprise'
      ? `Interested in our Enterprise plan for ${pageType.toLowerCase()}? Let's discuss your needs.`
      : "Get in touch with our team. We'll respond within 24 hours.";

  const companyLabel =
    pageType === 'Communities' ? 'Community/Society Name' : 'Company Name';
  const companyPlaceholder =
    pageType === 'Communities'
      ? 'Your community/society name'
      : 'Your company name';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[rgba(0,0,0,0.5)] backdrop-blur-[4px]"
        onClick={closeForm}
      />
      {/* Modal content */}
      <div className="relative bg-white rounded-lg w-full max-w-[500px] max-h-[90vh] overflow-y-auto shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)] max-sm:mx-4 max-sm:max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e5e7eb]">
          <h3 className="m-0 text-[1.25rem] font-semibold text-[#1A2B4A]">
            Contact MFL Support
          </h3>
          <button
            onClick={closeForm}
            className="bg-transparent border-none text-[1.5rem] cursor-pointer text-[#6b7280] p-1 rounded transition-colors duration-200 hover:bg-[#f3f4f6]"
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
                className="w-full p-3 border border-[#d1d5db] rounded text-[0.875rem] transition-colors duration-200 corp-font-sans focus:outline-none focus:border-[#F26522] focus:shadow-[0_0_0_1px_#F26522]"
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
                className="w-full p-3 border border-[#d1d5db] rounded text-[0.875rem] transition-colors duration-200 corp-font-sans focus:outline-none focus:border-[#F26522] focus:shadow-[0_0_0_1px_#F26522]"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2 font-medium text-[#1A2B4A] text-[0.875rem]">
                {companyLabel}
              </label>
              <input
                type="text"
                name="company"
                placeholder={companyPlaceholder}
                className="w-full p-3 border border-[#d1d5db] rounded text-[0.875rem] transition-colors duration-200 corp-font-sans focus:outline-none focus:border-[#F26522] focus:shadow-[0_0_0_1px_#F26522]"
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
                className="w-full p-3 border border-[#d1d5db] rounded text-[0.875rem] transition-colors duration-200 corp-font-sans focus:outline-none focus:border-[#F26522] focus:shadow-[0_0_0_1px_#F26522]"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2 font-medium text-[#1A2B4A] text-[0.875rem]">
                Plan Interest
              </label>
              <select
                name="planInterest"
                defaultValue={planType}
                className="w-full p-3 border border-[#d1d5db] rounded text-[0.875rem] transition-colors duration-200 corp-font-sans focus:outline-none focus:border-[#F26522] focus:shadow-[0_0_0_1px_#F26522]"
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
                placeholder="Tell us about your organization size, goals, and any specific requirements..."
                className="w-full p-3 border border-[#d1d5db] rounded text-[0.875rem] transition-colors duration-200 corp-font-sans resize-y min-h-[100px] focus:outline-none focus:border-[#F26522] focus:shadow-[0_0_0_1px_#F26522]"
              />
            </div>
            <div className="flex gap-3 mt-6 max-sm:flex-col">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 py-3 px-4 rounded font-semibold text-[0.875rem] cursor-pointer transition-all duration-200 corp-font-sans bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded font-semibold text-[0.875rem] cursor-pointer transition-all duration-200 corp-font-sans bg-[#F26522] border border-[#F26522] text-white hover:bg-[#C94E0E] hover:border-[#C94E0E] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
          <div className="mt-6 pt-4 border-t border-[#e5e7eb] text-center">
            <p className="m-0 text-[0.875rem] text-[#6b7280]">
              Or email us directly at{' '}
              <a
                href="mailto:mflsupport@mpowero.com"
                className="text-[#F26522] no-underline font-medium hover:underline"
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
