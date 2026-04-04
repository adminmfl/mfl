'use client';

import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

const footerLinks = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Pricing', href: '#' },
    { label: 'Integrations', href: '#' },
  ],
  resources: [
    { label: 'Challenge ideas', href: '#' },
    { label: 'Team leader guide', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Help center', href: '#' },
  ],
  company: [
    { label: 'About MFL', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Privacy', href: '#' },
  ],
};

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background">
      <div className="container max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="bg-primary text-primary-foreground px-2.5 py-1 rounded-lg text-sm font-extrabold">
                MFL
              </span>
              <span className="font-bold text-background">My Fitness League</span>
            </Link>
            <p className="text-sm text-background/40 leading-relaxed max-w-[260px]">
              Build habits. Build bonds. Build your league. The team fitness
              platform where every kind of mover belongs and friendships grow.
            </p>
          </div>

          <div>
            <h5 className="text-[11px] font-bold tracking-widest uppercase text-background/40 mb-4">
              Product
            </h5>
            <ul className="space-y-2.5">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-background/60 hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="text-[11px] font-bold tracking-widest uppercase text-background/40 mb-4">
              Resources
            </h5>
            <ul className="space-y-2.5">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-background/60 hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="text-[11px] font-bold tracking-widest uppercase text-background/40 mb-4">
              Company
            </h5>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-background/60 hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-10 bg-background/10" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-background/40">
            &copy; {currentYear} My Fitness League. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-background/40">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <span>·</span>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <span>·</span>
            <a href="#" className="hover:text-primary transition-colors">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
