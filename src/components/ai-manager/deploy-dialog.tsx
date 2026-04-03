'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IconRocket, IconLoader2 } from '@tabler/icons-react';
import { toast } from 'sonner';
import { ChallengeTemplate } from './types';

interface DeployDialogProps {
  leagueId: string;
  template: ChallengeTemplate | null;
  onClose: () => void;
  onDeployed?: () => void;
}

export function DeployDialog({ leagueId, template, onClose, onDeployed }: DeployDialogProps) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [name, setName] = useState(template?.title || '');
  const [deploying, setDeploying] = useState(false);

  // Sync name when template changes
  if (template && name === '') {
    setName(template.title);
  }

  const handleDeploy = async () => {
    if (!template || !startDate) return;
    setDeploying(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/challenge-deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          startDate,
          customName: name || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Challenge deployed! ${data.commCount} communications scheduled.`);
        onClose();
        onDeployed?.();
      } else {
        toast.error(data.error || 'Deploy failed');
      }
    } catch {
      toast.error('Failed to deploy challenge');
    } finally {
      setDeploying(false);
    }
  };

  const commSchedule = Array.isArray(template?.comm_templates) ? template.comm_templates : [];
  const rules = Array.isArray(template?.rules) ? template.rules : [];

  return (
    <Dialog open={!!template} onOpenChange={(open) => { if (!open) { onClose(); setName(''); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Deploy Challenge</DialogTitle>
          <DialogDescription>
            Launch &quot;{template?.title}&quot; with an automated communication schedule.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Challenge Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          {/* Rules Preview */}
          {rules.length > 0 && (
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Rules</Label>
              {rules.map((r: any, i: number) => (
                <div key={i} className="text-sm flex items-start gap-1.5">
                  <span className={r.is_mandatory ? 'text-red-500' : 'text-muted-foreground'}>
                    {r.is_mandatory ? '●' : '○'}
                  </span>
                  <span>{r.rule_text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Comm Schedule Preview */}
          {commSchedule.length > 0 && (
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Scheduled Communications</Label>
              {commSchedule.map((c: any, i: number) => (
                <div key={i} className="text-sm flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Day {c.day_offset}</Badge>
                  <span>{(c.type || c.draft_type || '').replace(/_/g, ' ')}</span>
                  {c.prompt_hint && (
                    <span className="text-muted-foreground">— {c.prompt_hint}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); setName(''); }}>Cancel</Button>
          <Button onClick={handleDeploy} disabled={deploying || !startDate}>
            {deploying ? (
              <IconLoader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <IconRocket className="h-4 w-4 mr-1" />
            )}
            Deploy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
