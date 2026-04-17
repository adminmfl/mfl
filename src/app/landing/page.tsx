import {
  LandingHeader,
  HeroSection,
  WhatIsSection,
  PillarsSection,
  HabitSection,
  HowItWorksSection,
  StoriesSection,
  EveryoneSection,
  CtaSection,
  LandingFooter,
} from '@/components/landing';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <HeroSection />
        <WhatIsSection />
        <PillarsSection />
        <HabitSection />
        <HowItWorksSection />
        <StoriesSection />
        <EveryoneSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
