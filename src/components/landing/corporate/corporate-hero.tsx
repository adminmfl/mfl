import Link from 'next/link';

export function CorporateHero() {
  return (
    <section className="min-h-[calc(100vh-88px)] grid grid-cols-2 max-md:grid-cols-1">
      {/* Hero Left */}
      <div className="flex flex-col justify-center px-12 py-12 max-md:px-4 max-md:py-6 max-md:order-1">
        <div className="corp-font-mono text-[0.68rem] tracking-[3px] uppercase text-[#F26522] mb-[0.875rem] flex items-center gap-2 animate-[fadeUp_0.65s_ease_0.05s_both]">
          <span className="w-[22px] h-[2px] bg-[#F26522] inline-block" />
          Corporate Fitness League Platform
        </div>
        <h1 className="corp-font-bebas text-[clamp(3rem,5vw,5.2rem)] leading-[0.95] tracking-[1px] text-[#1A2B4A] mb-4 animate-[fadeUp_0.65s_ease_0.12s_both] max-md:text-[2.2rem] max-md:leading-[1.1]">
          Your Company.
          <br />
          <span className="text-[#F26522]">One League.</span>
          <br />
          Real Bonds.
        </h1>
        <p className="text-[0.97rem] text-[#6B7280] leading-[1.72] max-w-[430px] mb-7 font-light animate-[fadeUp_0.65s_ease_0.2s_both] max-md:text-[0.88rem] max-md:max-w-full">
          MyFitnessLeague (MFL) builds{' '}
          <strong className="text-[#1A2B4A] font-semibold">
            team bonds and fitness together
          </strong>{' '}
          — through a company-wide league of competing teams, daily activities,
          surprise challenges, and a grand finale. Any company, any size. No app
          store. No IT setup.
        </p>
        <div className="flex flex-col gap-[0.6rem] mb-7 animate-[fadeUp_0.65s_ease_0.28s_both] max-md:w-full">
          <div className="flex items-center gap-4 flex-wrap max-md:flex-col max-md:gap-3 max-md:w-full">
            <Link
              href="/signup"
              className="bg-[#F26522] text-white border-none px-[2.2rem] py-[0.9rem] corp-font-sans text-[0.95rem] font-bold cursor-pointer rounded-[3px] no-underline inline-block transition-all duration-200 hover:bg-[#C94E0E] hover:-translate-y-[1px] max-md:w-full max-md:text-center max-md:px-[1.2rem] max-md:py-3 max-md:text-[0.85rem]"
            >
              Launch Free — 7 Days →
            </Link>
            <a
              href="#how"
              className="text-[#1A2B4A] text-[0.85rem] font-medium no-underline border-b-[1.5px] border-[#1A2B4A] pb-[2px] transition-all duration-200 hover:text-[#F26522] hover:border-[#F26522] max-md:text-[0.8rem]"
            >
              See how it works ↓
            </a>
          </div>
          <div className="text-[0.75rem] text-[#6B7280] corp-font-mono tracking-[0.3px] flex items-center gap-[6px] before:content-['✓'] before:text-[#F26522] before:font-bold">
            First 7 days live and free. Pay only if your team loves it — and
            they will.
          </div>
        </div>
        <div className="flex items-center gap-5 px-[0.875rem] py-[0.65rem] bg-white border border-[rgba(26,43,74,0.1)] rounded-[6px] w-fit animate-[fadeUp_0.65s_ease_0.36s_both] max-md:hidden">
          <div>
            <div className="corp-font-bebas text-[1.5rem] text-[#1A2B4A] leading-none">
              92%
            </div>
            <div className="text-[0.62rem] text-[#6B7280] mt-[2px]">
              Rated 4–5 stars
            </div>
          </div>
          <div className="w-[1px] h-7 bg-[rgba(26,43,74,0.1)]" />
          <div>
            <div className="corp-font-bebas text-[1.5rem] text-[#1A2B4A] leading-none">
              100%
            </div>
            <div className="text-[0.62rem] text-[#6B7280] mt-[2px]">
              Fitness improvement
            </div>
          </div>
          <div className="w-[1px] h-7 bg-[rgba(26,43,74,0.1)]" />
          <div>
            <div className="corp-font-bebas text-[1.5rem] text-[#1A2B4A] leading-none">
              76%
            </div>
            <div className="text-[0.62rem] text-[#6B7280] mt-[2px]">
              Want Season 2
            </div>
          </div>
          <div className="w-[1px] h-7 bg-[rgba(26,43,74,0.1)]" />
          <div>
            <div className="corp-font-bebas text-[1.5rem] text-[#1A2B4A] leading-none">
              150+
            </div>
            <div className="text-[0.62rem] text-[#6B7280] mt-[2px]">
              Pilot participants
            </div>
          </div>
        </div>
      </div>

      {/* Hero Right */}
      <div className="bg-[#1A2B4A] relative overflow-hidden flex items-stretch max-md:min-h-auto max-md:order-[-1] max-md:flex-col">
        {/* Orange circle decoration */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[#F26522] opacity-[0.08] pointer-events-none" />

        {/* Photo column */}
        <div className="grid grid-rows-3 w-[55%] gap-[2px] shrink-0 max-md:w-full max-md:grid-rows-[auto_auto_auto]">
          <img
            src="/images/aleksandrs-karevs-WadTdbyDE94-unsplash.jpg"
            alt="Group running in park"
            className="w-full h-full object-cover block brightness-[0.78] max-md:h-[200px]"
          />
          <img
            src="/images/gabin-vallet-J154nEkpzlQ-unsplash.jpg"
            alt="Badminton doubles match"
            className="w-full h-full object-cover block brightness-[0.78] max-md:h-[200px]"
          />
          <img
            src="/images/dillon-wanner-ciqbTWuGgBI-unsplash.jpg"
            alt="Team cycling outdoor sport"
            className="w-full h-full object-cover block brightness-[0.78] max-md:h-[200px]"
          />
        </div>

        {/* App screenshot strip */}
        <div className="w-[45%] flex flex-col gap-3 px-[0.875rem] py-4 justify-center max-md:w-full max-md:grid max-md:grid-cols-2 max-md:gap-2 max-md:p-[0.65rem]">
          {/* Leaderboard screenshot */}
          <div className="bg-[#243760] border border-[rgba(255,255,255,0.12)] rounded-[10px] overflow-hidden flex-1 min-h-0 max-md:min-h-[120px] max-md:flex max-md:flex-col">
            <div className="bg-[rgba(255,255,255,0.06)] px-3 py-2 flex items-center justify-between border-b border-[rgba(255,255,255,0.08)]">
              <span className="corp-font-mono text-[0.6rem] text-[rgba(255,255,255,0.5)] tracking-[1px] uppercase max-md:text-[0.5rem]">
                Leaderboard
              </span>
              <span className="w-[6px] h-[6px] rounded-full bg-[#F26522]" />
            </div>
            <div className="px-3 py-[0.6rem] max-md:px-2 max-md:py-2 max-md:flex-1 max-md:overflow-hidden">
              <div className="text-[0.58rem] text-[rgba(255,255,255,0.3)] corp-font-mono mb-[0.4rem] tracking-[0.5px]">
                R&A CORP · DAY 18
              </div>
              {/* Lead row */}
              <div className="flex items-center gap-2 py-[0.3rem] border-b border-[rgba(255,255,255,0.05)]">
                <div className="corp-font-bebas text-[0.9rem] text-[#F5A623] w-[14px] text-center max-md:text-[0.7rem] max-md:w-[10px]">
                  1
                </div>
                <div className="text-[0.9rem]">🦁</div>
                <div className="flex-1 text-[0.68rem] text-[rgba(255,255,255,0.75)] font-medium max-md:text-[0.7rem]">
                  Lions
                </div>
                <div className="corp-font-bebas text-[0.95rem] text-[#F5A623]">
                  1840
                </div>
              </div>
              <div className="w-full h-[2px] bg-[rgba(255,255,255,0.07)] rounded-[1px] mt-[2px]">
                <div
                  className="h-full rounded-[1px] bg-[#F5A623]"
                  style={{ width: '94%' }}
                />
              </div>
              {/* Row 2 */}
              <div className="flex items-center gap-2 py-[0.3rem] border-b border-[rgba(255,255,255,0.05)]">
                <div className="corp-font-bebas text-[0.9rem] text-[rgba(255,255,255,0.2)] w-[14px] text-center max-md:text-[0.7rem] max-md:w-[10px]">
                  2
                </div>
                <div className="text-[0.9rem]">🐯</div>
                <div className="flex-1 text-[0.68rem] text-[rgba(255,255,255,0.75)] font-medium max-md:text-[0.7rem]">
                  Tigers
                </div>
                <div className="corp-font-bebas text-[0.95rem] text-[rgba(255,255,255,0.7)]">
                  1710
                </div>
              </div>
              <div className="w-full h-[2px] bg-[rgba(255,255,255,0.07)] rounded-[1px] mt-[2px]">
                <div
                  className="h-full rounded-[1px] bg-[#F26522]"
                  style={{ width: '88%' }}
                />
              </div>
              {/* Row 3 */}
              <div className="flex items-center gap-2 py-[0.3rem]">
                <div className="corp-font-bebas text-[0.9rem] text-[rgba(255,255,255,0.2)] w-[14px] text-center max-md:text-[0.7rem] max-md:w-[10px]">
                  3
                </div>
                <div className="text-[0.9rem]">🦅</div>
                <div className="flex-1 text-[0.68rem] text-[rgba(255,255,255,0.75)] font-medium max-md:text-[0.7rem]">
                  Eagles
                </div>
                <div className="corp-font-bebas text-[0.95rem] text-[rgba(255,255,255,0.7)]">
                  1480
                </div>
              </div>
              <div className="w-full h-[2px] bg-[rgba(255,255,255,0.07)] rounded-[1px] mt-[2px]">
                <div
                  className="h-full rounded-[1px] bg-[#F26522] opacity-65"
                  style={{ width: '76%' }}
                />
              </div>
            </div>
          </div>

          {/* Activity log screenshot */}
          <div className="bg-[#243760] border border-[rgba(255,255,255,0.12)] rounded-[10px] overflow-hidden flex-1 min-h-0 max-md:min-h-[120px] max-md:flex max-md:flex-col">
            <div className="bg-[rgba(255,255,255,0.06)] px-3 py-2 flex items-center justify-between border-b border-[rgba(255,255,255,0.08)]">
              <span className="corp-font-mono text-[0.6rem] text-[rgba(255,255,255,0.5)] tracking-[1px] uppercase max-md:text-[0.5rem]">
                My Activity · Today
              </span>
              <span className="w-[6px] h-[6px] rounded-full bg-[#F26522]" />
            </div>
            <div className="px-3 py-[0.6rem] max-md:px-2 max-md:py-2 max-md:flex-1 max-md:overflow-hidden">
              <div className="flex items-center justify-between py-[0.3rem] border-b border-[rgba(255,255,255,0.05)]">
                <span className="text-[0.67rem] text-[rgba(255,255,255,0.65)] max-md:text-[0.68rem]">
                  🚶 Steps — 8,240
                </span>
                <span className="text-[0.6rem] px-[6px] py-[1px] rounded-[2px] corp-font-mono bg-[rgba(15,110,86,0.3)] text-[#5DCAA5]">
                  ✓ Done
                </span>
              </div>
              <div className="flex items-center justify-between py-[0.3rem] border-b border-[rgba(255,255,255,0.05)]">
                <span className="text-[0.67rem] text-[rgba(255,255,255,0.65)] max-md:text-[0.68rem]">
                  🏸 Badminton · 45 min
                </span>
                <span className="text-[0.6rem] px-[6px] py-[1px] rounded-[2px] corp-font-mono bg-[rgba(15,110,86,0.3)] text-[#5DCAA5]">
                  ✓ Done
                </span>
              </div>
              <div className="flex items-center justify-between py-[0.3rem] border-b border-[rgba(255,255,255,0.05)]">
                <span className="text-[0.67rem] text-[rgba(255,255,255,0.65)] max-md:text-[0.68rem]">
                  🚶 Lunch walk · 20 min
                </span>
                <span className="text-[0.6rem] px-[6px] py-[1px] rounded-[2px] corp-font-mono bg-[rgba(15,110,86,0.3)] text-[#5DCAA5]">
                  ✓ Done
                </span>
              </div>
              <div className="flex items-center justify-between py-[0.3rem]">
                <span className="text-[0.67rem] text-[rgba(255,255,255,0.65)] max-md:text-[0.68rem]">
                  🏋️ Plank Relay Challenge
                </span>
                <span className="text-[0.6rem] px-[6px] py-[1px] rounded-[2px] corp-font-mono bg-[rgba(242,101,34,0.2)] text-[#F26522]">
                  Log now
                </span>
              </div>
              <div className="mt-2 px-2 py-[0.35rem] bg-[rgba(245,166,35,0.12)] rounded border border-[rgba(245,166,35,0.25)]">
                <div className="text-[0.62rem] text-[#F5A623] corp-font-mono">
                  +12 pts for team today 🔥
                </div>
              </div>
            </div>
          </div>

          {/* AI Coach screenshot */}
          <div className="bg-[#243760] border border-[rgba(255,255,255,0.12)] rounded-[10px] overflow-hidden flex-1 min-h-0 max-md:min-h-[120px] max-md:flex max-md:flex-col max-md:col-span-2">
            <div className="bg-[rgba(255,255,255,0.06)] px-3 py-2 flex items-center justify-between border-b border-[rgba(255,255,255,0.08)]">
              <span className="corp-font-mono text-[0.6rem] text-[rgba(255,255,255,0.5)] tracking-[1px] uppercase max-md:text-[0.5rem]">
                AI Coach
              </span>
              <span className="text-[0.58rem] text-[#5DCAA5]">● Live</span>
            </div>
            <div className="px-3 py-[0.6rem] max-md:px-2 max-md:py-2 max-md:flex-1 max-md:overflow-hidden">
              <div className="bg-[rgba(255,255,255,0.06)] rounded-[8px_8px_8px_2px] px-[0.6rem] py-[0.4rem] text-[0.67rem] text-[rgba(255,255,255,0.78)] leading-[1.5] mb-[0.35rem] max-md:text-[0.7rem]">
                Tigers are 130 pts behind Lions. Log today&apos;s run + Plank
                challenge to close the gap 💪
              </div>
              <div className="bg-[rgba(242,101,34,0.18)] rounded-[8px_8px_2px_8px] px-[0.6rem] py-[0.4rem] text-[0.67rem] text-[rgba(255,255,255,0.85)] leading-[1.5] text-right mb-[0.35rem] max-md:text-[0.7rem]">
                Any morning run routes near Hitech City?
              </div>
              <div className="bg-[rgba(255,255,255,0.06)] rounded-[8px_8px_8px_2px] px-[0.6rem] py-[0.4rem] text-[0.67rem] text-[rgba(255,255,255,0.78)] leading-[1.5] mb-[0.35rem] max-md:text-[0.7rem]">
                Inorbit → Cyber Towers loop, 2.2 km ~25 min. Priya from your
                team goes at 7am 🏃
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
