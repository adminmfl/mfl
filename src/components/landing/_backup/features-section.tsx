'use client';

// ============================================================================
// Positioning Section Component
// ============================================================================

export function FeaturesSection() {
  return (
    <section id="features" className="py-14 md:py-20 bg-gradient-to-b from-muted/40 via-muted/20 to-background">
      <div className="container max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <div className="relative overflow-hidden rounded-3xl border bg-background/70 backdrop-blur-sm shadow-lg">
          <div className="absolute -top-24 -right-16 size-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 size-56 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative px-6 py-10 md:px-12 md:py-14 lg:px-16">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mt-4 text-2xl md:text-4xl font-bold text-foreground">
                MFL is a league engine for fitness and habits.
              </h2>
              <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
                It turns everyday movement — walking, workouts, sports, challenges — into a team-based league with structure, scoring, and momentum.
              </p>
              <div className="mt-6 rounded-2xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-4">
                <p className="text-base md:text-lg font-semibold text-foreground">
                  This is not a fitness app. <span className="text-primary">It’s a way to play together.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
