'use client';

import Link from 'next/link';

function Scoreboard() {
  const teams = [
    {
      rank: 1,
      emoji: '\u{1F31F}',
      name: 'Wing A \u2014 Sunrisers',
      captain: 'Capt: Meera Iyer \u00B7 12 families',
      pts: '3,140',
      width: '96%',
      color: '#F5A623',
      opacity: 1,
      leader: true,
    },
    {
      rank: 2,
      emoji: '\u{1F525}',
      name: 'Wing C \u2014 Challengers',
      captain: 'Capt: Rajesh Nair \u00B7 11 families',
      pts: '2,980',
      width: '90%',
      color: '#F26522',
      opacity: 1,
      leader: false,
    },
    {
      rank: 3,
      emoji: '\u{1F4AA}',
      name: 'Wing B \u2014 Warriors',
      captain: 'Capt: Priya Sharma \u00B7 10 families',
      pts: '2,710',
      width: '82%',
      color: '#F26522',
      opacity: 0.7,
      leader: false,
    },
    {
      rank: 4,
      emoji: '\u{1F3C3}',
      name: 'Wing D \u2014 Strikers',
      captain: 'Capt: Anand Kumar \u00B7 11 families',
      pts: '2,430',
      width: '73%',
      color: '#F26522',
      opacity: 0.5,
      leader: false,
    },
  ];

  return (
    <div className="w-full max-w-[380px] relative z-[1] animate-[fadeUp_0.9s_0.25s_ease_both]">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-block bg-[#0F6E56] text-white font-['DM_Mono',monospace] text-[0.62rem] tracking-[2px] uppercase px-3 py-1 rounded-[2px] mb-3">
          Live Leaderboard
        </div>
        <div className="font-['Bebas_Neue',sans-serif] text-[1.8rem] text-white tracking-[1px]">
          Prestige Palms League
        </div>
        <div className="font-['DM_Mono',monospace] text-[0.68rem] text-[rgba(255,255,255,0.38)] tracking-[1px] mt-1">
          Day 22 of 40 &middot; 5 Wings Competing
        </div>
      </div>

      {/* Team Rows */}
      {teams.map((team) => (
        <div key={team.rank}>
          <div
            className={`rounded-[4px] px-[1.1rem] py-[0.9rem] mb-[6px] flex items-center gap-[0.9rem] ${
              team.leader
                ? 'border border-[rgba(245,166,35,0.45)] bg-[rgba(245,166,35,0.07)]'
                : 'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)]'
            }`}
          >
            <div
              className={`font-['Bebas_Neue',sans-serif] text-[1.3rem] w-[22px] text-center ${
                team.leader ? 'text-[#F5A623]' : 'text-[rgba(255,255,255,0.18)]'
              }`}
            >
              {team.rank}
            </div>
            <div className="text-[1.3rem]">{team.emoji}</div>
            <div className="flex-1">
              <div className="font-medium text-white text-[0.88rem] mb-[2px]">
                {team.name}
              </div>
              <div className="text-[0.67rem] text-[rgba(255,255,255,0.38)] font-['DM_Mono',monospace]">
                {team.captain}
              </div>
            </div>
            <div className="text-right">
              <div
                className={`font-['Bebas_Neue',sans-serif] text-[1.5rem] leading-none ${
                  team.leader ? 'text-[#F5A623]' : 'text-white'
                }`}
              >
                {team.pts}
              </div>
              <div className="text-[0.62rem] text-[rgba(255,255,255,0.3)] font-['DM_Mono',monospace] tracking-[1px]">
                pts
              </div>
            </div>
          </div>
          <div className="h-[2px] bg-[rgba(255,255,255,0.07)] rounded-[1px] my-1 mb-2">
            <div
              className="h-full rounded-[1px]"
              style={{
                width: team.width,
                background: team.color,
                opacity: team.opacity,
              }}
            />
          </div>
        </div>
      ))}

      {/* Age Pills */}
      <div className="flex flex-wrap gap-[6px] mt-5 max-[960px]:gap-[0.3rem] max-[960px]:mt-[0.65rem]">
        {[
          'Kids 8\u201314 \u2713',
          'Teens 15\u201324 \u2713',
          'Adults 25\u201355 \u2713',
          'Seniors 55+ \u2713',
        ].map((pill) => (
          <div
            key={pill}
            className="text-[0.68rem] font-['DM_Mono',monospace] tracking-[0.5px] px-[10px] py-1 rounded-[20px] bg-[rgba(15,110,86,0.3)] text-[#5DCAA5] border border-[rgba(15,110,86,0.4)] max-[960px]:text-[0.62rem] max-[960px]:px-[7px] max-[960px]:py-[3px]"
          >
            {pill}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.07)] flex justify-between">
        {[
          { num: '186', label: 'Residents' },
          { num: '4', label: 'Age groups' },
          { num: '18', label: 'Days left' },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="font-['Bebas_Neue',sans-serif] text-[1.2rem] text-[#F26522]">
              {stat.num}
            </div>
            <div className="text-[0.62rem] text-[rgba(255,255,255,0.3)] font-['DM_Mono',monospace] tracking-[1px]">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResidentialHero() {
  return (
    <section className="min-h-[calc(100vh-104px)] grid grid-cols-2 max-[960px]:grid-cols-1 max-[960px]:w-full">
      {/* Left */}
      <div className="flex flex-col justify-center px-16 py-20 max-[960px]:px-4 max-[960px]:py-10 max-[960px]:w-full">
        <div className="font-['DM_Mono',monospace] text-[0.7rem] tracking-[3px] uppercase text-[#0F6E56] mb-6 flex items-center gap-[10px] animate-[fadeUp_0.6s_ease_both] before:content-[''] before:inline-block before:w-7 before:h-[2px] before:bg-[#0F6E56]">
          Residential Community Leagues
        </div>
        <h1 className="font-['Bebas_Neue',sans-serif] text-[clamp(3.2rem,5.2vw,5.5rem)] leading-[0.95] tracking-[1px] mb-8 text-[#1A2B4A] animate-[fadeUp_0.7s_0.08s_ease_both] max-[960px]:text-[2rem] max-[960px]:leading-[1.1]">
          Your Society.
          <br />
          <span className="text-[#F26522]">One League.</span>
          <br />
          <span className="text-[#0F6E56]">Every Generation.</span>
        </h1>
        <p className="text-[1.05rem] text-[#6B7280] leading-[1.75] max-w-[460px] mb-10 font-light animate-[fadeUp_0.7s_0.18s_ease_both] max-[960px]:text-[0.85rem] max-[960px]:max-w-full">
          MFL brings your apartment community together &mdash; grandparents,
          parents, teenagers, toddler-chasing moms &mdash; all competing as{' '}
          <strong className="text-[#1A2B4A] font-semibold">
            one league, across buildings and wings.
          </strong>{' '}
          Neighbours who nodded in the lift are suddenly on the same team.
        </p>
        <div className="flex items-center gap-6 flex-wrap animate-[fadeUp_0.7s_0.28s_ease_both] max-[960px]:w-full">
          <Link
            href="/signup"
            className="bg-[#F26522] text-white border-none px-[2.4rem] py-4 font-['DM_Sans',sans-serif] text-[0.95rem] font-semibold cursor-pointer rounded-[3px] no-underline inline-block transition-all duration-200 hover:bg-[#C94E0E] hover:-translate-y-[1px] max-[960px]:w-full max-[960px]:text-center max-[960px]:px-[1.3rem] max-[960px]:py-[0.8rem] max-[960px]:text-[0.85rem]"
          >
            Set Up Your Society League &rarr;
          </Link>
          <a
            href="#how"
            className="text-[#1A2B4A] text-[0.88rem] font-medium no-underline flex items-center gap-[5px] border-b-[1.5px] border-[#1A2B4A] pb-[2px] transition-all duration-200 hover:text-[#F26522] hover:border-[#F26522]"
          >
            See how it works &darr;
          </a>
        </div>
        <div className="mt-12 flex items-center gap-8 animate-[fadeUp_0.7s_0.38s_ease_both]">
          {[
            { num: '92%', label: 'Rated 4\u20135 stars' },
            { num: '100%', label: 'Fitness improvement' },
            { num: '76%', label: 'Want to play again' },
          ].map((item, i) => (
            <div key={item.label} className="flex items-center gap-8">
              {i > 0 && (
                <div className="w-[1px] h-[38px] bg-[rgba(26,43,74,0.1)]" />
              )}
              <div>
                <div className="font-['Bebas_Neue',sans-serif] text-[2rem] text-[#1A2B4A] leading-none">
                  {item.num}
                </div>
                <div className="text-[0.7rem] text-[#6B7280] mt-[3px]">
                  {item.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Scoreboard */}
      <div className="bg-[#1A2B4A] flex items-center justify-center px-12 py-16 relative overflow-hidden max-[960px]:min-h-[420px] max-[960px]:-order-1 max-[960px]:w-full before:content-[''] before:absolute before:top-[-80px] before:right-[-80px] before:w-[360px] before:h-[360px] before:rounded-full before:bg-[#0F6E56] before:opacity-10 after:content-[''] after:absolute after:bottom-[-60px] after:left-[-60px] after:w-[260px] after:h-[260px] after:rounded-full after:bg-[#F26522] after:opacity-[0.07]">
        <Scoreboard />
      </div>
    </section>
  );
}
