import type {
  IndividualRanking,
  TeamRanking,
} from '@/hooks/use-league-leaderboard';

export type AwardCard = {
  title: string;
  subtitle: string;
  recipient: string;
  fallback: string;
  pointsLabel?: string;
};

export type FinaleAwards = {
  winnerAwards: AwardCard[];
  teamCharacterAwards: AwardCard[];
  leadershipAwards: AwardCard[];
  individualAwards: AwardCard[];
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function computeFinaleAwards(
  teams: TeamRanking[],
  individuals: IndividualRanking[],
): FinaleAwards {
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

  return {
    winnerAwards,
    teamCharacterAwards,
    leadershipAwards,
    individualAwards,
  };
}
