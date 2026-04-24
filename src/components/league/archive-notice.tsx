'use client';

import React from 'react';
import { AlertCircle, Calendar, Archive } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

interface ArchiveNoticeProps {
  daysRemaining: number;
  endDate: string;
  leagueName: string;
}

export function ArchiveNotice({
  daysRemaining,
  endDate,
  leagueName,
}: ArchiveNoticeProps) {
  const deletionDate = new Date(endDate);
  deletionDate.setDate(deletionDate.getDate() + 90);
  const formattedDate = deletionDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-4">
      <Alert className="border-orange-200 bg-orange-50">
        <Archive className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-900">League Archived</AlertTitle>
        <AlertDescription className="text-orange-800">
          This league has ended and is now archived. Data will be retained until{' '}
          <strong>{formattedDate}</strong>.
        </AlertDescription>
      </Alert>

      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Calendar className="size-5 text-orange-600 mt-1 shrink-0" />
            <div>
              <h3 className="font-semibold text-orange-900 mb-1">
                Data Retention Timeline
              </h3>
              <ul className="space-y-2 text-sm text-orange-800">
                <li>
                  <strong>14 days:</strong> Trophy celebration mode (fully
                  accessible)
                </li>
                <li>
                  <strong>15-90 days:</strong> Archived (read-only, but visible)
                </li>
                <li>
                  <strong>After 90 days:</strong> Data archived, photos deleted
                </li>
              </ul>
              <p className="mt-3 text-xs text-orange-700">
                ℹ️ Player data is retained indefinitely. Only photos are subject
                to deletion.
              </p>
            </div>
          </div>

          {daysRemaining <= 30 && daysRemaining > 0 && (
            <div className="mt-4 pt-4 border-t border-orange-200">
              <p className="text-sm font-medium text-orange-900">
                ⏰ {daysRemaining} day{daysRemaining === 1 ? '' : 's'} until
                archival
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
