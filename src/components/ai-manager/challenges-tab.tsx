'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconLoader2 } from '@tabler/icons-react';
import { ChallengeTemplate, ActiveChallenge } from './types';
import { TemplateCard } from './template-card';
import { DeployDialog } from './deploy-dialog';

interface ChallengesTabProps {
  leagueId: string;
  templates: ChallengeTemplate[];
}

const challengeStatusColor = (status: string) => {
  if (status === 'active') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (status === 'scheduled' || status === 'upcoming') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  if (status === 'closed' || status === 'published') return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
};

export function ChallengesTab({ leagueId, templates }: ChallengesTabProps) {
  const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [deployTemplate, setDeployTemplate] = useState<ChallengeTemplate | null>(null);

  const fetchActiveChallenges = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/challenges`);
      if (res.ok) {
        const data = await res.json();
        const challenges = data.data || data || [];
        setActiveChallenges(challenges);
      }
    } catch (err) {
      console.error('Failed to fetch active challenges:', err);
    } finally {
      setLoadingChallenges(false);
    }
  }, [leagueId]);

  useEffect(() => {
    fetchActiveChallenges();
  }, [fetchActiveChallenges]);

  const nonClosedChallenges = activeChallenges.filter(
    c => c.status !== 'closed' && c.status !== 'published'
  );

  return (
    <div className="space-y-6">
      {/* Active Challenges Section */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Active Challenges</h2>
        {loadingChallenges ? (
          <div className="flex items-center justify-center py-6">
            <IconLoader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : nonClosedChallenges.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground text-sm">
              No active challenges. Deploy one from the template library below.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {nonClosedChallenges.map((ch) => (
              <Card key={ch.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm">{ch.name}</CardTitle>
                    <Badge className={challengeStatusColor(ch.status)}>{ch.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{ch.challenge_type}</Badge>
                    {ch.end_date && <span>Ends {new Date(ch.end_date).toLocaleDateString()}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Template Library Section */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Template Library</h2>
        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground text-sm">
              No challenge templates available.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((tmpl) => (
              <TemplateCard
                key={tmpl.id}
                template={tmpl}
                onDeploy={setDeployTemplate}
              />
            ))}
          </div>
        )}
      </section>

      {/* Deploy Dialog */}
      <DeployDialog
        leagueId={leagueId}
        template={deployTemplate}
        onClose={() => setDeployTemplate(null)}
        onDeployed={fetchActiveChallenges}
      />
    </div>
  );
}
