import type { Metadata } from 'next';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
import {
  CorporateNav,
  CorporateBanner,
  CorporateHero,
  CorporateStats,
  CorporateSocialProof,
  CorporateHowItWorks,
  CorporateOpeningDay,
  CorporateFinale,
  CorporatePhotoRow,
  CorporateAiCoach,
  CorporateWhatIsIt,
  CorporateActivities,
  CorporateProblem,
  CorporatePricing,
  CorporateFaq,
  CorporateRwaStrip,
  CorporateFinalCta,
  CorporateFooter,
  CorporateContactModal,
} from '@/components/landing/corporate';

export const metadata: Metadata = {
  title: 'MyFitnessLeague — Corporate Fitness Leagues',
  description:
    'MyFitnessLeague — Corporate fitness leagues that build team bonds. IPL-style competing teams, daily activities, bonus challenges and a Grand Finale. Any company, any size.',
  openGraph: {
    title: 'MyFitnessLeague — Corporate Fitness Leagues',
    description: 'Team fitness leagues for companies. First 7 days free.',
    url: 'https://myfitnessleague.com',
    images: [
      {
        url: 'https://myfitnessleague.com/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function RootPage() {
  return (
    <div className="corp-font-sans bg-[#FAF9F7] text-[#111827] overflow-x-hidden max-w-[100vw] relative scroll-smooth">
      <CorporateNav />
      <CorporateBanner />
      <CorporateHero />
      <CorporateStats />
      <CorporateSocialProof />
      <CorporateHowItWorks />
      <CorporateOpeningDay />
      <CorporateFinale />
      <CorporatePhotoRow />
      <CorporateAiCoach />
      <CorporateWhatIsIt />
      <CorporateActivities />
      <CorporateProblem />
      <CorporatePricing />
      <CorporateFaq />
      <CorporateRwaStrip />
      <CorporateFinalCta />
      <CorporateFooter />
      <CorporateContactModal />
      <PwaInstallPrompt />
    </div>
  );
}
