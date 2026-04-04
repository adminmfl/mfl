'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Monitor, Footprints, Dumbbell, Heart, Globe, TrendingUp } from 'lucide-react';

const personas = [
  { icon: Monitor, title: 'Remote & hybrid teams', desc: 'A shared experience that transcends Slack. Real connection across time zones and screens.' },
  { icon: Footprints, title: 'Beginners & casual movers', desc: 'A 20-minute walk earns real points. No experience needed. No intimidation. Just movement.' },
  { icon: Dumbbell, title: 'Fitness enthusiasts', desc: "Your PBs are celebrated. Your energy lifts the whole team. You're the spark that gets others moving." },
  { icon: Heart, title: 'Yoga & mindfulness movers', desc: "Stretching, breathing, walking — it all counts. Mind-body movement gets the points it deserves." },
  { icon: Globe, title: 'Global & multicultural teams', desc: 'One league, any time zone. MFL works wherever your people are and whatever they love to do.' },
  { icon: TrendingUp, title: 'Teams of 10 to 10,000', desc: 'Start a small squad challenge or run a company-wide league. MFL scales with your ambition.' },
];

export function EveryoneSection() {
  return (
    <section className="py-20 md:py-28 bg-muted/40 border-t">
      <div className="container max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-bold tracking-widest uppercase text-primary mb-3">
            For every kind of team
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            If they can move, they belong in the league
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            MFL isn&apos;t for athletes. It&apos;s for humans — every shape,
            pace, fitness level, time zone, and reason for moving.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {personas.map((p) => (
            <Card
              key={p.title}
              className="hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20 transition-all duration-300"
            >
              <CardContent className="p-5 flex items-start gap-3">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <p.icon className="size-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm mb-1">{p.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default EveryoneSection;
