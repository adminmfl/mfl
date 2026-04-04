'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Draft } from './types';
import { DraftCard } from './draft-card';
import { EditDraftDialog } from './edit-draft-dialog';
import { PrecastLibrary } from './precast-library';

interface CommunicationTabProps {
  leagueId: string;
  drafts: Draft[];
  sendingDraftId: string | null;
  onSendDraft: (id: string) => void;
  onDismissDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
  onDraftsRefresh: () => void;
}

export function CommunicationTab({
  leagueId,
  drafts,
  sendingDraftId,
  onSendDraft,
  onDismissDraft,
  onDeleteDraft,
  onDraftsRefresh,
}: CommunicationTabProps) {
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [subTab, setSubTab] = useState('drafts');

  const pendingDrafts = drafts.filter(d => d.status === 'pending' || d.status === 'edited');

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="drafts" className="relative">
            Drafts
            {pendingDrafts.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1 text-xs">
                {pendingDrafts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="library">Message Library</TabsTrigger>
        </TabsList>

        {/* Drafts Sub-Tab */}
        <TabsContent value="drafts" className="space-y-4">
          {drafts.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground text-sm">
                No drafts yet. Drafts are generated from alerts, message library, or challenge schedules.
              </CardContent>
            </Card>
          ) : (
            drafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                isSending={sendingDraftId === draft.id}
                onSend={onSendDraft}
                onEdit={setEditingDraft}
                onDismiss={onDismissDraft}
                onDelete={onDeleteDraft}
              />
            ))
          )}
        </TabsContent>

        {/* Message Library Sub-Tab */}
        <TabsContent value="library">
          <PrecastLibrary leagueId={leagueId} onCreateDraft={onDraftsRefresh} />
        </TabsContent>
      </Tabs>

      {/* Edit Draft Dialog */}
      <EditDraftDialog
        leagueId={leagueId}
        draft={editingDraft}
        onClose={() => setEditingDraft(null)}
        onSaved={onDraftsRefresh}
      />
    </div>
  );
}
