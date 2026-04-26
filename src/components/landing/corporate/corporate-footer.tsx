export function CorporateFooter() {
  return (
    <footer className="bg-[#0D1728] border-t border-[rgba(255,255,255,0.05)] px-12 py-6 flex justify-between items-center max-md:flex-col max-md:gap-3 max-md:px-4 max-md:py-4 max-md:text-center">
      <a
        href="#"
        className="corp-font-bebas text-[1.35rem] tracking-[2px] text-white no-underline flex items-center gap-[6px]"
      >
        <span className="w-2 h-2 rounded-full bg-[#F26522] inline-block mb-[2px]" />
        My<span className="text-[#F26522]">F</span>itness
        <span className="text-[#F26522]">L</span>eague
      </a>
      <div className="text-[0.72rem] text-[rgba(255,255,255,0.22)] corp-font-mono">
        © 2026 MyFitnessLeague · myfitnessleague.com · Hyderabad, India
      </div>
    </footer>
  );
}
