'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  IconSend,
  IconEdit,
  IconPlus,
  IconTrash,
  IconLoader2,
  IconCheck,
} from '@tabler/icons-react';
import { toast } from '@/lib/toast';

interface CannedMessage {
  canned_message_id: string;
  title: string;
  content: string;
  role_target: string;
  is_system: boolean;
  category?: string;
}

interface PrecastLibraryProps {
  leagueId: string;
  onSendMessage?: (content: string) => void;
  onCreateDraft?: (content: string) => void;
}

const roleColors: Record<string, string> = {
  host: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  captain: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  governor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export function PrecastLibrary({ leagueId, onSendMessage, onCreateDraft }: PrecastLibraryProps) {
  const [messages, setMessages] = useState<CannedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [creating, setCreating] = useState(false);

  // Send/edit dialog
  const [editMsg, setEditMsg] = useState<CannedMessage | null>(null);
  const [editContent, setEditContent] = useState('');

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/canned-messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.data || data || []);
      }
    } catch (err) {
      console.error('Failed to fetch canned messages:', err);
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleQuickSend = async (msg: CannedMessage) => {
    setEditMsg(msg);
    setEditContent(msg.content);
  };

  const confirmSend = async () => {
    if (!editMsg || !editContent.trim()) return;
    setSendingId(editMsg.canned_message_id);
    try {
      // Create as draft via the drafts API
      const res = await fetch(`/api/leagues/${leagueId}/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'announcement',
          targetScope: 'league',
          contextData: { precast: true, title: editMsg.title, content: editContent },
        }),
      });
      if (res.ok) {
        toast.success('Draft created from template! Check the drafts list above to review and send.');
        setEditMsg(null);
        if (onCreateDraft) onCreateDraft(editContent);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create draft');
      }
    } catch {
      toast.error('Failed to create draft');
    } finally {
      setSendingId(null);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/canned-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, content: newContent }),
      });
      if (res.ok) {
        toast.success('Template created');
        setShowCreate(false);
        setNewTitle('');
        setNewContent('');
        await fetchMessages();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create template');
      }
    } catch {
      toast.error('Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/leagues/${leagueId}/canned-messages`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canned_message_id: id }),
    });
    if (res.ok) {
      toast.success('Template deleted');
      await fetchMessages();
    } else {
      toast.error('Failed to delete');
    }
  };

  // Group by role_target
  const grouped = messages.reduce((acc, msg) => {
    const key = msg.role_target || 'general';
    if (!acc[key]) acc[key] = [];
    acc[key].push(msg);
    return acc;
  }, {} as Record<string, CannedMessage[]>);

  const filtered = filter === 'all' ? messages : messages.filter(m => m.role_target === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <IconLoader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'host', 'captain', 'governor'].map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <IconPlus className="h-4 w-4 mr-1" /> New Template
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No templates found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((msg) => (
            <Card key={msg.canned_message_id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={roleColors[msg.role_target] || ''} variant="outline">
                      {msg.role_target}
                    </Badge>
                    {msg.is_system && (
                      <Badge variant="secondary" className="text-[10px]">System</Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm">{msg.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{msg.content}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleQuickSend(msg)}>
                    <IconSend className="h-3 w-3 mr-1" /> Use as Draft
                  </Button>
                  {!msg.is_system && (
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(msg.canned_message_id)}>
                      <IconTrash className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Send/Edit Dialog */}
      <Dialog open={!!editMsg} onOpenChange={(open) => !open && setEditMsg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Template: {editMsg?.title}</DialogTitle>
            <DialogDescription>
              Review and edit the message. It will be saved as a draft for your review.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMsg(null)}>Cancel</Button>
            <Button onClick={confirmSend} disabled={!!sendingId}>
              {sendingId ? <IconLoader2 className="h-4 w-4 mr-1 animate-spin" /> : <IconCheck className="h-4 w-4 mr-1" />}
              Create Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Message Template</DialogTitle>
            <DialogDescription>Create a reusable message template for this league.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Template title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Textarea placeholder="Message content" value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newTitle.trim() || !newContent.trim()}>
              {creating ? <IconLoader2 className="h-4 w-4 mr-1 animate-spin" /> : <IconPlus className="h-4 w-4 mr-1" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
