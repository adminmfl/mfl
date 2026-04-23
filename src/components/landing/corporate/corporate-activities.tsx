export function CorporateActivities() {
  const activities = [
    '🚶 Steps / Walking',
    '🏃 Jogging / Running',
    '🏋️ Gym Workout',
    '🧘 Yoga',
    '🚴 Cycling',
    '🏊 Swimming',
    '🏸 Badminton',
    '🤸 Stretching',
    '⛹️ Basketball',
    '🥊 Boxing / Martial Arts',
    '🧗 Climbing',
    '🕺 Dance / Zumba',
  ];

  const challenges = [
    '🏓 Table Tennis Tournament',
    '🏋️ Plank Relay',
    '👟 Steps Matchup — team vs team',
    '🚫 No Sugar / No Junk Day',
    '🏏 Cricket Match',
    '🧘 Team Yoga Session',
    '🎲 Board Games Tournament',
    '💃 Dance Competition',
  ];

  return (
    <section className="px-12 py-12 bg-white scroll-mt-[60px] max-md:px-4 max-md:py-8">
      <div className="corp-font-mono text-[0.64rem] tracking-[3px] uppercase text-[#F26522] mb-2">
        Activities &amp; Challenges
      </div>
      <h2 className="corp-font-bebas text-[clamp(1.9rem,3vw,3rem)] leading-none text-[#1A2B4A] mb-[0.65rem] max-md:text-[1.8rem] max-md:leading-[1.1]">
        Two ingredients.
        <br />
        One powerful league.
      </h2>
      <p className="text-[0.9rem] text-[#6B7280] leading-[1.7] max-w-[560px] font-light max-md:max-w-full">
        Activities build fitness and daily bonds. Challenges create team energy
        and unforgettable moments. Host picks the mix, sets the rules — MFL
        handles the rest.
      </p>
      <div className="grid grid-cols-2 gap-7 mt-7 max-md:grid-cols-1">
        {/* Activities column */}
        <div className="border border-[rgba(26,43,74,0.1)] rounded-lg p-6 bg-[#FAF9F7]">
          <div className="rounded-[5px] px-[0.875rem] py-[0.65rem] mb-[0.875rem] bg-[#FDE8DC]">
            <div className="font-bold text-[0.92rem] text-[#1A2B4A]">
              Daily Activities
            </div>
            <div className="text-[0.66rem] corp-font-mono text-[#6B7280] tracking-[0.5px] mt-[2px]">
              Individual · Whole league · Habit &amp; bonding
            </div>
          </div>
          <p className="text-[0.8rem] text-[#6B7280] leading-[1.62] mb-[1.1rem]">
            Each player logs their chosen activity every day of the league.
            Points go to the team — individual effort, collective reward. Host
            picks from 10–12 fitness activities, sets the minimum daily target
            for each, and can add custom ones. Fully configurable.
          </p>
          <div className="text-[0.65rem] corp-font-mono tracking-[1.5px] uppercase text-[#6B7280] mb-2">
            Choose any combination
          </div>
          <div className="flex flex-wrap gap-[5px] mb-4">
            {activities.map((a, i) => (
              <div
                key={i}
                className="text-[0.76rem] px-[10px] py-1 bg-white border border-[rgba(26,43,74,0.1)] rounded-[20px] text-[#1A2B4A] font-medium"
              >
                {a}
              </div>
            ))}
          </div>
          <div className="flex gap-[0.65rem] items-start p-3 bg-white rounded-[5px] border border-[rgba(26,43,74,0.1)]">
            <div className="text-[1rem] shrink-0">💡</div>
            <div className="text-[0.76rem] text-[#6B7280] leading-[1.58]">
              Host picks any activities from the library, sets minimum targets,
              and can add their own. Players log daily — the team leaderboard
              updates instantly. Everything is customizable.
            </div>
          </div>
        </div>
        {/* Challenges column */}
        <div className="border border-[rgba(26,43,74,0.1)] rounded-lg p-6 bg-[#FAF9F7]">
          <div className="rounded-[5px] px-[0.875rem] py-[0.65rem] mb-[0.875rem] bg-[#EEF1F7]">
            <div className="font-bold text-[0.92rem] text-[#1A2B4A]">
              Bonus Challenges
            </div>
            <div className="text-[0.66rem] corp-font-mono text-[#6B7280] tracking-[0.5px] mt-[2px]">
              Team-based · 1–2 weeks · Energy boosters
            </div>
          </div>
          <p className="text-[0.8rem] text-[#6B7280] leading-[1.62] mb-[1.1rem]">
            Team events the host deploys during the league. Each challenge runs
            for 1 to 2 weeks — long enough for teams to organise, compete, and
            bond over it. Host sets the duration, rules, and points. Fully
            customizable in number and design.
          </p>
          <div className="text-[0.65rem] corp-font-mono tracking-[1.5px] uppercase text-[#6B7280] mb-2">
            From MFL leagues
          </div>
          <div className="flex flex-wrap gap-[5px] mb-4">
            {challenges.map((c, i) => (
              <div
                key={i}
                className="text-[0.76rem] px-[10px] py-1 bg-[#EEF1F7] border border-[rgba(26,43,74,0.12)] rounded-[20px] text-[#1A2B4A] font-medium"
              >
                {c}
              </div>
            ))}
          </div>
          <div className="flex gap-[0.65rem] items-start p-3 bg-white rounded-[5px] border border-[rgba(26,43,74,0.1)]">
            <div className="text-[1rem] shrink-0">💡</div>
            <div className="text-[0.76rem] text-[#6B7280] leading-[1.58]">
              Starter: 4 challenges. Growth &amp; Enterprise: 6. Extend to 60 or
              90 days for 2–4 more. The AI League Manager recommends the next
              challenge — host confirms before it goes live.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
