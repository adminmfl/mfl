'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconEye } from '@tabler/icons-react';
import { DigestItem, Intervention } from './types';
import { DigestCard } from './digest-card';
import { AlertCard } from './alert-card';

interface DashboardTabProps {
  digestItems: DigestItem[];
  interventions: Intervention[];
  generatingIntId: string | null;
  onMarkDigestRead: (ids: string[]) => void;
  onDismissDigest: (ids: string[]) => void;
  onGenerateDraft: (interventionId: string) => void;
  onDismissIntervention: (ids: string[]) => void;
}

export function DashboardTab({
  digestItems,
  interventions,
  generatingIntId,
  onMarkDigestRead,
  onDismissDigest,
  onGenerateDraft,
  onDismissIntervention,
}: DashboardTabProps) {
  const unreadDigest = digestItems.filter(d => d.status === 'unread');
  const pendingAlerts = interventions.filter(i => i.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Alerts
            {pendingAlerts.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({pendingAlerts.length} pending)
              </span>
            )}
          </h2>
        </div>

        {interventions.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground text-sm">
              No alerts. Run a scan to check for at-risk members.
            </CardContent>
          </Card>
        ) : (
          interventions.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isGenerating={generatingIntId === alert.id}
              onGenerateDraft={onGenerateDraft}
              onDismiss={(id) => onDismissIntervention([id])}
            />
          ))
        )}
      </section>

      {/* Digest Insights Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Digest Insights
            {unreadDigest.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({unreadDigest.length} unread)
              </span>
            )}
          </h2>
          {unreadDigest.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkDigestRead(unreadDigest.map(d => d.id))}
            >
              <IconEye className="h-4 w-4 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        {digestItems.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground text-sm">
              No digest items today. Run a scan to check your league health.
            </CardContent>
          </Card>
        ) : (
          digestItems.map((item) => (
            <DigestCard
              key={item.id}
              item={item}
              onMarkRead={(id) => onMarkDigestRead([id])}
              onDismiss={(id) => onDismissDigest([id])}
            />
          ))
        )}
      </section>
    </div>
  );
}
