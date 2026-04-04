'use client';

import { useEffect } from 'react';
import { useLeague } from '@/contexts/league-context';

/**
 * LeagueBrandingProvider
 *
 * Reads activeLeague.branding and injects CSS custom properties
 * to override the default theme when a league has custom branding.
 * If no branding is set, this is a no-op.
 */
export function LeagueBrandingProvider({ children }: { children: React.ReactNode }) {
  const { activeLeague } = useLeague();

  useEffect(() => {
    const color = activeLeague?.branding?.primary_color;
    const root = document.documentElement;

    if (color && /^#[0-9a-fA-F]{6}$/.test(color)) {
      // Convert hex to HSL for CSS variable override
      const r = parseInt(color.slice(1, 3), 16) / 255;
      const g = parseInt(color.slice(3, 5), 16) / 255;
      const b = parseInt(color.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;
      let h = 0;
      let s = 0;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
      }

      const hDeg = Math.round(h * 360);
      const sPct = Math.round(s * 100);
      const lPct = Math.round(l * 100);

      root.style.setProperty('--primary', `${hDeg} ${sPct}% ${lPct}%`);
      root.dataset.leagueBranding = 'active';
    } else {
      // Remove override — restore defaults
      root.style.removeProperty('--primary');
      delete root.dataset.leagueBranding;
    }

    return () => {
      root.style.removeProperty('--primary');
      delete root.dataset.leagueBranding;
    };
  }, [activeLeague?.branding?.primary_color]);

  return <>{children}</>;
}
