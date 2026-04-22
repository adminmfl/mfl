import Link from 'next/link';

export function CorporateHowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Configure',
      desc: 'Answer 5 questions — headcount, fitness or bonding focus, duration. The AI League Manager sets up your complete league: teams, activities, challenges, schedule. Done in 5 minutes.',
      time: '5 minutes',
    },
    {
      num: '02',
      title: 'Launch — Opening Day',
      desc: 'Team reveal, captain selection, jersey colours, war cry. Run our 30-minute Opening Day playbook at your all-hands. Colleagues become teammates before a single activity is logged.',
      time: 'Week 1 · 30 min event',
    },
    {
      num: '03',
      title: 'Play Activities — daily, all league',
      desc: 'Each player logs their chosen activity every day — steps, a walk, a workout, badminton. Points go to the team. The leaderboard updates live. Bonds form through shared accountability.',
      time: 'Every day · 40–90 days',
    },
    {
      num: '04',
      title: 'Play Challenges — team events',
      desc: 'Every 5–7 days the host drops a bonus challenge — Table Tennis Tournament, Plank Relay, Steps Matchup. Short, team-based, high-energy. These are the moments the office talks about.',
      time: 'Every week',
    },
    {
      num: '05',
      title: 'Grand Finale — trophies, glory',
      desc: 'A live awards ceremony with physical trophies for the champion team and individual winners. Every player gets a personalised season card. 76% asked for Season 2 before Season 1 ended.',
      time: 'Day 40 · Finale',
    },
  ];

  const configItems = [
    {
      label: 'Organisation',
      value: 'R&A Associates · 53 people',
      type: 'text',
    },
    { label: 'Focus', value: 'Team Bonding + Fitness', type: 'badge' },
    { label: 'Duration', value: '40 days', type: 'text' },
    { label: 'Teams', value: '4 teams · 12–13 players', type: 'text' },
    { label: 'Daily activity', value: 'Steps + Sport', type: 'text' },
    { label: 'Challenges', value: '6 across the season', type: 'text' },
    { label: 'AI Coach', value: 'Every player', type: 'badge' },
    { label: 'Communication', value: 'AI automated', type: 'badge' },
  ];

  return (
    <section
      className="px-12 py-12 bg-white scroll-mt-[60px] max-md:px-4 max-md:py-8"
      id="how"
    >
      <div className="corp-font-mono text-[0.64rem] tracking-[3px] uppercase text-[#F26522] mb-2">
        The league in 5 steps
      </div>
      <h2 className="corp-font-bebas text-[clamp(1.9rem,3vw,3rem)] leading-none text-[#1A2B4A] mb-[0.65rem] max-md:text-[1.8rem] max-md:leading-[1.1]">
        Configure in minutes.
        <br />
        Bond for 40 days.
      </h2>
      <div className="grid grid-cols-2 gap-12 mt-7 items-start max-md:grid-cols-1">
        <div>
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex gap-[0.875rem] py-[0.875rem] border-b border-[rgba(26,43,74,0.1)] group ${
                i === 0 ? 'border-t border-t-[rgba(26,43,74,0.1)]' : ''
              }`}
            >
              <div className="corp-font-bebas text-[1.8rem] text-[rgba(26,43,74,0.12)] leading-none min-w-[32px] transition-colors duration-200 group-hover:text-[#F26522]">
                {step.num}
              </div>
              <div>
                <div className="font-semibold text-[0.9rem] text-[#1A2B4A] mb-[0.2rem]">
                  {step.title}
                </div>
                <div className="text-[0.8rem] text-[#6B7280] leading-[1.6]">
                  {step.desc}
                </div>
                <div className="corp-font-mono text-[0.6rem] text-[#F26522] tracking-[1px] mt-[0.3rem]">
                  {step.time}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="sticky top-20 max-md:static max-md:mt-6">
          <div className="bg-[#FAF9F7] border border-[rgba(26,43,74,0.1)] rounded-[6px] p-[1.4rem]">
            <div className="corp-font-mono text-[0.62rem] tracking-[2px] text-[#6B7280] uppercase mb-[0.875rem]">
              AI-Generated League Config
            </div>
            {configItems.map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-2 border-b border-[rgba(26,43,74,0.06)] text-[0.8rem]"
              >
                <span className="text-[#6B7280]">{item.label}</span>
                {item.type === 'badge' ? (
                  <span className="bg-[#FDE8DC] text-[#C94E0E] text-[0.62rem] px-[7px] py-[2px] rounded-[2px] corp-font-mono">
                    {item.value}
                  </span>
                ) : (
                  <span className="font-medium text-[#1A2B4A]">
                    {item.value}
                  </span>
                )}
              </div>
            ))}
            <Link
              href="/signup"
              className="block w-full bg-[#F26522] text-white border-none py-[0.85rem] corp-font-sans text-[0.9rem] font-semibold cursor-pointer rounded-[3px] mt-4 transition-colors duration-200 hover:bg-[#C94E0E] text-center no-underline"
            >
              Launch This League →
            </Link>
            <div className="text-center text-[0.7rem] text-[#6B7280] corp-font-mono mt-[0.4rem]">
              First 7 days free · Love it, then pay
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
