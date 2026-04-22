'use client';

const dailyActivities = [
  '\u{1F6B6} Daily Steps',
  '\u{1F9D8} Morning Yoga',
  '\u{1F3C3} Society Walk / Jog',
  '\u{1F6B4} Cycling',
  '\u{1F3CA} Swimming',
  '\u{1F3CB}\uFE0F Gym Workout',
  '\u{1F3F8} Badminton',
];

const bonusChallenges = [
  '\u{1F3D3} Table Tennis Tournament',
  '\u{1F3CB}\uFE0F Plank Relay Challenge',
  '\u{1F45F} Steps Matchup \u2014 wing vs wing',
  '\u{1F6AB} No Sugar / No Junk Day',
  '\u{1F3CF} Cricket Match',
  '\u{1F9D8} Community Yoga Session',
  '\u{1F3B2} Board Games Tournament',
  '\u{1F483} Dance Competition',
];

export function ResidentialActivities() {
  return (
    <section className="px-8 py-24 bg-white max-[960px]:px-4 max-[960px]:py-10 max-[960px]:w-full">
      <div className="font-['DM_Mono',monospace] text-[0.68rem] tracking-[3px] uppercase text-[#F26522] mb-4">
        Activities &amp; Challenges
      </div>
      <h2 className="font-['Bebas_Neue',sans-serif] text-[clamp(2.4rem,3.8vw,3.8rem)] leading-none mb-4 text-[#1A2B4A] max-[960px]:text-[1.8rem] max-[960px]:leading-[1.1]">
        Two simple tools.
        <br />
        One lively community.
      </h2>
      <p className="text-base text-[#6B7280] leading-[1.75] max-w-[560px] font-light max-[960px]:max-w-full">
        Every MFL league runs on just two ingredients &mdash; Activities that
        everyone does daily and Challenges that fire up the competition. Your
        RWA host picks the mix at setup; MFL handles everything else.
      </p>

      <div className="flex flex-col gap-8 mt-10 max-w-full max-[960px]:gap-6 max-[960px]:w-full">
        {/* Daily Activities Column */}
        <div className="border border-[rgba(26,43,74,0.1)] rounded-lg px-14 py-10 bg-[#FAF9F7] w-full max-w-[1400px] mx-auto max-[960px]:px-4 max-[960px]:py-6 max-[960px]:w-full">
          <div className="bg-[#FDE8DC] rounded-md px-4 py-3 mb-4">
            <div className="font-bold text-[0.95rem] text-[#1A2B4A]">
              Daily Activities
            </div>
            <div className="text-[0.68rem] font-['DM_Mono',monospace] text-[#6B7280] tracking-[0.5px] mt-[3px]">
              Run the full league &middot; Individual &middot; Habit-forming
            </div>
          </div>
          <p className="text-[0.88rem] text-[#6B7280] leading-[1.75] mb-5 max-w-[90%]">
            Activities are the backbone of the league &mdash; running every day
            from Day 1 to Day 40. Each resident logs their own activity and
            earns points for their wing or team. Age-appropriate targets mean
            everyone can contribute meaningfully.
          </p>
          <div className="text-[0.68rem] font-['DM_Mono',monospace] tracking-[1.5px] uppercase text-[#6B7280] mb-[0.6rem]">
            Popular community activities
          </div>
          <div className="flex flex-wrap gap-2 mb-5 max-w-[95%]">
            {dailyActivities.map((a) => (
              <div
                key={a}
                className="text-[0.78rem] px-[11px] py-[5px] bg-white border border-[rgba(26,43,74,0.1)] rounded-[20px] text-[#1A2B4A] font-medium"
              >
                {a}
              </div>
            ))}
          </div>
          <div className="flex gap-3 items-start p-[0.875rem] bg-white rounded-md border border-[rgba(26,43,74,0.1)]">
            <div className="text-[1.1rem] flex-shrink-0">{'\u{1F4A1}'}</div>
            <div className="text-[0.78rem] text-[#6B7280] leading-[1.6]">
              RWA host picks 1&ndash;3 activities at setup. Each has an
              age-adjusted minimum &mdash; grandparent and grandchild both earn
              full points for completing their level. The leaderboard updates
              live every day.
            </div>
          </div>
        </div>

        {/* Bonus Challenges Column */}
        <div className="border border-[rgba(26,43,74,0.1)] rounded-lg px-14 py-10 bg-[#FAF9F7] w-full max-w-[1400px] mx-auto max-[960px]:px-4 max-[960px]:py-6 max-[960px]:w-full">
          <div className="bg-[#EEF1F7] rounded-md px-4 py-3 mb-4">
            <div className="font-bold text-[0.95rem] text-[#1A2B4A]">
              Bonus Challenges
            </div>
            <div className="text-[0.68rem] font-['DM_Mono',monospace] text-[#6B7280] tracking-[0.5px] mt-[3px]">
              Time-limited &middot; Team-based &middot; Energy boosters
            </div>
          </div>
          <p className="text-[0.88rem] text-[#6B7280] leading-[1.75] mb-5 max-w-[90%]">
            Challenges are short, team-based events that the host deploys during
            the league to keep things exciting, spark new conversations between
            neighbours, and reward collective effort. They run for 2&ndash;5
            days and award bonus points to the team.
          </p>
          <div className="text-[0.68rem] font-['DM_Mono',monospace] tracking-[1.5px] uppercase text-[#6B7280] mb-[0.6rem]">
            Real challenges from community leagues
          </div>
          <div className="flex flex-wrap gap-2 mb-5 max-w-[95%]">
            {bonusChallenges.map((c) => (
              <div
                key={c}
                className="text-[0.78rem] px-[11px] py-[5px] bg-[#EEF1F7] border border-[rgba(26,43,74,0.15)] rounded-[20px] text-[#1A2B4A] font-medium"
              >
                {c}
              </div>
            ))}
          </div>
          <div className="flex gap-3 items-start p-[0.875rem] bg-white rounded-md border border-[rgba(26,43,74,0.1)]">
            <div className="text-[1.1rem] flex-shrink-0">{'\u{1F4A1}'}</div>
            <div className="text-[0.78rem] text-[#6B7280] leading-[1.6]">
              Starter plans include 4 challenges, Society and Large Society
              include 6. Extend the league to 60 or 90 days and unlock 2&ndash;4
              more. The AI League Manager recommends the next challenge and
              deploys it upon host confirmation.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-[0.84rem] text-[#6B7280] p-4 bg-[#EEF1F7] rounded-md border border-[rgba(26,43,74,0.1)] max-w-[1400px] mx-auto">
        Setting up is simple: pick your daily activities &rarr; choose your
        challenge schedule &rarr; launch. The AI League Manager walks your RWA
        committee through every step in under 5 minutes.
      </div>
    </section>
  );
}
