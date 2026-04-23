import React from 'react';
import type { TeamRanking } from '@/hooks/use-league-leaderboard';

type TrophyLeaderboardSectionProps = {
  teams: TeamRanking[];
};

export function TrophyLeaderboardSection({
  teams,
}: TrophyLeaderboardSectionProps) {
  return (
    <section
      className="rounded-lg border p-4"
      style={{
        borderColor: 'var(--gf-border-25)',
        backgroundColor: 'var(--gf-surface-muted)',
      }}
    >
      <h3 className="font-semibold" style={{ color: 'var(--gf-text-heading)' }}>
        Trophy Leaderboard
      </h3>
      <div className="mt-3 space-y-2">
        {teams.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--gf-text-secondary)' }}>
            No team standings available.
          </p>
        ) : (
          teams.map((team) => (
            <div
              key={team.team_id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
              style={{
                borderColor: 'var(--gf-border-20)',
                backgroundColor: 'var(--gf-surface-row)',
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex size-7 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    backgroundColor: 'var(--gf-badge-bg)',
                    color: 'var(--gf-badge-text)',
                  }}
                >
                  {team.rank}
                </span>
                <p
                  className="font-medium"
                  style={{ color: 'var(--gf-text-primary)' }}
                >
                  {team.team_name}
                </p>
              </div>
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--gf-text-emphasis)' }}
              >
                {team.total_points} pts
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
