'use client';

import { useState } from 'react';

const faqItems = [
  {
    q: "What's the difference between Activities and Challenges?",
    a: 'Activities run every day of the league — individual habits like daily steps, a jog or badminton session that earn team points consistently. Challenges are team events running 1–2 weeks that the host deploys for excitement — a Table Tennis Tournament, Plank Relay, or Steps Matchup. Activities build the habit; Challenges build the drama.',
  },
  {
    q: 'How do we customise activities and challenges?',
    a: 'Host picks from 10–12 fitness activities in the library — steps, jogging, badminton, gym, yoga, cycling, swimming and more — or adds custom ones. Each activity has a configurable minimum target. Challenges are fully customizable too: duration (1–2 weeks), rules, proof method, and points — all set by the host.',
  },
  {
    q: 'How does the free trial work?',
    a: 'Your league goes live and the first 7 days are completely free — teams active, leaderboard running, players logging. No card required. If your team loves it, you pay to continue. If not, you walk away owing nothing.',
  },
  {
    q: 'How often do challenges run and who manages them?',
    a: "Challenges run for 1–2 weeks each and are spaced across the league. The AI League Manager recommends which challenge to run next and when — the host reviews and confirms before it's deployed. Once confirmed, the AI handles the announcement, reminders, and awarding of points. Starter plans get 4 challenges, Growth and Enterprise get 6. Extend to 60 or 90 days to unlock more.",
  },
  {
    q: 'What awards are given at the Grand Finale?',
    a: "Three categories: Team Awards (every team gets one — Champions, Runners-Up, and host-named categories beyond that), Individual Awards (Most Active, Best Streak, Most Improved as examples — host adds their own surprises), and Leadership Awards for standout captains. Every participant also gets a personalised season stats card and a League Finisher Certificate — a shareable digital certificate they can print, post on LinkedIn, or share with family. The exact award names and number are fully the host's call.",
  },
  {
    q: 'Do employees need to download an app?',
    a: 'MFL is a Progressive Web App — installs from the browser, no App Store or IT approval needed. Works on all Android and iOS phones.',
  },
  {
    q: 'How much HR time does this take weekly?',
    a: 'Under 30 minutes. The AI League Manager handles daily reminders, points, challenge announcements, and motivation alerts automatically. You just watch the dashboard.',
  },
  {
    q: 'We already have a wellness app. Does MFL replace it?',
    a: 'No. MFL tracks teams, not individuals. A league season drives up usage of whatever step tracker your employees already own. They coexist perfectly.',
  },
  {
    q: 'Can we brand this as our own league?',
    a: 'Yes. Growth and Enterprise plans let you name the league, upload your logo, and use a custom URL. A small "Powered by MFL" badge stays — everything else is your brand.',
  },
];

export function CorporateFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="px-12 py-12 bg-white scroll-mt-[60px] max-md:px-4 max-md:py-8">
      <div className="corp-font-mono text-[0.64rem] tracking-[3px] uppercase text-[#F26522] mb-2">
        Questions
      </div>
      <h2 className="corp-font-bebas text-[clamp(1.9rem,3vw,3rem)] leading-none text-[#1A2B4A] mb-[0.65rem] max-md:text-[1.8rem] max-md:leading-[1.1]">
        Everything you&apos;re
        <br />
        thinking right now.
      </h2>
      <div className="mt-7 max-w-[800px] max-md:max-w-full">
        {faqItems.map((item, i) => (
          <div key={i} className="border-b border-[rgba(26,43,74,0.1)]">
            <button
              onClick={() => toggle(i)}
              className="w-full bg-transparent border-none cursor-pointer flex items-center justify-between py-4 text-left corp-font-sans text-[0.92rem] font-semibold text-[#1A2B4A] gap-4 hover:text-[#F26522] transition-colors duration-200"
            >
              <span>{item.q}</span>
              <span
                className="text-[0.65rem] text-[#F26522] shrink-0 transition-transform duration-200"
                style={{
                  transform:
                    openIndex === i ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                ▼
              </span>
            </button>
            {openIndex === i && (
              <div className="text-[0.82rem] text-[#6B7280] leading-[1.65] px-0 pt-[0.1rem] pb-4">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
