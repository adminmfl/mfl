'use client';

/**
 * AI League Manager — Host Dashboard
 * 4 tabs: Digest, Drafts, Alerts (Interventions), Library (Challenge Templates)
 * + "Run Scan Now" button for manual scan trigger
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  IconBrain,
  IconRefresh,
  IconSend,
  IconEdit,
  IconTrash,
  IconX,
  IconAlertTriangle,
  IconMessage,
  IconCheck,
  IconLoader2,
  IconRocket,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface DigestItem {
  id: string;
  category: string;
  title: string;
  body: string;
  priority: number;
  status: string;
  action_type?: string;
  action_payload?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
}

interface Draft {
  id: string;
  type: string;
  target_scope: string;
  target_id?: string;
  content: string;
  status: string;
  created_at: string;
  sent_at?: string;
}

interface Intervention {
  id: string;
  member_user_id: string;
  team_id?: string;
  trigger_type: string;
  severity: string;
  title: string;
  description: string;
  suggested_action: string;
  player_context?: Record<string, any>;
  status: string;
  created_at: string;
}

interface ChallengeTemplate {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  duration_days: number;
  total_points: number;
  definition: any;
}

// ============================================================================
// Severity Colors
// ============================================================================

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

const priorityColors = (p: number) => {
  if (p >= 8) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  if (p >= 6) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
  if (p >= 4) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
};

// ============================================================================
// Page Component
// ============================================================================

export default function AIManagerPage() {
  const params = useParams();
  const leagueId = params.id as string;

  const [activeTab, setActiveTab] = useState('digest');
  const [isScanning, setIsScanning] = useState(false);

  // Data states
  const [digestItems, setDigestItems] = useState<DigestItem[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [templates, setTemplates] = useState<ChallengeTemplate[]>([]);
  const [loading, setLoading] = useState(true);

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
  // Run Scan Now
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
    } catch (err) {
      toast.error('Failed to run scan');
    } finally {
      setIsScanning(false);
    }
  };

  // ========================================
  // Digest Actions
  // ========================================

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

  // ========================================
  // Draft Actions
  // ========================================

  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [editContent, setEditContent] = useState('');
  const [sendingDraftId, setSendingDraftId] = useState<string | null>(null);

  const handleEditDraft = (draft: Draft) => {
    setEditingDraft(draft);
    setEditContent(draft.content);
  };

  const saveDraftEdit = async () => {
    if (!editingDraft) return;
    const res = await fetch(`/api/leagues/${leagueId}/drafts/${editingDraft.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent }),
    });
    if (res.ok) {
      toast.success('Draft updated');
      setEditingDraft(null);
      await fetchDrafts();
    } else {
      toast.error('Failed to update draft');
    }
  };

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

  // ========================================
  // Intervention Actions
  // ========================================

  const [generatingIntId, setGeneratingIntId] = useState<string | null>(null);

  const generateDraftFromIntervention = async (interventionId: string) => {
    setGeneratingIntId(interventionId);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/interventions/${interventionId}/draft`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Draft generated! Check the Drafts tab.');
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
  // Challenge Deploy
  // ========================================

  const [deployTemplate, setDeployTemplate] = useState<ChallengeTemplate | null>(null);
  const [deployStartDate, setDeployStartDate] = useState('');
  const [deployName, setDeployName] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeploy = async () => {
    if (!deployTemplate || !deployStartDate) return;
    setIsDeploying(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/challenge-deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: deployTemplate.id,
          startDate: deployStartDate,
          customName: deployName || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Challenge deployed! ${data.commCount} communications scheduled.`);
        setDeployTemplate(null);
      } else {
        toast.error(data.error || 'Deploy failed');
      }
    } catch {
      toast.error('Failed to deploy challenge');
    } finally {
      setIsDeploying(false);
    }
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

  const unreadDigest = digestItems.filter(d => d.status === 'unread');
  const pendingInterventions = interventions.filter(i => i.status === 'pending');
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
            Your daily insights, communications, and intervention alerts
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="digest" className="relative">
            Digest
            {unreadDigest.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1 text-xs">
                {unreadDigest.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="drafts" className="relative">
            Drafts
            {pendingDrafts.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-xs">
                {pendingDrafts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="relative">
            Alerts
            {pendingInterventions.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1 text-xs">
                {pendingInterventions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
        </TabsList>

        {/* ============================== DIGEST TAB ============================== */}
        <TabsContent value="digest" className="space-y-4">
          {digestItems.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No digest items today. Run a scan to check your league health.
              </CardContent>
            </Card>
          ) : (
            <>
              {unreadDigest.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markDigestRead(unreadDigest.map(d => d.id))}
                  >
                    <IconEye className="h-4 w-4 mr-1" /> Mark all read
                  </Button>
                </div>
              )}
              {digestItems.map((item) => (
                <Card key={item.id} className={item.status === 'unread' ? 'border-primary/50' : 'opacity-75'}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={priorityColors(item.priority)}>P{item.priority}</Badge>
                        <Badge variant="outline">{item.category.replace(/_/g, ' ')}</Badge>
                        <CardTitle className="text-base">{item.title}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        {item.status === 'unread' && (
                          <Button variant="ghost" size="sm" onClick={() => markDigestRead([item.id])}>
                            <IconEye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => dismissDigest([item.id])}>
                          <IconEyeOff className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.body}</p>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        {/* ============================== DRAFTS TAB ============================== */}
        <TabsContent value="drafts" className="space-y-4">
          {drafts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No drafts yet. Drafts are generated from digest actions, interventions, or challenge schedules.
              </CardContent>
            </Card>
          ) : (
            drafts.map((draft) => (
              <Card key={draft.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{draft.type.replace(/_/g, ' ')}</Badge>
                      <Badge variant="secondary">{draft.target_scope}</Badge>
                      <Badge
                        className={
                          draft.status === 'sent'
                            ? 'bg-green-100 text-green-800'
                            : draft.status === 'dismissed'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-100 text-blue-800'
                        }
                      >
                        {draft.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(draft.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap mb-3">{draft.content}</p>
                  {(draft.status === 'pending' || draft.status === 'edited') && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => sendDraft(draft.id)} disabled={sendingDraftId === draft.id}>
                        {sendingDraftId === draft.id ? (
                          <IconLoader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <IconSend className="h-4 w-4 mr-1" />
                        )}
                        Send
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEditDraft(draft)}>
                        <IconEdit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => dismissDraft(draft.id)}>
                        <IconX className="h-4 w-4 mr-1" /> Dismiss
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteDraft(draft.id)}>
                        <IconTrash className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ============================== ALERTS TAB ============================== */}
        <TabsContent value="alerts" className="space-y-4">
          {interventions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No alerts. Run a scan to check for at-risk members.
              </CardContent>
            </Card>
          ) : (
            interventions.map((alert) => (
              <Card key={alert.id} className={alert.status === 'pending' ? 'border-orange-300 dark:border-orange-700' : 'opacity-75'}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={severityColors[alert.severity] || ''}>
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline">{alert.trigger_type.replace(/_/g, ' ')}</Badge>
                      <CardTitle className="text-base">{alert.title}</CardTitle>
                    </div>
                    <Badge variant="secondary">{alert.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                  <p className="text-sm italic text-muted-foreground mb-3">{alert.suggested_action}</p>
                  {alert.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => generateDraftFromIntervention(alert.id)}
                        disabled={generatingIntId === alert.id}
                      >
                        {generatingIntId === alert.id ? (
                          <IconLoader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <IconMessage className="h-4 w-4 mr-1" />
                        )}
                        Generate Message
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => dismissIntervention([alert.id])}>
                        <IconX className="h-4 w-4 mr-1" /> Dismiss
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ============================== LIBRARY TAB ============================== */}
        <TabsContent value="library" className="space-y-4">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No challenge templates available. Run the migration to seed templates.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((tmpl) => {
                const commSchedule = Array.isArray(tmpl.definition?.comm_schedule) ? tmpl.definition.comm_schedule : [];
                return (
                  <Card key={tmpl.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{tmpl.title}</CardTitle>
                          <CardDescription>{tmpl.description}</CardDescription>
                        </div>
                        <Badge variant="outline">{tmpl.challenge_type}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {tmpl.duration_days} days{tmpl.total_points ? ` · ${tmpl.total_points} pts` : ''}{commSchedule.length > 0 ? ` · ${commSchedule.length} scheduled comms` : ''}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => {
                            setDeployTemplate(tmpl);
                            setDeployName(tmpl.title);
                            setDeployStartDate(new Date().toISOString().split('T')[0]);
                          }}
                        >
                          <IconRocket className="h-4 w-4 mr-1" /> Deploy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ============================== EDIT DRAFT DIALOG ============================== */}
      <Dialog open={!!editingDraft} onOpenChange={(open) => !open && setEditingDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Draft</DialogTitle>
            <DialogDescription>
              Edit the message before sending. The AI generated this — make it yours.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={6}
            className="mt-2"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDraft(null)}>
              Cancel
            </Button>
            <Button onClick={saveDraftEdit}>
              <IconCheck className="h-4 w-4 mr-1" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================== DEPLOY DIALOG ============================== */}
      <Dialog open={!!deployTemplate} onOpenChange={(open) => !open && setDeployTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy Challenge</DialogTitle>
            <DialogDescription>
              Launch &quot;{deployTemplate?.title}&quot; with an automated communication schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Challenge Name</Label>
              <Input value={deployName} onChange={(e) => setDeployName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={deployStartDate}
                onChange={(e) => setDeployStartDate(e.target.value)}
              />
            </div>
            {deployTemplate?.definition?.comm_schedule && (
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Scheduled Communications</Label>
                {deployTemplate.definition.comm_schedule.map((c: any, i: number) => (
                  <div key={i} className="text-sm flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Day {c.day_offset}</Badge>
                    <span>{c.type.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground">— {c.prompt_hint}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeployTemplate(null)}>
              Cancel
            </Button>
            <Button onClick={handleDeploy} disabled={isDeploying}>
              {isDeploying ? (
                <IconLoader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <IconRocket className="h-4 w-4 mr-1" />
              )}
              Deploy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
