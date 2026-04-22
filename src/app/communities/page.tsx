import type { Metadata } from 'next';

import {
  ResidentialNav,
  ResidentialBanner,
  ResidentialHero,
  ResidentialDifferences,
  ResidentialPhotoRow,
  ResidentialHowItWorks,
  ResidentialEventPhotos,
  ResidentialOutcomes,
  ResidentialTestimonials,
  ResidentialAiCoach,
  ResidentialActivities,
  ResidentialPricing,
  ResidentialFaq,
  ResidentialCorpStrip,
  ResidentialCta,
  ResidentialFooter,
  ResidentialContactModal,
} from '@/components/landing/residential';

export const metadata: Metadata = {
  title:
    'MyFitnessLeague \u2014 For Residential Communities & Apartment Societies',
  description:
    'MyFitnessLeague \u2014 Community fitness leagues for residential societies. Wing vs wing competition, daily activities, and grand finale celebrations. Perfect for RWAs and apartment communities.',
  openGraph: {
    title: 'MyFitnessLeague \u2014 Community Fitness Leagues',
    description:
      'Team fitness leagues for residential communities. First 7 days free.',
    images: ['https://myfitnessleague.com/og-image.jpg'],
    url: 'https://myfitnessleague.com/communities',
  },
  alternates: {
    canonical: 'https://myfitnessleague.com/communities',
  },
};

export default function CommunitiesPage() {
  return (
    <div className="font-['DM_Sans',sans-serif] bg-[#FAF9F7] text-[#111827] overflow-x-hidden max-w-[100vw] relative scroll-smooth">
      <ResidentialNav />
      <ResidentialBanner />
      <ResidentialHero />
      <ResidentialDifferences />
      <ResidentialPhotoRow />
      <ResidentialHowItWorks />
      <ResidentialEventPhotos />
      <ResidentialOutcomes />
      <ResidentialTestimonials />
      <ResidentialAiCoach />
      <ResidentialActivities />
      <ResidentialPricing />
      <ResidentialFaq />
      <ResidentialCorpStrip />
      <ResidentialCta />
      <ResidentialFooter />
      <ResidentialContactModal />
    </div>
  );
}
