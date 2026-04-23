'use client';

import React from 'react';
import Confetti from 'react-confetti';
import { Crown, Medal, Sparkles, Star, Trophy } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRole } from '@/contexts/role-context';

import { Badge } from '@/components/ui/badge';
import { DownloadCertificateButton } from '@/components/leagues/download-report-button';
import { AwardGrid } from './grande-finale/award-grid';
import { CeremonyPhotosSection } from './grande-finale/ceremony-photos-section';
import type { CeremonyPhoto } from './grande-finale/ceremony-photos-section';
import { computeFinaleAwards } from './grande-finale/compute-awards';
import { TrophyLeaderboardSection } from './grande-finale/trophy-leaderboard-section';
import type {
  IndividualRanking,
  TeamRanking,
} from '@/hooks/use-league-leaderboard';

interface GrandeFinaleCelebrationProps {
  leagueId: string;
  leagueName: string;
  leagueEndDate: string;
  teams: TeamRanking[];
  individuals: IndividualRanking[];
}

function getPostLeagueDayInfo(endDate: string): {
  isPostLeague: boolean;
  day: number;
} {
  const now = new Date();
  const end = new Date(endDate);

  if (Number.isNaN(end.getTime())) {
    return { isPostLeague: false, day: 0 };
  }

  // Consider league closed after the configured end day is over.
  const closeMoment = new Date(end);
  closeMoment.setHours(23, 59, 59, 999);

  if (now <= closeMoment) {
    return { isPostLeague: false, day: 0 };
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const day =
    Math.floor((now.getTime() - closeMoment.getTime()) / msPerDay) + 1;
  return { isPostLeague: true, day };
}

export function GrandeFinaleCelebration({
  leagueId,
  leagueName,
  leagueEndDate,
  teams,
  individuals,
}: GrandeFinaleCelebrationProps) {
  const finaleTheme = React.useMemo(
    () =>
      ({
        '--gf-text-primary': '#F8F2D8',
        '--gf-text-secondary': '#E7D7A2',
        '--gf-text-heading': '#F1D675',
        '--gf-text-emphasis': '#F6E27A',
        '--gf-text-subtle': '#D8C996',
        '--gf-surface-card': '#102756',
        '--gf-surface-muted': '#0D1F44B3',
        '--gf-surface-row': '#132C61',
        '--gf-avatar-bg': '#1A356E',
        '--gf-avatar-text': '#F4E5B0',
        '--gf-badge-bg': '#D4AF37',
        '--gf-badge-text': '#0A1A3A',
        '--gf-border-20': '#D4AF3733',
        '--gf-border-25': '#D4AF3740',
        '--gf-border-30': '#D4AF374D',
        '--gf-border-35': '#D4AF3759',
        '--gf-border-60': '#D4AF3799',
      }) as React.CSSProperties,
    [],
  );

  const { data: session } = useSession();
  const { activeRole } = useRole();
  const [windowSize, setWindowSize] = React.useState({ width: 0, height: 0 });
  const [photos, setPhotos] = React.useState<CeremonyPhoto[]>([]);
  const [canUploadCeremonyPhotos, setCanUploadCeremonyPhotos] =
    React.useState(false);
  const [galleryLoading, setGalleryLoading] = React.useState(true);
  const [galleryError, setGalleryError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const update = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const fetchCeremonyPhotos = React.useCallback(async () => {
    try {
      setGalleryLoading(true);
      setGalleryError(null);

      const response = await fetch(`/api/leagues/${leagueId}/ceremony-photos`);
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to load ceremony photos');
      }

      setCanUploadCeremonyPhotos(
        Boolean(json.data?.canUpload) && activeRole === 'host',
      );
      setPhotos(Array.isArray(json.data?.photos) ? json.data.photos : []);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load ceremony photos';
      setGalleryError(message);
    } finally {
      setGalleryLoading(false);
    }
  }, [leagueId, activeRole]);

  React.useEffect(() => {
    fetchCeremonyPhotos();
  }, [fetchCeremonyPhotos]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCeremonyPhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setGalleryError(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/leagues/${leagueId}/ceremony-photos`, {
        method: 'POST',
        body: formData,
      });
      const contentType = response.headers.get('content-type') || '';
      const json = contentType.includes('application/json')
        ? await response.json()
        : null;

      if (!response.ok || !json?.success) {
        throw new Error(
          json?.error || `Failed to upload ceremony photo (${response.status})`,
        );
      }

      await fetchCeremonyPhotos();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to upload ceremony photo';
      setGalleryError(message);
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const { isPostLeague, day } = React.useMemo(
    () => getPostLeagueDayInfo(leagueEndDate),
    [leagueEndDate],
  );

  const {
    winnerAwards,
    teamCharacterAwards,
    leadershipAwards,
    individualAwards,
  } = React.useMemo(
    () => computeFinaleAwards(teams, individuals),
    [teams, individuals],
  );

  if (!isPostLeague) {
    return null;
  }

  const isTrophyMode = day <= 14;
  const remainingDays = Math.max(0, 14 - day + 1);

  return (
    <div
      className="relative overflow-hidden rounded-xl border bg-gradient-to-b from-[#0B1A3A] via-[#102756] to-[#08142F] p-4 text-[#FAF3D9] shadow-xl lg:p-6"
      style={{
        ...finaleTheme,
        borderColor: 'var(--gf-border-30)',
      }}
    >
      {isTrophyMode && windowSize.width > 0 && windowSize.height > 0 ? (
        <Confetti
          width={windowSize.width}
          height={Math.min(windowSize.height, 900)}
          recycle={false}
          numberOfPieces={240}
          gravity={0.2}
          colors={['#D4AF37', '#F6E27A', '#1F3F7A', '#FFFFFF']}
        />
      ) : null}

      <div className="relative z-10 space-y-5">
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: 'var(--gf-border-35)',
            backgroundColor: 'var(--gf-surface-muted)',
          }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              style={{
                backgroundColor: 'var(--gf-badge-bg)',
                color: 'var(--gf-badge-text)',
              }}
            >
              {isTrophyMode ? 'Trophy Mode' : 'Extended Archive'}
            </Badge>
            {isTrophyMode ? (
              <Badge
                variant="outline"
                style={{
                  borderColor: 'var(--gf-border-60)',
                  color: 'var(--gf-text-emphasis)',
                }}
              >
                {remainingDays} day{remainingDays === 1 ? '' : 's'} remaining
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-[#4E6BAE] text-[#C9D8FF]"
              >
                Celebration window complete
              </Badge>
            )}
          </div>

          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ color: 'var(--gf-text-emphasis)' }}
              >
                Grande Finale
              </h1>
              <p
                className="mt-1 text-sm"
                style={{ color: 'var(--gf-text-secondary)' }}
              >
                {leagueName} has entered the finale experience with trophy
                rankings and award cards.
              </p>
            </div>
            <Trophy
              className="size-7"
              style={{ color: 'var(--gf-badge-bg)' }}
            />
          </div>

          {session?.user?.id ? (
            <div className="mt-4">
              <DownloadCertificateButton
                leagueId={leagueId}
                userId={session.user.id}
                leagueStatus="completed"
                size="sm"
              />
              <p
                className="mt-2 text-xs"
                style={{ color: 'var(--gf-text-subtle)' }}
              >
                League Finisher Certificate is available for every participant.
              </p>
            </div>
          ) : null}
        </div>

        <section className="space-y-3">
          <div
            className="flex items-center gap-2"
            style={{ color: 'var(--gf-text-emphasis)' }}
          >
            <Crown className="size-4" />
            <h2 className="text-lg font-semibold">
              Winner Awards (Top 3 Teams)
            </h2>
          </div>
          <AwardGrid
            cards={winnerAwards}
            emptyText="Winner awards will appear when rankings are available."
          />
        </section>

        <section className="space-y-3">
          <div
            className="flex items-center gap-2"
            style={{ color: 'var(--gf-text-emphasis)' }}
          >
            <Sparkles className="size-4" />
            <h2 className="text-lg font-semibold">Team Character Awards</h2>
          </div>
          <AwardGrid
            cards={teamCharacterAwards}
            emptyText="No remaining teams to assign team character awards yet."
          />
        </section>

        <section className="space-y-3">
          <div
            className="flex items-center gap-2"
            style={{ color: 'var(--gf-text-emphasis)' }}
          >
            <Medal className="size-4" />
            <h2 className="text-lg font-semibold">Leadership Awards</h2>
          </div>
          <AwardGrid
            cards={leadershipAwards}
            emptyText="Leadership awards need enough individual data to compute."
          />
        </section>

        <section className="space-y-3">
          <div
            className="flex items-center gap-2"
            style={{ color: 'var(--gf-text-emphasis)' }}
          >
            <Star className="size-4" />
            <h2 className="text-lg font-semibold">Individual Awards</h2>
          </div>
          <AwardGrid
            cards={individualAwards}
            emptyText="Individual awards will appear when participants have scored entries."
          />
        </section>

        <TrophyLeaderboardSection teams={teams} />

        <CeremonyPhotosSection
          canUploadCeremonyPhotos={canUploadCeremonyPhotos}
          fileInputRef={fileInputRef}
          handleCeremonyPhotoUpload={handleCeremonyPhotoUpload}
          handleUploadClick={handleUploadClick}
          uploading={uploading}
          galleryLoading={galleryLoading}
          galleryError={galleryError}
          photos={photos}
        />
      </div>
    </div>
  );
}
