'use client';

const outcomes = [
  {
    num: '92%',
    label: 'Rated 4\u20135 stars overall',
    desc: 'Across pilot leagues spanning corporate, Rotary, and residential communities. Consistent satisfaction regardless of fitness level or age group.',
  },
  {
    num: '100%',
    label: 'Reported some fitness improvement',
    desc: 'Every participant moved more \u2014 including seniors and children. The team format means even low scorers show up because they don\u2019t want to let their wing down.',
  },
  {
    num: '76%',
    label: 'Wanted to play again immediately',
    desc: 'Three quarters asked for a Season 2 before Season 1 ended. Residential communities told us it was the most fun they\u2019d had as a society in years.',
  },
  {
    num: '#1',
    label: 'Outcome: Friendships across families',
    desc: 'Not fitness. Not weight loss. Families that had shared a compound for years and never spoken were planning weekend walks together by Week 3.',
  },
  {
    num: '4',
    label: 'Age groups active simultaneously',
    desc: 'Kids, teens, adults, and seniors all participating in the same league under one roof \u2014 each contributing points appropriate to their age and ability.',
  },
  {
    num: '20min',
    label: 'Full league setup by RWA committee',
    desc: 'Any committee member can configure and launch the league without technical help. No vendor. No coordinator. No proposal to approve.',
  },
];

export function ResidentialOutcomes() {
  return (
    <section className="px-16 py-24 bg-white scroll-mt-[60px] max-[960px]:px-4 max-[960px]:py-10 max-[960px]:w-full">
      <div className="font-['DM_Mono',monospace] text-[0.68rem] tracking-[3px] uppercase text-[#F26522] mb-4">
        What communities have told us
      </div>
      <h2 className="font-['Bebas_Neue',sans-serif] text-[clamp(2.4rem,3.8vw,3.8rem)] leading-none mb-4 text-[#1A2B4A] max-[960px]:text-[1.8rem] max-[960px]:leading-[1.1]">
        The numbers from
        <br />
        our pilot leagues.
      </h2>
      <div className="grid grid-cols-3 gap-[1px] mt-16 bg-[rgba(26,43,74,0.1)] max-[960px]:grid-cols-1 max-[960px]:gap-4 max-[960px]:w-full">
        {outcomes.map((o) => (
          <div key={o.num} className="bg-white px-8 py-10">
            <div className="font-['Bebas_Neue',sans-serif] text-[3.5rem] text-[#F26522] leading-none mb-1">
              {o.num}
            </div>
            <div className="text-base font-semibold mb-2 text-[#1A2B4A]">
              {o.label}
            </div>
            <div className="text-[0.82rem] text-[#6B7280] leading-[1.65]">
              {o.desc}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
