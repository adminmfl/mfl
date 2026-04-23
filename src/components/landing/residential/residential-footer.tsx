'use client';

export function ResidentialFooter() {
  return (
    <footer className="bg-[#0D1728] border-t border-[rgba(255,255,255,0.05)] px-16 py-8 flex justify-between items-center max-[960px]:flex-col max-[960px]:gap-4 max-[960px]:px-6 max-[960px]:text-center">
      <a
        href="#"
        className="font-['Bebas_Neue',sans-serif] text-[1.4rem] tracking-[2px] text-white no-underline flex items-center gap-[6px]"
      >
        <span className="w-2 h-2 rounded-full bg-[#F26522] inline-block mb-[2px]" />
        MYFITNESSLEAGUE
      </a>
      <div className="text-[0.76rem] text-[rgba(255,255,255,0.22)] font-['DM_Mono',monospace]">
        &copy; 2026 MyFitnessLeague &middot; myfitnessleague.com &middot;
        Hyderabad, India
      </div>
    </footer>
  );
}
