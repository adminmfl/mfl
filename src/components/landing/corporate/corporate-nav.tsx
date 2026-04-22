'use client';

import Link from 'next/link';

export function CorporateNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-12 py-[0.7rem] bg-[rgba(250,249,247,0.96)] backdrop-blur-[14px] border-b border-[rgba(26,43,74,0.1)] max-md:px-4 max-md:py-[0.65rem]">
      <a
        href="#"
        className="corp-font-bebas text-[1.5rem] tracking-[2px] text-[#1A2B4A] no-underline flex items-center gap-[6px] max-md:text-[1.1rem]"
      >
        <span className="w-2 h-2 rounded-full bg-[#F26522] inline-block mb-[2px]" />
        My<span className="text-[#F26522]">F</span>itness
        <span className="text-[#F26522]">L</span>eague
      </a>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 bg-[rgba(26,43,74,0.06)] border border-[rgba(26,43,74,0.1)] rounded-[20px] px-1 py-[3px] max-md:hidden">
          <span className="text-[0.72rem] font-semibold px-3 py-1 rounded-[16px] bg-[#F26522] text-white whitespace-nowrap">
            🏢 Corporate
          </span>
          <Link
            href="/communities"
            className="text-[0.72rem] font-medium px-3 py-1 rounded-[16px] no-underline text-[#6B7280] transition-all duration-200 whitespace-nowrap hover:text-[#1A2B4A]"
          >
            🏘️ Communities
          </Link>
        </div>
        <Link
          href="/login"
          className="text-[#1A2B4A] px-[1.4rem] py-[0.55rem] corp-font-sans text-[0.82rem] font-semibold cursor-pointer rounded-[3px] no-underline transition-all duration-200 whitespace-nowrap border-[1.5px] border-[#1A2B4A] bg-transparent hover:bg-[#1A2B4A] hover:text-white max-md:text-[0.7rem] max-md:px-[0.85rem] max-md:py-[0.45rem]"
        >
          Log In
        </Link>
        <Link
          href="/signup"
          className="bg-[#F26522] text-white border-none px-[1.4rem] py-[0.55rem] corp-font-sans text-[0.82rem] font-semibold cursor-pointer rounded-[3px] no-underline transition-colors duration-200 whitespace-nowrap hover:bg-[#C94E0E] max-md:text-[0.7rem] max-md:px-[0.85rem] max-md:py-[0.45rem]"
        >
          Sign Up — Free →
        </Link>
      </div>
    </nav>
  );
}
