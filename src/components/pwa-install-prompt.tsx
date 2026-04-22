'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) return false;
  return Date.now() - dismissedAt < DISMISS_DURATION_MS;
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.innerWidth < 768 ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
  return isIos && isSafari;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosPrompt, setShowIosPrompt] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isIosSafari() && !isStandalone() && isMobile() && !isDismissed();
  });
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isIosSafari() && !isStandalone() && isMobile() && !isDismissed();
  });

  useEffect(() => {
    // Don't show if already installed, not mobile, or recently dismissed
    if (isStandalone() || !isMobile() || isDismissed()) return;
    // iOS handled by initial state
    if (isIosSafari()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 mx-4 md:hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-xl border bg-card p-4 shadow-lg">
        {showIosPrompt ? (
          // iOS Safari: manual instructions
          <div className="flex items-start gap-3">
            <Share className="size-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Install MFL App</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tap <span className="font-medium">Share</span> then{' '}
                <span className="font-medium">Add to Home Screen</span>
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 p-1 rounded-md hover:bg-muted"
              aria-label="Dismiss"
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          </div>
        ) : (
          // Android / Desktop Chrome: use deferred prompt
          <div className="flex items-center gap-3">
            <Download className="size-5 text-primary shrink-0" />
            <p className="flex-1 text-sm font-semibold min-w-0">
              Install MFL App
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" onClick={handleInstall}>
                Install
              </Button>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-md hover:bg-muted"
                aria-label="Dismiss"
              >
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
