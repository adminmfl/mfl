'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, LogIn, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from '@/components/ui/sheet';

export function LandingHeader() {
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#what-is', label: 'What is MFL' },
    { href: '#how-it-works', label: 'How it works' },
    { href: '#stories', label: 'Stories' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? 'bg-background/80 backdrop-blur-md border-b shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="container max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        <nav className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="bg-primary text-primary-foreground px-2.5 py-1 rounded-lg text-sm font-extrabold tracking-wide">
              MFL
            </span>
            <span className="font-bold text-lg hidden sm:block tracking-tight text-foreground/90 group-hover:text-primary transition-colors">
              My Fitness League
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild className="shadow-md shadow-primary/20">
              <Link href="/signup">Start Free</Link>
            </Button>
          </div>

          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="size-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] p-0 border-l bg-background/95 backdrop-blur-2xl">
              <div className="flex flex-col h-full">
                <div className="p-6 border-b">
                  <Link href="/" className="flex items-center gap-2 mb-1">
                    <span className="bg-primary text-primary-foreground px-2.5 py-1 rounded-lg text-sm font-extrabold">
                      MFL
                    </span>
                    <SheetTitle className="font-bold text-lg tracking-tight">
                      My Fitness League
                    </SheetTitle>
                  </Link>
                  <p className="text-xs text-muted-foreground ml-1">
                    Habits. Bonds. Together.
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="flex flex-col gap-2">
                    {navLinks.map((link) => (
                      <SheetClose asChild key={link.href}>
                        <a
                          href={link.href}
                          className="p-3 -mx-3 rounded-xl hover:bg-muted/50 font-semibold text-foreground"
                        >
                          {link.label}
                        </a>
                      </SheetClose>
                    ))}
                  </div>
                </div>
                <div className="p-6 border-t bg-muted/30">
                  <div className="flex flex-col gap-3">
                    <Button size="lg" className="w-full shadow-lg shadow-primary/20" asChild>
                      <Link href="/signup">
                        <Sparkles className="mr-2 size-4" />
                        Start Free
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="w-full" asChild>
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
