'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IconCheck, IconLoader2 } from '@tabler/icons-react';
import { toast } from '@/lib/toast';
import { Draft } from './types';

interface EditDraftDialogProps {
  leagueId: string;
  draft: Draft | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditDraftDialog({ leagueId, draft, onClose, onSaved }: EditDraftDialogProps) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (draft) setContent(draft.content);
  }, [draft]);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        toast.success('Draft updated');
        onClose();
        onSaved();
      } else {
        toast.error('Failed to update draft');
      }
    } catch {
      toast.error('Failed to update draft');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!draft} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Draft</DialogTitle>
          <DialogDescription>
            Edit the message before sending. The AI generated this — make it yours.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="mt-2"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <IconLoader2 className="h-4 w-4 mr-1 animate-spin" /> : <IconCheck className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
