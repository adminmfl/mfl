'use client';

import Link from 'next/link';

interface PriceCardProps {
  tier: string;
  size: string;
  teamInfo: string;
  price: string;
  features: string[];
  featured?: boolean;
  ctaText: string;
  ctaHref?: string;
  isContact?: boolean;
  showFreeNote?: boolean;
}

function PriceCard({
  tier,
  size,
  teamInfo,
  price,
  features,
  featured,
  ctaText,
  ctaHref,
  isContact,
  showFreeNote,
}: PriceCardProps) {
  return (
    <div
      className={`bg-white rounded-md p-10 relative max-[960px]:w-full ${
        featured
          ? 'border-2 border-[#F26522]'
          : 'border border-[rgba(26,43,74,0.1)]'
      }`}
    >
      {featured && (
        <div className="absolute -top-[13px] left-1/2 -translate-x-1/2 bg-[#F26522] text-white text-[0.68rem] font-['DM_Mono',monospace] tracking-[1px] px-[14px] py-[3px] rounded-[2px] whitespace-nowrap">
          Most Popular
        </div>
      )}
      <div className="font-['DM_Mono',monospace] text-[0.68rem] tracking-[2px] text-[#6B7280] uppercase mb-4">
        {tier}
      </div>
      <div className="font-['Bebas_Neue',sans-serif] text-[2rem] text-[#1A2B4A] mb-1">
        {size}
      </div>
      <div className="font-['DM_Mono',monospace] text-[0.65rem] text-[#6B7280] tracking-[0.5px] mb-4">
        {teamInfo}
      </div>
      <div className="text-[0.84rem] text-[#6B7280] mb-6 pb-6 border-b border-[rgba(26,43,74,0.1)]">
        <span className="font-['Bebas_Neue',sans-serif] text-[1.8rem] text-[#1A2B4A]">
          {price}
        </span>{' '}
        <span className="text-[0.72rem] font-['DM_Mono',monospace] text-[#F26522] font-medium">
          Launch Offer
        </span>
        <br />
        <span className="text-[0.78rem] text-[#6B7280]">
          per resident &middot; 40 day league
        </span>
      </div>

      {/* Extend Add-ons */}
      <div className="my-[0.875rem] px-3 py-[0.65rem] bg-[#EEF1F7] rounded flex flex-wrap gap-[6px] items-center">
        <span className="text-[0.68rem] text-[#6B7280] font-['DM_Mono',monospace] mr-[2px]">
          Extend:
        </span>
        <span className="text-[0.7rem] bg-white border border-[rgba(26,43,74,0.1)] rounded-[3px] px-[7px] py-[2px] text-[#1A2B4A] font-medium">
          60 days +&#8377;50
        </span>
        <span className="text-[0.7rem] bg-white border border-[rgba(26,43,74,0.1)] rounded-[3px] px-[7px] py-[2px] text-[#1A2B4A] font-medium">
          90 days +&#8377;90
        </span>
      </div>

      <ul className="list-none mb-8">
        {features.map((f) => (
          <li
            key={f}
            className="text-[0.84rem] py-[0.4rem] text-[#6B7280] flex items-start gap-2 before:content-['\2713'] before:text-[#F26522] before:font-bold before:flex-shrink-0 before:mt-[1px]"
          >
            {f}
          </li>
        ))}
      </ul>

      {isContact ? (
        <button
          onClick={() => {
            // Trigger contact form - handled by parent
            if (typeof window !== 'undefined') {
              const event = new CustomEvent('openContactForm', {
                detail: { planType: 'Enterprise', pageType: 'Communities' },
              });
              window.dispatchEvent(event);
            }
          }}
          className={`w-full py-[0.85rem] font-['DM_Sans',sans-serif] text-[0.9rem] font-semibold cursor-pointer rounded-[3px] border-[1.5px] border-[#1A2B4A] bg-transparent text-[#1A2B4A] transition-all duration-200 hover:bg-[#1A2B4A] hover:text-white max-[960px]:text-[0.82rem] max-[960px]:py-[0.7rem] max-[960px]:px-[1.2rem]`}
        >
          {ctaText}
        </button>
      ) : (
        <Link
          href={ctaHref || '/signup'}
          className={`block w-full py-[0.85rem] font-['DM_Sans',sans-serif] text-[0.9rem] font-semibold cursor-pointer rounded-[3px] text-center no-underline transition-all duration-200 max-[960px]:text-[0.82rem] max-[960px]:py-[0.7rem] max-[960px]:px-[1.2rem] ${
            featured
              ? 'bg-[#F26522] text-white border border-[#F26522] hover:bg-[#C94E0E] hover:border-[#C94E0E]'
              : 'border-[1.5px] border-[#1A2B4A] bg-transparent text-[#1A2B4A] hover:bg-[#1A2B4A] hover:text-white'
          }`}
        >
          {ctaText}
        </Link>
      )}

      {showFreeNote && (
        <div className="text-center text-[0.72rem] text-[#6B7280] font-['DM_Mono',monospace] mt-2 tracking-[0.3px]">
          First 7 days live, free. No card required.
        </div>
      )}
    </div>
  );
}

export function ResidentialPricing() {
  return (
    <section
      id="pricing"
      className="px-16 py-24 bg-[#FAF9F7] scroll-mt-[60px] max-[960px]:px-4 max-[960px]:py-10 max-[960px]:w-full"
    >
      <div className="font-['DM_Mono',monospace] text-[0.68rem] tracking-[3px] uppercase text-[#F26522] mb-4">
        Pricing &middot; Launch Offer
      </div>
      <h2 className="font-['Bebas_Neue',sans-serif] text-[clamp(2.4rem,3.8vw,3.8rem)] leading-none mb-4 text-[#1A2B4A] max-[960px]:text-[1.8rem] max-[960px]:leading-[1.1]">
        Simple pricing.
        <br />
        Everything included.
      </h2>
      <p className="text-base text-[#6B7280] leading-[1.75] max-w-[560px] font-light max-[960px]:max-w-full">
        Per resident, per league. AI Personal Coach + AI League Manager included
        in every plan. Kids, seniors, everyone &mdash; one price for all ages.
      </p>

      <div className="grid grid-cols-3 gap-6 mt-16 max-[960px]:grid-cols-1 max-[960px]:w-full">
        <PriceCard
          tier="Starter"
          size="Up to 40 Residents"
          teamInfo="Up to 4 teams &middot; 12 residents each"
          price="&#8377;199"
          features={[
            'AI Personal Coach \u2014 every resident',
            'AI League Manager \u2014 RWA host',
            'Leaderboard + resident app',
            '4 challenges (40 days)',
            '+2 challenges for 60 days',
            '+4 challenges for 90 days',
            'Multi-generational activity mix',
            'Opening Day clubhouse playbook',
            'Grand Finale ceremony kit',
            'League Finisher Certificate \u2014 every player',
            'WhatsApp support',
          ]}
          ctaText="Launch Free \u2014 7 Days \u2192"
          ctaHref="/signup"
          showFreeNote
        />
        <PriceCard
          tier="Society"
          size="40\u2013150 Residents"
          teamInfo="4 to 12 teams &middot; 12 residents each"
          price="&#8377;149"
          featured
          features={[
            'AI Personal Coach \u2014 every resident',
            'AI League Manager \u2014 RWA host',
            'RWA committee dashboard',
            'Custom society branding',
            '6 challenges (40 days)',
            '+2 challenges for 60 days',
            '+4 challenges for 90 days',
            'Age-group balanced team formation',
            'Grand Finale ceremony kit',
            'League Finisher Certificate \u2014 every resident',
            'Priority support',
          ]}
          ctaText="Launch Free \u2014 7 Days \u2192"
          ctaHref="/signup"
          showFreeNote
        />
        <PriceCard
          tier="Large Society"
          size="150+ Residents"
          teamInfo="12+ teams &middot; unlimited scale"
          price="&#8377;99"
          features={[
            'AI Personal Coach \u2014 every resident',
            'AI League Manager \u2014 RWA host',
            'Society-branded app experience',
            '6 challenges (40 days)',
            '+2 challenges for 60 days',
            '+4 challenges for 90 days',
            'Sub-leagues by tower if needed',
            'Wearable auto-sync',
            'Dedicated onboarding support',
          ]}
          ctaText="Talk to Us \u2192"
          isContact
        />
      </div>

      <div className="mt-8 px-6 py-5 bg-[#EEF1F7] border border-[rgba(26,43,74,0.1)] rounded-md text-[0.84rem] text-[#6B7280] leading-[1.65]">
        <span className="font-semibold text-[#1A2B4A] block mb-1">
          How it works:
        </span>
        Base league is 40 days &mdash; Starter gets 4 challenges, Society and
        Large Society get 6. Extend to 60 days (+&#8377;50/resident) for 2 more
        challenges, or 90 days (+&#8377;90/resident) for 4 more. The first 7
        days of your live league are free &mdash; no card needed upfront. Pay
        only if your community loves it.
      </div>
    </section>
  );
}
