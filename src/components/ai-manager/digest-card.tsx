'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { DigestItem, priorityColor } from './types';

interface DigestCardProps {
  item: DigestItem;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function DigestCard({ item, onMarkRead, onDismiss }: DigestCardProps) {
  return (
    <Card className={item.status === 'unread' ? 'border-primary/50' : 'opacity-75'}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={priorityColor(item.priority)}>P{item.priority}</Badge>
            <Badge variant="outline">{item.category.replace(/_/g, ' ')}</Badge>
            <CardTitle className="text-base">{item.title}</CardTitle>
          </div>
          <div className="flex gap-1 shrink-0">
            {item.status === 'unread' && (
              <Button variant="ghost" size="sm" onClick={() => onMarkRead(item.id)}>
                <IconEye className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onDismiss(item.id)}>
              <IconEyeOff className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{item.body}</p>
      </CardContent>
    </Card>
  );
}
