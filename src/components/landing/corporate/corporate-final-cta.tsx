import Link from 'next/link';

export function CorporateFinalCta() {
  return (
    <section className="bg-[#1A2B4A] text-center px-12 py-[4.5rem] max-md:px-4 max-md:py-10">
      <div className="corp-font-mono text-[0.64rem] tracking-[3px] uppercase text-[rgba(242,101,34,0.75)] mb-2">
        Ready to start
      </div>
      <h2 className="corp-font-bebas text-[clamp(2.2rem,4vw,4rem)] leading-none text-white mb-[0.65rem] max-md:text-[1.8rem] max-md:leading-[1.1]">
        Your league.
        <br />
        20 minutes from now.
      </h2>
      <p className="text-[0.9rem] text-[rgba(255,255,255,0.45)] leading-[1.7] max-w-[420px] font-light mx-auto mt-[0.875rem] mb-8 max-md:max-w-full">
        No sales call. No IT ticket. No proposal. Answer 5 questions and
        you&apos;re live.
      </p>
      <Link
        href="/signup"
        className="bg-[#F26522] text-white border-none px-[2.8rem] py-4 corp-font-sans text-[0.95rem] font-bold cursor-pointer rounded-[3px] no-underline inline-block transition-all duration-200 hover:bg-[#C94E0E] hover:-translate-y-[1px]"
      >
        Launch Free — 7 Days →
      </Link>
      <div className="mt-3 text-[0.72rem] text-[rgba(255,255,255,0.3)] corp-font-mono tracking-[0.3px]">
        First 7 days live and free · No card required · Pay only if your team
        loves it
      </div>
    </section>
  );
}
