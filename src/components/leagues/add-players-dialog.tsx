'use client';

import { useState } from 'react';
import { Loader2, UserPlus, Upload, AlertCircle } from 'lucide-react';
import { toast } from '@/lib/toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Team {
  team_id: string;
  team_name: string;
}

interface AddPlayersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leagueId: string;
  teams?: Team[];
}

interface AddResult {
  added: number;
  existing: number;
  errors: string[];
}

export function AddPlayersDialog({
  open,
  onOpenChange,
  leagueId,
  teams = [],
}: AddPlayersDialogProps) {
  // Single add state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [teamId, setTeamId] = useState<string>('');
  const [singleLoading, setSingleLoading] = useState(false);

  // Bulk add state
  const [csvText, setCsvText] = useState('');
  const [bulkTeamId, setBulkTeamId] = useState<string>('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Results
  const [result, setResult] = useState<AddResult | null>(null);

  const resetForm = () => {
    setName('');
    setEmail('');
    setTeamId('');
    setCsvText('');
    setBulkTeamId('');
    setResult(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const addPlayers = async (
    players: { name: string; email: string; team_id?: string }[],
  ) => {
    const res = await fetch(`/api/leagues/${leagueId}/add-players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to add players');
    }
    return json.data as AddResult;
  };

  // Single add handler
  const handleSingleAdd = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    setSingleLoading(true);
    setResult(null);

    try {
      const data = await addPlayers([
        {
          name: name.trim(),
          email: email.trim(),
          ...(teamId && teamId !== 'none' ? { team_id: teamId } : {}),
        },
      ]);

      setResult(data);

      if (data.added > 0) {
        toast.success('Player added successfully');
        setName('');
        setEmail('');
      } else if (data.existing > 0) {
        toast.info('Player already exists, added to league');
      }

      if (data.errors.length > 0) {
        toast.error(data.errors[0]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add player');
    } finally {
      setSingleLoading(false);
    }
  };

  // Bulk add handler
  const handleBulkAdd = async () => {
    const lines = csvText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      toast.error('Please enter at least one player (name,email per line)');
      return;
    }

    const players: { name: string; email: string; team_id?: string }[] = [];
    const parseErrors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length < 2 || !parts[0] || !parts[1]) {
        parseErrors.push(`Line ${i + 1}: Invalid format (expected name,email)`);
        continue;
      }
      players.push({
        name: parts[0],
        email: parts[1],
        ...(bulkTeamId && bulkTeamId !== 'none' ? { team_id: bulkTeamId } : {}),
      });
    }

    if (parseErrors.length > 0) {
      toast.error(`${parseErrors.length} line(s) had errors. Fix and retry.`);
      setResult({ added: 0, existing: 0, errors: parseErrors });
      return;
    }

    if (players.length === 0) {
      toast.error('No valid players found');
      return;
    }

    setBulkLoading(true);
    setResult(null);

    try {
      const data = await addPlayers(players);
      setResult(data);

      if (data.added > 0 || data.existing > 0) {
        toast.success(
          `Added ${data.added} new player(s), ${data.existing} existing player(s) linked`,
        );
        setCsvText('');
      }

      if (data.errors.length > 0) {
        toast.error(`${data.errors.length} error(s) occurred`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add players');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            Add Players
          </DialogTitle>
          <DialogDescription>
            Add players by name and email. New accounts will be created for
            players not yet registered.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="single" className="flex-1">
              Add Single
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex-1">
              Bulk Upload
            </TabsTrigger>
          </TabsList>

          {/* Single Add Tab */}
          <TabsContent value="single" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="player-name">Name</Label>
              <Input
                id="player-name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={singleLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="player-email">Email</Label>
              <Input
                id="player-email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={singleLoading}
              />
            </div>

            {teams.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="player-team">Team (optional)</Label>
                <Select
                  value={teamId}
                  onValueChange={setTeamId}
                  disabled={singleLoading}
                >
                  <SelectTrigger id="player-team">
                    <SelectValue placeholder="No team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No team</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.team_id} value={t.team_id}>
                        {t.team_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={handleSingleAdd}
              disabled={singleLoading || !name.trim() || !email.trim()}
              className="w-full gap-2"
            >
              {singleLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="size-4" />
                  Add Player
                </>
              )}
            </Button>
          </TabsContent>

          {/* Bulk Upload Tab */}
          <TabsContent value="bulk" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="csv-input">Players (CSV format)</Label>
              <Textarea
                id="csv-input"
                placeholder={
                  'John Doe,john@example.com\nJane Smith,jane@example.com'
                }
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                disabled={bulkLoading}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                One player per line: name,email
              </p>
            </div>

            {teams.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="bulk-team">Assign all to team (optional)</Label>
                <Select
                  value={bulkTeamId}
                  onValueChange={setBulkTeamId}
                  disabled={bulkLoading}
                >
                  <SelectTrigger id="bulk-team">
                    <SelectValue placeholder="No team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No team</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.team_id} value={t.team_id}>
                        {t.team_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={handleBulkAdd}
              disabled={bulkLoading || !csvText.trim()}
              className="w-full gap-2"
            >
              {bulkLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  Upload Players
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Results */}
        {result && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium">Results</p>
            <div className="flex gap-4 text-sm">
              {result.added > 0 && (
                <span className="text-green-600">
                  {result.added} new player(s) added
                </span>
              )}
              {result.existing > 0 && (
                <span className="text-blue-600">
                  {result.existing} existing player(s) linked
                </span>
              )}
            </div>
            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>
                  <ul className="list-disc pl-4 text-xs space-y-1">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
