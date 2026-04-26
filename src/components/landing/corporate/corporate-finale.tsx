export function CorporateFinale() {
  const awardCategories = [
    {
      icon: '🏆',
      title: 'Team Awards — every team gets one',
      desc: 'League Champions, Runners-Up, Most Consistent, Best Team Spirit — and more. Every team walks away with a trophy. Host picks the category names.',
      special: false,
    },
    {
      icon: '🌟',
      title: 'Individual Awards',
      desc: "Most Active Player, Best Streak, Most Improved — plus whatever the host adds as surprises. There's always one award nobody saw coming.",
      special: false,
    },
    {
      icon: '👑',
      title: 'Leadership Awards',
      desc: "Best Captain, Best Vice-Captain — recognising the people who kept their team going when the leaderboard got tough. Host's call on how many.",
      special: false,
    },
    {
      icon: '📊',
      title: 'Season card for every player',
      desc: 'Personal stats — steps, workouts, challenges won, team rank. Every participant gets one. A keepsake from 40 days of moving and bonding together.',
      special: false,
    },
  ];

  const finaleAwards = [
    '🥇 Lions — League Champions · 1,840 pts',
    '🥈 Tigers — Runners Up · 1,710 pts',
    '🥉 Eagles — Third Place · 1,480 pts',
    '🏃 Most Active — Priya M · 42,180 steps',
    '👑 Best Captain — Rashida K · Lions',
  ];

  return (
    <section
      className="px-12 py-12 bg-[#FDF3DC] border-t-[3px] border-[#F5A623] scroll-mt-[60px] max-md:px-4 max-md:py-8"
      id="finale"
    >
      <div className="corp-font-mono text-[0.64rem] tracking-[3px] uppercase text-[#F26522] mb-2">
        Grand Finale
      </div>
      <h2 className="corp-font-bebas text-[clamp(1.9rem,3vw,3rem)] leading-none text-[#1A2B4A] mb-[0.65rem] max-md:text-[1.8rem] max-md:leading-[1.1]">
        🏆 Trophy day.
        <br />
        Every team celebrated.
      </h2>
      <div className="grid grid-cols-2 gap-10 mt-7 items-start max-md:grid-cols-1">
        {/* Left */}
        <div>
          <p className="text-[0.9rem] text-[#6B7280] leading-[1.72] mb-6 font-light">
            The Grand Finale is a live event — hundreds of players, all teams on
            stage, trophies lifted, confetti flying. Not a notification. Not a
            Zoom call. A proper celebration that makes 40 days of hard work feel
            like a season worth winning. Every player walks away with something
            to remember.
          </p>

          <div className="flex flex-col gap-[0.875rem] mt-5">
            {awardCategories.map((cat, i) => (
              <div
                key={i}
                className="flex items-start gap-[0.875rem] p-[0.875rem] bg-white border border-[rgba(26,43,74,0.1)] rounded-[6px]"
              >
                <div className="text-[1.4rem] shrink-0 mt-[1px]">
                  {cat.icon}
                </div>
                <div>
                  <div className="font-semibold text-[0.88rem] text-[#1A2B4A] mb-1">
                    {cat.title}
                  </div>
                  <div className="text-[0.78rem] text-[#6B7280] leading-[1.55]">
                    {cat.desc}
                  </div>
                </div>
              </div>
            ))}
            {/* Special certificate card */}
            <div
              className="flex items-start gap-[0.875rem] p-[0.875rem] border border-[rgba(245,166,35,0.35)] rounded-[6px]"
              style={{ background: 'linear-gradient(135deg, #FDF3DC, #fff)' }}
            >
              <div className="text-[1.4rem] shrink-0 mt-[1px]">🎓</div>
              <div>
                <div className="font-semibold text-[0.88rem] text-[#1A2B4A] mb-1">
                  League Finisher Certificate — every player
                </div>
                <div className="text-[0.78rem] text-[#6B7280] leading-[1.55]">
                  A personalised digital certificate for completing the league —
                  with your name, team, and season stats. Print it, post it on
                  LinkedIn, or share it with friends and family. You earned it.
                </div>
                <div className="mt-2 flex gap-[0.4rem] flex-wrap">
                  <span className="text-[0.65rem] px-2 py-[3px] bg-[rgba(26,43,74,0.08)] rounded-[3px] text-[#1A2B4A] corp-font-mono">
                    🖨️ Print-ready
                  </span>
                  <span className="text-[0.65rem] px-2 py-[3px] bg-[rgba(26,43,74,0.08)] rounded-[3px] text-[#1A2B4A] corp-font-mono">
                    💼 Share on LinkedIn
                  </span>
                  <span className="text-[0.65rem] px-2 py-[3px] bg-[rgba(26,43,74,0.08)] rounded-[3px] text-[#1A2B4A] corp-font-mono">
                    📱 Share with family
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Photo grid */}
        <div>
          <div className="flex flex-col gap-3">
            {/* Main photo */}
            <div className="relative rounded-lg overflow-hidden">
              <img
                src="/images/gabin-vallet-J154nEkpzlQ-unsplash.jpg"
                alt="Champions lifting trophy cup crowd celebration"
                className="w-full h-[220px] object-cover block brightness-[0.82]"
              />
              <div
                className="absolute bottom-0 left-0 right-0 px-4 py-3 corp-font-bebas text-[1.1rem] text-[#F5A623] tracking-[0.5px]"
                style={{
                  background:
                    'linear-gradient(transparent, rgba(26,43,74,0.92))',
                }}
              >
                🏆 Champions crowned — R&A Corp League Season 1
              </div>
            </div>
            {/* Small photos */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative rounded-[6px] overflow-hidden">
                <img
                  src="/images/marvin-cors-qWWawTh_IY0-unsplash.jpg"
                  alt="Trophy cup winners collecting award stage"
                  className="w-full h-[130px] object-cover block brightness-[0.78]"
                />
                <div
                  className="absolute bottom-0 left-0 right-0 px-3 py-2 text-[0.72rem] text-[rgba(255,255,255,0.85)] corp-font-mono tracking-[0.5px]"
                  style={{
                    background:
                      'linear-gradient(transparent, rgba(26,43,74,0.9))',
                  }}
                >
                  Trophies ready for the stage
                </div>
              </div>
              <div className="relative rounded-[6px] overflow-hidden">
                <img
                  src="/images/anna-stampfli-q0PZ3BoFmCE-unsplash.jpg"
                  alt="Crowd confetti fireworks celebration event"
                  className="w-full h-[130px] object-cover block brightness-[0.78]"
                />
                <div
                  className="absolute bottom-0 left-0 right-0 px-3 py-2 text-[0.72rem] text-[rgba(255,255,255,0.85)] corp-font-mono tracking-[0.5px]"
                  style={{
                    background:
                      'linear-gradient(transparent, rgba(26,43,74,0.9))',
                  }}
                >
                  All teams on stage
                </div>
              </div>
            </div>
            {/* Award bar */}
            <div className="bg-[#1A2B4A] rounded-[6px] px-4 py-[0.875rem] flex flex-col gap-[0.4rem]">
              {finaleAwards.map((award, i) => (
                <div
                  key={i}
                  className="text-[0.78rem] text-[rgba(255,255,255,0.8)] py-[0.3rem] border-b border-[rgba(255,255,255,0.07)] last:border-none"
                >
                  {award}
                </div>
              ))}
              <div className="text-[0.78rem] text-[#F5A623] py-[0.3rem] border-b border-[rgba(245,166,35,0.2)] last:border-none">
                🎓 53 League Finisher Certificates awarded
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
