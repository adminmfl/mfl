'use client';

import React, { useState } from 'react';
import { Download, Share2, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SeasonSummaryProps {
  leagueId: string;
  leagueName: string;
  canDownload?: boolean;
}

export function SeasonSummary({
  leagueId,
  leagueName,
  canDownload = true,
}: SeasonSummaryProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleDownloadReport = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(
        `/api/leagues/${leagueId}/report?format=pdf`,
      );

      if (!response.ok) throw new Error('Failed to download report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${leagueName}-season-summary.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);
      const shareUrl = `${window.location.origin}/leagues/${leagueId}`;
      const shareData = {
        title: `${leagueName} Season Summary`,
        text: `Check out my season summary for ${leagueName}.`,
        url: shareUrl,
      };

      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
    } catch (error) {
      console.error('Error sharing season summary:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-slate-50 to-slate-100/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="size-5 text-primary" />
          Your Season Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Commemorate your league journey with a personalized PDF report
          containing your stats, achievements, and performance metrics.
        </p>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Included in Report:</h4>
          <ul className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Final Rankings
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Activity Summary
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Challenge Results
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Performance Metrics
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Team Statistics
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Rest Days Used
            </li>
          </ul>
        </div>

        <div className="flex gap-2">
          {canDownload && (
            <Button
              onClick={handleDownloadReport}
              disabled={isDownloading}
              className="flex-1"
              size="sm"
            >
              <Download className="size-4 mr-2" />
              {isDownloading ? 'Generating...' : 'Download PDF'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleShare}
            disabled={isSharing}
          >
            <Share2 className="size-4 mr-2" />
            {isSharing ? 'Sharing...' : 'Share'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pt-2 border-t">
          💾 Your data is retained indefinitely. Download while available to
          keep a personal copy.
        </p>
      </CardContent>
    </Card>
  );
}
