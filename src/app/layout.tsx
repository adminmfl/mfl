import type { Metadata } from "next";
import {
  Manrope,
  Inter,
  Plus_Jakarta_Sans,
  DM_Sans,
  Outfit,
} from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { ToastManager } from "@/components/ui/toast-manager";
import AuthProvider from "@/components/auth/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ColorThemeProvider } from "@/components/providers/color-theme-provider";
import { FontProvider } from "@/components/providers/font-provider";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
  variable: "--font-manrope",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
  variable: "--font-inter",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
  variable: "--font-plus-jakarta",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
  variable: "--font-dm-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "MFL - My Fitness League | Corporate Fitness Challenges",
  description: "Create leagues, build teams, and track workouts together. Simple tools to keep your community motivated and accountable.",
  keywords: ["fitness", "league", "corporate wellness", "team building", "workout tracker", "challenges", "leaderboards"],
  icons: {
    icon: '/img/mfl-logo.jpg',
    apple: '/img/mfl-logo.jpg',
  },
  openGraph: {
    title: "MFL - My Fitness League",
    description: "Fitness Challenges For Teams. Create leagues, build teams, and track workouts together.",
    url: 'https://myfitnessleague.in',
    siteName: 'My Fitness League',
    images: [
      {
        url: '/img/mfl-logo.jpg',
        width: 800,
        height: 600,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let session = null;
  try {
    session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
  } catch (error) {
    console.error("Session error:", error);
    // Continue with null session - user will need to login
  }
  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${inter.variable} ${plusJakarta.variable} ${dmSans.variable} ${outfit.variable} font-manrope`}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0F1E46" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preload" href="/img/mfl-logo.jpg?width=100&quality=80" as="image" />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <ColorThemeProvider>
            <FontProvider>
              <AuthProvider session={session}>{children}</AuthProvider>
              <ToastManager />
            </FontProvider>
          </ColorThemeProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
