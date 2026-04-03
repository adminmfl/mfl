'use client';

import { Card, CardContent } from '@/components/ui/card';

const steps = [
  { num: '01', emoji: '🏟️', title: 'Create your league', desc: 'Name it, choose your challenge type, set the dates. About two minutes, start to finish.' },
  { num: '02', emoji: '🔗', title: 'Invite your people', desc: 'Share one link. Everyone joins in a tap — no downloads required to get started.' },
  { num: '03', emoji: '🏃', title: 'Move. Log. Cheer.', desc: 'Teams log any activity, climb the table, and cheer each other on. Energy builds fast.' },
  { num: '04', emoji: '🌱', title: 'Habits & bonds form', desc: "By week three, movement is routine. The friendships made in the league? Those last far longer." },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-foreground text-background">
      <div className="container max-w-6xl mx-auto px-6 md:px-12 lg:px-16">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-bold tracking-widest uppercase text-primary mb-3">
            Getting started
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-background mb-4">
            From idea to league in under 10 minutes
          </h2>
          <p className="text-background/60 leading-relaxed">
            No procurement. No six-month implementations. No app stores. Just your team, ready to move.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s) => (
            <Card
              key={s.num}
              className="bg-background/5 border-background/10 hover:bg-background/10 hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 text-center"
            >
              <CardContent className="p-6">
                <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary/60 mb-3">
                  {s.num}
                </p>
                <span className="text-2xl mb-3 block">{s.emoji}</span>
                <h4 className="font-bold text-sm text-background mb-2">{s.title}</h4>
                <p className="text-sm text-background/60 leading-relaxed">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
