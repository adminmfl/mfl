'use client';

import React from 'react';
import Confetti from 'react-confetti';
import { Crown, Medal, Sparkles, Star, Trophy } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DownloadCertificateButton } from '@/components/leagues/download-report-button';
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

type AwardCard = {
  title: string;
  subtitle: string;
  recipient: string;
  fallback: string;
  pointsLabel?: string;
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
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
  const { data: session } = useSession();
  const [windowSize, setWindowSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const update = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const { isPostLeague, day } = React.useMemo(
    () => getPostLeagueDayInfo(leagueEndDate),
    [leagueEndDate],
  );

  if (!isPostLeague) {
    return null;
  }

  const isTrophyMode = day <= 14;
  const remainingDays = Math.max(0, 14 - day + 1);

  const topTeams = teams.slice(0, 3);
  const remainingTeams = teams.slice(3);

  const bestIndividualByTeam = new Map<string, IndividualRanking>();
  for (const individual of individuals) {
    if (!individual.team_id) continue;
    const current = bestIndividualByTeam.get(individual.team_id);
    if (!current || individual.points > current.points) {
      bestIndividualByTeam.set(individual.team_id, individual);
    }
  }

  const winnerAwards: AwardCard[] = topTeams.map((team, index) => {
    const labels = ['Champion Team', 'First Runner-Up', 'Second Runner-Up'];
    const representative = bestIndividualByTeam.get(team.team_id);
    return {
      title: labels[index] || 'Winner Award',
      subtitle: `Rank #${team.rank}`,
      recipient: team.team_name,
      fallback: getInitials(representative?.username || team.team_name),
      pointsLabel: `${team.total_points} pts`,
    };
  });

  const teamCharacterNames = [
    'Spirit Squad Award',
    'Consistency Crew Award',
    'Comeback Crew Award',
    'Heart of the League Award',
    'Momentum Makers Award',
    'Team Unity Award',
  ];

  const teamCharacterAwards: AwardCard[] = remainingTeams.map((team, index) => {
    const representative = bestIndividualByTeam.get(team.team_id);
    return {
      title: teamCharacterNames[index % teamCharacterNames.length],
      subtitle: 'Team Character Award',
      recipient: team.team_name,
      fallback: getInitials(representative?.username || team.team_name),
      pointsLabel: `${team.total_points} pts`,
    };
  });

  const byPoints = [...individuals].sort((a, b) => b.points - a.points);
  const byRR = [...individuals].sort((a, b) => b.avg_rr - a.avg_rr);
  const bySubmissions = [...individuals].sort(
    (a, b) => b.submission_count - a.submission_count,
  );

  const leadershipAwards: AwardCard[] = [];
  if (byRR[0]) {
    leadershipAwards.push({
      title: 'Leadership Awards',
      subtitle: 'Rhythm Leader',
      recipient: byRR[0].username,
      fallback: getInitials(byRR[0].username),
      pointsLabel: `RR ${byRR[0].avg_rr.toFixed(2)}`,
    });
  }
  if (bySubmissions[0]) {
    leadershipAwards.push({
      title: 'Leadership Awards',
      subtitle: 'Consistency Captain',
      recipient: bySubmissions[0].username,
      fallback: getInitials(bySubmissions[0].username),
      pointsLabel: `${bySubmissions[0].submission_count} logs`,
    });
  }

  const individualAwards: AwardCard[] = [];
  if (byPoints[0]) {
    individualAwards.push({
      title: 'Individual Awards',
      subtitle: 'Most Active Player',
      recipient: byPoints[0].username,
      fallback: getInitials(byPoints[0].username),
      pointsLabel: `${byPoints[0].points} pts`,
    });
  }
  if (byPoints[1]) {
    individualAwards.push({
      title: 'Individual Awards',
      subtitle: 'Rising Star',
      recipient: byPoints[1].username,
      fallback: getInitials(byPoints[1].username),
      pointsLabel: `${byPoints[1].points} pts`,
    });
  }
  if (bySubmissions[1]) {
    individualAwards.push({
      title: 'Individual Awards',
      subtitle: 'Most Dedicated',
      recipient: bySubmissions[1].username,
      fallback: getInitials(bySubmissions[1].username),
      pointsLabel: `${bySubmissions[1].submission_count} logs`,
    });
  }

  const renderAwardGrid = (cards: AwardCard[], emptyText: string) => {
    if (cards.length === 0) {
      return (
        <div className="rounded-lg border border-[#D4AF37]/25 bg-[#0D1F44]/70 p-4 text-sm text-[#E7D7A2]">
          {emptyText}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Card
            key={`${card.title}-${card.subtitle}-${card.recipient}`}
            className="border-[#D4AF37]/30 bg-[#102756] text-[#F8F2D8] shadow-lg"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#F1D675]">
                {card.subtitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3 pt-1">
              <div className="flex size-11 items-center justify-center rounded-full border border-[#D4AF37]/60 bg-[#1A356E] text-sm font-semibold text-[#F4E5B0]">
                {card.fallback}
              </div>
              <div>
                <p className="font-semibold">{card.recipient}</p>
                {card.pointsLabel ? (
                  <p className="text-xs text-[#E7D7A2]">{card.pointsLabel}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#0B1A3A] via-[#102756] to-[#08142F] p-4 text-[#FAF3D9] shadow-xl lg:p-6">
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
        <div className="rounded-lg border border-[#D4AF37]/35 bg-[#0D1F44]/75 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-[#D4AF37] text-[#0A1A3A] hover:bg-[#D4AF37]">
              {isTrophyMode ? 'Trophy Mode' : 'Extended Archive'}
            </Badge>
            {isTrophyMode ? (
              <Badge
                variant="outline"
                className="border-[#D4AF37]/70 text-[#F6E27A]"
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
              <h1 className="text-2xl font-bold tracking-tight text-[#F6E27A]">
                Grande Finale
              </h1>
              <p className="mt-1 text-sm text-[#E7D7A2]">
                {leagueName} has entered the finale experience with trophy
                rankings and award cards.
              </p>
            </div>
            <Trophy className="size-7 text-[#D4AF37]" />
          </div>

          {session?.user?.id ? (
            <div className="mt-4">
              <DownloadCertificateButton
                leagueId={leagueId}
                userId={session.user.id}
                leagueStatus="completed"
                size="sm"
              />
              <p className="mt-2 text-xs text-[#D8C996]">
                League Finisher Certificate is available for every participant.
              </p>
            </div>
          ) : null}
        </div>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#F6E27A]">
            <Crown className="size-4" />
            <h2 className="text-lg font-semibold">
              Winner Awards (Top 3 Teams)
            </h2>
          </div>
          {renderAwardGrid(
            winnerAwards,
            'Winner awards will appear when rankings are available.',
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#F6E27A]">
            <Sparkles className="size-4" />
            <h2 className="text-lg font-semibold">Team Character Awards</h2>
          </div>
          {renderAwardGrid(
            teamCharacterAwards,
            'No remaining teams to assign team character awards yet.',
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#F6E27A]">
            <Medal className="size-4" />
            <h2 className="text-lg font-semibold">Leadership Awards</h2>
          </div>
          {renderAwardGrid(
            leadershipAwards,
            'Leadership awards need enough individual data to compute.',
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#F6E27A]">
            <Star className="size-4" />
            <h2 className="text-lg font-semibold">Individual Awards</h2>
          </div>
          {renderAwardGrid(
            individualAwards,
            'Individual awards will appear when participants have scored entries.',
          )}
        </section>

        <section className="rounded-lg border border-[#D4AF37]/25 bg-[#0D1F44]/70 p-4">
          <h3 className="font-semibold text-[#F1D675]">Trophy Leaderboard</h3>
          <div className="mt-3 space-y-2">
            {teams.length === 0 ? (
              <p className="text-sm text-[#E7D7A2]">
                No team standings available.
              </p>
            ) : (
              teams.map((team) => (
                <div
                  key={team.team_id}
                  className="flex items-center justify-between rounded-md border border-[#D4AF37]/20 bg-[#132C61] px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#D4AF37] text-sm font-bold text-[#0A1A3A]">
                      {team.rank}
                    </span>
                    <p className="font-medium">{team.team_name}</p>
                  </div>
                  <p className="text-sm font-semibold text-[#F6E27A]">
                    {team.total_points} pts
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
