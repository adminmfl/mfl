'use client';

import { useState, useEffect } from 'react';
import { useLeague } from '@/contexts/league-context';
import { useRole } from '@/contexts/role-context';
import { TeamWorkoutsViewer } from './team-workouts-viewer';

interface TeamOption {
  team_id: string;
  team_name: string;
}

export function WorkoutsSection({ leagueId }: { leagueId: string }) {
  const { activeLeague } = useLeague();
  const { isHost, isGovernor, isCaptain, isViceCaptain } = useRole();
  const [teams, setTeams] = useState<TeamOption[]>([]);

  const showTeamWorkouts =
    (activeLeague as any)?.player_team_workout_visibility ?? false;
  const showLeagueWorkouts =
    (activeLeague as any)?.player_league_workout_visibility ?? false;

  // Leaders always see workouts; players only if visibility is enabled
  const isLeader = isHost || isGovernor || isCaptain || isViceCaptain;
  const shouldShow = isLeader || showTeamWorkouts || showLeagueWorkouts;

  useEffect(() => {
    if (!shouldShow) return;

    fetch(`/api/leagues/${leagueId}/teams`)
      .then((r) => r.json())
      .then((json) => {
        const list = json.data?.teams ?? json.teams ?? [];
        setTeams(
          list.map((t: any) => ({
            team_id: t.team_id,
            team_name: t.team_name,
          })),
        );
      })
      .catch(() => {});
  }, [leagueId, shouldShow]);

  if (!shouldShow || teams.length === 0) return null;

  return (
    <div className="px-4 lg:px-6">
      <TeamWorkoutsViewer
        leagueId={leagueId}
        userTeamId={activeLeague?.team_id ?? null}
        teams={teams}
        showTeamWorkouts={isLeader || showTeamWorkouts}
        showLeagueWorkouts={isLeader || showLeagueWorkouts}
      />
    </div>
  );
}
