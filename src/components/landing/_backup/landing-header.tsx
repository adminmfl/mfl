'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, X, Zap, Users, TrendingUp, LogIn, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from '@/components/ui/sheet';

// ============================================================================
// Landing Header Component
// ============================================================================

export function LandingHeader() {
  const [isScrolled, setIsScrolled] = React.useState(false);


  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#features', label: 'Features', icon: Zap, description: 'Power up your fitness' },
    { href: '#how-it-works', label: 'How it Works', icon: Users, description: 'Simple 3-step process' },
    { href: '#benefits', label: 'Benefits', icon: TrendingUp, description: 'Why choose us' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${isScrolled
        ? 'bg-background/80 backdrop-blur-md border-b shadow-sm'
        : 'bg-transparent'
        }`}
    >
      <div className="container max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <nav className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/img/mfl-logo.jpg"
              alt="My Fitness League"
              className="size-9 rounded-lg object-cover shadow-md group-hover:shadow-primary/25 transition-all"
            />
            <span className="font-bold text-lg hidden sm:block tracking-tight text-foreground/90 group-hover:text-primary transition-colors">
              My Fitness League
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors relative group"
              >
                {link.label}
                <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">

            <Button variant="ghost" asChild className="font-medium hover:bg-primary/5 hover:text-primary">
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild className="shadow-md shadow-primary/20 hover:shadow-primary/40 transition-all">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>



          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="hover:bg-primary/5 hover:text-primary">
                <Menu className="size-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[320px] p-0 border-l border-border/50 bg-background/95 backdrop-blur-2xl">
              <div className="flex flex-col h-full">
                {/* Mobile Menu Header */}
                <div className="p-6 border-b border-border/50">
                  <Link href="/" className="flex items-center gap-2 mb-1">
                    <img
                      src="/img/mfl-logo.jpg"
                      alt="My Fitness League"
                      className="size-9 rounded-lg object-cover shadow-md"
                    />
                    <SheetTitle className="font-bold text-lg tracking-tight">
                      My Fitness League
                    </SheetTitle>
                  </Link>
                  <p className="text-xs text-muted-foreground ml-1">
                    Fitness challenges for modern teams
                  </p>
                </div>

                {/* Mobile Nav Links */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="flex flex-col gap-2">
                    {navLinks.map((link) => (
                      <SheetClose asChild key={link.href}>
                        <a
                          href={link.href}
                          className="group flex items-start gap-4 p-3 -mx-3 rounded-xl hover:bg-muted/50 active:bg-muted transition-all"
                        >
                          <div className="bg-primary/10 text-primary p-2.5 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors mt-0.5">
                            <link.icon className="size-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {link.label}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {link.description}
                            </div>
                          </div>
                        </a>
                      </SheetClose>
                    ))}
                  </div>
                </div>

                {/* Mobile Footer CTA */}
                <div className="p-6 border-t border-border/50 bg-muted/30">
                  <div className="flex flex-col gap-3">
                    <Button size="lg" className="w-full shadow-lg shadow-primary/20" asChild>
                      <Link href="/signup">
                        <Sparkles className="mr-2 size-4" />
                        Get Started
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="w-full bg-background/50 border-input/50 hover:bg-background hover:border-primary/50" asChild>
                      <Link href="/login">
                        <LogIn className="mr-2 size-4" />
                        Log In
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </header>
  );
}

export default LandingHeader;
