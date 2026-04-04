'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconRocket } from '@tabler/icons-react';
import { ChallengeTemplate } from './types';

interface TemplateCardProps {
  template: ChallengeTemplate;
  onDeploy: (template: ChallengeTemplate) => void;
}

export function TemplateCard({ template, onDeploy }: TemplateCardProps) {
  const commSchedule = Array.isArray(template.comm_templates) ? template.comm_templates : [];
  const rules = Array.isArray(template.rules) ? template.rules : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{template.title}</CardTitle>
            <CardDescription>{template.description}</CardDescription>
          </div>
          <Badge variant="outline">{template.challenge_type}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Rules */}
        {rules.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase">Rules</span>
            {rules.map((rule, i) => (
              <div key={i} className="text-xs flex items-start gap-1.5">
                <span className={rule.is_mandatory ? 'text-red-500' : 'text-muted-foreground'}>
                  {rule.is_mandatory ? '●' : '○'}
                </span>
                <span>{rule.rule_text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Scoring */}
        {template.scoring_logic && template.scoring_logic.type && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {template.scoring_logic.type}
            </Badge>
            {template.scoring_logic.points_per_completion && (
              <span className="text-xs text-muted-foreground">
                {template.scoring_logic.points_per_completion} pts/completion
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-muted-foreground">
            {template.duration_days} days
            {template.total_points ? ` · ${template.total_points} pts` : ''}
            {commSchedule.length > 0 ? ` · ${commSchedule.length} comms` : ''}
          </span>
          <Button size="sm" onClick={() => onDeploy(template)}>
            <IconRocket className="h-4 w-4 mr-1" /> Deploy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
