'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconSend, IconEdit, IconX, IconTrash, IconLoader2 } from '@tabler/icons-react';
import { Draft } from './types';

interface DraftCardProps {
  draft: Draft;
  isSending: boolean;
  onSend: (id: string) => void;
  onEdit: (draft: Draft) => void;
  onDismiss: (id: string) => void;
  onDelete: (id: string) => void;
}

const statusColor = (status: string) => {
  if (status === 'sent') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (status === 'dismissed') return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
};

export function DraftCard({ draft, isSending, onSend, onEdit, onDismiss, onDelete }: DraftCardProps) {
  const isActionable = draft.status === 'pending' || draft.status === 'edited';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{draft.type.replace(/_/g, ' ')}</Badge>
            <Badge variant="secondary">{draft.target_scope}</Badge>
            <Badge className={statusColor(draft.status)}>{draft.status}</Badge>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {new Date(draft.created_at).toLocaleDateString()}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap mb-3">{draft.content}</p>
        {isActionable && (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => onSend(draft.id)} disabled={isSending}>
              {isSending ? (
                <IconLoader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <IconSend className="h-4 w-4 mr-1" />
              )}
              Send
            </Button>
            <Button size="sm" variant="outline" onClick={() => onEdit(draft)}>
              <IconEdit className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDismiss(draft.id)}>
              <IconX className="h-4 w-4 mr-1" /> Dismiss
            </Button>
            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => onDelete(draft.id)}>
              <IconTrash className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
