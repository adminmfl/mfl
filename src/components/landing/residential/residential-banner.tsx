'use client';

import Link from 'next/link';

export function ResidentialBanner() {
  return (
    <div className="mt-[72px] bg-[#0F6E56] text-white text-center px-16 py-[0.6rem] font-['DM_Mono',monospace] text-[0.68rem] tracking-[2px] uppercase max-[960px]:px-4 max-[960px]:mt-16">
      <span className="max-[960px]:text-[0.72rem]">
        &#x1F3D8;&#xFE0F; &nbsp; MFL for Residential Communities &amp; Apartment
        Societies
      </span>
      <Link
        href="/"
        className="text-[rgba(255,255,255,0.65)] no-underline border-b border-[rgba(255,255,255,0.3)] ml-4 text-[0.65rem] hover:text-white max-[960px]:text-[0.58rem]"
      >
        Looking for the corporate version? &rarr;
      </Link>
    </div>
  );
}
