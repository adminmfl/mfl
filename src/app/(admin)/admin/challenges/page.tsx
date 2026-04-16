'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { toast } from '@/lib/toast';

type PresetChallenge = {
  challenge_id: string;
  name: string;
  description: string | null;
  challenge_type: 'individual' | 'team' | 'sub_team';
  doc_url: string | null;
  created_date: string;
};

type ChallengePricing = {
  pricing_id?: string;
  per_day_rate: number;
  tax: number | null;
  admin_markup: number | null;
};

export default function AdminChallengesPage() {
  const [loading, setLoading] = React.useState(true);
  const [challenges, setChallenges] = React.useState<PresetChallenge[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingChallenge, setEditingChallenge] = React.useState<PresetChallenge | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    challenge_type: 'individual' as 'individual' | 'team' | 'sub_team',
  });

  const [pricing, setPricing] = React.useState<ChallengePricing | null>(null);
  const [pricingEditMode, setPricingEditMode] = React.useState(false);
  const [savingPricing, setSavingPricing] = React.useState(false);

  /* ---------------- Fetch Challenges ---------------- */

  const fetchChallenges = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/challenges');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      setChallenges(json.data || []);
    } catch {
      toast.error('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------------- Fetch Pricing ---------------- */

  const fetchPricing = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/challenge-pricing');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);

      setPricing(json.data || { per_day_rate: 0, tax: null, admin_markup: null });
      setPricingEditMode(false); // ✅ always view mode after fetch
    } catch {
      toast.error('Failed to load pricing');
    }
  }, []);

  React.useEffect(() => {
    fetchChallenges();
    fetchPricing();
  }, [fetchChallenges, fetchPricing]);

  /* ---------------- Challenge CRUD ---------------- */

  const handleOpenDialog = (challenge?: PresetChallenge) => {
    if (challenge) {
      setEditingChallenge(challenge);
      setFormData({
        name: challenge.name,
        description: challenge.description || '',
        challenge_type: challenge.challenge_type,
      });
    } else {
      setEditingChallenge(null);
      setFormData({
        name: '',
        description: '',
        challenge_type: 'individual',
      });
    }
    setSelectedFile(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      let docUrl = editingChallenge?.doc_url ?? null;

      if (selectedFile) {
        const fd = new FormData();
        fd.append('file', selectedFile);

        const uploadRes = await fetch('/api/upload/challenge-document', {
          method: 'POST',
          body: fd,
        });

        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadJson.error);
        docUrl = uploadJson.data.url;
      }

      const res = await fetch(
        editingChallenge
          ? `/api/admin/challenges/${editingChallenge.challenge_id}`
          : '/api/admin/challenges',
        {
          method: editingChallenge ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, doc_url: docUrl }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);

      toast.success(editingChallenge ? 'Challenge updated' : 'Challenge created');
      setDialogOpen(false);
      fetchChallenges();
    } catch {
      toast.error('Failed to save challenge');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return;
    try {
      const res = await fetch(`/api/admin/challenges/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error();
      toast.success('Challenge deleted');
      fetchChallenges();
    } catch {
      toast.error('Failed to delete challenge');
    }
  };

  /* ---------------- Render ---------------- */

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pre-configured Challenges</h1>
          <p className="text-muted-foreground">
            Manage challenge templates that leagues can activate
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 size-4" /> Add Challenge
        </Button>
      </div>

      {/* Pricing */}
      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <div>
            <CardTitle>Challenge Pricing</CardTitle>
            <CardDescription>
              Default per-day rate and tax applied to challenges
            </CardDescription>
          </div>
          {!pricingEditMode && (
            <Button size="sm" variant="secondary" onClick={() => setPricingEditMode(true)}>
              Edit pricing
            </Button>
          )}
        </CardHeader>

        {pricingEditMode ? (
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {['per_day_rate', 'tax', 'admin_markup'].map((key) => (
                <div key={key} className="space-y-3">
                  <Label className="text-sm font-medium">
                    {key.replace('_', ' ')}
                  </Label>
                  <Input
                    type="number"
                    value={(pricing as any)?.[key] ?? ''}
                    onChange={(e) =>
                      setPricing((p) => ({
                        ...(p as ChallengePricing),
                        [key]: e.target.value === '' ? null : Number(e.target.value),
                      }))
                    }
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                disabled={savingPricing}
                onClick={async () => {
                  try {
                    setSavingPricing(true);
                    const res = await fetch('/api/admin/challenge-pricing', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(pricing),
                    });
                    const json = await res.json();
                    if (!res.ok || !json.success) throw new Error();
                    toast.success('Pricing saved');
                    fetchPricing();
                  } catch {
                    toast.error('Failed to save pricing');
                  } finally {
                    setSavingPricing(false);
                  }
                }}
              >
                Save pricing
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  fetchPricing();
                  setPricingEditMode(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent className="grid md:grid-cols-3 gap-6 mt-2">
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-xs text-muted-foreground uppercase">Per-day rate</p>
              <p className="text-lg font-semibold">
                ₹{Number(pricing?.per_day_rate ?? 0).toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-xs text-muted-foreground uppercase">Tax</p>
              <p className="text-lg font-semibold">
                {Number(pricing?.tax ?? 0).toFixed(2)}%
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-xs text-muted-foreground uppercase">Admin markup</p>
              <p className="text-lg font-semibold">
                {Number(pricing?.admin_markup ?? 0).toFixed(2)}%
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Challenges Table */}
      <Card>
        <CardHeader>
          <CardTitle>Available Challenges</CardTitle>
          <CardDescription>{challenges.length} challenges available</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Rules</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challenges.map((c) => (
                <TableRow key={c.challenge_id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{c.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {c.challenge_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {c.doc_url ? (
                      <a href={c.doc_url} target="_blank" className="flex items-center gap-2 text-blue-500 hover:text-blue-600 font-medium">
                        <FileText className="size-3" /> View
                      </a>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{new Date(c.created_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(c)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(c.challenge_id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingChallenge ? 'Edit Challenge' : 'Add New Challenge'}</DialogTitle>
            <DialogDescription>
              {editingChallenge
                ? 'Update the challenge template'
                : 'Create a new pre-configured challenge'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input required value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} />
            </div>

            <div>
              <Label>Challenge Type</Label>
              <Select value={formData.challenge_type} onValueChange={(v) => setFormData(p => ({ ...p, challenge_type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="sub_team">Sub-team</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rules document <span className="text-xs text-muted-foreground">(optional — existing doc is kept unless replaced)</span></Label>
              {editingChallenge?.doc_url && !selectedFile && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-md border px-3 py-2 bg-muted/30">
                  <FileText className="size-3.5 shrink-0" />
                  <span className="truncate">Current document attached</span>
                  <a href={editingChallenge.doc_url} target="_blank" rel="noopener noreferrer" className="text-primary underline shrink-0">View</a>
                </div>
              )}
              <Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : (editingChallenge ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
