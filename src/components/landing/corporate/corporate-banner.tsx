export function CorporateBanner() {
  return (
    <div className="bg-[#1A2B4A] px-12 py-[0.65rem] mt-[52px] flex items-center justify-between gap-4 max-md:px-4 max-md:mt-[50px] max-md:flex-wrap">
      <div className="flex items-center gap-3">
        <span className="text-[1.2rem]">🏢</span>
        <div>
          <div className="font-bold text-[0.85rem] text-white max-md:text-[0.75rem]">
            MyFitnessLeague (MFL) for Corporate Teams
          </div>
          <div className="text-[0.68rem] text-[rgba(255,255,255,0.42)] corp-font-mono tracking-[0.3px] mt-[1px] max-md:text-[0.6rem]">
            For any company with employees — any size, any industry
          </div>
        </div>
      </div>
      <div className="flex gap-[5px] flex-wrap max-md:hidden">
        <span className="text-[0.65rem] px-[9px] py-[3px] rounded-[2px] bg-[rgba(242,101,34,0.15)] text-[#F26522] border border-[rgba(242,101,34,0.25)] corp-font-mono whitespace-nowrap">
          Team Bonding
        </span>
        <span className="text-[0.65rem] px-[9px] py-[3px] rounded-[2px] bg-[rgba(242,101,34,0.15)] text-[#F26522] border border-[rgba(242,101,34,0.25)] corp-font-mono whitespace-nowrap">
          Employee Wellness
        </span>
        <span className="text-[0.65rem] px-[9px] py-[3px] rounded-[2px] bg-[rgba(242,101,34,0.15)] text-[#F26522] border border-[rgba(242,101,34,0.25)] corp-font-mono whitespace-nowrap">
          Culture Building
        </span>
        <span className="text-[0.65rem] px-[9px] py-[3px] rounded-[2px] bg-[rgba(242,101,34,0.15)] text-[#F26522] border border-[rgba(242,101,34,0.25)] corp-font-mono whitespace-nowrap">
          HR Dashboard
        </span>
      </div>
    </div>
  );
}
