'use client';

import dynamic from 'next/dynamic';

const Toaster = dynamic(() => import('sonner').then(mod => mod.Toaster), {
  ssr: false,
});

export function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      duration={4000}
    />
  );
}
