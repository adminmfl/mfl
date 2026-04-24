'use client';

const chatMessages = [
  {
    type: 'coach',
    avatar: '\u{1F916}',
    text: 'Good morning Meera! Wing A is just 90 pts ahead of Wing C. A 30-min morning walk today keeps your lead. Want a reminder at 6:30am?',
  },
  {
    type: 'user',
    avatar: '\u{1F464}',
    text: 'Yes! Also my knees have been sore.',
  },
  {
    type: 'coach',
    avatar: '\u{1F916}',
    text: 'Got it \u2014 skipping the step challenge today. Instead: 15-min gentle yoga earns 8 pts and is easier on your knees. I\u2019ll send you a quick routine \u{1F9D8}',
  },
  {
    type: 'coach',
    avatar: '\u{1F916}',
    text: 'Also \u2014 your son Ravi hasn\u2019t logged today. A nudge from you might be all he needs \u{1F604}',
  },
];

const capabilities = [
  {
    icon: '\u{1F3AF}',
    title: 'Adapts to your age, pace and preferences',
    desc: 'Sets up with your preferred activities, intensity, timing, and any physical limitations. A 68-year-old and a 16-year-old get very different guidance \u2014 from the same coach.',
  },
  {
    icon: '\u{1F4C5}',
    title: 'Plans your week to maximise team points',
    desc: 'Recommends which activities earn the most points this week, when to push harder, and when your rest day is safest \u2014 always with your team\u2019s leaderboard position in mind.',
  },
  {
    icon: '\u{1F3C6}',
    title: 'Tells you exactly how to climb the board',
    desc: 'Shows the gap to the wing above, which bonus challenges to target, and what your specific contribution needs to be this week to close it. Real strategy, not vague encouragement.',
  },
  {
    icon: '\u{1F514}',
    title: 'Nudges before you forget \u2014 not after',
    desc: 'Reminds you before a challenge closes, alerts you when your wing is slipping, and cheers when you\u2019ve moved the needle for the team. Timely, friendly, never spammy.',
  },
  {
    icon: '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}',
    title: 'Connects your family as a unit',
    desc: 'Tells you when a family member hasn\u2019t logged, suggests family activities that earn points together, and celebrates when multiple generations from the same household contribute on the same day.',
  },
  {
    icon: '\u{1F4C8}',
    title: 'Tracks your personal journey end to end',
    desc: 'Your streaks, personal bests, and week-by-week contribution to the team \u2014 all visible. Every resident leaves with a clear picture of what 40 days of moving together actually looks like.',
  },
];

export function ResidentialAiCoach() {
  return (
    <section className="px-16 py-24 bg-[#FAF9F7] max-[960px]:px-4 max-[960px]:py-10 max-[960px]:w-full">
      <div className="font-['DM_Mono',monospace] text-[0.68rem] tracking-[3px] uppercase text-[#F26522] mb-4">
        Meet your AI Personal Coach
      </div>
      <h2 className="font-['Bebas_Neue',sans-serif] text-[clamp(2.4rem,3.8vw,3.8rem)] leading-none mb-4 text-[#1A2B4A] max-[960px]:text-[1.8rem] max-[960px]:leading-[1.1]">
        Every resident gets a
        <br />
        <span className="text-[#F26522]">coach in their pocket.</span>
      </h2>
      <p className="text-base text-[#6B7280] leading-[1.75] max-w-[560px] font-light mb-12 max-[960px]:max-w-full">
        Not a generic app. A coach that learns your pace, your schedule, your
        preferences &mdash; and guides you every day of the league whether
        you&apos;re 14 or 74.
      </p>

      <div className="grid grid-cols-[1fr_1.4fr] gap-16 items-start max-[960px]:grid-cols-1 max-[960px]:w-full">
        {/* Phone Mockup */}
        <div className="flex justify-center max-[960px]:mb-4">
          <div className="w-[295px] bg-[#1A2B4A] rounded-3xl p-5 border-[6px] border-[#243760]">
            {/* Phone Bar */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(255,255,255,0.08)]">
              <div className="w-[10px] h-[10px] rounded-full bg-[#F26522]" />
              <span className="font-['DM_Mono',monospace] text-[0.7rem] text-[rgba(255,255,255,0.55)] tracking-[1px]">
                MFL Coach
              </span>
              <div className="text-[0.6rem] text-[#5DCAA5]">&bull;</div>
            </div>

            {/* Chat Area */}
            <div className="flex flex-col gap-3">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${
                    msg.type === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div className="text-[1.1rem] flex-shrink-0 mb-[2px]">
                    {msg.avatar}
                  </div>
                  <div
                    className={`px-[0.85rem] py-[0.6rem] text-[0.75rem] leading-[1.55] max-w-[195px] ${
                      msg.type === 'user'
                        ? 'bg-[rgba(242,101,34,0.2)] border border-[rgba(242,101,34,0.3)] rounded-[12px_12px_2px_12px] text-[rgba(255,255,255,0.9)]'
                        : 'bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.08)] rounded-[12px_12px_12px_2px] text-[rgba(255,255,255,0.82)]'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Capability Cards */}
        <div className="grid grid-cols-2 gap-4 max-[960px]:grid-cols-1">
          {capabilities.map((cap) => (
            <div
              key={cap.title}
              className="bg-white border border-[rgba(26,43,74,0.1)] rounded-lg p-5 flex gap-[0.875rem] items-start"
            >
              <div className="text-[1.3rem] flex-shrink-0 mt-[1px]">
                {cap.icon}
              </div>
              <div>
                <div className="font-semibold text-[0.88rem] text-[#1A2B4A] mb-[0.3rem]">
                  {cap.title}
                </div>
                <div className="text-[0.78rem] text-[#6B7280] leading-[1.6]">
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
