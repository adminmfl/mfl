import React from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type CeremonyPhoto = {
  path: string;
  url: string;
  name: string;
  createdAt: string | null;
};

type CeremonyPhotosSectionProps = {
  canUploadCeremonyPhotos: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleCeremonyPhotoUpload: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => Promise<void>;
  handleUploadClick: () => void;
  uploading: boolean;
  galleryLoading: boolean;
  galleryError: string | null;
  photos: CeremonyPhoto[];
};

export function CeremonyPhotosSection({
  canUploadCeremonyPhotos,
  fileInputRef,
  handleCeremonyPhotoUpload,
  handleUploadClick,
  uploading,
  galleryLoading,
  galleryError,
  photos,
}: CeremonyPhotosSectionProps) {
  return (
    <section
      className="rounded-lg border p-4"
      style={{
        borderColor: 'var(--gf-border-25)',
        backgroundColor: 'var(--gf-surface-muted)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          className="font-semibold"
          style={{ color: 'var(--gf-text-heading)' }}
        >
          Ceremony Photos
        </h3>
        {canUploadCeremonyPhotos ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleCeremonyPhotoUpload}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleUploadClick}
              disabled={uploading}
              style={{
                backgroundColor: 'var(--gf-badge-bg)',
                color: 'var(--gf-badge-text)',
              }}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-1.5 size-4" />
                  Upload Photo
                </>
              )}
            </Button>
          </>
        ) : null}
      </div>

      {galleryLoading ? (
        <p
          className="mt-3 text-sm"
          style={{ color: 'var(--gf-text-secondary)' }}
        >
          Loading ceremony photos...
        </p>
      ) : galleryError ? (
        <p className="mt-3 text-sm text-red-300">{galleryError}</p>
      ) : photos.length === 0 ? (
        <p
          className="mt-3 text-sm"
          style={{ color: 'var(--gf-text-secondary)' }}
        >
          No ceremony photos uploaded yet.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo) => (
            <a
              key={photo.path}
              href={photo.url}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-md border"
              style={{ borderColor: 'var(--gf-border-25)' }}
            >
              <img
                src={photo.url}
                alt={photo.name || 'Ceremony photo'}
                className="h-32 w-full object-cover transition-transform duration-200 hover:scale-105"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
