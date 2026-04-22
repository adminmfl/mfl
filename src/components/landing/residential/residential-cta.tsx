'use client';

import Link from 'next/link';

export function ResidentialCta() {
  return (
    <section className="bg-[#1A2B4A] text-white text-center px-16 py-32 max-[960px]:px-4 max-[960px]:py-12 max-[960px]:w-full">
      <div className="font-['DM_Mono',monospace] text-[0.68rem] tracking-[3px] uppercase text-[rgba(242,101,34,0.8)] mb-4">
        Ready to bring your society together
      </div>
      <h2 className="font-['Bebas_Neue',sans-serif] text-[clamp(3rem,5vw,5rem)] leading-none mb-4 text-white max-[960px]:text-[1.8rem] max-[960px]:leading-[1.1]">
        Your neighbours
        <br />
        are waiting.
      </h2>
      <p className="text-base text-[rgba(255,255,255,0.45)] leading-[1.75] max-w-[460px] font-light mx-auto mt-6 mb-12">
        Set up your society league in 20 minutes. No vendor. No coordinator.
        Just your community &mdash; competing, bonding, and moving together.
      </p>
      <Link
        href="/signup"
        className="bg-[#F26522] text-white border-none px-12 py-[1.1rem] font-['DM_Sans',sans-serif] text-base font-semibold cursor-pointer rounded-[3px] no-underline inline-block transition-all duration-200 hover:bg-[#C94E0E] hover:-translate-y-[1px]"
      >
        Launch Free &mdash; 7 Days &rarr;
      </Link>
      <p className="mt-4 text-[0.78rem] text-[rgba(255,255,255,0.35)] font-['DM_Mono',monospace] tracking-[0.5px]">
        First 7 days live and free. No card required.
      </p>
    </section>
  );
}
