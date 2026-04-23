'use client';

import Link from 'next/link';

export function ResidentialNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-16 py-4 bg-[rgba(250,249,247,0.94)] backdrop-blur-[14px] border-b border-[rgba(26,43,74,0.1)] max-[960px]:px-4 max-[960px]:py-[0.85rem]">
      <a
        href="#"
        className="font-['Bebas_Neue',sans-serif] text-[1.6rem] tracking-[2px] text-[#1A2B4A] no-underline flex items-center gap-[6px] max-[960px]:text-[1rem]"
      >
        <span className="w-2 h-2 rounded-full bg-[#F26522] inline-block mb-[2px]" />
        MYFITNESSLEAGUE
      </a>
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="text-[0.8rem] text-[#6B7280] no-underline border-b border-dashed border-[rgba(107,114,128,0.5)] pb-[1px] transition-colors duration-200 hover:text-[#F26522] hover:border-[#F26522] max-[960px]:hidden"
        >
          For Corporates &rarr;
        </Link>
        <Link
          href="/login"
          className="text-[0.85rem] font-semibold text-[#1A2B4A] no-underline transition-colors duration-200 hover:text-[#F26522] max-[960px]:text-[0.7rem]"
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="bg-[#F26522] text-white border-none px-[1.6rem] py-[0.6rem] font-['DM_Sans',sans-serif] text-[0.85rem] font-semibold cursor-pointer rounded-[3px] no-underline transition-colors duration-200 hover:bg-[#C94E0E] max-[960px]:text-[0.7rem] max-[960px]:px-[0.85rem] max-[960px]:py-[0.45rem] max-[960px]:whitespace-nowrap"
        >
          Sign Up — Free &rarr;
        </Link>
      </div>
    </nav>
  );
}
