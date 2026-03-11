'use client'

import { SessionProvider } from 'next-auth/react'
import { useEffect } from 'react'
import type { Session } from 'next-auth'

export default function AuthProvider({ children, session }: { children: React.ReactNode; session?: Session | null }) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Service worker caching can break Next dev (stale/missing Turbopack chunks).
    // Keep SW strictly production-only.
    if (process.env.NODE_ENV !== 'production') {
      (async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        } catch {
          // ignore
        }
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch {
          // ignore
        }
      })();
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);
  return (
    // Disable client-side session polling to avoid repeated /api/auth/session calls
    <SessionProvider session={session} refetchInterval={0} refetchOnWindowFocus={true}>
      {children}
    </SessionProvider>
  )
}


