'use client';

import { Card, CardContent } from '@/components/ui/card';

// ============================================================================
// League Includes Data
// ============================================================================

const leagueIncludes = [
  'Daily fitness & movement',
  'Sports tournaments',
  'Weekly themed challenges',
  'Team events & fun games',
  'Experience sharing & storytelling',
  'Finale days & celebrations',
];

// ============================================================================
// Section Component
// ============================================================================

export function BenefitsSection() {
  return (
    <section id="benefits" className="py-20 md:py-28">
      <div className="container max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-3xl md:text-4xl font-bold">
            What a League Can Include
          </h2>
          <p className="text-lg text-muted-foreground mt-3">
            All formats are inclusive, age-balanced, and team-first.
          </p>
        </div>

        <Card className="border bg-muted/30">
          <CardContent className="p-6 md:p-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {leagueIncludes.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl border bg-background/70 px-4 py-3"
                >
                  <div className="size-2.5 rounded-full bg-primary" />
                  <span className="text-sm md:text-base font-medium text-foreground">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default BenefitsSection;
