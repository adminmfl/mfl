'use client';

import Link from 'next/link';

export function ResidentialCorpStrip() {
  return (
    <div className="bg-[#EEF1F7] border-t border-b border-[rgba(26,43,74,0.1)] px-16 py-10 flex items-center justify-between gap-8 max-[960px]:flex-col max-[960px]:items-start max-[960px]:px-4 max-[960px]:py-6 max-[960px]:w-full">
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-full bg-white border border-[rgba(26,43,74,0.1)] flex items-center justify-center text-2xl flex-shrink-0">
          {'\u{1F3E2}'}
        </div>
        <div>
          <div className="font-semibold text-[0.95rem] text-[#1A2B4A] mb-1">
            Running an HR team, company, or professional organisation?
          </div>
          <div className="text-[0.82rem] text-[#6B7280] leading-[1.5] max-w-[520px]">
            MFL&apos;s corporate version is built for offices, law firms, tech
            companies, and professional clubs like Rotary &mdash; with team
            bonding, productivity culture, and HR dashboards built in.
          </div>
        </div>
      </div>
      <Link
        href="/"
        className="text-[0.82rem] font-semibold text-[#F26522] no-underline border-b-[1.5px] border-[#F26522] pb-[1px] whitespace-nowrap flex-shrink-0 transition-colors duration-200 hover:text-[#C94E0E] hover:border-[#C94E0E]"
      >
        See MFL for Corporates &rarr;
      </Link>
    </div>
  );
}
