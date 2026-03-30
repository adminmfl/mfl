'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function CtaSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 p-10 md:p-16 lg:p-20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

          <div className="relative text-center max-w-2xl mx-auto">
            <p className="text-xs font-bold tracking-widest uppercase text-white/70 mb-4">
              Start today — it&apos;s free
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-5">
              Your team is one challenge away from something great
            </h2>
            <p className="text-lg text-white/80 mb-10 leading-relaxed">
              Start a league in 10 minutes. Watch what happens when your team moves together.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild className="px-8 text-base font-bold">
                <Link href="/signup">
                  Start Your League Free
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="px-8 text-base border-white/20 text-white bg-white/10 hover:bg-white/20"
              >
                <Link href="/login">Log In</Link>
              </Button>
            </div>

            <p className="text-sm text-white/50 mt-5">
              Free for teams up to 20 · No credit card · No procurement needed
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CtaSection;
