import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AwardCard } from './compute-awards';

type AwardGridProps = {
  cards: AwardCard[];
  emptyText: string;
};

export function AwardGrid({ cards, emptyText }: AwardGridProps) {
  if (cards.length === 0) {
    return (
      <div
        className="rounded-lg border p-4 text-sm"
        style={{
          borderColor: 'var(--gf-border-25)',
          backgroundColor: 'var(--gf-surface-muted)',
          color: 'var(--gf-text-secondary)',
        }}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <Card
          key={`${card.title}-${card.subtitle}-${card.recipient}`}
          className="shadow-lg"
          style={{
            borderColor: 'var(--gf-border-30)',
            backgroundColor: 'var(--gf-surface-card)',
            color: 'var(--gf-text-primary)',
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle
              className="text-sm font-semibold"
              style={{ color: 'var(--gf-text-heading)' }}
            >
              {card.subtitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3 pt-1">
            <div
              className="flex size-11 items-center justify-center rounded-full border text-sm font-semibold"
              style={{
                borderColor: 'var(--gf-border-60)',
                backgroundColor: 'var(--gf-avatar-bg)',
                color: 'var(--gf-avatar-text)',
              }}
            >
              {card.fallback}
            </div>
            <div>
              <p className="font-semibold">{card.recipient}</p>
              {card.pointsLabel ? (
                <p
                  className="text-xs"
                  style={{ color: 'var(--gf-text-secondary)' }}
                >
                  {card.pointsLabel}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
