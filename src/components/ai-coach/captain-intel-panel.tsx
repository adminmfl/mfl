'use client';

import { useState, useEffect } from 'react';
import {
  Bot,
  Target,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CaptainIntelPanelProps {
  leagueId: string;
}

interface InsightMessage {
  id: string;
  content: string;
  metadata?: {
    rank?: number;
    inactive?: string[];
    active_ratio?: string;
  };
  created_at: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CaptainIntelPanel({ leagueId }: CaptainIntelPanelProps) {
  const [insights, setInsights] = useState<InsightMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!leagueId) return;

    fetch(`/api/leagues/${leagueId}/ai-coach?type=captain&limit=3`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setInsights(json.messages || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [leagueId]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('Copied to clipboard — paste in Team Chat');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading || insights.length === 0) return null;

  const latest = insights[0];
  const metadata = latest.metadata;

  return (
    <Card className="border-purple-200 dark:border-purple-800/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="size-4 text-purple-500" />
          AI Captain Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick stats */}
        {metadata && (
          <div className="flex flex-wrap gap-2">
            {metadata.rank && (
              <Badge variant="outline" className="gap-1 text-xs">
                <TrendingUp className="size-3" />
                Rank #{metadata.rank}
              </Badge>
            )}
            {metadata.active_ratio && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Target className="size-3" />
                Active: {metadata.active_ratio}
              </Badge>
            )}
            {metadata.inactive && metadata.inactive.length > 0 && (
              <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-300">
                <AlertTriangle className="size-3" />
                {metadata.inactive.length} inactive
              </Badge>
            )}
          </div>
        )}

        {/* AI insight */}
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs leading-relaxed text-foreground/90">
            {latest.content}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">
              {new Date(latest.created_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] gap-1"
              onClick={() => handleCopy(latest.content)}
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? 'Copied' : 'Copy to send'}
            </Button>
          </div>
        </div>

        {/* Inactive players */}
        {metadata?.inactive && metadata.inactive.length > 0 && (
          <div className="text-xs">
            <p className="font-medium text-muted-foreground mb-1">Inactive players (3 days):</p>
            <div className="flex flex-wrap gap-1">
              {metadata.inactive.map((name) => (
                <Badge key={name} variant="secondary" className="text-[11px]">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
