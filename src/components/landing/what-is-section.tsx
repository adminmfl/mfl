'use client';

import { Trophy, Sprout, Sparkles, Activity, Zap, MessageCircle, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const bullets = [
  {
    icon: Trophy,
    title: 'Team leagues, not solo trackers',
    desc: 'You compete as a team, win as a team. The energy changes completely when your colleagues are in it with you.',
  },
  {
    icon: Sprout,
    title: 'Habits built through belonging',
    desc: 'Social accountability is the #1 driver of lasting behavior change. MFL makes your team each other\'s reason to show up.',
  },
  {
    icon: Sparkles,
    title: 'Works for every kind of mover',
    desc: '50+ activities, fairly weighted. A 20-minute walk earns real points. No one is sidelined for not being an athlete.',
  },
];

const cards = [
  { icon: Activity, title: 'Any movement. Real points.', body: 'Walk, run, cycle, swim, stretch, lift, dance — 50+ activities all count. A weighted system means it\'s fair whether you log a 5K or a lunch stroll.' },
  { icon: Zap, title: 'Leagues with seasons & real drama', body: 'Teams compete in weekly challenges, climb the league table, and chase the championship. Friendly rivalry is the engine that keeps people coming back.' },
  { icon: MessageCircle, title: 'A social feed that celebrates everyone', body: 'Every activity shows up. Kudos, cheers, and reactions make each move feel seen — even a quiet 15-minute walk at lunch.' },
  { icon: BarChart3, title: 'Insights for captains, not just HR', body: 'Team captains see how the group is doing, who needs a nudge, and what\'s working. Built for the people closest to the team.' },
];

export function WhatIsSection() {
  return (
    <section id="what-is" className="py-20 md:py-28 bg-foreground text-background">
      <div className="container max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-primary mb-4">
              What is MFL?
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-5 text-background">
              More than a fitness app.
              <br />Your team&apos;s league.
            </h2>
            <p className="text-background/70 leading-relaxed mb-4">
              MFL — My Fitness League — is where teams come together to move,
              challenge each other, cheer, and grow closer. Not about obsessing
              over steps. About building a team culture where health and
              friendship reinforce each other, week after week.
            </p>
            <p className="text-background/70 leading-relaxed mb-8">
              Every team is a mix: dedicated runners, casual walkers, yoga lovers,
              people who&apos;ve never really exercised. MFL is designed so all of
              them belong — and all of them thrive.
            </p>

            <div className="flex flex-col gap-4">
              {bullets.map((b) => (
                <div key={b.title} className="flex items-start gap-3">
                  <div className="size-9 flex-shrink-0 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center mt-0.5">
                    <b.icon className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-background text-sm mb-1">{b.title}</p>
                    <p className="text-sm text-background/60">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {cards.map((c) => (
              <Card
                key={c.title}
                className="bg-background/5 border-background/10 hover:bg-background/10 hover:border-primary/25 transition-all duration-300 hover:translate-x-1"
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <c.icon className="size-5 text-primary" />
                    <p className="font-bold text-sm text-background">{c.title}</p>
                  </div>
                  <p className="text-sm text-background/60 leading-relaxed">{c.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default WhatIsSection;
