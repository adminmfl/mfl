'use client';

import { useState } from 'react';

const faqs = [
  {
    q: 'What\u2019s the difference between Activities and Challenges?',
    a: 'Activities run every day \u2014 individual habits like morning walks or yoga that each resident logs to earn points for their wing. Challenges are short team events (2\u20135 days) that the host deploys for excitement \u2014 a Table Tennis Tournament, Plank Relay, or Steps Matchup between wings. Activities build the habit; Challenges build the drama.',
  },
  {
    q: 'How do we choose activities for our society?',
    a: 'At setup the RWA host picks 1\u20133 daily activities \u2014 steps, yoga, walking, cycling, swimming, and more. Each activity has age-adjusted targets so an 8-year-old and a 70-year-old both earn meaningful points. The AI League Manager recommends the right mix based on your community profile.',
  },
  {
    q: 'Can children participate?',
    a: 'Yes \u2014 children from age 8 upwards participate under a parent\u2019s account. Activities have age-appropriate targets so a child\u2019s 3,000 steps earns the same points as an adult\u2019s 8,000. Everyone contributes to the team meaningfully regardless of age.',
  },
  {
    q: 'What about elderly residents who aren\u2019t tech-savvy?',
    a: 'Family members can log activities on behalf of elderly participants. The app is intentionally simple \u2014 one tap to log. Many seniors in our pilots became the most active participants once their grandchildren showed them the leaderboard.',
  },
  {
    q: 'How are teams formed \u2014 by wing, tower, or random?',
    a: 'You choose at setup. Wing vs wing uses the natural geography of your society and works brilliantly for larger communities. Cross-wing random teams mix neighbours and work better for smaller societies where meeting new people is the primary goal.',
  },
  {
    q: 'Does the RWA committee need to manage it daily?',
    a: 'No. The AI League Manager handles daily reminders, points updates, challenge deployments, and leaderboard communications automatically. Under 30 minutes a week from the committee is typical \u2014 mostly enjoying watching the society come alive.',
  },
  {
    q: 'Do residents need to download an app?',
    a: 'No App Store needed. MFL installs as a Progressive Web App from the browser in one tap. Works on all Android and iOS devices regardless of phone model or storage space.',
  },
  {
    q: 'How does the free trial work?',
    a: 'Your league goes live and runs free for the first 7 days \u2014 teams are active, the leaderboard is live, residents are logging. No card required upfront. If the society loves it (they will), you pay to unlock the rest of the season. If not, you walk away owing nothing.',
  },
];

export function ResidentialFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section className="px-16 py-24 bg-white scroll-mt-[60px] max-[960px]:px-4 max-[960px]:py-10 max-[960px]:w-full">
      <div className="font-['DM_Mono',monospace] text-[0.68rem] tracking-[3px] uppercase text-[#F26522] mb-4">
        Questions
      </div>
      <h2 className="font-['Bebas_Neue',sans-serif] text-[clamp(2.4rem,3.8vw,3.8rem)] leading-none mb-4 text-[#1A2B4A] max-[960px]:text-[1.8rem] max-[960px]:leading-[1.1]">
        What societies
        <br />
        always ask us.
      </h2>
      <div className="grid grid-cols-2 gap-x-16 gap-y-0 mt-16 max-[960px]:grid-cols-1 max-[960px]:w-full">
        {faqs.map((faq, i) => (
          <div key={i} className="py-6 border-b border-[rgba(26,43,74,0.1)]">
            <button
              className="font-semibold text-[0.94rem] text-[#1A2B4A] cursor-pointer flex justify-between items-center bg-none border-none w-full text-left p-0 transition-colors duration-200 hover:text-[#0F6E56]"
              onClick={() => toggle(i)}
            >
              {faq.q}
              <span className="text-[0.8rem] text-[#0F6E56] transition-transform duration-200 ml-4 flex-shrink-0">
                {openIndex === i ? '\u25B2' : '\u25BC'}
              </span>
            </button>
            <div
              className={`text-[0.84rem] text-[#6B7280] leading-[1.65] mt-3 overflow-hidden transition-[max-height] duration-300 ease-out ${
                openIndex === i ? 'max-h-[500px]' : 'max-h-0'
              }`}
            >
              {faq.a}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
