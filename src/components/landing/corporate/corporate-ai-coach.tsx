export function CorporateAiCoach() {
  const capabilities = [
    {
      icon: '🎯',
      title: 'Knows your goals & preferences',
      desc: 'Sets up with your workout style, intensity, preferred timing, and league objectives. Guides you on what actually works for you.',
    },
    {
      icon: '📅',
      title: 'Plans your week for max team points',
      desc: "Recommends which activities to do which days — always with your team's leaderboard position in mind.",
    },
    {
      icon: '🏆',
      title: 'Leaderboard strategy, not just motivation',
      desc: 'Identifies the gap to the team above, which challenges to target, and what teammates need from you this week.',
    },
    {
      icon: '🔔',
      title: 'Nudges before you forget',
      desc: 'Reminds you before challenges close, alerts when your team is slipping, celebrates when you move the needle.',
    },
    {
      icon: '🤝',
      title: 'Helps motivate your teammates',
      desc: 'Suggests what to say to a struggling teammate, who to pair up with, and how to lift team energy when the leaderboard gets tight.',
    },
    {
      icon: '📈',
      title: 'Tracks your personal arc',
      desc: 'Your streak, personal bests, and team contribution week by week. Every player leaves with a full view of their season.',
    },
  ];

  return (
    <section className="px-12 py-12 bg-[#FAF9F7] scroll-mt-[60px] max-md:px-4 max-md:py-8">
      <div className="corp-font-mono text-[0.64rem] tracking-[3px] uppercase text-[#F26522] mb-2">
        AI Personal Coach
      </div>
      <h2 className="corp-font-bebas text-[clamp(1.9rem,3vw,3rem)] leading-none text-[#1A2B4A] mb-[0.65rem] max-md:text-[1.8rem] max-md:leading-[1.1]">
        Every player gets a<br />
        <span className="text-[#F26522]">coach in their pocket.</span>
      </h2>
      <p className="text-[0.9rem] text-[#6B7280] leading-[1.7] max-w-[560px] font-light max-md:max-w-full">
        Not a generic chatbot. A coach that knows your goals, your schedule,
        your workout preferences — and guides you every single day of the
        league.
      </p>
      <div className="grid grid-cols-[1fr_1.5fr] gap-12 mt-7 items-start max-md:grid-cols-1">
        {/* Phone mockup */}
        <div className="flex justify-center">
          <div className="w-[280px] bg-[#1A2B4A] rounded-[22px] p-[1.1rem] border-[5px] border-[#243760] max-md:w-[220px] max-md:max-w-full">
            <div className="flex items-center justify-between mb-[0.875rem] pb-[0.65rem] border-b border-[rgba(255,255,255,0.08)]">
              <div className="w-[9px] h-[9px] rounded-full bg-[#F26522]" />
              <span className="corp-font-mono text-[0.66rem] text-[rgba(255,255,255,0.55)] tracking-[1px]">
                MFL Coach
              </span>
              <span className="text-[0.58rem] text-[#5DCAA5]">● Live</span>
            </div>
            <div className="flex flex-col gap-[0.65rem]">
              {/* Bot message */}
              <div className="flex items-end gap-[7px]">
                <div className="text-[1rem] shrink-0">🤖</div>
                <div className="bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.08)] rounded-[10px_10px_10px_2px] px-3 py-[0.55rem] text-[0.72rem] text-[rgba(255,255,255,0.82)] leading-[1.52] max-w-[188px]">
                  Morning Arjun! Tigers are 130 pts behind Lions. A run + Plank
                  Challenge today closes the gap. 7am works for you?
                </div>
              </div>
              {/* User message */}
              <div className="flex items-end gap-[7px] flex-row-reverse">
                <div className="bg-[rgba(242,101,34,0.2)] border border-[rgba(242,101,34,0.3)] rounded-[10px_10px_2px_10px] px-3 py-[0.55rem] text-[0.72rem] text-[rgba(255,255,255,0.9)] leading-[1.52] max-w-[188px]">
                  Sure — route near Hitech City?
                </div>
                <div className="text-[1rem] shrink-0">👤</div>
              </div>
              {/* Bot message */}
              <div className="flex items-end gap-[7px]">
                <div className="text-[1rem] shrink-0">🤖</div>
                <div className="bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.08)] rounded-[10px_10px_10px_2px] px-3 py-[0.55rem] text-[0.72rem] text-[rgba(255,255,255,0.82)] leading-[1.52] max-w-[188px]">
                  Inorbit → Cyber Towers, 2.2 km, ~25 min. Priya from your team
                  goes at 7am 🏃
                </div>
              </div>
              {/* Bot message */}
              <div className="flex items-end gap-[7px]">
                <div className="text-[1rem] shrink-0">🤖</div>
                <div className="bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.08)] rounded-[10px_10px_10px_2px] px-3 py-[0.55rem] text-[0.72rem] text-[rgba(255,255,255,0.82)] leading-[1.52] max-w-[188px]">
                  Plank Challenge closes tonight at 8pm — 50 bonus pts for the
                  team. Want a 6pm reminder?
                </div>
              </div>
              {/* User message */}
              <div className="flex items-end gap-[7px] flex-row-reverse">
                <div className="bg-[rgba(242,101,34,0.2)] border border-[rgba(242,101,34,0.3)] rounded-[10px_10px_2px_10px] px-3 py-[0.55rem] text-[0.72rem] text-[rgba(255,255,255,0.9)] leading-[1.52] max-w-[188px]">
                  Yes please!
                </div>
                <div className="text-[1rem] shrink-0">👤</div>
              </div>
            </div>
          </div>
        </div>
        {/* Capability cards */}
        <div className="grid grid-cols-2 gap-[0.875rem] max-md:grid-cols-1">
          {capabilities.map((cap, i) => (
            <div
              key={i}
              className="bg-white border border-[rgba(26,43,74,0.1)] rounded-[7px] p-[1.1rem] flex gap-3 items-start"
            >
              <div className="text-[1.2rem] shrink-0 mt-[1px]">{cap.icon}</div>
              <div>
                <div className="font-semibold text-[0.85rem] text-[#1A2B4A] mb-1">
                  {cap.title}
                </div>
                <div className="text-[0.76rem] text-[#6B7280] leading-[1.58]">
                  {cap.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
