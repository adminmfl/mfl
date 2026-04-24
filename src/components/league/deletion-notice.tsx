'use client';

import React from 'react';
import { AlertCircle, Archive } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

interface DeletionNoticeProps {
  leagueName: string;
  endDate: string;
}

export function DeletionNotice({ leagueName, endDate }: DeletionNoticeProps) {
  const deletionDate = new Date(endDate);
  deletionDate.setDate(deletionDate.getDate() + 90);
  const formattedDate = deletionDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-4">
      <Alert className="border-slate-300 bg-slate-50">
        <Archive className="h-4 w-4 text-slate-600" />
        <AlertTitle className="text-slate-900">Data Archived</AlertTitle>
        <AlertDescription className="text-slate-700">
          This league data has been archived as of{' '}
          <strong>{formattedDate}</strong>. Historical data remains but is no
          longer actively maintained.
        </AlertDescription>
      </Alert>

      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                What happened to your data?
              </h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li>
                  ✓ <strong>Player data:</strong> Permanently retained
                </li>
                <li>
                  ✓ <strong>Activity records:</strong> Permanently retained
                </li>
                <li>
                  ✓ <strong>Team information:</strong> Permanently retained
                </li>
                <li>
                  ✗ <strong>Photos:</strong> Deleted after 90 days
                </li>
                <li>
                  ✗ <strong>Proof files:</strong> May be deleted
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>📊 Your Season Summary:</strong> Download your personal report
          before data is archived. Your achievements will always be available in
          your profile.
        </p>
      </div>
    </div>
  );
}
