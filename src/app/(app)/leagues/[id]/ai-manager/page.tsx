'use client';

/**
 * AI League Manager — Host Dashboard
 * 3 modules: Dashboard, Communication, Challenges
 * Thin orchestrator — all UI in sub-components under src/components/ai-manager/
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconBrain, IconRefresh, IconLoader2 } from '@tabler/icons-react';
import { toast } from 'sonner';

import type { DigestItem, Draft, Intervention, ChallengeTemplate } from '@/components/ai-manager/types';
import { DashboardTab } from '@/components/ai-manager/dashboard-tab';
import { CommunicationTab } from '@/components/ai-manager/communication-tab';
import { ChallengesTab } from '@/components/ai-manager/challenges-tab';

// ============================================================================
// Page Component
// ============================================================================

export default function AIManagerPage() {
  const params = useParams();
  const leagueId = params.id as string;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isScanning, setIsScanning] = useState(false);

  // Data states
  const [digestItems, setDigestItems] = useState<DigestItem[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [templates, setTemplates] = useState<ChallengeTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Draft send tracking
  const [sendingDraftId, setSendingDraftId] = useState<string | null>(null);
  const [generatingIntId, setGeneratingIntId] = useState<string | null>(null);

  // ========================================
  // Data Fetching
  // ========================================

  const fetchDigest = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/host-digest`);
      if (res.ok) setDigestItems(await res.json());
    } catch (err) {
      console.error('Failed to fetch digest:', err);
    }
  }, [leagueId]);

  const fetchDrafts = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/drafts`);
      if (res.ok) setDrafts(await res.json());
    } catch (err) {
      console.error('Failed to fetch drafts:', err);
    }
  }, [leagueId]);

  const fetchInterventions = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/interventions`);
      if (res.ok) setInterventions(await res.json());
    } catch (err) {
      console.error('Failed to fetch interventions:', err);
    }
  }, [leagueId]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/challenge-templates`);
      if (res.ok) setTemplates(await res.json());
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  }, [leagueId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchDigest(), fetchDrafts(), fetchInterventions(), fetchTemplates()]);
    setLoading(false);
  }, [fetchDigest, fetchDrafts, fetchInterventions, fetchTemplates]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ========================================
  // Actions
  // ========================================

  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/ai-scan`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Scan complete: ${data.digestCount} digest items, ${data.interventionCount} alerts`);
        await fetchAll();
      } else {
        toast.error(data.error || 'Scan failed');
      }
    } catch {
      toast.error('Failed to run scan');
    } finally {
      setIsScanning(false);
    }
  };

  // Digest actions
  const markDigestRead = async (ids: string[]) => {
    await fetch(`/api/leagues/${leagueId}/host-digest`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds: ids, status: 'read' }),
    });
    await fetchDigest();
  };

  const dismissDigest = async (ids: string[]) => {
    await fetch(`/api/leagues/${leagueId}/host-digest`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds: ids, status: 'dismissed' }),
    });
    await fetchDigest();
  };

  // Draft actions
  const sendDraft = async (draftId: string) => {
    setSendingDraftId(draftId);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/drafts/${draftId}/send`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Message sent!');
        await fetchDrafts();
      } else {
        toast.error(data.error || 'Failed to send');
      }
    } catch {
      toast.error('Failed to send');
    } finally {
      setSendingDraftId(null);
    }
  };

  const dismissDraft = async (draftId: string) => {
    await fetch(`/api/leagues/${leagueId}/drafts/${draftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dismissed' }),
    });
    await fetchDrafts();
  };

  const deleteDraft = async (draftId: string) => {
    await fetch(`/api/leagues/${leagueId}/drafts/${draftId}`, { method: 'DELETE' });
    await fetchDrafts();
  };

  // Intervention actions
  const generateDraftFromIntervention = async (interventionId: string) => {
    setGeneratingIntId(interventionId);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/interventions/${interventionId}/draft`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Draft generated! Check the Communication tab.');
        await Promise.all([fetchInterventions(), fetchDrafts()]);
      } else {
        toast.error(data.error || 'Failed to generate draft');
      }
    } catch {
      toast.error('Failed to generate draft');
    } finally {
      setGeneratingIntId(null);
    }
  };

  const dismissIntervention = async (ids: string[]) => {
    await fetch(`/api/leagues/${leagueId}/interventions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interventionIds: ids, status: 'dismissed' }),
    });
    await fetchInterventions();
  };

  // ========================================
  // Render
  // ========================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingAlerts = interventions.filter(i => i.status === 'pending');
  const unreadDigest = digestItems.filter(d => d.status === 'unread');
  const pendingDrafts = drafts.filter(d => d.status === 'pending' || d.status === 'edited');

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <IconBrain className="h-6 w-6" />
            AI League Manager
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Dashboard, communications, and challenge management
          </p>
        </div>
        <Button onClick={handleRunScan} disabled={isScanning} variant="outline">
          {isScanning ? (
            <>
              <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <IconRefresh className="h-4 w-4 mr-2" />
              Run Scan Now
            </>
          )}
        </Button>
      </div>

      {/* 3-Module Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="relative">
            Dashboard
            {(pendingAlerts.length + unreadDigest.length) > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1 text-xs">
                {pendingAlerts.length + unreadDigest.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="communication" className="relative">
            Communication
            {pendingDrafts.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-xs">
                {pendingDrafts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab
            digestItems={digestItems}
            interventions={interventions}
            generatingIntId={generatingIntId}
            onMarkDigestRead={markDigestRead}
            onDismissDigest={dismissDigest}
            onGenerateDraft={generateDraftFromIntervention}
            onDismissIntervention={dismissIntervention}
          />
        </TabsContent>

        <TabsContent value="communication">
          <CommunicationTab
            leagueId={leagueId}
            drafts={drafts}
            sendingDraftId={sendingDraftId}
            onSendDraft={sendDraft}
            onDismissDraft={dismissDraft}
            onDeleteDraft={deleteDraft}
            onDraftsRefresh={fetchDrafts}
          />
        </TabsContent>

        <TabsContent value="challenges">
          <ChallengesTab
            leagueId={leagueId}
            templates={templates}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
