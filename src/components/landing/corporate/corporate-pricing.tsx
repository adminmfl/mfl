'use client';

import Link from 'next/link';

export function CorporatePricing() {
  const plans = [
    {
      tier: 'Starter',
      size: 'Up to 40 People',
      team: 'Up to 4 teams · 12 players each',
      price: '₹199',
      featured: false,
      features: [
        'AI Personal Coach — every player',
        'AI League Manager — host',
        'Leaderboard + player app',
        '4 challenges (40 days)',
        '+2 challenges / 60 days',
        '+4 challenges / 90 days',
        'Opening Day playbook',
        'Grand Finale ceremony kit',
        'WhatsApp support',
      ],
      cta: 'Launch Free — 7 Days →',
      ctaType: 'link' as const,
    },
    {
      tier: 'Growth',
      size: '40–150 People',
      team: '4 to 12 teams · 12 players each',
      price: '₹149',
      featured: true,
      features: [
        'AI Personal Coach — every player',
        'AI League Manager — host',
        'Host analytics dashboard',
        'Custom league name + branding',
        '6 challenges (40 days)',
        '+2 challenges / 60 days',
        '+4 challenges / 90 days',
        'Opening Day facilitation guide',
        'Grand Finale ceremony kit',
        'Priority support',
      ],
      cta: 'Launch Free — 7 Days →',
      ctaType: 'link' as const,
    },
    {
      tier: 'Enterprise',
      size: '150+ People',
      team: '12+ teams · unlimited scale',
      price: '₹99',
      featured: false,
      features: [
        'AI Personal Coach — every player',
        'AI League Manager — host',
        'White-label app (Powered by MFL)',
        'HR analytics dashboard',
        '6 challenges (40 days)',
        '+2 challenges / 60 days',
        '+4 challenges / 90 days',
        'Wearable auto-sync',
        'Grand Finale ceremony kit',
        'Dedicated onboarding call',
      ],
      cta: 'Talk to Us →',
      ctaType: 'contact' as const,
    },
  ];

  return (
    <section
      className="px-12 py-12 bg-[#FAF9F7] scroll-mt-[60px] max-md:px-4 max-md:py-8"
      id="pricing"
    >
      <div className="corp-font-mono text-[0.64rem] tracking-[3px] uppercase text-[#F26522] mb-2">
        Pricing · Launch Offer
      </div>
      <h2 className="corp-font-bebas text-[clamp(1.9rem,3vw,3rem)] leading-none text-[#1A2B4A] mb-[0.65rem] max-md:text-[1.8rem] max-md:leading-[1.1]">
        Simple pricing.
        <br />
        Everything included.
      </h2>
      <p className="text-[0.9rem] text-[#6B7280] leading-[1.7] max-w-[560px] font-light max-md:max-w-full">
        Per person, per league. AI Personal Coach + AI League Manager in every
        plan. Pay only if your team loves it.
      </p>
      <div className="grid grid-cols-3 gap-[1.1rem] mt-7 max-md:grid-cols-1">
        {plans.map((plan, i) => (
          <div
            key={i}
            className={`bg-white rounded-[6px] px-6 py-7 relative ${
              plan.featured
                ? 'border-2 border-[#F26522]'
                : 'border border-[rgba(26,43,74,0.1)]'
            } max-md:w-full`}
          >
            {plan.featured && (
              <div className="absolute -top-[11px] left-1/2 -translate-x-1/2 bg-[#F26522] text-white text-[0.63rem] corp-font-mono tracking-[1px] px-3 py-[3px] rounded-[2px] whitespace-nowrap">
                Most Popular
              </div>
            )}
            <div className="corp-font-mono text-[0.63rem] tracking-[2px] text-[#6B7280] uppercase mb-[0.4rem]">
              {plan.tier}
            </div>
            <div className="corp-font-bebas text-[1.6rem] text-[#1A2B4A] mb-[0.15rem]">
              {plan.size}
            </div>
            <div className="corp-font-mono text-[0.62rem] text-[#6B7280] tracking-[0.3px] mb-[0.875rem]">
              {plan.team}
            </div>
            <div className="mb-3">
              <span className="corp-font-bebas text-[1.9rem] text-[#1A2B4A]">
                {plan.price}
              </span>
              <span className="text-[0.65rem] corp-font-mono text-[#F26522] ml-1 align-middle">
                Launch Offer
              </span>
              <span className="text-[0.74rem] text-[#6B7280] block mt-[2px]">
                per person · 40 day league
              </span>
            </div>
            <div className="my-3 px-3 py-[0.6rem] bg-[#FAF9F7] rounded flex flex-wrap gap-[5px] items-center">
              <span className="text-[0.66rem] text-[#6B7280] corp-font-mono mr-[2px]">
                Extend:
              </span>
              <span className="text-[0.68rem] bg-white border border-[rgba(26,43,74,0.1)] rounded-[3px] px-[7px] py-[2px] text-[#1A2B4A] font-medium">
                60 days +₹50
              </span>
              <span className="text-[0.68rem] bg-white border border-[rgba(26,43,74,0.1)] rounded-[3px] px-[7px] py-[2px] text-[#1A2B4A] font-medium">
                90 days +₹90
              </span>
            </div>
            <ul className="list-none mb-6">
              {plan.features.map((f, j) => (
                <li
                  key={j}
                  className="text-[0.8rem] py-[0.32rem] text-[#6B7280] flex items-start gap-[7px]"
                >
                  <span className="text-[#F26522] font-bold shrink-0 mt-[1px]">
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            {plan.ctaType === 'link' ? (
              <Link
                href="/signup"
                className={`block w-full py-[0.8rem] corp-font-sans text-[0.88rem] font-semibold cursor-pointer rounded-[3px] transition-all duration-200 text-center no-underline max-md:text-[0.82rem] max-md:px-[1.2rem] max-md:py-[0.7rem] ${
                  plan.featured
                    ? 'bg-[#F26522] text-white border-[#F26522] border-[1.5px] hover:bg-[#C94E0E] hover:border-[#C94E0E]'
                    : 'border-[1.5px] border-[#1A2B4A] bg-transparent text-[#1A2B4A] hover:bg-[#1A2B4A] hover:text-white'
                }`}
              >
                {plan.cta}
              </Link>
            ) : (
              <button
                onClick={() => {
                  if (
                    typeof window !== 'undefined' &&
                    (window as any).openContactForm
                  ) {
                    (window as any).openContactForm('Enterprise', 'Corporate');
                  }
                }}
                className="w-full py-[0.8rem] corp-font-sans text-[0.88rem] font-semibold cursor-pointer rounded-[3px] transition-all duration-200 text-center border-[1.5px] border-[#1A2B4A] bg-transparent text-[#1A2B4A] hover:bg-[#1A2B4A] hover:text-white max-md:text-[0.82rem] max-md:px-[1.2rem] max-md:py-[0.7rem]"
              >
                {plan.cta}
              </button>
            )}
            {plan.ctaType === 'link' && (
              <div className="text-center text-[0.7rem] text-[#6B7280] corp-font-mono mt-[0.4rem] tracking-[0.2px]">
                First 7 days live, free. No card required.
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 px-5 py-4 bg-[#EEF1F7] border border-[rgba(26,43,74,0.1)] rounded-[5px] text-[0.82rem] text-[#6B7280] leading-[1.62]">
        <span className="font-semibold text-[#1A2B4A] block mb-[3px]">
          How it works:
        </span>
        Base league is 40 days — Starter gets 4 challenges, Growth and
        Enterprise get 6. Extend to 60 days (+₹50/person) or 90 days
        (+₹90/person) to unlock more challenges. First 7 days of your live
        league are free — no card needed. Pay only if your team loves it.
      </div>
    </section>
  );
}
