'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconMessage, IconX, IconLoader2 } from '@tabler/icons-react';
import { Intervention, severityColors } from './types';

interface AlertCardProps {
  alert: Intervention;
  isGenerating: boolean;
  onGenerateDraft: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function AlertCard({ alert, isGenerating, onGenerateDraft, onDismiss }: AlertCardProps) {
  return (
    <Card className={alert.status === 'pending' ? 'border-orange-300 dark:border-orange-700' : 'opacity-75'}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={severityColors[alert.severity] || ''}>
              {alert.severity}
            </Badge>
            <Badge variant="outline">{alert.trigger_type.replace(/_/g, ' ')}</Badge>
            <CardTitle className="text-base">{alert.title}</CardTitle>
          </div>
          <Badge variant="secondary" className="shrink-0">{alert.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
        <p className="text-sm italic text-muted-foreground mb-3">{alert.suggested_action}</p>
        {alert.status === 'pending' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onGenerateDraft(alert.id)}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <IconLoader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <IconMessage className="h-4 w-4 mr-1" />
              )}
              Generate Message
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDismiss(alert.id)}>
              <IconX className="h-4 w-4 mr-1" /> Dismiss
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
