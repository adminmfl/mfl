import Link from 'next/link';

export function CorporateRwaStrip() {
  return (
    <div
      className="bg-[#EEF1F7] border-t border-b border-[rgba(26,43,74,0.1)] px-12 py-7 flex items-center justify-between gap-6 max-md:flex-col max-md:items-start max-md:px-4 max-md:py-4"
      id="rwa"
    >
      <div className="flex items-center gap-4">
        <div className="text-[1.4rem]">🏘️</div>
        <div>
          <div className="font-semibold text-[0.9rem] text-[#1A2B4A] mb-[3px]">
            Not a corporate team? MFL runs beautifully for housing societies,
            apartment complexes, and villa communities.
          </div>
          <div className="text-[0.78rem] text-[#6B7280] max-w-[500px] leading-[1.5]">
            Multi-generational teams, wing vs wing or villa vs villa
            competition, family challenges — designed for communities, not
            offices.
          </div>
        </div>
      </div>
      <Link
        href="/communities"
        className="text-[0.8rem] font-semibold text-[#F26522] no-underline border-b-[1.5px] border-[#F26522] pb-[1px] whitespace-nowrap shrink-0 transition-colors duration-200 hover:text-[#C94E0E]"
      >
        See MFL for Communities →
      </Link>
    </div>
  );
}
