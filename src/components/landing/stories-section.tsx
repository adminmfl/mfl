'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const stories = [
  {
    stars: 5,
    quote: "I expected 20% of my team to sign up. We got 94%. Two months on, people who'd never spoken are grabbing coffee together. That's not a fitness app — that's a culture shift.",
    name: 'Rachel M.',
    role: 'People Lead · 120-person company',
    tag: '94% participation rate',
  },
  {
    stars: 5,
    quote: "Our quietest team members became the most consistent movers. MFL rewards showing up — not athletic talent. That's the culture we always wanted. It just happened naturally.",
    name: 'David K.',
    role: 'Engineering Manager · distributed team',
    tag: '14-day team streak',
  },
  {
    stars: 5,
    quote: "Our remote team was a list of names on a screen. After one MFL season they had inside jokes, group walks, and a genuine reason to check in on each other. Completely unexpected.",
    name: 'Asha P.',
    role: 'Team Lead · fully remote, 65 people',
    tag: 'Cross-timezone league',
  },
];

export function StoriesSection() {
  return (
    <section id="stories" className="py-20 md:py-28">
      <div className="container max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-bold tracking-widest uppercase text-primary mb-3">
            Real team stories
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            They started for fitness.
            <br />They stayed for the friendships.
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Teams that join for the health benefits discover the real reward is who they become to each other.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {stories.map((s) => (
            <Card
              key={s.name}
              className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <CardContent className="p-7 flex flex-col flex-1">
                <div className="text-sm tracking-widest text-amber-500 mb-4">
                  {'★'.repeat(s.stars)}
                </div>
                <p className="text-[15px] leading-relaxed italic text-foreground mb-5 flex-1">
                  &ldquo;{s.quote}&rdquo;
                </p>
                <Separator className="mb-4" />
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-muted flex items-center justify-center text-lg flex-shrink-0">
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.role}</p>
                    <Badge variant="secondary" className="mt-1 text-[10px] px-2 py-0">
                      {s.tag}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default StoriesSection;
