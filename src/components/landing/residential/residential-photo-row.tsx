'use client';

const photos = [
  {
    src: '/images/aleksandrs-karevs-WadTdbyDE94-unsplash.jpg',
    alt: 'Senior residents morning walk community',
    label: 'For seniors',
    headline: 'Morning walks\near full points.',
  },
  {
    src: '/images/dillon-wanner-ciqbTWuGgBI-unsplash.jpg',
    alt: 'Family yoga together community fitness',
    label: 'For families',
    headline: 'Parents and kids\non the same team.',
  },
  {
    src: '/images/anna-stampfli-q0PZ3BoFmCE-unsplash.jpg',
    alt: 'Community celebration event residents',
    label: 'For everyone',
    headline: 'Grand Finale at\nthe clubhouse.',
  },
];

export function ResidentialPhotoRow() {
  return (
    <div className="grid grid-cols-3 gap-0 max-[960px]:grid-cols-1">
      {photos.map((photo) => (
        <div key={photo.label} className="relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.src}
            alt={photo.alt}
            className="w-full h-[280px] object-cover block brightness-[0.65]"
          />
          <div className="absolute inset-0 flex flex-col justify-end p-5">
            <div className="font-['DM_Mono',monospace] text-[0.6rem] tracking-[2px] text-[rgba(255,255,255,0.6)] uppercase mb-[0.3rem]">
              {photo.label}
            </div>
            <div className="font-['Bebas_Neue',sans-serif] text-[1.4rem] text-white leading-[1.05] whitespace-pre-line">
              {photo.headline}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
