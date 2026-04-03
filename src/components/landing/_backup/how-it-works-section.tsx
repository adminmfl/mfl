'use client';

import {
  PlusCircle,
  UserPlus,
  Activity,
  Medal,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

// ============================================================================
// Types
// ============================================================================

interface Step {
  number: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

// ============================================================================
// Steps Data
// ============================================================================

const steps: Step[] = [
  {
    number: '01',
    icon: PlusCircle,
    title: 'Create a League',
    description: 'Choose duration, teams, captains. MFL sets structure.',
  },
  {
    number: '02',
    icon: UserPlus,
    title: 'Play Together',
    description: 'Daily movement, sports, challenges, team support.',
  },
  {
    number: '03',
    icon: Activity,
    title: 'Track Progress',
    description: 'Leaderboards, team points, streaks.',
  },
  {
    number: '04',
    icon: Medal,
    title: 'Finish & Repeat',
    description: 'Celebrate and start next season.',
  },
];

// ============================================================================
// How It Works Section Component
// ============================================================================

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-muted/30">
      <div className="container max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Get started in minutes. No complex setup required.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((step, index) => (
            <Card
              key={step.number}
              className="relative overflow-hidden group hover:shadow-lg transition-all duration-300"
            >
              {/* Step number background */}
              <div className="absolute -top-4 -right-4 text-8xl font-bold text-primary/5 group-hover:text-primary/10 transition-colors">
                {step.number}
              </div>

              <CardContent className="pt-3 pb-4 px-4 relative">
                {/* Icon */}
                <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <step.icon className="size-5 text-primary" />
                </div>

                {/* Step indicator */}
                <div className="text-xs font-semibold text-primary mb-2">
                  STEP {step.number}
                </div>

                {/* Content */}
                <h3 className="font-semibold text-lg mb-1.5">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-snug">
                  {step.description}
                </p>
              </CardContent>

              {/* Connector line (except last) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-border" />
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
