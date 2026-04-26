'use client';

export function ResidentialEventPhotos() {
  return (
    <div className="grid grid-cols-2 gap-0 max-[960px]:grid-cols-1">
      {/* Opening Day */}
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/anna-stampfli-q0PZ3BoFmCE-unsplash.jpg"
          alt="Community residents Opening Day event clubhouse"
          className="w-full h-[400px] object-cover block brightness-[0.6]"
        />
        <div
          className="absolute inset-0 flex flex-col justify-end p-8 bg-gradient-to-b from-transparent via-transparent to-[rgba(26,43,74,0.88)]"
          style={{ backgroundPosition: '0 55%' }}
        >
          <div className="inline-block bg-[#F26522] text-white font-['DM_Mono',monospace] text-[0.6rem] tracking-[2px] px-[10px] py-[3px] rounded-[2px] mb-2 w-fit">
            Opening Day &middot; Clubhouse
          </div>
          <div className="font-['Bebas_Neue',sans-serif] text-[1.8rem] text-white leading-[1.05] tracking-[0.5px]">
            Team reveal. War cry.
            <br />
            Neighbours become rivals.
          </div>
          <div className="text-[0.78rem] text-[rgba(255,255,255,0.6)] mt-[0.4rem] leading-[1.5]">
            All residents gathered. Teams announced. The league begins before
            anyone has taken a step.
          </div>
        </div>
      </div>

      {/* Grand Finale */}
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/gabin-vallet-J154nEkpzlQ-unsplash.jpg"
          alt="Community Grand Finale trophy ceremony celebration"
          className="w-full h-[400px] object-cover block brightness-[0.6]"
        />
        <div
          className="absolute inset-0 flex flex-col justify-end p-8 bg-gradient-to-b from-transparent via-transparent to-[rgba(10,10,10,0.88)]"
          style={{ backgroundPosition: '0 55%' }}
        >
          <div className="inline-block bg-[#F5A623] text-[#1A2B4A] font-['DM_Mono',monospace] text-[0.6rem] tracking-[2px] px-[10px] py-[3px] rounded-[2px] mb-2 w-fit font-bold">
            Grand Finale &middot; Trophy Day
          </div>
          <div className="font-['Bebas_Neue',sans-serif] text-[1.8rem] text-white leading-[1.05] tracking-[0.5px]">
            Trophies. Certificates.
            <br />
            League Finisher for all.
          </div>
          <div className="text-[0.78rem] text-[rgba(255,255,255,0.6)] mt-[0.4rem] leading-[1.5]">
            Every team honoured. Every resident gets a League Finisher
            Certificate &mdash; print it, share it on WhatsApp, or post it on
            LinkedIn.
          </div>
        </div>
      </div>
    </div>
  );
}
