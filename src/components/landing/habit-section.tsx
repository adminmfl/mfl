'use client';

import { Card, CardContent } from '@/components/ui/card';

const stats = [
  { num: '87%', title: 'More active after 30 days', sub: 'of MFL participants report lasting behavior change' },
  { num: '3.2×', title: 'More cross-team friendships', sub: 'formed after the first league season' },
  { num: '14 days', title: 'To form a new movement habit', sub: 'when social accountability is in play' },
  { num: '91%', title: 'Want to run another season', sub: 'after completing their first MFL challenge' },
];

export function HabitSection() {
  return (
    <section className="py-20 md:py-28 bg-muted/40 border-y">
      <div className="container max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-primary mb-4">
              The science behind it
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-5">
              Why doing it together is the only thing that actually works
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Solo fitness goals fail 80% of the time. Not because people lack
              willpower — but because willpower is finite. What never runs out is
              not wanting to let your team down.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              MFL is built on this truth: the most powerful fitness tool ever
              invented is a group of people who expect to see you show up. We
              package that into a league your whole team can join in five minutes.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {stats.map((s) => (
              <Card key={s.num} className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                <CardContent className="p-5 flex items-center gap-5">
                  <span className="text-3xl md:text-4xl font-black text-primary min-w-[80px] tracking-tight">
                    {s.num}
                  </span>
                  <div>
                    <p className="font-bold text-sm mb-0.5">{s.title}</p>
                    <p className="text-sm text-muted-foreground">{s.sub}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default HabitSection;
