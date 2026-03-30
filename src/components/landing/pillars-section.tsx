'use client';

import { Card, CardContent } from '@/components/ui/card';

const pillars = [
  {
    emoji: '🔥',
    kicker: 'Pillar one',
    kickerColor: 'text-primary',
    checkColor: 'text-primary',
    title: 'Fitness for every body',
    desc: 'No one gets left out. MFL is built for the whole team — from the person doing their first ever workout to the one training for an ultra. Every move earns points. Every effort matters.',
    points: [
      '50+ activities — walk, run, cycle, yoga, gym, swim & more',
      'Weighted points so effort is always rewarded fairly',
      'No wearable needed — log manually or sync any device',
      'Streaks that reward consistency, not speed',
    ],
  },
  {
    emoji: '🎮',
    kicker: 'Pillar two',
    kickerColor: 'text-violet-600',
    checkColor: 'text-violet-600',
    title: 'Fun that keeps people coming back',
    desc: "Gamification done right isn't about leaderboards that shame the less fit. It's about giving everyone a real reason to open the app tomorrow — and the day after that.",
    points: [
      'Team-vs-team league seasons with live standings',
      'Weekly surprise challenges & group quests',
      'Milestone moments — PBs, streaks, comeback stories',
      'Progress-first, not performance-first',
    ],
  },
  {
    emoji: '🤝',
    kicker: 'Pillar three',
    kickerColor: 'text-emerald-600',
    checkColor: 'text-emerald-600',
    title: 'Friendships that change culture',
    desc: "When people move together, they talk differently. A lunchtime walk becomes a real conversation. A shared challenge becomes a shared identity. That's the lasting outcome of MFL.",
    points: [
      "Cross-team leagues connect people who'd never meet",
      'Built-in team feed, kudos & celebrations',
      'Buddy matching for accountability pairs',
      'Shared moments that outlast the challenge',
    ],
  },
];

export function PillarsSection() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="container max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-bold tracking-widest uppercase text-primary mb-3">
            Why MFL works
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Three things that make habits stick
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            We didn&apos;t invent fitness. We designed a system where fitness, fun,
            and friendship amplify each other — so the habit loop stays unbroken
            long after the first challenge ends.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {pillars.map((p) => (
            <Card
              key={p.title}
              className="hover:-translate-y-1.5 hover:shadow-lg transition-all duration-300"
            >
              <CardContent className="p-7">
                <span className="text-4xl mb-4 block">{p.emoji}</span>
                <p className={`text-[11px] font-bold tracking-widest uppercase mb-2 ${p.kickerColor}`}>
                  {p.kicker}
                </p>
                <h3 className="text-xl font-extrabold tracking-tight mb-3">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">{p.desc}</p>
                <ul className="space-y-0">
                  {p.points.map((pt, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2.5 text-sm text-muted-foreground py-2 border-t border-border first:border-t-0"
                    >
                      <span className={`font-extrabold text-xs ${p.checkColor}`}>✓</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PillarsSection;
