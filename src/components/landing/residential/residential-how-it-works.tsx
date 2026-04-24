'use client';

import Link from 'next/link';

const steps = [
  {
    num: '01',
    title: 'Configure your community league',
    desc: 'Tell the AI League Manager your society name, number of families, how you want to form teams \u2014 by wing, tower, or random \u2014 and how long the league runs. It builds everything in under 3 minutes.',
    time: '~3 minutes',
    image: null,
  },
  {
    num: '02',
    title: 'Share the link on your society group',
    desc: 'Drop the registration link on WhatsApp. Residents sign up individually. No app download \u2014 it works in the browser. The platform handles team formation automatically.',
    time: '1\u20132 days',
    image: null,
  },
  {
    num: '03',
    title: 'Host an Opening Day at the clubhouse',
    desc: 'Team reveal, captain selection, jersey colours, war cry \u2014 all residents gathered. Families arrive not knowing their team. The reveal moment is electric.',
    time: 'Week 1 \u00B7 45 min event',
    image: {
      src: '/images/marvin-cors-qWWawTh_IY0-unsplash.jpg',
      alt: 'Colourful team jerseys community league',
    },
  },
  {
    num: '04',
    title: 'League runs itself for 40 days',
    desc: 'Residents log steps, workouts, yoga, cycling \u2014 whatever suits their age and ability. The AI handles reminders, points, and bonus challenges. The leaderboard goes up in the lobby. Competition is real.',
    time: '40 days',
    image: null,
  },
  {
    num: '05',
    title: 'Clubhouse Grand Finale \u2014 trophies, glory',
    desc: 'A live awards ceremony \u2014 trophies for all teams, individual awards, and a League Finisher Certificate for every participant. Print it, post it on WhatsApp, or share on LinkedIn. The society talks about it for months.',
    time: 'Finale day',
    image: null,
  },
];

const configItems = [
  { label: 'Society', value: 'Prestige Palms \u00B7 240 flats', badge: false },
  { label: 'Teams by', value: 'Wing / Tower', badge: true },
  { label: 'Duration', value: '40 days', badge: false },
  {
    label: 'Age groups',
    value: 'Kids \u00B7 Teens \u00B7 Adults \u00B7 Seniors',
    badge: false,
  },
  {
    label: 'Daily activities',
    value: 'Steps, Yoga, Cycling, Walk',
    badge: false,
  },
  {
    label: 'Bonus challenges',
    value: '6 \u2014 including family challenges',
    badge: false,
  },
  { label: 'Opening Day', value: 'Clubhouse playbook', badge: true },
  { label: 'Communication', value: 'AI automated', badge: true },
];

export function ResidentialHowItWorks() {
  return (
    <section
      id="how"
      className="px-16 py-24 bg-[#FAF9F7] scroll-mt-[60px] max-[960px]:px-4 max-[960px]:py-10 max-[960px]:w-full"
    >
      <div className="font-['DM_Mono',monospace] text-[0.68rem] tracking-[3px] uppercase text-[#F26522] mb-4">
        How it works
      </div>
      <h2 className="font-['Bebas_Neue',sans-serif] text-[clamp(2.4rem,3.8vw,3.8rem)] leading-none mb-4 text-[#1A2B4A] max-[960px]:text-[1.8rem] max-[960px]:leading-[1.1]">
        From idea to
        <br />
        league live in a day.
      </h2>
      <p className="text-base text-[#6B7280] leading-[1.75] max-w-[560px] font-light max-[960px]:max-w-full">
        No technical setup. Works on every phone. The RWA committee runs it
        &mdash; no external coordinator needed.
      </p>

      <div className="grid grid-cols-2 gap-20 mt-16 items-start max-[960px]:grid-cols-1 max-[960px]:gap-8 max-[960px]:w-full">
        {/* Steps */}
        <div>
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={`flex gap-6 py-7 border-b border-[rgba(26,43,74,0.1)] group ${
                i === 0 ? 'border-t border-t-[rgba(26,43,74,0.1)]' : ''
              }`}
            >
              <div className="font-['Bebas_Neue',sans-serif] text-[2.4rem] text-[rgba(26,43,74,0.1)] leading-none min-w-[44px] transition-colors duration-200 group-hover:text-[#F26522]">
                {step.num}
              </div>
              <div>
                <div className="font-semibold text-base mb-[0.4rem] text-[#1A2B4A]">
                  {step.title}
                </div>
                <div className="text-[0.84rem] text-[#6B7280] leading-[1.65]">
                  {step.desc}
                </div>
                {step.image && (
                  <div className="mt-3 rounded-md overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={step.image.src}
                      alt={step.image.alt}
                      className="w-full h-[110px] object-cover block rounded-md"
                    />
                  </div>
                )}
                <div className="font-['DM_Mono',monospace] text-[0.63rem] text-[#0F6E56] tracking-[1px] mt-2">
                  {step.time}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Config Visual */}
        <div className="bg-white border border-[rgba(26,43,74,0.1)] rounded-md p-10 sticky top-[100px] max-[960px]:static max-[960px]:mt-6 max-[960px]:w-full">
          <div className="font-['DM_Mono',monospace] text-[0.68rem] tracking-[2px] text-[#6B7280] uppercase mb-6">
            Sample Society Config
          </div>
          {configItems.map((item) => (
            <div
              key={item.label}
              className="flex justify-between items-center py-[0.72rem] border-b border-[rgba(26,43,74,0.06)] text-[0.84rem]"
            >
              <span className="text-[#6B7280]">{item.label}</span>
              {item.badge ? (
                <span className="bg-[#E1F5EE] text-[#0F6E56] text-[0.68rem] px-2 py-[2px] rounded-[2px] font-['DM_Mono',monospace]">
                  {item.value}
                </span>
              ) : (
                <span className="font-medium text-[#1A2B4A]">{item.value}</span>
              )}
            </div>
          ))}
          <Link
            href="/signup"
            className="block w-full bg-[#F26522] text-white border-none py-4 font-['DM_Sans',sans-serif] text-[0.95rem] font-semibold cursor-pointer rounded-[3px] mt-6 transition-colors duration-200 hover:bg-[#C94E0E] text-center no-underline"
          >
            Launch This League &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
