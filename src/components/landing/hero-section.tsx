'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      <div className="absolute top-[-100px] right-[-150px] w-[600px] h-[400px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-[-100px] w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

      <div className="container relative max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-16 md:py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Content */}
          <div className="text-center lg:text-left">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 gap-2">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              Teams moving together every day
            </Badge>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Fitness that builds{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-600">
                habits, bonds & real friendship.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              MFL is the team fitness league where moving together becomes something
              your people actually look forward to — full of shared victories,
              friendly rivalry, and the kind of connection that turns colleagues
              into friends.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
              <Button size="lg" asChild className="px-8 shadow-lg shadow-primary/20 text-base">
                <Link href="/signup">
                  Start Your League Free
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="px-8 text-base">
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {['bg-orange-200', 'bg-violet-200', 'bg-emerald-200', 'bg-sky-200'].map((bg, i) => (
                  <div key={i} className={`size-8 rounded-full ${bg} border-2 border-background`} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Thousands of teams</strong> in 40+ countries in the league.
                <br />Rated 4.8 ★ by team leaders.
              </p>
            </div>
          </div>

          {/* Right: Hero Illustration */}
          <div className="relative flex items-center justify-center order-first lg:order-last">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-violet-500/10 rounded-full blur-3xl scale-75" />
            <Image
              src="/img/mfl-hero.svg"
              alt="My Fitness League — teams moving together"
              width={500}
              height={500}
              className="relative w-full max-w-md lg:max-w-lg drop-shadow-xl"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
